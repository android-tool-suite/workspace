const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=(name,cls='')=>`<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]||ICONS.plugin}</svg>`;
const btn=(text,action,kind='',ico='',disabled=false,attrs='')=>`<button type="button" class="btn ${kind}" data-action="${esc(action)}" ${disabled?'disabled':''} ${attrs}>${ico?icon(ico):''}${text}</button>`;
const ib=(name,label,action)=>`<button type="button" class="icon-btn" aria-label="${esc(label)}" title="${esc(label)}" data-action="${esc(action)}">${icon(name)}</button>`;
const badge=(text,kind='')=>`<span class="badge ${kind}">${text}</span>`;
const mark=(name,color='')=>`<span class="mark ${color}">${icon(name)}</span>`;
const card=(body,cls='')=>`<section class="card ${cls}">${body}</section>`;
const section=(title,sub='',action='')=>`<div class="section-title"><div><h2>${title}</h2>${sub?`<p>${sub}</p>`:''}</div>${action}</div>`;
const notice=(text,kind='',action='')=>`<div class="notice ${kind}">${icon(kind==='error'||kind==='warn'?'warning':'info')}<div class="grow">${text}${action?`<div>${action}</div>`:''}</div></div>`;
const empty=(title,body,action='',ico='folder')=>`<section class="empty">${mark(ico)}<h2>${title}</h2><p>${body}</p>${action}</section>`;
const row=(ico,title,sub,action,trailing='',color='')=>`<button type="button" class="list-row" data-action="${esc(action)}">${ico?mark(ico,color):''}<span class="grow"><strong>${title}</strong>${sub?`<small>${sub}</small>`:''}</span>${trailing?`<span class="trailing">${trailing}</span>`:icon('chevron','chevron')}</button>`;
const toggle=(title,sub,checked,key,disabled=false)=>`<div class="switch-row"><div class="grow"><strong>${title}</strong>${sub?`<small>${sub}</small>`:''}</div><label class="switch"><input type="checkbox" aria-label="${esc(title)}" data-setting="${esc(key)}" ${checked?'checked':''} ${disabled?'disabled':''}><span></span></label></div>`;
const check=(title,sub,checked,key,disabled=false)=>`<label class="check-row"><input type="checkbox" data-check="${esc(key)}" ${checked?'checked':''} ${disabled?'disabled':''}><span class="grow"><strong>${title}</strong>${sub?`<small>${sub}</small>`:''}</span></label>`;
const search=(id,label,value,placeholder)=>`<div class="search-box">${icon('search')}<input class="input" id="${id}" type="search" aria-label="${esc(label)}" value="${esc(value)}" placeholder="${esc(placeholder||label)}" autocomplete="off"></div>`;
const segment=(items,value,action)=>`<div class="segments" aria-label="选择视图">${items.map(([key,label])=>`<button type="button" class="${value===key?'active':''}" aria-pressed="${value===key}" data-action="${action}:${key}">${label}</button>`).join('')}</div>`;
const chip=(text,active,action)=>`<button type="button" class="chip ${active?'active':''}" aria-pressed="${active}" data-action="${esc(action)}">${text}</button>`;
const ownerName=id=>id==='host'?'Android Tool Suite':PLUGINS[id]?.name||id;
const currentPhi=()=>S.phi.accounts.find(a=>a.id===S.phi.account)||S.phi.accounts[0];
const currentGacha=()=>S.gacha.accounts.find(a=>a.id===S.gacha.account)||S.gacha.accounts[0];
const currentPool=()=>POOLS.find(p=>p.id===S.gacha.pool)||POOLS[0];
const isEmpty=()=>S.condition==='empty';
const runningJobs=()=>S.jobs.filter(j=>j.status==='running');
const hasRunning=owner=>runningJobs().some(j=>j.owner===owner);
const effectiveConnection=()=>S.condition==='offline'||!S.plugins.shizuku.installed||!S.plugins.shizuku.enabled?'offline':S.runtime.system==='ready'?S.connection:S.runtime.system==='error'?'error':'checking';
const permissionGranted=(id,name)=>!(S.condition==='permission'&&({phi:'联网同步',gacha:'查找设备日志',access:'管理无障碍服务'}[id]===name))&&S.plugins[id].permissions[name]!==false;
const clone=value=>JSON.parse(JSON.stringify(value));
let toastTimer,overlayReturnFocus=null,lastRenderedRoute='',dragState=null,longPressTimer=null,suppressClickUntil=0,backgroundRenderPending=false;
const jobTimers=new Map();

