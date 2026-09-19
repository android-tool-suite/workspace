// Interactive, offline simulations of main's loading and page-lifetime contracts.
function createRuntimeState(){return {pages:{},lru:[],system:'ready',startupGate:false,web:{phi:'idle',gacha:'idle'},published:{},phiAvailable:{},gameAvailable:{},phiPages:{analysis:'idle',catalog:'idle'},phiSecret:'idle',phiPush:{status:'idle',profile:null,targets:null,source:null,warning:false},games:{'星穹铁道':'idle','原神':'idle'},switchTarget:null,switchOrigin:null,switchError:null,switchStage:null,gachaDataPublished:false,views:{},session:'idle',readLog:[]};}
const localReads=new Map();
let startupTimer=null;
const ownerForRoute=route=>['phi','gacha','shizuku','access','battery'].includes(route.split('/')[0])?route.split('/')[0]:null;
// Timing is a one-shot review condition. Ordinary fixture operations finish in a microtask.
function reviewReadDelay(mode,phase){return mode==='fast'?80:mode==='before'?(phase==='web'?490:190):mode==='after'?(phase==='web'?510:210):mode==='slow'?1200:0;}
function queueLocalRead(owner,key,success,failure,{outcome,delay,phase='local',feedback=true,refresh=renderBackground}={}){
 if(localReads.has(key))return;
 const controlled=!outcome&&phase===S.readPhase,result=outcome||(controlled?S.nextReadOutcome:'success'),duration=delay??(controlled?reviewReadDelay(S.readTiming,phase):0);
 if(controlled){S.nextReadOutcome='success';S.readTiming='instant';}
 const entry={owner,key,phase,held:result==='hold',timer:null,feedbackTimer:null,startFrame:null,feedback:false,complete:null};
 const audit=startTransitionReview(owner);const request={key,phase,planned:entry.held?'手动完成':duration,result:'pending'};audit.requests.push(request);entry.request=request;entry.audit=audit;
 entry.complete=()=>{
  if(localReads.get(key)!==entry)return;
  clearTimeout(entry.timer);clearTimeout(entry.feedbackTimer);cancelAnimationFrame(entry.startFrame);localReads.delete(key);
  request.result=result==='error'?'error':'ready';request.finished=Math.round(performance.now()-audit.started);
  S.runtime.readLog.push({key,result:request.result});if(result==='error')failure();else success();
  refresh();patchReadFeedback();if(audit.done&&transitionReview===audit)publishTransitionReview();
 };
 localReads.set(key,entry);
 const arm=()=>{
  if(localReads.get(key)!==entry)return;
  request.started=Math.round(performance.now()-audit.started);
  if(feedback)entry.feedbackTimer=setTimeout(()=>{if(localReads.get(key)===entry){entry.feedback=true;patchReadFeedback();}},phase==='web'?500:200);
  if(!entry.held){if(duration>0)entry.timer=setTimeout(entry.complete,duration);else queueMicrotask(entry.complete);}
 };
 if(phase==='web'&&(duration>0||entry.held))entry.startFrame=requestAnimationFrame(arm);else arm();
}
function cancelLocalRead(key){const read=localReads.get(key);if(read){if(read.request){read.request.result='cancelled';read.request.finished=Math.round(performance.now()-read.audit.started);}clearTimeout(read.timer);clearTimeout(read.feedbackTimer);cancelAnimationFrame(read.startFrame);localReads.delete(key);}}
function pendingForOwner(owner){return [...localReads.values()].filter(r=>r.owner===owner||r.owner==='system'&&['shizuku','access'].includes(owner));}
function setReadIndicator(node,visible){if(!node)return;const value=String(visible);if(node.dataset.visible===value)return;node.dataset.visible=value;node.style.visibility=visible?'visible':'hidden';node.style.opacity=visible?'1':'0';node.setAttribute('aria-hidden',String(!visible));}
function patchReadFeedback(){
 const owner=ownerForRoute(S.route),reads=pendingForOwner(owner),slot=document.getElementById('read-progress-slot');
 if(slot)slot.hidden=!['phi','gacha','shizuku','access'].includes(owner);
 setReadIndicator(document.getElementById('read-progress'),reads.some(r=>r.phase!=='web'&&r.feedback));
 setReadIndicator(document.getElementById('tool-load-feedback'),reads.some(r=>r.phase==='web'&&r.feedback));
 ui.product.setAttribute('aria-busy',String(reads.some(r=>!r.key.startsWith('phi-targets:'))));
 if(!reads.length&&ui.product.dataset.contentState==='retained')ui.product.dataset.contentState='ready';
 const refresh=ui.header.querySelector('[data-action="refresh-local"]');if(refresh)refresh.disabled=reads.length>0;
 refreshRuntimeControls();updateGachaSwitchControls();
}
let transitionReview=null,transitionFrame=null;
function startTransitionReview(owner){
 if(transitionReview&&!transitionReview.done&&transitionReview.owner===owner)return transitionReview;
 cancelAnimationFrame(transitionFrame);
 const audit={owner,started:performance.now(),requests:[],frames:[],sampleCount:0,partialFrames:0,blankRefreshFrames:0,feedbackFrames:0,webFeedbackFrames:0,maxProgressOpacity:0,maxWebOpacity:0,firstContentAt:null,hadContent:!!S.runtime.published[owner]&&ui.product.dataset.runtimeOwner===owner&&['ready','retained'].includes(ui.product.dataset.contentState),done:false,quiet:0};
 transitionReview=audit;
 const sample=()=>{
  if(transitionReview!==audit)return;
  const elapsed=Math.round(performance.now()-audit.started),current=ui.product.dataset.runtimeOwner===owner;
  if(current){
   const state=ui.product.dataset.contentState,body=ui.content.textContent.trim(),context=!!ui.context.textContent.trim(),controls=ui.context.querySelectorAll('button,input,select').length+ui.content.querySelectorAll('button,input,select').length;
   const progress=document.getElementById('read-progress'),web=document.getElementById('tool-load-feedback');
   const opacity=node=>getComputedStyle(node).visibility==='visible'?Number(getComputedStyle(node).opacity):0,p=opacity(progress),w=opacity(web);
   const frame={ms:elapsed,state,title:ui.header.querySelector('h1')?.textContent||'',context,body:body.length,controls,progress:+p.toFixed(3),web:+w.toFixed(3)};
   audit.sampleCount++;if(audit.frames.length<240)audit.frames.push(frame);
   if(state==='pending'&&!audit.hadContent&&(context||body||controls))audit.partialFrames++;
   if(audit.hadContent&&state==='retained'&&!body)audit.blankRefreshFrames++;
   if(p>0)audit.feedbackFrames++;if(w>0)audit.webFeedbackFrames++;
   audit.maxProgressOpacity=Math.max(audit.maxProgressOpacity,p);audit.maxWebOpacity=Math.max(audit.maxWebOpacity,w);
   if(['ready','retained','error'].includes(state)&&audit.firstContentAt===null)audit.firstContentAt=elapsed;
  }
  audit.quiet=pendingForOwner(owner).length?0:audit.quiet+1;
  if(audit.quiet>=2||elapsed>4000){audit.done=true;audit.truncated=elapsed>4000;publishTransitionReview();return;}
  transitionFrame=requestAnimationFrame(sample);
 };
 transitionFrame=requestAnimationFrame(sample);publishTransitionReview();return audit;
}
function publishTransitionReview(){
 const output=document.getElementById('transition-report');if(!output||!transitionReview)return;
 const a=transitionReview,summary={owner:a.owner,complete:a.done,capturedFrames:a.sampleCount,storedFrames:a.frames.length,firstContentMs:a.firstContentAt,partialFrames:a.partialFrames,blankRefreshFrames:a.blankRefreshFrames,progressFrames:a.feedbackFrames,toolHintFrames:a.webFeedbackFrames,maxProgressOpacity:+a.maxProgressOpacity.toFixed(3),maxToolHintOpacity:+a.maxWebOpacity.toFixed(3),truncated:!!a.truncated||a.sampleCount>a.frames.length,requests:a.requests,frames:a.frames};
 output.textContent=JSON.stringify(summary,null,2);output.dataset.complete=String(a.done);
}
function resetTransitionReview(){cancelAnimationFrame(transitionFrame);transitionReview=null;const output=document.getElementById('transition-report');if(output){output.textContent='选择一个过渡场景，或设置下一次读取后打开 / 刷新插件。';delete output.dataset.complete;}}

