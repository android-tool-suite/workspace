function showPlugin(id){if(!S.plugins[id]?.installed||!S.plugins[id].enabled){go(`plugin/${id}`);return;}go(pluginEntryRoute(id));}
function switchGacha(id){requestGachaSwitch(id);}
function syncPhi(){
 S.overlay=null;const account=currentPhi();if(!account||!account.logged){S.phi.reloginId=account?.id;go('phi/login');return;}
 if(!permissionGranted('phi','联网同步')){S.returnTo=S.route;go('permissions/phi');return;}
 if(hasRunning('phi')){go(`task/${runningJobs().find(j=>j.owner==='phi').id}`);return;}
 if(S.runtime.phiSecret==='loading')return;
 const id=account.id,origin=S.route;S.runtime.phiSecret='loading';
 queueLocalRead('phi',`phi-credential:${id}`,()=>{
  if(S.phi.account!==id||!S.phi.accounts.find(a=>a.id===id)?.logged)return;S.runtime.phiSecret='ready';
  startTask({title:'同步 Phigros 云存档',owner:'phi',kind:'sync',rows:[{id,name:account.name,owner:account.server}],stages:['连接并读取云存档','解析成绩与计算 RKS','保存快照和变化历史'],navigate:S.route===origin,context:{target:'phi/overview',targetLabel:'查看成绩'},commit:()=>{const a=S.phi.accounts.find(a=>a.id===id);if(a){a.hasData=true;commitPhiSync(id);}S.phi.empty=false;S.condition='normal';}});
 },()=>{if(S.phi.account===id)S.runtime.phiSecret='error';});render();
}
function fetchGacha(mode='incremental'){
 if(hasRunning('gacha')){go(`task/${runningJobs().find(j=>j.owner==='gacha').id}`);return;}
 if(!permissionGranted('gacha','联网获取记录')){S.returnTo='gacha/acquire';go('permissions/gacha');return;}
 if(!S.gacha.linkReady&&!S.gacha.draft.trim()){toast('先填入链接，或从其他来源取得链接。');return;}
 if(S.gacha.draft.trim()&&!/^https?:\/\//i.test(S.gacha.draft.trim())){toast('请输入以 https:// 开头的演示链接。');return;}
 let a=gachaAcquireAccount();
 if(S.gacha.newAccount||!a){a={id:'g4',game:'星穹铁道',uid:'100000004',name:'新获取的账号',count:186};}
 const account={...a},isNew=!S.gacha.accounts.some(v=>v.id===account.id);S.gacha.linkReady=true;S.gacha.draft='';
 startTask({title:mode==='full'?'完整刷新抽卡记录':'获取新的抽卡记录',owner:'gacha',kind:'sync',rows:POOLS.map(p=>({id:p.id,name:p.label,owner:`${account.game} · ${account.uid}`})),stages:['读取各卡池可见历史','去重并合并本地记录','保存结果与重新分析'],context:{target:'gacha/records',targetLabel:'查看新增记录'},commit:done=>{
  if(isNew&&!S.gacha.accounts.some(v=>v.id===account.id))S.gacha.accounts.push(account);
  S.gacha.recordSets??={};const all=S.gacha.recordSets[account.id]??=makeGachaRecords(account);
  for(const row of done){for(let i=0;i<3;i++)all.unshift({id:`${account.id}-new-${row.id}-${all.length}`,name:['示例新记录 A','示例新记录 B','示例新记录 C'][i],rarity:i===0?4:3,pool:row.id,date:'2026-09-18 09:42',pity:4+i,up:null});}
  S.runtime.games[account.game]='ready';S.gacha.account=account.id;S.gacha.newAccount=false;S.gacha.lastSync='新增 '+done.length*3+' 条';S.gacha.filterPool='all';S.gacha.rarity=0;S.gacha.query='';S.condition='normal';
 }});
}
function installPlugin(id,version){
 closeOverlay();const p=PLUGINS[id],wasInstalled=S.plugins[id].installed;
 startTask({title:`${wasInstalled?'更新':'安装'} ${p.short}`,owner:'plugins',kind:'install',rows:[{id,name:p.name,owner:'插件安装包'}],stages:['读取并核验插件包','检查兼容性与版本','完成安装'],context:{target:`plugin/${id}`,targetLabel:wasInstalled?'查看插件':'查看权限并启用'},commit:()=>{
  releasePluginPage(id);if(id==='phi')S.phi.targetCaches={};const v=S.plugins[id];v.installed=true;v.version=version||p.version;v.update=!!p.next&&v.version!==p.next;
  if(!wasInstalled){v.enabled=false;v.permissions=Object.fromEntries(p.permission.map(name=>[name,false]));if(!S.toolOrder.includes(id))S.toolOrder.push(id);}
  S.firstUse=false;
 }});
}
function exportUigfTask(){if(!gachaSelectionReady('export'))return;const accounts=S.gacha.accounts.filter(a=>S.gacha.exportIds.includes(a.id));if(!accounts.length)return;startTask({title:'导出 UIGF 记录',owner:'gacha',kind:'export',rows:accounts.map(a=>({id:a.id,name:`${a.game} · ${a.uid}`,owner:gachaRecordsFor(a).length+' 条记录'})),context:{target:'gacha/data',targetLabel:'返回记录数据'},stages:['汇总所选账号记录','生成 UIGF v4.2 文件','写入保存位置']});}
function importUigfTask(){if(!gachaSelectionReady('import'))return;const ids=[...S.gacha.importIds];if(!ids.length)return;startTask({title:'导入 UIGF 记录',owner:'gacha',kind:'import',rows:ids.map(id=>({id,name:id==='g1'?'星穹铁道 · 100000001':'原神 · 100000002',owner:id==='g1'?'新增 12 条 · 重复 28 条':'新增 8 条 · 重复 20 条'})),context:{target:'gacha/data',targetLabel:'查看本地记录'},stages:['检查文件格式和账号','合并新增记录，跳过重复项','保存所选账号'],commit:done=>{for(const row of done){let a=S.gacha.accounts.find(a=>a.id===row.id);if(!a){a={id:row.id,game:row.id==='g1'?'星穹铁道':'原神',uid:row.id==='g1'?'100000001':'100000002',name:'导入的档案',count:row.id==='g1'?848:520};S.gacha.accounts.push(a);}S.gacha.recordSets??={};const records=S.gacha.recordSets[a.id]??=makeGachaRecords(a);for(let n=0;n<(a.id==='g1'?12:8);n++){const id=`${a.id}-import-${n}`;if(!records.some(r=>r.id===id))records.unshift({id,name:'导入的示例记录 '+(n+1),rarity:n===0?5:3,pool:'character',date:'2026-09-18 09:40',pity:18+n,up:n===0?true:null});}S.runtime.games[a.game]='ready';}S.condition='normal';}});}
function changeService(id,enabled,pauseRule=false){
 const s=S.services.find(s=>s.id===id);if(!s)return;
 if(runningJobs().some(j=>j.context.service===id)){toast('这项服务正在处理。');return;}
 startTask({title:(enabled?'启用':'停用')+' '+s.app,owner:'access',kind:'service',rows:[{id,name:s.name,owner:s.app}],stages:['确认当前连接','修改服务状态','重新读取结果'],context:{service:id,target:'access/services',targetLabel:'查看服务'},navigate:false,commit:()=>{s.enabled=enabled;if(pauseRule)s.auto=false;}});
}
function chooseBackup(type){
 const f=S.flow;if(!f)return;closeOverlay();
 f.query='';f.source='all';f.onlySelected=false;f.password='';f.confirmed=false;f.step=0;f.compatibility=null;f.encrypted=false;f.error='';f.dirty=false;
 if(type==='broken'||type==='future'){f.file=null;f.items=[];f.modes={};f.error=type==='future'?'这份备份使用未知的格式版本 99，当前应用无法安全读取。未恢复任何内容。':'无法读取这份示例文件，尚未恢复任何内容。';render();return;}
 if(type==='legacy'){f.compatibility='legacy';f.file='旧版迁移示例.zip';f.items=f.owner==='all'||f.owner==='host'?['host-settings']:[];f.modes=Object.fromEntries(f.items.map(id=>[id,'merge']));render();return;}
 const items=DATA_ITEMS.filter(i=>(f.owner==='all'||i.owner===f.owner)&&(type==='complete'||!i.secret&&!i.cache&&i.id!=='packages'));
 f.file=type==='complete'?'完整迁移.atsbackup':'日常备份.atsbackup';f.encrypted=type==='complete';f.items=items.map(i=>i.id);f.modes=Object.fromEntries(items.map(i=>[i.id,i.merge?'merge':'skip']));render();
}

function setPreset(mode){
 const f=S.flow;if(!f||f.kind!=='export')return;
 for(const i of flowItems())f.selected[i.id]=mode==='complete'||mode==='daily'&&!!i.keep;
 f.dirty=true;f.confirmed=false;render();
}

function moveTile(group,id,delta,first=false){nudgeSort(group,id,delta,first);}
function startJourney(id){
 resetSceneState();
 S.condition='normal';S.outcome='success';S.overlay=null;
 if(id==='install'){S.pluginTab='discover';S.plugins.battery.installed=false;S.plugins.battery.enabled=false;S.scene='discover';go('plugins',{root:true});}
 if(id==='backup'){S.scene='export';beginFlow('export');}
 if(id==='permission'){S.gacha.source='log';S.connection='unauthorized';S.plugins.gacha.permissions['查找设备日志']=false;S.returnTo=null;S.scene='gacha-log';go('gacha/acquire',{root:true});S.root='home';}
 if(id==='trend'){S.scene='phi';S.phi.days=30;go('phi/overview',{root:true});S.root='home';}
 if(id==='automation'){S.scene='access';S.connection='ready';S.plugins.access.permissions['管理无障碍服务']=true;go('access/services',{root:true});S.root='home';}
}
let demoImageUrl=null;
function downloadDemoImage(){
 if(!phiTargetsReady()){toast('推分结果准备完成后即可保存图片。');return;}
 const profile=S.phi.image==='profile';
 const groups=profile?[{label:'最佳成绩',rows:SONGS.slice(0,8)}]:[{label:'P3',rows:SONGS.slice(0,3).map(s=>({...s,acc:100,score:1000000}))},{label:'B27',rows:SONGS.slice(3,30)}];
 let cursor=profile?360:140,body='';
 if(profile){body+=`<text x="40" y="145" font-size="18">课题模式 3 / 48 · Data 1.24 GiB</text><text x="40" y="185" font-size="17">难度</text><text x="235" y="185" font-size="17">Clear</text><text x="435" y="185" font-size="17">FC</text><text x="635" y="185" font-size="17">AP</text>`;
  [['EZ',68,61,43],['HD',72,64,38],['IN',153,124,64],['AT',33,21,7]].forEach((row,i)=>{[40,235,435,635].forEach((x,j)=>body+=`<text x="${x}" y="${219+i*31}" font-size="17" fill="#bfd6c6">${row[j]}</text>`);});
 }
 for(const group of groups){body+=`<text x="40" y="${cursor}" font-size="22">${group.label}</text>`;cursor+=18;
  body+=group.rows.map((s,i)=>{const x=40+i%2*480,y=cursor+Math.floor(i/2)*126;return `<rect x="${x}" y="${y}" width="450" height="114" rx="10" fill="#244232"/><text x="${x+14}" y="${y+28}" font-size="17">${i+1}. ${esc(s.name.slice(0,38))}</text><text x="${x+14}" y="${y+54}" font-size="15" fill="#bfd6c6">${s.level} ${s.constant.toFixed(1)} · ${s.acc.toFixed(4)}%</text><text x="${x+14}" y="${y+77}" font-size="15" fill="#bfd6c6">${s.rks.toFixed(4)} RKS · ${s.score}</text><text x="${x+14}" y="${y+99}" font-size="14" fill="#bfd6c6">推分 ACC · ${phiTargetLabel(s)}</text>`;}).join('');
  cursor+=Math.ceil(group.rows.length/2)*126+34;
 }
 const height=cursor+40;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="${height}" viewBox="0 0 1000 ${height}"><rect width="1000" height="${height}" fill="#162f24"/><g font-family="sans-serif" fill="#e6f2e8"><text x="40" y="55" font-size="28">${esc(currentPhi()?.name||'示例玩家')} · Phigros</text><text x="40" y="98" font-size="24">${phiRks().toFixed(4)} RKS · ${profile?'个人信息图':'B30 / P3 + B27'}</text>${body}<text x="500" y="${height-19}" font-size="14" text-anchor="middle" fill="#a3bfac">UI PREVIEW — 示例数据 — NOT A REAL SAVE</text></g></svg>`;
 if(demoImageUrl)URL.revokeObjectURL(demoImageUrl);
 demoImageUrl=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
 showOverlay('image-save',{url:demoImageUrl});
}

function act(action,element){
 const [name,a,b,c]=action.split(':');
 if(gachaSelectionPending()&&GACHA_WRITES.has(name)){toast('完成或取消账号切换后，再执行此操作。');return;}
 switch(name){
  case 'go':if(a==='gacha/analysis')S.gacha.analysisDraft=clone(S.gacha.analysis);go(a);break;
  case 'root':go(a,{root:true});break;
  case 'back':back();break;
  case 'scene':selectScene(a);break;
  case 'finish-local-reads':finishHeldReads();break;
  case 'simulate-cold-start':simulateColdStart();break;
  case 'simulate-release':simulateRelease();break;
  case 'refresh-local':refreshCurrentLocal();break;
  case 'web-read-retry':ensureWebTool(a,true);render();break;
  case 'system-read-retry':readSystemStatus(true);render();break;
  case 'phi-read-retry':ensurePhiData(a,true);render();break;
  case 'phi-push-retry':ensurePhiTargets(true);refreshPhiTargets();break;
  case 'phi-push-save':if(phiTargetsReady()){S.phi.targetCaches[S.phi.account]=S.runtime.phiPush.targets;S.runtime.phiPush.warning=false;refreshPhiTargets();toast('推分缓存已保存');}break;
  case 'game-retry':ensureGame(a,true);S.runtime.switchError=null;render();break;
  case 'gacha-switch-cancel':cancelGachaSwitch();render();break;
  case 'mihoyo-session-retry':ensureMihoyoSession(true);render();break;
  case 'local-debug-help':showOverlay('message',{title:'本地 Debug 构建',message:'此构建仅供本机开发和 ADB 调试，不从远端下载应用更新。正式安装包请在发布中心获取。插件仍可从正式目录检查更新。'});break;
  case 'check-app-update':if(S.buildFlavor==='local-debug')return;startTask({title:'检查应用更新',owner:'host',kind:'check',rows:[{id:'app-release',name:'Android Tool Suite',owner:'正式版本'}],stages:['读取正式发布信息','核对当前应用版本'],context:{target:'settings',targetLabel:'返回应用设置'},commit:()=>S.appUpdateChecked=true});break;
  case 'journey':startJourney(a);break;
 case 'guide':go('guide');break;
 case 'inspector-close':S.inspector=false;applyPreferences();break;
  case 'open':showPlugin(a);break;
  case 'modal-close':closeOverlay();render();break;
  case 'sort-mode':S.sortMode=S.sortMode===a?null:a;render();break;
  case 'sort-undo':undoSort();break;
  case 'toast-close':document.getElementById('toast').hidden=true;break;
  case 'add-widget':showOverlay('add-widget');break;
  case 'widget-add':if(!S.homeOrder.includes(a))S.homeOrder.push(a);S.hiddenWidgets=S.hiddenWidgets.filter(id=>id!==a);closeOverlay();render();toast('已添加到首页');break;
  case 'tile-size':S.wideTiles=S.wideTiles.includes(a)?S.wideTiles.filter(id=>id!==a):[...S.wideTiles,a];closeOverlay();render();break;
  case 'tile-move':moveTile(a,b,Number(c));break;
  case 'tile-first':moveTile(a,b,0,true);break;
  case 'tile-hide':if(a==='home')S.hiddenWidgets.push(b);else S.hiddenTools.push(b);closeOverlay();render();toast(a==='home'?'已从首页移除，工具仍然可用':'已隐藏入口，插件仍在运行',a==='home'?'add-widget':'restore-tools','恢复');break;
  case 'restore-tools':S.hiddenTools=[];render();toast('工具入口已恢复');break;
  case 'clear-tool-query':S.toolQuery='';render();break;
  case 'clear-plugin-query':S.pluginQuery='';render();break;
  case 'discover':S.firstUse=false;S.pluginTab='discover';go('plugins',{root:true});break;
  case 'plugins-tab':S.pluginTab=a;render();break;
  case 'plugin-more':showOverlay('plugin-more',{id:a});break;
  case 'plugin-data':go(`data/owner/${a}`);break;
  case 'install':showOverlay('install-confirm',{id:a});break;
  case 'local-package':showOverlay('package-picker');break;
  case 'local-package-select':showOverlay('install-confirm',{id:a,local:true});break;
  case 'local-package-legacy':showOverlay('legacy-package');break;
  case 'local-package-invalid':showOverlay('package-invalid');break;
  case 'install-confirmed':installPlugin(a,b);break;
  case 'version-install':if(S.plugins[a].installed&&b<S.plugins[a].version)showOverlay('downgrade',{id:a,version:b});else showOverlay('install-confirm',{id:a,version:b});break;
  case 'enable-review':showOverlay('enable-review',{id:a});break;
  case 'enable-confirmed':if(a==='shizuku'&&!S.overlay?.ack)return;S.plugins[a].enabled=true;closeOverlay();showPlugin(a);toast('插件已启用');break;
  case 'uninstall':showOverlay('uninstall',{id:a});break;
  case 'uninstall-confirmed':{
   const clear=!!S.overlay?.clear,p=PLUGINS[a];closeOverlay();startTask({title:'移除 '+p.short,owner:'plugins',kind:'delete',rows:[{id:a,name:p.name,owner:'插件包'},...(clear?[{id:a+'-data',name:'业务数据与凭据',owner:p.name}]:[])],context:{target:'plugins',targetLabel:'查看插件列表'},stages:['核对影响范围','移除所选内容','更新插件列表'],commit:done=>{if(done.some(r=>r.id===a)){releasePluginPage(a);S.plugins[a].installed=false;S.plugins[a].enabled=false;}if(clear&&done.some(r=>r.id===a+'-data')){if(a==='phi'){S.phi.accounts=[];S.phi.empty=true;}if(a==='gacha')S.gacha.accounts=[];if(a==='access')S.services.forEach(s=>{s.auto=false;s.favorite=false;});}}});break;
  }
  case 'export-package':showOverlay('save-location',{purpose:'package',id:a});break;
  case 'updates':showOverlay('updates');break;
  case 'check-updates':startTask({title:'检查插件更新',owner:'plugins',kind:'check',rows:Object.keys(PLUGINS).filter(id=>S.plugins[id].installed&&S.plugins[id].checkUpdates).map(id=>({id,name:PLUGINS[id].name})),context:{target:'plugins',targetLabel:'查看插件状态'},stages:['读取发布目录','核对已安装版本','整理可用更新']});break;
  case 'update-all':{const ids=Object.keys(PLUGINS).filter(id=>S.plugins[id].installed&&S.plugins[id].update&&S.plugins[id].checkUpdates);closeOverlay();startTask({title:'更新所选插件',owner:'plugins',kind:'install',rows:ids.map(id=>({id,name:PLUGINS[id].name})),context:{target:'plugins',targetLabel:'查看更新结果'},commit:done=>done.forEach(r=>{releasePluginPage(r.id);if(r.id==='phi')S.phi.targetCaches={};S.plugins[r.id].version=PLUGINS[r.id].next;S.plugins[r.id].update=false;}),stages:['下载并核验安装包','检查兼容性','更新所选插件']});break;}
  case 'flow':beginFlow(a,b||'all');break;
  case 'flow-mode':setFlowMode(a,b);break;
  case 'flow-source':S.flow.source=a;render();break;
  case 'flow-selected-only':S.flow.onlySelected=!S.flow.onlySelected;render();break;
  case 'flow-clear-filters':S.flow.query='';S.flow.source='all';S.flow.onlySelected=false;render();break;
  case 'flow-visible':changeFlowSelection(flowVisibleItems().map(i=>i.id),a==='all');break;
  case 'flow-cache-only':for(const i of flowItems())S.flow.modes[i.id]='skip';changeFlowSelection(flowItems().filter(i=>i.cache).map(i=>i.id),true);break;
  case 'flow-preset':setPreset(a);break;
  case 'flow-protection-preset':if(!S.flow||S.flow.kind!=='export'||!['sensitive','all','none'].includes(a))return;for(const i of flowItems())S.flow.protection[i.id]=a==='all'||a==='sensitive'&&!!i.secret;S.flow.protectionPreset=a;S.flow.dirty=true;render();break;
  case 'flow-next':if(!flowCanContinue())return;if(S.flow.step===0){S.flow.scrolls[0]=ui.content.scrollTop;S.flow.step=1;render();ui.content.scrollTop=S.flow.scrolls[1]||0;}else if(S.flow.kind==='export')showOverlay('save-location',{purpose:'flow'});else executeFlow();break;
  case 'flow-previous':S.flow.scrolls[1]=ui.content.scrollTop;S.flow.step=0;S.flow.confirmed=false;render();ui.content.scrollTop=S.flow.scrolls[0]||0;break;
  case 'flow-exit':requestFlowExit();break;
  case 'flow-discard':S.flow=null;closeOverlay();leavePage();break;
  case 'choose-backup':showOverlay('file-picker',{purpose:'backup'});break;
  case 'pick-backup':chooseBackup(a);break;
  case 'location-save':{const o={...S.overlay};closeOverlay();if(o.purpose==='flow')executeFlow();else if(o.purpose==='uigf')exportUigfTask();else if(o.purpose==='package')startTask({title:'导出 '+PLUGINS[o.id].short+' 插件包',owner:'plugins',kind:'export',rows:[{id:o.id,name:PLUGINS[o.id].name,owner:'安装包'}],context:{target:`plugin/${o.id}`,targetLabel:'返回插件详情'}});break;}
  case 'task-retry':retryJob(a);break;
  case 'task-edit':{const j=S.jobs.find(j=>j.id===a);go(j?.context?.returnRoute&&S.flow?j.context.returnRoute:j?.owner==='gacha'?'gacha/acquire':j?.owner==='phi'?'phi/overview':'data');break;}
  case 'task-cancel':{const j=S.jobs.find(j=>j.id===a);if(j?.status==='running'){j.status='cancelled';clearTimeout(jobTimers.get(a));jobTimers.delete(a);j.rows.filter(r=>r.status!=='done').forEach(r=>r.status='cancelled');render();}break;}
  case 'condition-normal':S.condition='normal';render();toast('已恢复标准数据与连接场景');break;
  case 'theme-menu':showOverlay('theme');break;
  case 'theme':S.theme=a;closeOverlay();render();break;
  case 'copy-version':showOverlay('message',{title:'版本信息',message:'Android Tool Suite · Design Exploration 06 · Standalone HTML Preview。可直接选中此段文字复制。'});break;
  case 'permission-context':S.returnTo=S.route;go(`permissions/${a}`);break;
  case 'return-task':{const route=S.returnTo||'gacha/acquire';S.returnTo=null;go(route,{replace:true});break;}
  case 'phi-tab':go(`phi/${a}`,{replace:true});break;
  case 'phi-account-picker':showOverlay('phi-picker');break;
  case 'phi-account':switchPhiProfile(a);break;
  case 'phi-account-menu':showOverlay('phi-account-menu',{account:a});break;
  case 'phi-rename':showOverlay('phi-rename',{account:a,value:S.phi.accounts.find(p=>p.id===a)?.name});break;
  case 'phi-rename-save':{const o=S.overlay,v=document.getElementById('modal-rename')?.value.trim();if(!v){o.error='请输入备注名称。';renderOverlay();return;}const account=S.phi.accounts.find(p=>p.id===o.account);if(account)account.name=v;closeOverlay();render();toast('备注已保存');break;}
  case 'phi-logout':showOverlay('phi-logout',{account:a});break;
  case 'phi-logout-confirmed':{const account=S.phi.accounts.find(p=>p.id===S.overlay.account);if(account){account.logged=false;cancelLocalRead(`phi-credential:${account.id}`);S.runtime.phiSecret='idle';}closeOverlay();render();toast('登录状态已移除，本地历史继续保留');break;}
  case 'phi-relogin':switchPhiProfile(a);S.phi.reloginId=a;go('phi/login');break;
  case 'phi-delete-account':showOverlay('phi-delete',{account:a});break;
  case 'phi-delete-confirmed':{const id=S.overlay.account;S.phi.accounts=S.phi.accounts.filter(p=>p.id!==id);delete S.phi.targetCaches[id];cancelLocalRead(`phi-targets:${id}`);cancelLocalRead(`phi-credential:${id}`);if(S.phi.account===id){cancelLocalRead('phi-analysis');S.phi.account=S.phi.accounts[0]?.id;S.runtime.phiPages.analysis='idle';S.runtime.phiAvailable.analysis=false;S.runtime.phiSecret='idle';S.runtime.phiPush={status:'idle',profile:null,targets:null};}closeOverlay();render();break;}
  case 'phi-sync':syncPhi();break;
  case 'phi-scores':S.phi.scores=a;render();break;
  case 'phi-level':S.phi.levels=S.phi.levels.includes(a)?S.phi.levels.filter(v=>v!==a):[...S.phi.levels,a];render();break;
  case 'phi-reset-filters':Object.assign(S.phi,{query:'',levels:['EZ','HD','IN','AT'],constantMin:'',constantMax:'',grades:[],fc:'any',ap:'any'});render();break;
  case 'phi-grade':S.phi.grades=a==='any'?[]:S.phi.grades.includes(a)?S.phi.grades.filter(g=>g!==a):[...S.phi.grades,a];render();break;
  case 'phi-completion':S.phi[a]=b;render();break;
  case 'phi-stat':Object.assign(S.phi,{scores:'all',levels:[a],query:'',constantMin:'',constantMax:'',grades:[],fc:b==='FC'?'yes':'any',ap:b==='AP'?'yes':'any'});go('phi/scores',{replace:true});break;
  case 'phi-range':S.phi.days=Number(a);S.phi.point=null;render();break;
  case 'phi-point':S.phi.point=a;render();break;
  case 'phi-song-history':go('phi/event/h18');break;
  case 'catalog-level':S.phi.catalogLevels=S.phi.catalogLevels.includes(a)?S.phi.catalogLevels.filter(v=>v!==a):[...S.phi.catalogLevels,a];render();break;
  case 'catalog-reset':Object.assign(S.phi,{catalogQuery:'',catalogLevels:['IN','AT'],catalogMin:'',catalogMax:''});render();break;
  case 'catalog-band':S.phi.catalogMin=a;S.phi.catalogMax=a===''?'':(Number(a)+.9).toFixed(1);render();break;
  case 'catalog-update':{startTask({title:'更新定数表',owner:'phi',kind:'sync',rows:[{id:'catalog',name:'定数表',owner:'Phigros'}],stages:['读取发布的定数信息','检查曲目与难度数据','保存本地定数表'],context:{target:'phi/catalog',targetLabel:'查看定数表'},commit:()=>{S.phi.catalogUpdated=true;}});break;}
  case 'phi-image':S.phi.image=a;go('phi/image');break;
  case 'phi-image-kind':S.phi.image=a;render();break;
  case 'save-demo-image':downloadDemoImage();break;
  case 'phi-login-method':S.phi.login=a;render();break;
  case 'phi-login-start':S.phi.loginStage='waiting';render();break;
  case 'phi-login-cancel':S.phi.loginStage='choice';render();break;
  case 'phi-authorize-demo':showOverlay('taptap-demo');break;
  case 'phi-login-complete':{
   const existing=S.phi.accounts.find(a=>a.id===S.phi.reloginId),name=document.getElementById('modal-login-name')?.value.trim()||S.phi.loginName.trim()||'新的旅程';
   if(existing){existing.logged=true;S.phi.account=existing.id;}else{const id=`p${Date.now()}`;S.phi.accounts.push({id,name,server:S.phi.server,logged:true,hasData:false});S.phi.account=id;}
   switchPhiProfile(S.phi.account);S.phi.reloginId=null;S.phi.loginStage='choice';S.phi.loginName='';S.phi.empty=false;closeOverlay();go('phi/overview',{replace:true});toast('示例登录已完成，可同步云存档');break;
  }
  case 'gacha-tab':go('gacha/'+a,{replace:true});break;
  case 'gacha-account-picker':showOverlay('gacha-picker');break;
  case 'gacha-account':switchGacha(a);break;
  case 'gacha-pool-open':S.gacha.pool=a;S.gacha.detailFilter='all';go(`gacha/pool/${a}`);break;
  case 'gacha-detail-filter':S.gacha.detailFilter=a;render();break;
  case 'gacha-month':S.gacha.filterPool='all';S.gacha.rarity=0;S.gacha.page=0;S.gacha.query=a;go('gacha/records');break;

  case 'gacha-filter-link':S.gacha.filterPool=a;S.gacha.rarity=Number(b);S.gacha.page=0;S.gacha.query='';go('gacha/records');break;
  case 'gacha-filter':S.gacha.filterPool=a;S.gacha.page=0;render();break;
  case 'gacha-rarity':S.gacha.rarity=Number(a);S.gacha.page=0;render();break;
  case 'gacha-page':S.gacha.page+=a==='next'?1:-1;ui.content.scrollTop=0;render();break;
  case 'gacha-reset-filters':S.gacha.filterPool='all';S.gacha.rarity=0;S.gacha.query='';S.gacha.page=0;render();break;
  case 'gacha-record':showOverlay('gacha-record',{record:a});break;
  case 'gacha-record-pool':S.gacha.pool=a;S.gacha.detailFilter='all';go(`gacha/pool/${a}`);break;
  case 'gacha-source':S.gacha.source=a;render();break;
  case 'gacha-example-link':S.gacha.linkAccount=null;S.gacha.draft='https://example.invalid/gacha?demo=1';S.gacha.linkReady=false;render();break;
  case 'gacha-clear-link':S.gacha.linkAccount=null;S.gacha.draft='';S.gacha.linkReady=false;render();break;
  case 'gacha-link-info':showOverlay('link-info');break;
  case 'gacha-new-account':S.gacha.linkAccount=null;S.gacha.newAccount=true;S.gacha.linkReady=false;S.gacha.draft='';S.gacha.source='link';go('gacha/acquire');toast('下一次获取将演示建立另一个账号档案');break;
  case 'gacha-fetch':fetchGacha(a);break;
  case 'gacha-find-link':if(effectiveConnection()!=='ready'){S.returnTo='gacha/acquire';go('shizuku');return;}startTask({title:'查找记录链接',owner:'gacha',kind:'lookup',rows:[{id:'log',name:S.gacha.logRange,owner:currentGacha()?.game||'星穹铁道'}],stages:['检查连接与允许范围','查找示例记录链接','核对来源'],context:{target:'gacha/acquire',targetLabel:'继续获取记录'},commit:()=>{S.gacha.source='link';S.gacha.linkReady=true;S.gacha.draft='';}});break;
  case 'gacha-login-start':S.gacha.qr=true;render();break;
  case 'gacha-login-cancel':S.gacha.qr=false;render();break;
  case 'gacha-login-complete':S.gacha.qr=false;S.gacha.login=true;render();toast('示例登录成功，请选择游戏角色');break;
  case 'gacha-role-link':if(!S.gacha.accounts.some(a=>a.id==='g2'))S.gacha.accounts.push({id:'g2',game:'原神',uid:'100000002',name:'旅行者',count:520});S.gacha.linkAccount='g2';S.gacha.source='link';S.gacha.linkReady=true;S.gacha.draft='';render();toast('角色链接已准备好');break;
  case 'gacha-logout':showOverlay('gacha-logout');break;
  case 'gacha-logout-confirmed':S.gacha.login=false;S.gacha.qr=false;closeOverlay();render();toast('已退出示例登录，记录保留');break;
  case 'gacha-import-pick':showOverlay('file-picker',{purpose:'uigf'});break;
  case 'pick-uigf':S.gacha.importIds=['g1','g2'];go('gacha/import');break;
  case 'uigf-confirm':importUigfTask();break;
  case 'gacha-export-start':S.gacha.exportIds=currentGacha()?[currentGacha().id]:[];go('gacha/export');break;
  case 'gacha-export-one':S.gacha.exportIds=[a];go('gacha/export');break;
  case 'uigf-save-location':if(!gachaSelectionReady('export'))return;showOverlay('save-location',{purpose:'uigf'});break;
  case 'gacha-account-actions':showOverlay('gacha-account-actions',{account:a});break;
  case 'gacha-delete':showOverlay('gacha-delete',{account:a});break;
  case 'gacha-delete-confirmed':{const id=S.overlay.account,account=S.gacha.accounts.find(a=>a.id===id);closeOverlay();startTask({title:'删除账号记录',owner:'gacha',kind:'delete',rows:[{id,name:`${account.game} · ${account.uid}`,owner:accountReadLabel(account)}],context:{target:'gacha/data',targetLabel:'查看剩余账号'},stages:['核对账号范围','删除所选记录','更新本地账号列表'],commit:()=>{S.gacha.accounts=S.gacha.accounts.filter(a=>a.id!==id);delete S.gacha.recordSets?.[id];delete S.gacha.analysisByAccount?.[id];if(S.runtime.switchTarget===id)cancelGachaSwitch();if(S.gacha.account===id)S.gacha.account=S.gacha.accounts[0]?.id;}});break;}
  case 'analysis-save':{const account=S.gacha.account,draft=clone(S.gacha.analysisDraft);startTask({title:'应用分析设置',owner:'gacha',kind:'analyze',rows:[{id:account,name:currentGacha()?.uid||'当前账号',owner:'分析设置'}],context:{target:'gacha/overview',targetLabel:'查看分析结果'},stages:['保存所选依据','重新识别 UP 归属','刷新统计结果'],commit:()=>{S.gacha.analysisByAccount??={};S.gacha.analysisByAccount[account]=draft;if(S.gacha.account===account){S.gacha.analysis=draft;S.gacha.analysisDraft=clone(draft);}}});break;}
  case 'analysis-discard':S.gacha.analysisDraft=clone(S.gacha.analysis);closeOverlay();leavePage();break;
  case 'resolve-shizuku':S.returnTo='gacha/acquire';go(S.plugins.shizuku.installed&&S.plugins.shizuku.enabled?'shizuku':'plugin/shizuku');break;
  case 'resolve-access-shizuku':S.returnTo='access/services';go(S.plugins.shizuku.installed&&S.plugins.shizuku.enabled?'shizuku':'plugin/shizuku');break;
  case 'shizuku-start':showOverlay('shizuku-start');break;
  case 'shizuku-started':S.condition='normal';S.connection='unauthorized';closeOverlay();render();break;
  case 'shizuku-authorize':showOverlay('shizuku-authorize');break;
  case 'shizuku-authorized':S.connection='ready';S.condition='normal';closeOverlay();render();toast('示例授权完成，连接可用');break;
  case 'shizuku-connect':S.connection='ready';S.condition='normal';render();break;
  case 'shizuku-check':if(S.condition==='offline')S.condition='normal';readSystemStatus(true);render();break;
  case 'favorite':{const s=S.services.find(s=>s.id===a);s.favorite=!s.favorite;render();toast(s.favorite?'已收藏，服务启停和恢复规则未改变':'已取消收藏，服务设置未改变');break;}
  case 'access-filter':S.accessFilter=a;render();break;
  case 'access-reset':S.accessQuery='';S.accessFilter='all';render();break;
  case 'access-refresh':readSystemStatus(true);render();break;
  case 'service-stop-confirmed':{const id=S.overlay.service;closeOverlay();changeService(id,false,true);break;}
  case 'registry-download':showOverlay('download-demo',{id:a});break;
  case 'add-battery-home':if(!S.homeOrder.includes('battery'))S.homeOrder.push('battery');S.hiddenWidgets=S.hiddenWidgets.filter(v=>v!=='battery');toast('示例小部件已添加到首页','root:home','查看');break;
  case 'reset-confirmed':{cancelLocalReads();for(const timer of jobTimers.values())clearTimeout(timer);jobTimers.clear();const {theme,size,zoom,focus,buildFlavor}=S;S={...initialState(),theme,size,zoom,focus,buildFlavor};closeOverlay();go('home',{replace:true,root:true});render();break;}
  case 'noop':break;
  default:console.warn('Unknown preview action:',action);toast('这个入口暂时无法打开，请重置预览后重试。');
 }
}

function handleSetting(key,checked){const [kind,id,name]=key.split(':');
 if(kind==='flow-protection'){S.flow.protection[id]=checked;S.flow.protectionPreset='custom';S.flow.dirty=true;render();return;}
 if(kind==='plugin-enabled'){if(checked){showOverlay('enable-review',{id});render();}else{releasePluginPage(id);S.plugins[id].enabled=false;render();toast('插件已停用');}return;}
 if(kind==='tool-visible'){S.hiddenTools=checked?S.hiddenTools.filter(v=>v!==id):[...new Set([...S.hiddenTools,id])];if(!S.toolOrder.includes(id))S.toolOrder.push(id);}
 else if(kind==='widget-visible'){S.hiddenWidgets=checked?S.hiddenWidgets.filter(v=>v!==id):[...new Set([...S.hiddenWidgets,id])];if(checked&&!S.homeOrder.includes(id))S.homeOrder.push(id);}
 else if(kind==='check-updates')S.plugins[id].checkUpdates=checked;
 else if(kind==='permission'){S.plugins[id].permissions[name]=checked;if(checked)S.condition='normal';if(S.overlay){render();return;}}
 else if(kind==='auto-update')S.autoUpdate=checked;
 else if(kind==='auto-app-update'&&S.buildFlavor!=='local-debug')S.autoAppUpdate=checked;
 else if(kind==='service-auto'){const service=S.services.find(s=>s.id===id);if(!service||!permissionGranted('access','后台自动恢复'))return;service.auto=checked;render();toast(checked?'已开启自动恢复，收藏和当前启用状态保持原样':'已关闭自动恢复，当前服务状态保持原样');return;}
 else if(kind==='service'){const service=S.services.find(s=>s.id===id);if(!checked&&service.auto){showOverlay('service-stop',{service:id});render();return;}changeService(id,checked);return;}
 render();
}
function handleCheck(key,checked){const [kind,id]=key.split(':');
 if(kind==='flow-item'){changeFlowSelection([id],checked);return;}
 if(kind==='flow-group'){changeFlowSelection(flowVisibleItems().filter(i=>i.owner===id).map(i=>i.id),checked);return;}
 if(kind==='flow-export'){setExportSelected(id,checked);return;}
 if(kind==='flow-delete'){setFlowMode(id,checked?'delete':'skip');return;}
 if(kind==='flow-confirmed')S.flow.confirmed=checked;
 else if(kind==='trust-ack'){S.overlay.ack=checked;renderOverlay();return;}
 else if(kind==='uninstall-clear'){S.overlay.clear=checked;renderOverlay();return;}
 else if(kind==='uigf-import')S.gacha.importIds=checked?[...S.gacha.importIds,id]:S.gacha.importIds.filter(v=>v!==id);
 else if(kind==='uigf-export')S.gacha.exportIds=checked?[...S.gacha.exportIds,id]:S.gacha.exportIds.filter(v=>v!==id);
 else if(kind==='analysis')S.gacha.analysisDraft[id]=checked;
 render();
}
function handleInput(el){switch(el.id){
 case 'flow-query':S.flow.query=el.value;break;
 case 'data-query':S.dataQuery=el.value;break;
 case 'tool-query':S.toolQuery=el.value;break;case 'plugin-query':S.pluginQuery=el.value;break;
 case 'score-min':S.phi.constantMin=el.value;break;case 'score-max':S.phi.constantMax=el.value;break;case 'catalog-min':S.phi.catalogMin=el.value;break;case 'catalog-max':S.phi.catalogMax=el.value;break;
 case 'phi-query':S.phi.query=el.value;break;case 'catalog-query':S.phi.catalogQuery=el.value;break;
 case 'gacha-query':S.gacha.query=el.value;S.gacha.page=0;break;case 'access-query':S.accessQuery=el.value;break;
 case 'gacha-link-input':S.gacha.draft=el.value;S.gacha.linkReady=false;break;
 case 'flow-password':S.flow.password=el.value;break;case 'phi-login-name':S.phi.loginName=el.value;return;
 case 'analysis-extra':S.gacha.analysisDraft.extra=el.value;break;case 'modal-login-name':S.phi.loginName=el.value;return;
 case 'modal-rename':if(S.overlay)S.overlay.value=el.value;return;
 default:return;
 }render();}

document.addEventListener('click',e=>{
 if(e.target.closest('.skip-link')){e.preventDefault();ui.content.focus({preventScroll:true});return;}
 const action=e.target.closest('[data-action]');
 if(action){if(performance.now()<suppressClickUntil&&action.closest('[data-sortable]')){e.preventDefault();return;}if(action.disabled)return;if(S.sortMode&&action.matches('[data-sortable]')){openTileMenu(action);return;}act(action.dataset.action,action);return;}
 if(e.target.matches('[data-dismiss]'))closeOverlay();
});
document.addEventListener('input',e=>handleInput(e.target));
document.addEventListener('change',e=>{const el=e.target;
 if(el.dataset.flowProtection){act('flow-protection-preset:'+el.dataset.flowProtection);return;}
 if(el.dataset.setting){handleSetting(el.dataset.setting,el.checked);return;}if(el.dataset.check){handleCheck(el.dataset.check,el.checked);return;}
 if(el.dataset.location!=null&&S.overlay){S.overlay.location=el.dataset.location;return;}
 const key=el.dataset.select;
 if(key?.startsWith('flow-import-mode:')){setFlowMode(key.split(':')[1],el.value);return;}
 if(key==='gacha-filter-pool'){S.gacha.filterPool=el.value;S.gacha.page=0;render();return;}
 if(key==='gacha-filter-rarity'){S.gacha.rarity=Number(el.value);S.gacha.page=0;render();return;}
 if(key==='phi-history-days')S.phi.historyDays=Number(el.value);else if(key==='phi-server')S.phi.server=el.value;else if(key==='gacha-log-range')S.gacha.logRange=el.value;else if(key?.startsWith('registry-version:')){S.registryVersions??={};S.registryVersions[key.split(':')[1]]=el.value;render();return;}else return;render();
});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){e.preventDefault();if(dragState){endDrag(true);return;}if(S.sortMode&&!S.overlay){S.sortMode=null;render();return;}back();return;}
 if(S.overlay&&e.key==='Tab'){const items=[...ui.overlay.querySelectorAll('button:not(:disabled),input,select,textarea,a,[tabindex="0"]')].filter(el=>!el.hidden);if(!items.length)return;const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}return;}
 const tile=e.target.closest('[data-sortable]');if(tile&&S.sortMode===tile.dataset.sortable&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();nudgeSort(tile.dataset.sortable,tile.dataset.tile,['ArrowUp','ArrowLeft'].includes(e.key)?-1:1);return;}if(tile&&(e.key==='F10'&&e.shiftKey||e.key==='ContextMenu')){e.preventDefault();openTileMenu(tile);return;}
 if(e.target.matches('g[data-action]')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();act(e.target.dataset.action,e.target);return;}
 if(e.target.matches('[role="tab"]')&&['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){const list=[...e.target.parentElement.querySelectorAll('[role="tab"]')],index=list.indexOf(e.target),next=e.key==='Home'?0:e.key==='End'?list.length-1:Math.max(0,Math.min(list.length-1,index+(e.key==='ArrowRight'?1:-1)));e.preventDefault();const action=list[next].dataset.action;act(action);requestAnimationFrame(()=>document.querySelector(`[data-action="${action}"]`)?.focus());}
});
function openTileMenu(tile,x,y){const b=tile.getBoundingClientRect(),point=devicePoint(x??b.left,y??b.top);showOverlay('tile-menu',{id:tile.dataset.tile,group:tile.dataset.sortable,x:point.x,y:point.y+(y==null?35:0)});}
document.addEventListener('contextmenu',e=>{const tile=e.target.closest('[data-sortable]');if(tile){e.preventDefault();endDrag(true,true);openTileMenu(tile,e.clientX,e.clientY);}});

let swipeStart=null;
ui.content.addEventListener('pointerdown',e=>{if(e.target.closest('input,textarea,select,.horizontal-scroll,.pool-browser,[data-sortable],svg')||S.overlay)return;if(/^phi\/(overview|scores|history|catalog)$/.test(S.route)||/^gacha\/(overview|records)$/.test(S.route))swipeStart={x:e.clientX,y:e.clientY,scale:previewScale(),route:S.route};});
ui.content.addEventListener('pointerup',e=>{const start=swipeStart;swipeStart=null;if(!start||start.route!==S.route)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;if(Math.abs(dx)<Math.max(60,ui.content.clientWidth*.3)*start.scale||Math.abs(dx)<Math.abs(dy)*1.5)return;const family=S.route.split('/')[0],pages=family==='phi'?['overview','scores','history','catalog']:['overview','records'],index=pages.indexOf(S.route.split('/')[1]),next=Math.max(0,Math.min(pages.length-1,index+(dx<0?1:-1)));if(index!==next){suppressClickUntil=performance.now()+400;go(`${family}/${pages[next]}`,{replace:true});}});
ui.content.addEventListener('pointercancel',()=>swipeStart=null);
window.addEventListener('popstate',e=>{rememberRuntimeView();S.sortMode=null;S.overlay=null;if(e.state?.atsPreview){S.scrolls[S.route]=ui.content.scrollTop;S.route=cachedReturnRoute(e.state.route);S.stack=e.state.stack||[];S.root=e.state.root||'home';if(S.route!==e.state.route)history.replaceState({...e.state,route:S.route},'',`#${encodeURIComponent(S.route)}`);}else{S.route='home';S.stack=[];}visitRuntimeRoute(S.route);render();});
document.getElementById('scene-search').addEventListener('input',renderStudio);
 document.getElementById('compact-scene').onchange=e=>selectScene(e.target.value);
 new ResizeObserver(()=>document.body.style.setProperty('--studio-header-height',document.querySelector('.studio-header').getBoundingClientRect().height+'px')).observe(document.querySelector('.studio-header'));
document.getElementById('theme-choice').onchange=e=>{S.theme=e.target.value;render();};document.getElementById('size-choice').onchange=e=>{S.size=e.target.value;render();};
document.getElementById('zoom-choice').onchange=e=>{S.zoom=e.target.value;applyPreferences();};
document.getElementById('condition-choice').onchange=e=>{S.condition=e.target.value;patchSystemWidgets();renderBackground();};
document.getElementById('read-outcome').onchange=e=>{S.nextReadOutcome=e.target.value;};
document.getElementById('read-phase').onchange=e=>{S.readPhase=e.target.value;};
document.getElementById('read-timing').onchange=e=>{S.readTiming=e.target.value;};
document.getElementById('build-flavor').onchange=e=>{S.buildFlavor=e.target.value;render();};document.getElementById('outcome-choice').onchange=e=>{S.outcome=e.target.value;};
document.getElementById('focus-mode').onclick=()=>{S.focus=!S.focus;applyPreferences();};document.getElementById('reset-demo').onclick=()=>showOverlay('reset');document.getElementById('inspector-toggle').onclick=()=>{S.inspector=!S.inspector;applyPreferences();};
const inspectorClose=document.createElement('button');inspectorClose.className='studio-button inspector-close';inspectorClose.dataset.action='inspector-close';inspectorClose.textContent='关闭审阅设置';document.querySelector('.inspector').prepend(inspectorClose);
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{if(S.theme==='system')applyPreferences();});
try{const route=decodeURIComponent(location.hash.slice(1));if(route&&/^[a-z0-9/-]+$/.test(route))S.route=route;}catch{}
history.replaceState({atsPreview:true,route:S.route,stack:[],root:'home'},'',`#${encodeURIComponent(S.route)}`);
setupViewport();
visitRuntimeRoute(S.route);
render();