function persistPreferences(){try{localStorage.setItem('ats-next-preview-preferences',JSON.stringify({theme:S.theme,size:S.size,zoom:S.zoom}));}catch{}}
function applyPreferences(){
 const dark=S.theme==='dark'||S.theme==='system'&&matchMedia('(prefers-color-scheme: dark)').matches;
 ui.device.dataset.theme=dark?'dark':'light';ui.device.dataset.size=S.size;document.body.classList.toggle('focus-preview',S.focus);
 document.getElementById('theme-choice').value=S.theme;document.getElementById('size-choice').value=S.size;document.getElementById('condition-choice').value=S.condition;document.getElementById('outcome-choice').value=S.outcome;document.getElementById('focus-mode').textContent=S.focus?'显示场景目录':'专注预览';document.body.classList.toggle('show-inspector',!!S.inspector);document.getElementById('inspector-toggle').setAttribute('aria-expanded',String(!!S.inspector));applyViewportProfile();persistPreferences();
}
function toast(text,action='',label='查看'){
 const el=document.getElementById('toast');clearTimeout(toastTimer);el.innerHTML=`<span>${esc(text)}</span>${action?`<button data-action="${esc(action)}">${label}</button>`:''}<button data-action="toast-close" aria-label="关闭提示">${icon('close')}</button>`;el.hidden=false;toastTimer=setTimeout(()=>{el.hidden=true;},6500);
}
function go(route,{replace=false,root=false}={}){
 if(S.route===route&&!replace){render();return;}
 rememberRuntimeView();S.scrolls[S.route]=ui.content.scrollTop;S.sortMode=null;
 const stack=root?[]:replace?S.stack:[...S.stack,S.route];
 S.route=route;S.stack=stack;visitRuntimeRoute(route);if(root&&['home','tools','plugins'].includes(route))S.root=route;S.overlay=null;
 history[replace?'replaceState':'pushState']({atsPreview:true,route,stack:S.stack,root:S.root},'',`#${encodeURIComponent(route)}`);
 render();ui.content.focus({preventScroll:true});
}
function back(){
 if(S.overlay){closeOverlay();return;}
 if(/^data\/(export|import|delete)$/.test(S.route)&&S.flow){if(S.flow.step>0){act('flow-previous');return;}requestFlowExit();return;}
 if(S.route==='gacha/analysis'&&JSON.stringify(S.gacha.analysisDraft)!==JSON.stringify(S.gacha.analysis)){showOverlay('discard-analysis');return;}
 leavePage();
}
function leavePage(){if(S.stack.length)history.back();else if(S.route!==S.root)go(S.root,{replace:true,root:true});else if(S.root!=='home')go('home',{root:true});}
function showOverlay(kind,params={}){overlayReturnFocus=document.activeElement;S.overlay={kind,...params};renderOverlay();}
function closeOverlay(){S.overlay=null;renderOverlay();if(overlayReturnFocus?.isConnected)overlayReturnFocus.focus({preventScroll:true});}
function renderOverlay(){
 const o=S.overlay;ui.product.inert=!!o||S.runtime.startupGate;
 if(!o){ui.overlay.innerHTML='';return;}
 const oldFocus=ui.overlay.contains(document.activeElement)?document.activeElement:null;
 const focusSpec=oldFocus?['id','data-check','data-setting','data-action'].map(attr=>[attr,oldFocus.getAttribute(attr)]).find(([,value])=>value):null;
 const view=modalView(o);
 if(view.menu){
  const x=Math.min(Math.max(12,o.x||20),ui.device.clientWidth-230),y=Math.min(Math.max(40,o.y||150),ui.device.clientHeight-340);
  ui.overlay.innerHTML=`<div class="overlay menu-backdrop" data-dismiss="true"><div class="context-menu" role="dialog" aria-modal="true" aria-label="${esc(view.title)}" style="left:${x}px;top:${y}px">${view.body}</div></div>`;
 }else{
  ui.overlay.innerHTML=`<div class="overlay ${view.sheet?'sheet':''}" ${view.dismissible!==false?'data-dismiss="true"':''}><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">${view.sheet?'<div class="sheet-handle"></div>':''}<div class="row between"><h2 id="modal-title">${view.title}</h2>${ib('close','关闭','modal-close')}</div>${view.body}${view.buttons?`<div class="actions right">${view.buttons}</div>`:''}</section></div>`;
 }
 updateGachaSwitchControls();
 requestAnimationFrame(()=>{const retained=focusSpec?[...ui.overlay.querySelectorAll(`[${focusSpec[0]}]`)].find(el=>el.getAttribute(focusSpec[0])===focusSpec[1]):null;const target=retained||ui.overlay.querySelector('[autofocus]')||ui.overlay.querySelector('button,input,select,[tabindex]');target?.focus({preventScroll:true});});
}
function tabs(items,active,kind){return `<nav class="tabs" role="tablist" aria-label="${kind==='phi'?'Phigros 页面':'抽卡页面'}">${items.map(([id,label])=>`<button type="button" role="tab" aria-selected="${id===active}" tabindex="${id===active?'0':'-1'}" class="${id===active?'active':''}" data-action="${kind}-tab:${id}">${label}</button>`).join('')}</nav>`;}
function header(title,subtitle='',actions='',root=false){return `${root?'':ib('back','返回','back')}<div class="header-copy"><h1>${title}</h1>${subtitle?`<small>${subtitle}</small>`:''}</div>${actions}`;}
function taskButton(){const n=runningJobs().length;return `<button class="icon-btn" aria-label="任务${n?'，'+n+' 项进行中':''}" data-action="go:tasks">${icon('tasks')}${n?`<span class="dot">${n}</span>`:''}</button>`;}
function appBar(title,subtitle='',actions='',root=false){return header(title,subtitle,actions,root);}
function render(){
 if(dragState)endDrag(true,true);
 const same=S.route===lastRenderedRoute,scroll=same?ui.content.scrollTop:(S.scrolls[S.route]||0),active=document.activeElement;
 const focusSpec=same&&active&&ui.content.contains(active)?['id','data-check','data-setting','data-action','data-select'].map(attr=>[attr,active.getAttribute(attr)]).find(([,value])=>value):null;
 const selection=focusSpec&&typeof active.selectionStart==='number'?[active.selectionStart,active.selectionEnd]:null;
 const horizontal=same?{}:(S.runtime.views[S.route]?.horizontal||{});if(same)ui.content.querySelectorAll('[data-scroll-key]').forEach(el=>horizontal[el.dataset.scrollKey]=el.scrollLeft);
 const expanded=same?Object.fromEntries([...ui.content.querySelectorAll('details[data-detail-key]')].map(el=>[el.dataset.detailKey,el.open])):(S.runtime.views[S.route]?.details||{});
 applyPreferences();
 prepareRuntimeRoute(S.route);
 const view=routeView(S.route),owner=ownerForRoute(S.route);
 const runtimeState=view.runtimeState||(pendingForOwner(owner).length?'retained':'ready');
 ui.product.dataset.runtimeOwner=owner||'';ui.product.dataset.contentState=runtimeState;
 if(owner&&runtimeState!=='pending')S.runtime.published[owner]=true;
 if(S.route==='gacha/data'&&runtimeState!=='pending')S.runtime.gachaDataPublished=true;
 if(!view.runtimeState)view.html=retainedReadNotice(S.route)+view.html;
 const root=['home','tools','plugins'].includes(S.route);ui.product.classList.toggle('has-nav',root);
 ui.header.innerHTML=view.header||appBar(view.title||'Android Tool Suite','',taskButton(),root);
 ui.context.innerHTML=view.context||'';ui.content.innerHTML=view.html;ui.footer.innerHTML=view.footer||'';
 ui.nav.hidden=!root;ui.nav.innerHTML=root?['home','tools','plugins'].map((id,i)=>`<button class="nav-item ${S.route===id?'active':''}" aria-current="${S.route===id?'page':'false'}" data-action="root:${id}">${icon(['home','grid','plugin'][i])}<span>${['首页','工具','插件'][i]}</span></button>`).join(''):'';
 ui.content.querySelectorAll('input[data-mixed]').forEach(el=>el.indeterminate=el.dataset.mixed==='true');
 ui.content.scrollTop=scroll;
 ui.content.querySelectorAll('[data-scroll-key]').forEach(el=>{if(horizontal[el.dataset.scrollKey]!=null)el.scrollLeft=horizontal[el.dataset.scrollKey];});
 ui.content.querySelectorAll('details[data-detail-key]').forEach(el=>{if(el.dataset.detailKey in expanded)el.open=expanded[el.dataset.detailKey];});
 lastRenderedRoute=S.route;
 renderStudio();renderOverlay();renderStartupGate();patchReadFeedback();
 if(focusSpec&&!S.overlay){const fresh=[...ui.content.querySelectorAll(`[${focusSpec[0]}]`)].find(el=>el.getAttribute(focusSpec[0])===focusSpec[1]);fresh?.focus({preventScroll:true});if(selection&&fresh?.setSelectionRange)try{fresh.setSelectionRange(...selection);}catch{}}
}
function renderBackground(){refreshRuntimeControls();if(dragState||sortSettling){backgroundRenderPending=true;return;}backgroundRenderPending=false;render();}
function renderStudio(){
 refreshRuntimeControls();
 const term=document.getElementById('scene-search').value.trim(),groups=[...new Set(SCENES.map(s=>s[0]))];
 document.getElementById('scene-nav').innerHTML=groups.map(group=>{const items=SCENES.filter(s=>s[0]===group&&(!term||(s[0]+s[2]).includes(term)));return items.length?`<section class="scene-group"><h2>${group}</h2>${items.map(s=>`<button class="scene-link ${S.scene===s[1]?'active':''}" data-action="scene:${s[1]}">${icon(s[4])}${s[2]}</button>`).join('')}</section>`:'';}).join('')||'<p class="scenes-empty">没有匹配的场景。</p>';
 document.getElementById('compact-scene').innerHTML=groups.map(group=>`<optgroup label="${group}">${SCENES.filter(s=>s[0]===group).map(s=>`<option value="${s[1]}" ${S.scene===s[1]?'selected':''}>${s[2]}</option>`).join('')}</optgroup>`).join('');
 document.getElementById('scene-count').textContent=`${SCENES.length} 个场景`;
 const chosen=SCENES.find(s=>s[1]===S.scene&&s[3]===S.route)||SCENES.find(s=>s[3]===S.route);
 document.getElementById('scene-breadcrumb').textContent=chosen?`${chosen[0]} / ${chosen[2]}`:`交互流程 / ${document.querySelector('#app-header h1')?.textContent||'详情'}`;
 const family=S.route.split('/')[0],note=NOTES[family]||NOTES[['plugin','versions','permissions'].includes(family)?'plugins':['about','licenses'].includes(family)?'settings':'guide'];
 document.getElementById('design-notes').innerHTML=`<h2>${note[0]}</h2><p>${note[1]}</p><ul>${note[2].map(t=>`<li>${t}</li>`).join('')}</ul>`;
 document.getElementById('journeys').innerHTML=[['install','从发现到启用工具'],['backup','导出、取消、继续'],['permission','权限恢复后继续获取'],['trend','从趋势查看具体变化'],['automation','收藏与自动恢复分离']].map(([id,t])=>`<button class="journey" data-action="journey:${id}">${icon('chevron')}<span>${t}</span></button>`).join('');
}
function routeView(route){
 const [family,sub,id]=route.split('/');
 const pendingView=runtimeRouteView(route);if(pendingView)return pendingView;
 if(family==='home')return homeView();if(family==='tools')return toolsView();if(family==='plugins')return pluginsView();if(family==='plugin')return pluginView(sub);if(family==='permissions')return permissionsView(sub);if(family==='versions')return versionsView(sub);
 if(family==='compatibility')return compatibilityView();if(family==='settings')return settingsView();if(family==='about'||family==='licenses')return aboutView(family==='licenses');
 if(family==='data')return sub==='owner'?dataOwnerView(id):sub?flowView():dataCenterView();if(family==='task')return taskView(sub);if(family==='tasks')return tasksView();
 if(family==='phi')return phiView(sub,id);if(family==='gacha')return gachaView(sub,id);if(family==='access')return accessView(sub);if(family==='shizuku')return shizukuView();if(family==='registry')return registryView(sub);if(family==='battery')return batteryView();return guideView();
}
function selectScene(id){
 const scene=SCENES.find(s=>s[1]===id);if(!scene)return;
 resetSceneState();
 S.scene=id;S.condition='normal';S.firstUse=false;S.overlay=null;
 if(id==='first'){S.firstUse=true;Object.values(S.plugins).forEach(p=>{p.installed=false;p.enabled=false;});S.phi.accounts=[];S.gacha.accounts=[];S.connection='offline';}if(id==='empty')S.condition='empty';if(id==='offline')S.condition='offline';if(id==='permission')S.condition='permission';
 if(id==='access-rules')S.accessFilter='automatic';
 if(id==='discover')S.pluginTab='discover';if(id==='plugins')S.pluginTab='installed';
 if(id==='phi-b30')S.phi.scores='b30';if(id==='phi-all')S.phi.scores='all';
 if(['gacha-link','gacha-log','gacha-login','permission'].includes(id))S.gacha.source=id==='gacha-log'||id==='permission'?'log':id==='gacha-login'?'mihoyo':'link';
 if(id.startsWith('shizuku'))S.connection=id==='shizuku-off'?'offline':id==='shizuku-auth'?'unauthorized':'ready';
 if(configureRuntimeScene(id))return;
 if(['export','import','delete'].includes(id)){beginFlow(id);return;}
 if(id.startsWith('task-')){createSampleTask(id.slice(5));return;}
 if(id==='gacha-analysis')S.gacha.analysisDraft=clone(S.gacha.analysis);
 go(scene[3],{root:true,replace:true});
}
function resetSceneState(){
 cancelLocalReads();
 const {theme,size,zoom,focus,outcome,buildFlavor,nextReadOutcome,readPhase,readTiming}=S;
 for(const timer of jobTimers.values())clearTimeout(timer);jobTimers.clear();
 S={...initialState(),theme,size,zoom,focus,outcome,buildFlavor,nextReadOutcome,readPhase,readTiming};lastRenderedRoute='';setSimulationNote('这里模拟页面生命周期；浏览器刷新仍会重置业务样例。');
 history.replaceState({atsPreview:true,route:'home',stack:[],root:'home'},'','#home');
}
function connectionNotice(){if(S.condition==='offline')return notice('当前离线，显示最近保存在本机的数据。','warn',btn('重新连接','condition-normal','text small'));if(S.condition==='permission')return notice('此功能尚未获得允许，本地数据仍可浏览。','warn',btn('查看功能权限',`permission-context:${S.route.startsWith('phi')?'phi':'gacha'}`,'text small'));return '';}
function taskInline(owner){const job=runningJobs().find(j=>!owner||j.owner===owner);return job?`<button class="task-inline" data-action="go:task/${job.id}">${icon('spinner','spinner')}<span class="grow">${esc(job.title)} · ${Math.round(job.progress)}%</span>${icon('chevron')}</button>`:'';}