function rememberRuntimeView(){const route=S.route;if(!ownerForRoute(route))return;S.runtime.views[route]={details:Object.fromEntries([...ui.content.querySelectorAll('details[data-detail-key]')].map(el=>[el.dataset.detailKey,el.open])),horizontal:Object.fromEntries([...ui.content.querySelectorAll('[data-scroll-key]')].map(el=>[el.dataset.scrollKey,el.scrollLeft]))};}
function cancelLocalReads(owner){for(const [key,read] of localReads)if(!owner||read.owner===owner)cancelLocalRead(key);if(!owner){clearTimeout(startupTimer);startupTimer=null;resetTransitionReview();}}
function finishHeldReads(){for(const read of [...localReads.values()])if(read.held)read.complete();refreshRuntimeControls();}
function resetPluginView(owner){
 if(owner==='phi'||owner==='gacha'){S.runtime.web[owner]='idle';delete S.runtime.published[owner];}
 if(owner==='phi'){
  const fresh=initialState().phi;for(const key of ['scores','query','levels','constantMin','constantMax','grades','fc','ap','catalogQuery','catalogLevels','catalogMin','catalogMax','days','historyDays','point','image','login','loginStage','loginName'])S.phi[key]=clone(fresh[key]);
  S.runtime.phiPages={analysis:'idle',catalog:'idle'};S.runtime.phiAvailable={};S.runtime.phiSecret='idle';S.runtime.phiPush={status:'idle',profile:null,targets:null,source:null,warning:false};
 }else if(owner==='gacha'){
  const fresh=initialState().gacha;for(const key of ['pool','detailFilter','query','filterPool','rarity','page','source','draft','linkReady','qr','analysisDraft'])S.gacha[key]=clone(fresh[key]);
  S.runtime.games={'星穹铁道':'idle','原神':'idle'};S.runtime.gameAvailable={};S.runtime.switchTarget=null;S.runtime.switchOrigin=null;S.runtime.switchError=null;S.runtime.switchStage=null;S.runtime.gachaDataPublished=false;S.runtime.session='idle';S.gacha.newAccount=false;S.gacha.linkAccount=null;
 }else if(owner==='access'){S.accessQuery='';S.accessFilter='all';}
 for(const route of Object.keys(S.scrolls))if(ownerForRoute(route)===owner)delete S.scrolls[route];
 for(const route of Object.keys(S.runtime.views))if(ownerForRoute(route)===owner)delete S.runtime.views[route];
}
function releasePluginPage(owner){cancelLocalReads(owner);resetPluginView(owner);S.runtime.pages[owner]={alive:false,route:PLUGINS[owner].route};S.runtime.lru=S.runtime.lru.filter(id=>id!==owner);}
function visitRuntimeRoute(route){const owner=ownerForRoute(route);if(!owner)return;S.runtime.pages[owner]={...S.runtime.pages[owner],alive:true,route};S.runtime.lru=[...S.runtime.lru.filter(id=>id!==owner),owner];while(S.runtime.lru.length>2)releasePluginPage(S.runtime.lru[0]);}
function pluginEntryRoute(id){const page=S.runtime.pages[id];return page?.alive?page.route:PLUGINS[id].route;}
function cachedReturnRoute(route){const owner=ownerForRoute(route);return owner&&!S.runtime.pages[owner]?.alive?PLUGINS[owner].route:route;}
function simulateRelease(){const owner=ownerForRoute(S.route);if(!owner)return;releasePluginPage(owner);go('home',{root:true});setSimulationNote(`${PLUGINS[owner].short} 页面已释放；再次打开将回到默认页。`);}
function simulateColdStart(){
 cancelLocalReads();if(dragState)endDrag(true,true);
 for(const owner of ['phi','gacha','access'])resetPluginView(owner);
 S.runtime=createRuntimeState();S.runtime.system='idle';S.runtime.startupGate=true;S.route='home';S.root='home';S.stack=[];S.scrolls={};S.overlay=null;S.flow=null;S.sortMode=null;S.returnTo=null;lastRenderedRoute='';
 history.replaceState({atsPreview:true,route:'home',stack:[],root:'home'},'','#home');
 readSystemStatus();render();const runtime=S.runtime;
 requestAnimationFrame(()=>{if(S.runtime===runtime&&runtime.startupGate)startupTimer=setTimeout(()=>{if(S.runtime===runtime)releaseStartupGate();},150);});
 setSimulationNote('已模拟冷启动：账号、业务记录、设置和任务保留；页面位置与连接确认重新建立。');
}
function setSimulationNote(text){const el=document.getElementById('simulation-note');if(el)el.textContent=text;}
function refreshRuntimeControls(){
 const read=document.getElementById('read-outcome'),build=document.getElementById('build-flavor'),finish=document.getElementById('finish-reads'),release=document.getElementById('release-page'),cache=document.getElementById('page-cache-state');
 if(read)read.value=S.nextReadOutcome;if(build)build.value=S.buildFlavor;
 const phase=document.getElementById('read-phase'),timing=document.getElementById('read-timing');if(phase)phase.value=S.readPhase;if(timing)timing.value=S.readTiming;
 const held=[...localReads.values()].filter(r=>r.held).length;
 if(finish){finish.disabled=!held;finish.textContent=held?`完成等待中的操作（${held}）`:'没有等待中的操作';}
 if(release)release.disabled=!ownerForRoute(S.route);
 if(cache)cache.textContent='存活页面：'+(S.runtime.lru.map(id=>PLUGINS[id].short).join('、')||'无')+'（最多 2 个）';
}
function renderStartupGate(){const host=document.getElementById('startup-layer');if(!host)return;if(S.runtime.startupGate&&!host.firstChild)host.innerHTML='<div class="startup-mask" aria-hidden="true"><span class="brand-symbol">a<span>t</span>s</span></div>';if(!S.runtime.startupGate)host.replaceChildren();ui.product.inert=!!S.overlay||S.runtime.startupGate;}
function releaseStartupGate(){clearTimeout(startupTimer);startupTimer=null;S.runtime.startupGate=false;renderStartupGate();}
function readSystemStatus(force=false){
 if(!force&&S.runtime.system!=='idle')return;cancelLocalReads('system');S.runtime.system='loading';patchSystemWidgets();
 queueLocalRead('system','system-status',()=>{S.runtime.system='ready';patchSystemWidgets();releaseStartupGate();},()=>{S.runtime.system='error';patchSystemWidgets();releaseStartupGate();});
}
function systemWidgetText(id){
 const state=S.runtime.system;
 if(S.condition==='offline'||!S.plugins.shizuku.installed||!S.plugins.shizuku.enabled)return id==='shizuku'?['尚未连接','点击处理系统连接']:['状态未确认','系统连接恢复后重新读取'];
 if(state==='loading'||state==='idle')return ['—','正在读取状态'];
 if(state==='error')return ['暂时不可用','读取失败 · 点击后重试'];
 if(id==='shizuku')return [S.connection==='ready'?'连接正常':S.connection==='offline'?'尚未运行':'等待授权',S.connection==='ready'?'系统能力可用':'点击查看下一步'];
 return [S.services.filter(s=>s.enabled).length+' 项启用',S.services.filter(s=>s.auto).length+' 项自动恢复'];
}
function patchSystemWidgets(){
 for(const id of ['shizuku','access']){const [title,detail]=systemWidgetText(id);ui.device.querySelectorAll(`[data-system-value="${id}"]`).forEach(el=>el.textContent=title);ui.device.querySelectorAll(`[data-system-detail="${id}"]`).forEach(el=>el.textContent=detail);}
}
function localReadPanel(status,title,retry){return status==='error'?`<section class="read-state read-error" role="alert">${icon('warning')}<h3>${title}失败</h3><p>本机保存的数据没有被清空，可以重新读取。</p>${btn('重新读取',retry,'outline small','refresh')}</section>`:'';}
function ensureWebTool(owner,force=false){if(!force&&S.runtime.web[owner]!=='idle')return;cancelLocalRead(`web:${owner}`);S.runtime.web[owner]='loading';queueLocalRead(owner,`web:${owner}`,()=>S.runtime.web[owner]='ready',()=>S.runtime.web[owner]='error',{phase:'web'});}
function phiDataAvailable(kind){return !!S.runtime.phiAvailable[kind]||S.runtime.phiPages[kind]==='ready';}
function refreshCurrentLocal(){
 const [owner,sub]=S.route.split('/');
 if(pendingForOwner(owner).length)return;
 if(owner==='phi')ensurePhiData(sub==='catalog'?'catalog':'analysis',true);
 if(owner==='gacha'){if(sub==='acquire'&&S.gacha.source==='mihoyo')ensureMihoyoSession(true);else if(sub==='data')for(const game of new Set(S.gacha.accounts.map(a=>a.game)))ensureGame(game,true);else if(currentGacha())ensureGame(currentGacha().game,true);}
 // Existing nodes, expanded rows, focus and scrolling remain usable throughout the read.
 patchReadFeedback();ui.product.dataset.contentState='retained';
}
function retainedReadNotice(route){
 const [owner,sub]=route.split('/');
 if(owner==='phi'){const kind=sub==='catalog'?'catalog':'analysis';if(phiDataAvailable(kind)&&S.runtime.phiPages[kind]==='error')return notice('本地数据刷新失败，继续显示上次读取的内容。','warn',btn('重试',`phi-read-retry:${kind}`,'text small','refresh'));}
 if(owner==='gacha'&&['overview','records','pool','analysis'].includes(sub)&&currentGacha()&&gameLoaded(currentGacha().game)&&S.runtime.games[currentGacha().game]==='error')return notice('记录刷新失败，继续显示上次读取的内容。','warn',btn('重试',`game-retry:${currentGacha().game}`,'text small','refresh'));
 return '';
}

function prepareRuntimeRoute(route){
 if(route==='home'&&S.runtime.system==='idle')readSystemStatus();
 const [family,sub]=route.split('/');
 if(['phi','gacha'].includes(family)){ensureWebTool(family);if(S.runtime.web[family]!=='ready')return;}
 if(family==='phi'){
  if(sub==='catalog')ensurePhiData('catalog');
  else if(!['accounts','login'].includes(sub)){ensurePhiData('analysis');if(phiDataAvailable('analysis'))ensurePhiTargets();}
 }
 if(family==='gacha'){
  if(['overview','records','pool','analysis'].includes(sub)&&currentGacha())ensureGame(currentGacha().game);
  if(sub==='data')for(const game of new Set(S.gacha.accounts.map(a=>a.game)))ensureGame(game);
  if(sub==='export')for(const a of S.gacha.accounts.filter(a=>S.gacha.exportIds.includes(a.id)))ensureGame(a.game);
  if(sub==='import')for(const id of S.gacha.importIds)ensureGame(id==='g1'?'星穹铁道':'原神');
  if(sub==='acquire'&&S.gacha.source==='mihoyo')ensureMihoyoSession();
 }
 if(['shizuku','access'].includes(family)&&S.runtime.system==='idle')readSystemStatus();
}
function ensurePhiData(kind,force=false){
 if(!force&&S.runtime.phiPages[kind]!=='idle')return;
 const profile=S.phi.account;if(phiDataAvailable(kind))S.runtime.phiAvailable[kind]=true;cancelLocalRead(`phi-${kind}`);S.runtime.phiPages[kind]='loading';
 queueLocalRead('phi',`phi-${kind}`,()=>{if(kind!=='catalog'&&profile!==S.phi.account)return;S.runtime.phiPages[kind]='ready';S.runtime.phiAvailable[kind]=true;if(kind==='analysis')ensurePhiTargets();},()=>{if(kind==='catalog'||profile===S.phi.account)S.runtime.phiPages[kind]='error';});
}
function switchPhiProfile(id){
 if(!S.phi.accounts.some(a=>a.id===id))return;for(const read of [...localReads.values()])if(read.owner==='phi'&&read.key!=='phi-catalog')cancelLocalRead(read.key);S.phi.account=id;S.phi.empty=false;S.phi.point=null;S.runtime.phiPages.analysis='idle';S.runtime.phiAvailable.analysis=false;S.runtime.phiSecret='idle';S.runtime.phiPush={status:'idle',profile:id,targets:null,source:null,warning:false};closeOverlay();render();
}
function makeDemoTargets(profile){return Object.fromEntries(SONGS.map(s=>[s.id+':'+s.level,s.acc>=100?null:Math.min(100,s.acc+(profile==='p2'?.18:.35))]));}
function ensurePhiTargets(force=false,{outcome,warning=false}={}){
 const id=S.phi.account,state=S.runtime.phiPush;if(!phiHasData()||!phiDataAvailable('analysis'))return;
 if(!force&&state.profile===id&&state.status!=='idle')return;
 const cached=S.phi.targetCaches[id];if(!force&&cached){S.runtime.phiPush={status:'ready',profile:id,targets:cached,source:'cache',warning:false};return;}
 cancelLocalRead(`phi-targets:${id}`);S.runtime.phiPush={status:'loading',profile:id,targets:null,source:null,warning:false};
 queueLocalRead('phi',`phi-targets:${id}`,()=>{if(id!==S.phi.account)return;const targets=makeDemoTargets(id);if(!warning)S.phi.targetCaches[id]=targets;S.runtime.phiPush={status:'ready',profile:id,targets,source:'computed',warning};},()=>{if(id===S.phi.account)S.runtime.phiPush={status:'error',profile:id,targets:null,source:null,warning:false};},{outcome,feedback:false,refresh:refreshPhiTargets});
}
function phiTargetsReady(){const p=S.runtime.phiPush;return p.status==='ready'&&p.profile===S.phi.account;}
function phiTargetLabel(song){const p=S.runtime.phiPush;if(!phiTargetsReady())return p.status==='error'?'计算失败':'计算中…';const target=p.targets[song.id+':'+song.level];return target==null?(song.acc>=100?'已达 AP':'暂无推分目标'):target.toFixed(4)+'%';}
function phiPushNotice(){const p=S.runtime.phiPush;if(p.status==='error')return notice('推分计算失败，成绩仍可浏览。','warn',btn('重新计算','phi-push-retry','text small','refresh'));if(p.warning)return notice('推分结果已可用，但缓存保存失败；下次打开需要重新计算。','warn',btn('重试保存','phi-push-save','text small'));return '';}