function beginFlow(kind,owner='all'){
 const items=DATA_ITEMS.filter(item=>(owner==='all'||item.owner===owner)&&(kind!=='delete'||item.owner!=='host'));
 const modes=Object.fromEntries(items.map(item=>[item.id,'skip']));
 const selected=Object.fromEntries(items.map(item=>[item.id,kind==='export'&&!!item.keep]));
 const protection=Object.fromEntries(items.map(item=>[item.id,true]));
 S.flow={kind,owner,items:items.map(i=>i.id),modes,selected,protection,protectionPreset:'all',query:'',source:'all',onlySelected:false,step:0,scrolls:{0:0,1:0},password:'',confirmed:false,file:null,encrypted:false,dirty:false,error:''};
 go(`data/${kind}`);if(kind==='import')showOverlay('file-picker',{purpose:'backup'});
}
const flowItems=()=>DATA_ITEMS.filter(i=>S.flow?.items.includes(i.id));
const flowMode=i=>S.flow.kind==='export'?(S.flow.selected[i.id]?(S.flow.protection[i.id]?'encrypted':'plain'):'skip'):S.flow.modes[i.id];
const selectedFlowItems=()=>flowItems().filter(i=>flowMode(i)!=='skip');
function setExportSelected(id,selected,refresh=true){
 const f=S.flow;f.selected[id]=selected;f.dirty=true;f.error='';
 if(selected){const item=flowItems().find(i=>i.id===id);for(const parent of item?.depends||[])f.selected[parent]=true;}
 else for(const item of flowItems())if(item.depends?.includes(id))f.selected[item.id]=false;
 if(refresh)render();
}
function setFlowMode(id,mode,refresh=true){
 const f=S.flow;f.modes[id]=mode;f.dirty=true;f.confirmed=false;f.error='';
 let changed=true;while(changed){changed=false;
  for(const item of flowItems()){
   if(f.kind==='delete'){
    if(mode==='skip'&&item.id===id){for(const parent of item.depends||[])if(f.modes[parent]==='delete'){f.modes[parent]='skip';changed=true;}}
    if(mode!=='skip'&&f.modes[item.id]==='delete'){for(const child of flowItems().filter(c=>c.depends?.includes(item.id))){if(f.modes[child.id]!=='delete'){f.modes[child.id]='delete';changed=true;}}}
   }else{
    if(mode==='skip'&&f.modes[item.id]!=='skip'&&(item.depends||[]).some(parent=>f.modes[parent]==='skip')){f.modes[item.id]='skip';changed=true;}
    if(mode!=='skip'&&f.modes[item.id]!=='skip'){for(const parent of item.depends||[]){if(parent in f.modes&&f.modes[parent]==='skip'){f.modes[parent]='replace';changed=true;}}}
   }
  }
 }
 if(refresh)render();
}
function flowNeedsPassword(){return S.flow.kind==='export'?selectedFlowItems().some(i=>S.flow.protection[i.id]):S.flow.kind==='import'&&S.flow.encrypted&&selectedFlowItems().some(i=>i.secret);}