function refreshPhiTargets(){
 refreshRuntimeControls();if(!['phi/scores','phi/image'].includes(S.route))return;
 const slot=ui.content.querySelector('[data-phi-push-state]');if(!slot){renderBackground();return;}
 slot.innerHTML=phiPushNotice();ui.content.querySelectorAll('[data-phi-target]').forEach(el=>{const song=SONGS.find(s=>s.id+':'+s.level===el.dataset.phiTarget);if(song)el.textContent=phiTargetLabel(song);});
 const save=ui.footer.querySelector('[data-action="save-demo-image"]');if(save)save.disabled=!phiTargetsReady();
}
function phiCredentialNotice(){return S.runtime.phiSecret==='error'?notice('登录状态读取失败，本地成绩仍可查看。','warn',btn('重新同步','phi-sync','text small','refresh')):'';}
function commitPhiSync(id){if(!S.phi.accounts.some(a=>a.id===id))return;const targets=makeDemoTargets(id);S.phi.targetCaches[id]=targets;if(S.phi.account===id){cancelLocalRead('phi-analysis');cancelLocalRead(`phi-targets:${id}`);S.runtime.phiPages.analysis='ready';S.runtime.phiPush={status:'ready',profile:id,targets,source:'sync',warning:false};}}
function gameLoaded(game){return !!S.runtime.gameAvailable[game]||S.runtime.games[game]==='ready';}
function ensureGame(game,force=false,options={}){
 if(!game||(!force&&S.runtime.games[game]!=='idle'))return;
 if(gameLoaded(game))S.runtime.gameAvailable[game]=true;cancelLocalRead(`gacha-game:${game}`);S.runtime.games[game]='loading';queueLocalRead('gacha',`gacha-game:${game}`,()=>{S.gacha.recordSets??={};for(const a of S.gacha.accounts.filter(a=>a.game===game))S.gacha.recordSets[a.id]??=makeGachaRecords(a);S.runtime.games[game]='ready';S.runtime.gameAvailable[game]=true;const target=S.gacha.accounts.find(a=>a.id===S.runtime.switchTarget);if(target?.game===game)saveGachaSelection(target.id);},()=>{S.runtime.games[game]='error';const target=S.gacha.accounts.find(a=>a.id===S.runtime.switchTarget);if(target?.game===game){S.runtime.switchError='read';S.runtime.switchStage='failed';}},options);
}
function accountReadLabel(account){return gameLoaded(account.game)?gachaRecordsFor(account).length+' 条记录':S.runtime.games[account.game]==='error'?'读取失败':'尚未读取';}
const GACHA_WRITES=new Set(['gacha-fetch','gacha-find-link','gacha-login-start','gacha-login-complete','gacha-role-link','gacha-logout-confirmed','gacha-delete-confirmed','analysis-save','uigf-confirm']);
function gachaSelectionPending(){return ['reading','saving'].includes(S.runtime.switchStage);}
function updateGachaSwitchControls(){
 const blocked=gachaSelectionPending();
 for(const node of ui.device.querySelectorAll('[data-action],[data-check^="analysis:"],#analysis-extra,#gacha-link-input')){
  if(node.dataset.action&&!GACHA_WRITES.has(node.dataset.action.split(':')[0]))continue;
  if(blocked){if(!node.hasAttribute('data-selection-disabled'))node.dataset.selectionDisabled=String(node.disabled);node.disabled=true;}
  else if(node.hasAttribute('data-selection-disabled')){node.disabled=node.dataset.selectionDisabled==='true';delete node.dataset.selectionDisabled;}
 }
}
function cancelGachaSwitch(){cancelLocalRead('gacha-selection-save');S.runtime.switchTarget=null;S.runtime.switchOrigin=null;S.runtime.switchError=null;S.runtime.switchStage=null;}
function requestGachaSwitch(id){
 const account=S.gacha.accounts.find(a=>a.id===id);if(!account)return;closeOverlay();cancelGachaSwitch();
 if(id===S.gacha.account){if(!gameLoaded(account.game)||S.runtime.games[account.game]==='error')ensureGame(account.game,true);if(S.route==='gacha/data')go('gacha/overview');else render();return;}
 S.runtime.switchOrigin=S.route;S.runtime.switchTarget=id;S.runtime.switchStage='reading';
 if(gameLoaded(account.game))saveGachaSelection(id);else ensureGame(account.game,S.runtime.games[account.game]==='error');render();
}
function saveGachaSelection(id){
 const account=S.gacha.accounts.find(a=>a.id===id);if(!account||id!==S.runtime.switchTarget)return;
 const candidate={id,analysis:clone(S.gacha.analysisByAccount?.[id]||{field:true,community:true,rules:false,extra:''})};
 S.runtime.switchStage='saving';S.runtime.switchError=null;cancelLocalRead('gacha-selection-save');
 queueLocalRead('gacha','gacha-selection-save',()=>{if(S.runtime.switchTarget===candidate.id)commitGachaSwitch(candidate);},()=>{if(S.runtime.switchTarget===candidate.id){S.runtime.switchError='save';S.runtime.switchStage='failed';}},{phase:'selection'});
}
function commitGachaSwitch(candidate){
 const {id,analysis}=candidate,origin=S.runtime.switchOrigin;if(!S.gacha.accounts.some(a=>a.id===id))return;
 // The selected account and its analysis become visible in the same turn, after save succeeds.
 S.gacha.analysis=analysis;S.gacha.analysisDraft=null;S.gacha.account=id;S.gacha.page=0;S.gacha.pool='character';S.gacha.detailFilter='all';cancelGachaSwitch();
 if(origin==='gacha/data'&&S.route===origin)go('gacha/overview');
}
function gachaSwitchNotice(){const a=S.gacha.accounts.find(a=>a.id===S.runtime.switchTarget);if(!a||!S.runtime.switchError)return '';const message=S.runtime.switchError==='save'?`账号选择保存失败，尚未切换到 ${a.game} · ${a.uid}。`:`未能读取 ${a.game} · ${a.uid} 的记录。`;return notice(message+'当前账号、设置与记录保持不变。','warn',btn('重试切换',`gacha-account:${a.id}`,'text small','refresh')+btn('取消切换','gacha-switch-cancel','text small'));}
function gachaDataPending(){return S.gacha.accounts.some(a=>['idle','loading'].includes(S.runtime.games[a.game]));}

function gachaSelectionReady(kind){const ids=kind==='import'?S.gacha.importIds:S.gacha.exportIds;return ids.length>0&&ids.every(id=>gameLoaded(kind==='import'?(id==='g1'?'星穹铁道':'原神'):S.gacha.accounts.find(a=>a.id===id)?.game));}
function gameLoadNotices(games){if(S.route==='gacha/data'&&gachaDataPending())return '';return [...new Set(games)].filter(game=>!gameLoaded(game)).map(game=>localReadPanel(S.runtime.games[game],`读取${game}记录`,`game-retry:${game}`)).join('');}
function ensureMihoyoSession(force=false){if(!force&&S.runtime.session!=='idle')return;cancelLocalRead('mihoyo-session');S.runtime.session='loading';queueLocalRead('gacha','mihoyo-session',()=>S.runtime.session='ready',()=>S.runtime.session='error');}
function runtimeRouteView(route){
 const [owner,sub]=route.split('/'),first=!S.runtime.published[owner];
 const title=owner==='phi'?({event:'当次变化',image:'成绩图片预览',accounts:'账号档案',login:'添加账号'}[sub]||'Phigros Data Studio'):owner==='gacha'?(sub==='pool'?poolLabel(POOLS.find(p=>p.id===route.split('/')[2])||POOLS[0]):{acquire:'获取记录',data:'数据与账号',import:'导入记录',export:'导出记录',analysis:'统计设置'}[sub]||'抽卡分析'):owner==='shizuku'?'Shizuku 授权':'无障碍服务';
 const shell=(state,html='',context='')=>({header:appBar(title,'',taskButton()),context,html,runtimeState:state});
 if(['phi','gacha'].includes(owner)&&S.runtime.web[owner]!=='ready')return S.runtime.web[owner]==='error'?shell('error',localReadPanel('error','打开工具',`web-read-retry:${owner}`)):shell('pending');
 if(owner==='phi'&&['overview','scores','history','event','image','catalog'].includes(sub)){
  const kind=sub==='catalog'?'catalog':'analysis',status=S.runtime.phiPages[kind];
  if(!phiDataAvailable(kind))return shell(status==='error'?'error':'pending',localReadPanel(status,kind==='catalog'?'读取本地定数表':'读取本地成绩',`phi-read-retry:${kind}`),(!first||status==='error')&&['overview','scores','history','catalog'].includes(sub)?phiContext(sub):'');
 }
 if(owner==='gacha'){
  if(sub==='data'&&!S.runtime.gachaDataPublished&&gachaDataPending())return shell('pending');
  if(['overview','records','pool','analysis'].includes(sub)&&currentGacha()&&!gameLoaded(currentGacha().game)){
   const status=S.runtime.games[currentGacha().game];return shell(status==='error'?'error':'pending',gachaSwitchNotice()+localReadPanel(status,`读取${currentGacha().game}记录`,`game-retry:${currentGacha().game}`),(!first||status==='error')&&['overview','records'].includes(sub)?gachaContext(sub):'');
  }
  if(first){const games=sub==='data'?S.gacha.accounts.map(a=>a.game):sub==='export'?S.gacha.accounts.filter(a=>S.gacha.exportIds.includes(a.id)).map(a=>a.game):sub==='import'?S.gacha.importIds.map(id=>id==='g1'?'星穹铁道':'原神'):[];
   if(games.some(game=>!gameLoaded(game))&&!games.some(game=>S.runtime.games[game]==='error'))return shell('pending');
   if(sub==='acquire'&&S.gacha.source==='mihoyo'&&['idle','loading'].includes(S.runtime.session))return shell('pending');
  }
 }
 if(['shizuku','access'].includes(owner)&&['idle','loading','error'].includes(S.runtime.system))return shell(S.runtime.system==='error'?'error':'pending',localReadPanel(S.runtime.system,'检查系统连接','system-read-retry'));
 return null;
}