function flowCanContinue(){const f=S.flow;if(!selectedFlowItems().length||f.kind==='import'&&!f.file)return false;if(f.step===0)return true;if(f.kind==='delete')return f.confirmed;return !flowNeedsPassword()||f.password.length>=8;}
function requestFlowExit(){if(S.flow&&(S.flow.dirty||S.flow.password||S.flow.confirmed))showOverlay('discard-flow');else{S.flow=null;leavePage();}}
function executeFlow(){
 const f=S.flow;if(!flowCanContinue())return;
 const rows=selectedFlowItems().map(i=>({id:i.id,name:i.title,owner:ownerName(i.owner),mode:flowMode(i)}));
 const label={export:'导出数据包',import:'导入数据包',delete:'删除所选数据'}[f.kind];
 const context={kind:f.kind,owner:f.owner,returnRoute:`data/${f.kind}`,file:f.file||'AndroidToolSuite-示例备份.atsbackup'};
 const job=startTask({title:label,owner:'data',kind:f.kind,rows,context,stages:f.kind==='export'?['准备所选内容','加密与生成数据包','写入保存位置']:f.kind==='import'?['校验文件与密码','准备恢复内容','写入并核对结果']:['核对删除范围','处理所选数据','刷新本机状态']});
 // This is an interaction prototype: the task changes only this in-memory preview.
 job.commit=(done)=>{if(f.kind==='delete'){for(const row of done){if(row.id==='phi-history')S.phi.empty=true;if(row.id==='gacha-hsr')S.gacha.accounts=S.gacha.accounts.filter(a=>a.game!=='星穹铁道');if(row.id==='gacha-gi')S.gacha.accounts=S.gacha.accounts.filter(a=>a.game!=='原神');if(row.id==='access-config')S.services.forEach(service=>{service.favorite=false;service.auto=false;});}}};
 f.password='';
}
function startTask({title,owner,kind='sync',rows=[],context={},stages=['准备任务','处理数据','核对结果'],commit=null,navigate=true}){
 const job={id:`t${S.jobSeq++}`,title,owner,kind,rows:rows.map(r=>({...r,status:'waiting'})),context,stages,status:'running',progress:0,stage:0,outcome:S.condition==='offline'&&kind==='sync'?'failure':S.outcome,error:'',commit,created:'09:42',attempt:1};
 S.outcome='success';S.jobs.unshift(job);if(navigate)go(`task/${job.id}`);else render();tickJob(job);return job;
}
function tickJob(job){
 clearTimeout(jobTimers.get(job.id));
 const advance=()=>{if(job.status!=='running')return;job.progress=Math.min(100,job.progress+13);job.stage=Math.min(job.stages.length-1,Math.floor(job.progress/35));
  if(job.progress>=100){
   const pending=job.rows.filter(r=>r.status!=='done'),partial=job.outcome==='partial'&&pending.length>1;
   if(job.outcome==='failure'||job.outcome==='partial'&&!partial){job.status='failed';job.error=S.condition==='offline'?'网络未连接。已有数据与本次选择均已保留。':'演示：目标暂时不可用，请检查后重试。';pending.forEach(r=>r.status='failed');}
   else if(partial){job.status='partial';job.error='部分对象未完成，重试只处理失败范围。';pending.forEach((r,i)=>r.status=i<pending.length-1?'done':'failed');}
   else{job.status='success';pending.forEach(r=>r.status='done');}
   const done=pending.filter(r=>r.status==='done');if(done.length&&job.commit)job.commit(done,job);
   if(S.route!==`task/${job.id}`)toast(`${job.title}${job.status==='success'?'已完成':'需要处理'}`,`go:task/${job.id}`);
   jobTimers.delete(job.id);renderBackground();return;
  }
  renderBackground();jobTimers.set(job.id,setTimeout(advance,320));
 };jobTimers.set(job.id,setTimeout(advance,320));
}
function retryJob(id){const j=S.jobs.find(j=>j.id===id);if(!j)return;j.status='running';j.progress=0;j.stage=0;j.outcome=S.outcome;j.error='';j.attempt++;S.outcome='success';S.condition='normal';j.rows.filter(r=>r.status!=='done').forEach(r=>r.status='waiting');go(`task/${id}`,{replace:true});tickJob(j);}
function createSampleTask(status){
 clearTimeout(jobTimers.get('sample'));jobTimers.delete('sample');
 const job={id:'sample',title:'导入数据包',owner:'data',kind:'import',created:'09:42',rows:[{id:'a',name:'应用设置',owner:'Android Tool Suite',status:'done'},{id:'b',name:'成绩与变化历史',owner:'Phigros Data Studio',status:'done'},{id:'c',name:'原神记录',owner:'跃迁与祈愿分析',status:status==='success'?'done':'failed'}],context:{returnRoute:'data'},stages:['校验文件','恢复所选内容','核对结果'],status:status==='failed'?'failed':status,progress:100,stage:2,outcome:'success',attempt:1,error:status==='partial'?'2 个对象已完成，1 个对象尚未恢复。':status==='failed'?'演示：数据包密码校验失败，本机数据未改变。':'',commit:null};
 if(status==='failed')job.rows.forEach(r=>r.status='failed');if(status==='running'){job.progress=13;job.stage=0;job.rows.forEach(r=>r.status='waiting');}
 S.jobs=S.jobs.filter(j=>j.id!=='sample');S.jobs.unshift(job);go('task/sample',{root:true});S.root='home';if(status==='running')tickJob(job);
}