function seedReadyGame(game){S.gacha.recordSets??={};for(const a of S.gacha.accounts.filter(a=>a.game===game))S.gacha.recordSets[a.id]??=makeGachaRecords(a);S.runtime.games[game]='ready';}
function configureRuntimeScene(id){
 if(id==='local-debug')S.buildFlavor='local-debug';
 if(id.startsWith('transition-')){const [_,phase,mode]=id.split('-');S.readPhase=phase;S.readTiming=mode==='error'?'slow':mode;S.nextReadOutcome=mode==='error'?'error':'success';}
 if(['home-first-read','cold-start','phi-read-loading','gacha-read-loading','gacha-session-loading'].includes(id))S.readPhase='local';
 if(id==='home-read-error')S.runtime.system='error';
 if(id==='cold-start'||id==='home-first-read'){S.nextReadOutcome=id==='home-first-read'?'hold':'success';simulateColdStart();return true;}
 if(id==='phi-read-loading')S.nextReadOutcome='hold';
 if(id==='phi-read-error')S.runtime.phiPages.analysis='error';
 if(id.startsWith('phi-push-')){S.runtime.phiPages.analysis='ready';if(id==='phi-push-error')S.runtime.phiPush={status:'error',profile:S.phi.account,targets:null};else if(id==='phi-push-warning'){S.runtime.phiPush={status:'ready',profile:S.phi.account,targets:makeDemoTargets(S.phi.account),source:'computed',warning:true};}else ensurePhiTargets(true,{outcome:'hold'});}
 if(id==='gacha-read-loading'||id==='gacha-read-error'){setSimulationNote('演示原神记录尚未就绪；当前星铁账号继续可用。可从账号菜单选回当前账号取消切换。');seedReadyGame('星穹铁道');S.runtime.switchTarget='g2';S.runtime.switchOrigin='gacha/overview';S.runtime.switchStage='reading';if(id==='gacha-read-error'){S.runtime.games['原神']='error';S.runtime.switchError='read';S.runtime.switchStage='failed';}else{S.nextReadOutcome='hold';ensureGame('原神');}}
 if(id==='gacha-switch-saving'||id==='gacha-switch-save-error'){
  seedReadyGame('星穹铁道');seedReadyGame('原神');S.readPhase='selection';S.nextReadOutcome=id==='gacha-switch-saving'?'hold':'error';S.readTiming='instant';S.runtime.switchTarget='g2';S.runtime.switchOrigin='gacha/overview';saveGachaSelection('g2');setSimulationNote('目标记录已经读取；只有账号选择保存成功后才切换。可跨页浏览原账号，或选回当前账号取消。');
 }
 if(id==='gacha-data-pending-error'){S.readPhase='local';ensureGame('星穹铁道',true,{outcome:'error',delay:0});ensureGame('原神',true,{outcome:'hold'});setSimulationNote('演示一个游戏读取失败，另一个仍在读取。数据页等两者结束后统一列出结果。');}
 if(id==='gacha-session-loading'){S.gacha.source='mihoyo';S.nextReadOutcome='hold';}
 if(id==='legacy-package'){go('plugins',{root:true,replace:true});showOverlay('legacy-package');return true;}
 if(id==='legacy-backup'||id==='future-backup'){beginFlow('import');chooseBackup(id==='legacy-backup'?'legacy':'future');return true;}
 return false;
}
