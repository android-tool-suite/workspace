// Host collection examples share widget instances and plugin state with the rest of the preview.
S.collectionFolders??=[];
const collectionOriginalHome=configuredHomeView;
const collectionOriginalModal=modalView;
const collectionOriginalAction=act;
function collectionMembers(scope){return scope==='home'?S.homeOrder:S.toolOrder.filter(id=>S.plugins[id]?.installed);}
function collectionName(scope,id){return scope==='home'?widgetTitle(id):PLUGINS[id]?.name||id;}
function collectionFolder(id){return S.collectionFolders.find(folder=>folder.id===id);}
function collectionGridItems(scope){
 if(scope==='home')return [...S.homeOrder.filter(id=>!S.hiddenWidgets.includes(id)&&!S.collectionFolders.some(folder=>folder.scope==='home'&&folder.members.includes(id))).map(id=>({id,size:S.widgetInstances[id]?.size||(S.wideTiles.includes(id)?'4x2':'2x2')})),...S.collectionFolders.filter(folder=>folder.scope==='home').map(folder=>({id:'@folder:'+folder.id,size:folder.size||'1x1',folder}))];
 const folder=collectionFolder(scope.slice(5));return (folder?.members||[]).map(id=>({id,size:S.widgetInstances[id]?.size||(S.wideTiles.includes(id)?'4x2':'2x2')}));
}
function collectionPlace(items,saved={},moving=null,destination=null){
 const cells={},occupied=new Set(),dimensions=item=>item.size.split('x').map(Number);
 const fits=(item,cell)=>{const [w,h]=dimensions(item);return cell.column>=0&&cell.column+w<=4&&cell.row>=0&&cell.row+h<=256&&!Array.from({length:h},(_,y)=>Array.from({length:w},(_,x)=>(cell.row+y)*4+cell.column+x)).flat().some(key=>occupied.has(key));};
 const put=(item,cell)=>{const [w,h]=dimensions(item);cells[item.id]=cell;for(let y=0;y<h;y++)for(let x=0;x<w;x++)occupied.add((cell.row+y)*4+cell.column+x);};
 const priority=items.find(item=>item.id===moving);if(priority&&destination)put(priority,destination);
 for(const item of items)if(!cells[item.id]&&saved[item.id]&&fits(item,saved[item.id]))put(item,saved[item.id]);
 for(const item of items)if(!cells[item.id]){let found=false;for(let y=0;y<256&&!found;y++)for(let x=0;x<4&&!found;x++)if(fits(item,{column:x,row:y})){put(item,{column:x,row:y});found=true;}}
 return cells;
}
function collectionCover(folder){
 const size=folder.size||'1x1',label='<strong>'+esc(folder.name)+'</strong><small>'+folder.members.length+' 个部件</small>';
 if(size==='1x1')return label;
 return '<span class="folder-caption">'+label+'</span>'+(folder.members.length?'<span class="folder-previews">'+folder.members.slice(0,4).map(id=>'<span class="folder-mini"><span class="folder-mini-content">'+widgetBody(id)+'</span></span>').join('')+'</span>':'<span class="empty-small">空文件夹</span>');
}
function collectionGrid(scope){
 ensureWidgetInstances();S.widgetPositions??={};const items=collectionGridItems(scope),cells=collectionPlace(items,S.widgetPositions[scope]);S.widgetPositions[scope]=cells;
 const rows=Math.max(1,...items.map(item=>cells[item.id].row+Number(item.size.split('x')[1])))+(S.sortMode==='home'?2:0);
 return '<div class="home-grid collection-grid" data-grid-scope="'+scope+'" style="grid-template-rows:repeat('+rows+',72px)">'+items.map(item=>{const [w,h]=item.size.split('x').map(Number),cell=cells[item.id];return '<button class="card home-tile '+(item.folder?'collection-cover':'')+'" data-grid-item="'+item.id+'" '+(item.folder?'data-folder-id="'+item.folder.id+'"':'')+' style="grid-column:'+(cell.column+1)+' / span '+w+';grid-row:'+(cell.row+1)+' / span '+h+'" data-action="'+(item.folder?'collection-open:'+item.folder.id:'widget-open:'+item.id)+'">'+(item.folder?collectionCover(item.folder):widgetBody(item.id))+'</button>';}).join('')+'</div>';
}
configuredHomeView=function(){
 return {header:appBar('首页','Android Tool Suite','',true),html:'<div class="home-greeting"><h2>常用，一眼可见</h2><div class="actions">'+ib('folder','新建文件夹','collection-new:home')+btn(S.sortMode==='home'?'完成':'排列','sort-mode:home','text small')+btn('小部件','go:widgets','text small')+'</div></div>'+sortHint('home')+collectionGrid('home')};
};

toolsView=function(){
 const collected=S.route==='tools/collected',folders=S.collectionFolders.filter(folder=>folder.scope==='tools');
 const ids=S.toolOrder.filter(id=>S.plugins[id]?.installed&&(collected?S.hiddenTools.includes(id):!S.hiddenTools.includes(id)&&!folders.some(folder=>folder.members.includes(id))));
 const pluginRow=id=>'<article class="tool-card collection-plugin" data-collection-tool="'+id+'" data-tile="'+id+'">'+mark(PLUGINS[id].icon,PLUGINS[id].color)+'<button class="grow collection-open-plugin" data-action="open:'+id+'"><strong>'+esc(PLUGINS[id].name)+'</strong><small>v'+S.plugins[id].version+' · '+(S.plugins[id].enabled?'已启用':'已停用')+'</small></button>'+ib('filter','插件详情 '+PLUGINS[id].name,'go:plugin/'+id)+ib('folder','整理 '+PLUGINS[id].name,'collection-move:tools:'+id)+'</article>';
 return {header:appBar(collected?'工具收纳':'工具','已安装插件','',!collected),html:section(collected?'收纳的插件':'已安装插件',String(ids.length)+' 个',btn(S.sortMode==='tools'?'完成':'排列','sort-mode:tools','text small')+ib('folder','新建插件文件夹','collection-new:tools'))+'<div class="tool-list" data-sort-region="tools">'+ids.map(pluginRow).join('')+(collected?'':folders.map(folder=>'<button class="tool-card" data-folder-id="'+folder.id+'" data-action="collection-open:'+folder.id+'">'+mark('folder')+'<span class="grow"><strong>'+esc(folder.name)+'</strong><small>'+folder.members.length+' 个插件</small></span>'+icon('chevron')+'</button>').join(''))+'</div>'+(!collected&&S.hiddenTools.length?row('folder','工具收纳',S.hiddenTools.length+' 个不常用插件','go:tools/collected'):'')};
};
const collectionOriginalRoute=routeView;
routeView=function(route){if(route==='plugins'||route==='tools/collected')return toolsView();return collectionOriginalRoute(route);};
modalView=function(o){
 if(o.kind==='collection-dist-filters'){
  const pools=POOLS.filter(pool=>gachaRecordsFor().some(record=>record.pool===pool.id)).sort((a,b)=>(previewResource(a.id)==='permanent'?0:1)-(previewResource(b.id)==='permanent'?0:1)),resources=[...new Set(pools.map(pool=>previewResource(pool.id)))];
  const choices=(title,key,items)=>'<h3>'+title+'</h3>'+items.map(([id,label])=>'<label class="selection-row"><input type="checkbox" data-preview-distribution="'+key+'" value="'+id+'" '+(o.draft[key].includes(id)?'checked':'')+'><span>'+esc(label)+'</span></label>').join('');
  return {title:'分布筛选',sheet:true,body:choices('票券类型','resources',resources.map(id=>[id,previewResourceName(id)]))+choices('卡池','pools',pools.map(pool=>[pool.id,poolLabel(pool)])),buttons:btn('取消','modal-close','text')+btn('应用','collection-dist-apply')};
 }
 if(o.kind==='collection-open'){
  const folder=collectionFolder(o.id);if(!folder)return {title:'文件夹',body:empty('文件夹已解散','成员保留。'),buttons:btn('关闭','modal-close','text')};
  const body=folder.scope==='home'?collectionGrid('home:'+folder.id)+'<div class="collection-exit" data-collection-exit="home">拖到这里移回主页</div>':folder.members.map(id=>'<button class="list-row" data-collection-tool="'+id+'" data-action="open:'+id+'">'+mark(PLUGINS[id]?.icon||'plugin')+'<span class="grow">'+esc(collectionName('tools',id))+'</span>'+icon('chevron')+'</button>').join('')+'<div class="collection-exit" data-collection-exit="tools">拖到这里移回工具页</div>';

  return {title:folder.name,body,sheet:true,buttons:btn('编辑','collection-edit:'+folder.id,'outline')+btn('解散','collection-dissolve:'+folder.id,'text')+btn('关闭','modal-close','text')};
 }
 if(o.kind==='collection-edit'){
  const folder=collectionFolder(o.id),scope=o.scope||folder?.scope||'home',members=folder?.members||o.members||[];
  return {title:folder?'编辑文件夹':'新建文件夹',sheet:true,body:'<label class="field">文件夹名称<input class="input" id="collection-name" maxlength="80" value="'+esc(folder?.name||'新建文件夹')+'"></label>'+'<p>长按并拖动卡片整理成员。</p>'+(folder?.scope==='home'?'<label class="field">尺寸<select class="input" data-collection-size>'+['1x1','1x2','2x1','2x2','4x2'].map(size=>'<option '+((folder.size||'1x1')===size?'selected':'')+'>'+size+'</option>').join('')+'</select></label>':''),buttons:btn('取消','modal-close','text')+btn('保存','collection-save:'+scope+':'+(folder?.id||''))};
 }
 if(o.kind==='collection-move'){
  const scope=o.scope;return {title:'整理',sheet:true,body:S.collectionFolders.filter(folder=>folder.scope===scope).map(folder=>menuItem(folder.name,'collection-assign:'+folder.id+':'+o.member,'folder')).join('')+menuItem('新建文件夹','collection-new-member:'+scope+':'+o.member,'plus')+(scope==='tools'?menuItem(S.hiddenTools.includes(o.member)?'移出收纳':'移入工具收纳','collection-collect:'+o.member,'folder'):''),buttons:btn('取消','modal-close','text')};
 }
 const view=collectionOriginalModal(o);
 return view;
};
act=function(action,event){
 const periodMenu=document.querySelector('.preview-period-more[open]');
 if(action==='back'&&periodMenu){periodMenu.open=false;return;}
 if(action==='gacha-reset-filters'||action.startsWith('gacha-month:'))S.gacha.distributionRecordIds=null;
 if(action.startsWith('gacha-month:')){const key=action.slice('gacha-month:'.length);S.gacha.period={key,records:gachaRecordsFor().filter(record=>record.date.startsWith(key)),mode:'month',chart:'resources'};go('gacha/period');return;}
 if(action.startsWith('collection-period-chart:')){S.gacha.period.chart=action.split(':')[1];render();return;}
 if(action.startsWith('collection-period-records:')){S.gacha.distributionRecordIds=S.gacha.period.records.map(record=>record.id);S.gacha.query='';S.gacha.filterPool='all';S.gacha.rarity=Number(action.split(':')[1]);S.gacha.page=0;go('gacha/records');return;}
 if(action==='gacha-refresh-roles'){toast('示例角色已刷新');return;}
 if(action==='collection-flow-search'){S.flow.searching=!S.flow.searching;if(!S.flow.searching)S.flow.query='';render();return;}
 if(action==='collection-dist-filter'){showOverlay('collection-dist-filters',{draft:clone(previewDistributionFilter())});return;}
 if(action==='collection-dist-apply'){S.gacha.distribution=S.overlay.draft;closeOverlay();render();return;}
 if(action.startsWith('collection-dist-mode:')){S.gacha.distribution={...previewDistributionFilter(),mode:action.split(':')[1]};render();return;}
 if(action.startsWith('collection-dist-group:')){const group=previewDistributionGroups()[Number(action.split(':')[1])];if(group){S.gacha.period={...group,mode:previewDistributionFilter().mode,chart:'resources'};go('gacha/period');}return;}
 if(action==='sort-undo'&&S.sortUndo?.grid){S.widgetPositions=clone(S.sortUndo.positions);S.sortUndo=null;render();return;}
 if(!action.startsWith('collection-'))return collectionOriginalAction(action,event);
 const [kind,a,b]=action.split(':');
 if(kind==='collection-new'){showOverlay('collection-edit',{scope:a});}
 else if(kind==='collection-new-member'){showOverlay('collection-edit',{scope:a,members:[b]});}
 else if(kind==='collection-open'){showOverlay('collection-open',{id:a});}
 else if(kind==='collection-edit'){showOverlay('collection-edit',{id:a});}
 else if(kind==='collection-move'){showOverlay('collection-move',{scope:a,member:b});}
 else if(kind==='collection-save'){
  const name=document.getElementById('collection-name')?.value.trim(),existing=collectionFolder(b),members=existing?.members||S.overlay.members||[];
  if(!name){toast('填写名称');return;}
  const id=b||'folder-'+Date.now();
  S.collectionFolders=S.collectionFolders.filter(folder=>folder.id!==id).map(folder=>({...folder,members:folder.scope===a?folder.members.filter(member=>!members.includes(member)):folder.members}));
  S.collectionFolders.push({id,scope:a,name,members,size:document.querySelector('[data-collection-size]')?.value||existing?.size||'1x1'});closeOverlay();render();
 }
 else if(kind==='collection-dissolve'){S.collectionFolders=S.collectionFolders.filter(folder=>folder.id!==a);closeOverlay();render();toast('文件夹已解散，成员保留');}
 else if(kind==='collection-assign'){
  const target=collectionFolder(a);if(!target)return;
  S.collectionFolders.forEach(folder=>{if(folder.scope===target.scope)folder.members=folder.members.filter(id=>id!==b);});target.members.push(b);closeOverlay();render();
 }
 else if(kind==='collection-collect'){S.collectionFolders.forEach(folder=>{if(folder.scope==='tools')folder.members=folder.members.filter(id=>id!==a);});S.hiddenTools=S.hiddenTools.includes(a)?S.hiddenTools.filter(id=>id!==a):[...S.hiddenTools,a];closeOverlay();render();}
};

document.addEventListener('change',event=>{
 const el=event.target;
 if(el.hasAttribute('data-preview-flow-source')){S.flow.source=el.value;render();}
 if(el.hasAttribute('data-preview-flow-batch')){if(el.value==='cache')act('flow-cache-only');else if(el.value)changeFlowSelection(flowVisibleItems().map(item=>item.id),el.value==='all');}
 if(el.dataset.check==='preview-flow-only-selected'){S.flow.onlySelected=el.checked;render();}
});

const previewDistributionCalendar = {"hk4e":[{"version":"1.0","start":"2020-09-28 00:00:00","end":"2020-11-10 16:00:00"},{"version":"1.1","start":"2020-11-11 06:00:00","end":"2020-12-22 15:00:00"},{"version":"1.2","start":"2020-12-23 06:00:00","end":"2021-02-02 15:00:00"},{"version":"1.3","start":"2021-02-03 06:00:00","end":"2021-03-16 15:00:00"},{"version":"1.4","start":"2021-03-17 06:00:00","end":"2021-04-27 15:00:00"},{"version":"1.5","start":"2021-04-28 06:00:00","end":"2021-06-08 15:00:00"},{"version":"1.6","start":"2021-06-09 06:00:00","end":"2021-07-20 14:59:59"},{"version":"2.0","start":"2021-07-21 06:00:00","end":"2021-08-31 14:59:59"},{"version":"2.1","start":"2021-09-01 06:00:00","end":"2021-10-12 14:59:59"},{"version":"2.2","start":"2021-10-13 06:00:00","end":"2021-11-23 14:59:59"},{"version":"2.3","start":"2021-11-24 06:00:00","end":"2022-01-04 17:59:59"},{"version":"2.4","start":"2022-01-05 06:00:00","end":"2022-02-15 14:59:59"},{"version":"2.5","start":"2022-02-16 06:00:00","end":"2022-03-29 14:59:59"},{"version":"2.6","start":"2022-03-30 06:00:00","end":"2022-05-31 05:59:59"},{"version":"2.7","start":"2022-05-31 09:00:00","end":"2022-07-12 14:59:59"},{"version":"2.8","start":"2022-07-13 06:00:00","end":"2022-08-23 14:59:59"},{"version":"3.0","start":"2022-08-24 06:00:00","end":"2022-09-27 14:59:59"},{"version":"3.1","start":"2022-09-28 06:00:00","end":"2022-11-01 14:59:59"},{"version":"3.2","start":"2022-11-02 06:00:00","end":"2022-12-06 14:59:59"},{"version":"3.3","start":"2022-12-07 06:00:00","end":"2023-01-17 14:59:59"},{"version":"3.4","start":"2023-01-18 06:00:00","end":"2023-02-28 14:59:59"},{"version":"3.5","start":"2023-03-01 06:00:00","end":"2023-04-11 14:59:59"},{"version":"3.6","start":"2023-04-12 06:00:00","end":"2023-05-23 14:59:59"},{"version":"3.7","start":"2023-05-24 06:00:00","end":"2023-07-04 14:59:59"},{"version":"3.8","start":"2023-07-05 06:00:00","end":"2023-08-15 17:59:59"},{"version":"4.0","start":"2023-08-16 06:00:00","end":"2023-09-26 14:59:59"},{"version":"4.1","start":"2023-09-27 06:00:00","end":"2023-11-07 14:59:59"},{"version":"4.2","start":"2023-11-08 06:00:00","end":"2023-12-19 14:59:59"},{"version":"4.3","start":"2023-12-20 06:00:00","end":"2024-01-30 14:59:00"},{"version":"4.4","start":"2024-01-31 06:00:00","end":"2024-03-12 14:59:00"},{"version":"4.5","start":"2024-03-13 06:00:00","end":"2024-04-23 14:59:00"},{"version":"4.6","start":"2024-04-24 06:00:00","end":"2024-06-04 14:59:00"},{"version":"4.7","start":"2024-06-05 06:00:00","end":"2024-07-16 14:59:00"},{"version":"4.8","start":"2024-07-17 06:00:00","end":"2024-08-27 14:59:00"},{"version":"5.0","start":"2024-08-28 06:00:00","end":"2024-10-08 14:59:00"},{"version":"5.1","start":"2024-10-09 06:00:00","end":"2024-11-19 14:59:00"},{"version":"5.2","start":"2024-11-20 06:00:00","end":"2024-12-31 14:59:00"},{"version":"5.3","start":"2025-01-01 06:00:00","end":"2025-02-11 14:59:00"},{"version":"5.4","start":"2025-02-12 06:00:00","end":"2025-03-25 14:59:00"},{"version":"5.5","start":"2025-03-26 06:00:00","end":"2025-05-06 14:59:00"},{"version":"5.6","start":"2025-05-07 06:00:00","end":"2025-06-17 14:59:00"},{"version":"5.7","start":"2025-06-18 06:00:00","end":"2025-07-29 14:59:00"},{"version":"5.8","start":"2025-07-30 06:00:00","end":"2025-09-09 14:59:00"},{"version":"6.0","start":"2025-09-10 06:00:00","end":"2025-10-22 06:00:00"},{"version":"6.1","start":"2025-10-22 06:00:00","end":"2025-12-02 14:59:00"},{"version":"6.2","start":"2025-12-03 06:00:00","end":"2026-01-13 14:59:00"},{"version":"6.3","start":"2026-01-14 06:00:00","end":"2026-02-24 14:59:00"},{"version":"6.4","start":"2026-02-25 06:00:00","end":"2026-04-07 14:59:00"},{"version":"6.5","start":"2026-04-08 06:00:00","end":"2026-05-19 14:59:00"},{"version":"6.6","start":"2026-05-20 06:00:00","end":"2026-06-30 14:59:00"},{"version":"6.7","start":"2026-07-01 06:00:00","end":"2026-08-11 14:59:00"},{"version":"7.0","start":"2026-08-12 06:00:00","end":"2026-09-22 14:59:00"},{"version":"7.1","start":"2026-09-23 06:00:00","end":"2026-10-13 17:59:59"}],"hkrpg":[{"version":"1.0","start":"2023-04-26 06:00:00","end":"2023-06-07 06:00:00"},{"version":"1.1","start":"2023-06-07 06:00:00","end":"2023-07-19 06:00:00"},{"version":"1.2","start":"2023-07-19 06:00:00","end":"2023-08-30 06:00:00"},{"version":"1.3","start":"2023-08-30 06:00:00","end":"2023-10-11 06:00:00"},{"version":"1.4","start":"2023-10-11 06:00:00","end":"2023-11-15 06:00:00"},{"version":"1.5","start":"2023-11-15 06:00:00","end":"2023-12-27 06:00:00"},{"version":"1.6","start":"2023-12-27 06:00:00","end":"2024-02-06 06:00:00"},{"version":"2.0","start":"2024-02-06 06:00:00","end":"2024-03-27 06:00:00"},{"version":"2.1","start":"2024-03-27 06:00:00","end":"2024-05-08 06:00:00"},{"version":"2.2","start":"2024-05-08 06:00:00","end":"2024-06-19 06:00:00"},{"version":"2.3","start":"2024-06-19 06:00:00","end":"2024-07-31 06:00:00"},{"version":"2.4","start":"2024-07-31 06:00:00","end":"2024-09-10 06:00:00"},{"version":"2.5","start":"2024-09-10 06:00:00","end":"2024-10-23 06:00:00"},{"version":"2.6","start":"2024-10-23 06:00:00","end":"2024-12-04 06:00:00"},{"version":"2.7","start":"2024-12-04 06:00:00","end":"2025-01-15 06:00:00"},{"version":"3.0","start":"2025-01-15 06:00:00","end":"2025-02-26 06:00:00"},{"version":"3.1","start":"2025-02-26 06:00:00","end":"2025-04-09 06:00:00"},{"version":"3.2","start":"2025-04-09 06:00:00","end":"2025-05-21 06:00:00"},{"version":"3.3","start":"2025-05-21 06:00:00","end":"2025-07-02 06:00:00"},{"version":"3.4","start":"2025-07-02 06:00:00","end":"2025-08-13 06:00:00"},{"version":"3.5","start":"2025-08-13 06:00:00","end":"2025-09-24 06:00:00"},{"version":"3.6","start":"2025-09-24 06:00:00","end":"2025-11-05 06:00:00"},{"version":"3.7","start":"2025-11-05 06:00:00","end":"2025-12-17 06:00:00"},{"version":"3.8","start":"2025-12-17 06:00:00","end":"2026-02-13 06:00:00"},{"version":"4.0","start":"2026-02-13 06:00:00","end":"2026-03-25 06:00:00"},{"version":"4.1","start":"2026-03-25 06:00:00","end":"2026-04-22 06:00:00"},{"version":"4.2","start":"2026-04-22 06:00:00","end":"2026-06-01 06:00:00"},{"version":"4.3","start":"2026-06-01 06:00:00","end":"2026-07-15 06:00:00"},{"version":"4.4","start":"2026-07-15 06:00:00","end":"2026-08-26 06:00:00"},{"version":"4.5","start":"2026-08-26 06:00:00","end":"2026-09-28 06:00:00"},{"version":"4.6","start":"2026-09-28 06:00:00","end":"2026-11-11 06:00:00"}]};
function previewDistributionFilter(){return S.gacha.distribution||{mode:'month',resources:[],pools:[]};}
function previewResource(pool){return ['character','weapon'].includes(pool)?'activity':'permanent';}
function previewResourceName(resource){return currentGacha()?.game==='原神'?(resource==='activity'?'纠缠之缘':'相遇之缘'):(resource==='activity'?'星轨专票':'星轨通票');}
function previewDistributionGroups(){
 const filter=previewDistributionFilter(),groups=new Map();
 for(const record of gachaRecordsFor()){
  const resource=previewResource(record.pool);
  if(filter.resources.length&&!filter.resources.includes(resource)||filter.pools.length&&!filter.pools.includes(record.pool))continue;
  const game=currentGacha()?.game==='原神'?'hk4e':'hkrpg',found=(previewDistributionCalendar[game]||[]).find(range=>record.date>=range.start&&record.date<range.end);
  const key=filter.mode==='version'?(record.game_version||found?.version||'版本未知'):record.date.slice(0,7);
  if(!groups.has(key))groups.set(key,{key,records:[],segments:new Map()});const group=groups.get(key);group.records.push(record);
  const id=resource+':'+record.pool;group.segments.set(id,(group.segments.get(id)||0)+1);
 }
 return [...groups.values()].sort((a,b)=>b.key.localeCompare(a.key,undefined,{numeric:true}));
}
gachaMonthsView=function(){
 const filter=previewDistributionFilter(),groups=previewDistributionGroups(),max=Math.max(1,...groups.map(group=>group.records.length));
 const legends=['permanent','activity'].filter(id=>gachaRecordsFor().some(record=>previewResource(record.pool)===id)).map(id=>'<div><strong>'+previewResourceName(id)+'</strong><small>'+POOLS.filter(pool=>previewResource(pool.id)===id&&gachaRecordsFor().some(record=>record.pool===pool.id)).map(pool=>poolLabel(pool)).join(' · ')+'</small></div>').join('');
 const order=(key)=>key.startsWith('permanent')?0:1;
 return {header:appBar('记录分布',currentGacha()?.game||''),html:'<nav class="tabs" aria-label="统计维度">'+[['month','月份'],['version','版本']].map(([key,label])=>'<button class="'+(filter.mode===key?'active':'')+'" data-action="collection-dist-mode:'+key+'">'+label+'</button>').join('')+'</nav>'+btn('筛选','collection-dist-filter','text small','filter')+'<div class="preview-resource-legends">'+legends+'</div><section class="wish-panel">'+groups.map((group,index)=>'<button class="wish-month-row" data-action="collection-dist-group:'+index+'"><span>'+esc(filter.mode==='version'&&group.key!=='版本未知'?'版本 '+group.key:group.key)+'</span><span class="wish-month-track"><span class="preview-distribution-stack" style="width:'+group.records.length/max*100+'%">'+[...group.segments].sort((a,b)=>order(a[0])-order(b[0])||a[0].localeCompare(b[0])).map(([key,count])=>'<i style="flex:'+count+';background:var('+(key.startsWith('activity')?'--primary':'--blue')+');opacity:'+(key.endsWith('weapon')?.72:1)+'" title="'+previewResourceName(key.split(':')[0])+' · '+poolLabel(POOLS.find(pool=>pool.id===key.split(':')[1]))+' · '+count+'"></i>').join('')+'</span></span><strong>'+group.records.length+'</strong>'+icon('chevron')+'</button>').join('')+'</section><p class="wish-footnote">点击月份或版本查看简要分析；票券内按卡池分段，版本未覆盖的数据保留未知。</p>'};
};
function previewDistributionSummary(){
 const period=S.gacha.period??={key:'暂无记录',records:[],mode:'month',chart:'resources'},records=period.records||[],five=records.filter(record=>record.rarity===5);
 const items=period.chart==='pools'?POOLS.map(pool=>({label:poolLabel(pool),color:previewResource(pool.id)==='activity'?'--primary':'--blue',count:records.filter(record=>record.pool===pool.id).length})):['permanent','activity'].map(id=>({label:previewResourceName(id),color:id==='activity'?'--primary':'--blue',count:records.filter(record=>previewResource(record.pool)===id).length}));
 let offset=0;const slices=items.filter(item=>item.count),arcs=slices.map(item=>{const share=item.count/Math.max(1,records.length)*100,arc='<circle cx="60" cy="60" r="46" pathLength="100" fill="none" stroke="var('+item.color+')" stroke-width="16" stroke-dasharray="'+share+' '+(100-share)+'" stroke-dashoffset="'+(-offset)+'"/>';offset+=share;return arc;}).join('');
 const daily=new Map();records.forEach(record=>{const day=record.date.slice(0,10);daily.set(day,(daily.get(day)||0)+1);});
 if(period.mode==='month'&&/^\d{4}-\d{2}$/.test(period.key)){const [year,month]=period.key.split('-').map(Number);for(let i=1;i<=new Date(Date.UTC(year,month,0)).getUTCDate();i++){const day=period.key+'-'+String(i).padStart(2,'0');if(!daily.has(day))daily.set(day,0);}}
 const days=[...daily].sort((a,b)=>a[0].localeCompare(b[0])),max=Math.max(1,...days.map(day=>day[1]));
 const bars=days.map(([day,count],index)=>'<div title="'+day+' · '+count+' 抽"><span><i style="height:'+count/max*100+'%"></i></span><small>'+(index===0||index===days.length-1||(index+1)%5===0&&days.length-index>2?Number(day.slice(8)):'')+'</small></div>').join('');
 const more='<details class="preview-period-more"><summary aria-label="更多记录操作"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg></summary><div>'+btn('记录明细','collection-period-records:0','text small')+btn('五星明细','collection-period-records:5','text small')+'</div></details>';
 return {header:appBar('记录分析',currentGacha()?.game||''),html:'<div class="wish-page"><section class="wish-panel"><div class="wish-panel-title"><div><p class="eyebrow">'+(period.mode==='month'?'月度分析':'分布分析')+'</p><h3>'+esc(period.key)+'</h3></div>'+more+'</div><div class="preview-period-metrics"><div><strong>'+records.length+'</strong><small>累计抽数</small></div><div><strong>'+five.length+'</strong><small>五星获取</small></div><div><strong>'+[...daily.values()].filter(Boolean).length+'</strong><small>有记录的天数</small></div></div></section><section class="wish-panel"><div class="wish-panel-title"><h3>抽数分布</h3><div class="actions">'+btn('票券','collection-period-chart:resources',period.chart==='resources'?'secondary small':'text small')+btn('卡池','collection-period-chart:pools',period.chart==='pools'?'secondary small':'text small')+'</div></div><div class="preview-period-pie"><svg viewBox="0 0 120 120" role="img" aria-label="抽数分布"><g transform="rotate(-90 60 60)">'+arcs+'</g></svg><div>'+slices.map(item=>'<p><span style="background:var('+item.color+')"></span>'+esc(item.label)+'<strong>'+item.count+'</strong><small>'+(item.count/Math.max(1,records.length)*100).toFixed(1)+'%</small></p>').join('')+'</div></div></section><section class="wish-panel"><div class="wish-panel-title"><h3>每日抽数</h3><small>'+(period.mode==='month'?'完整月份':'有记录的日期')+'</small></div><div class="preview-period-daily" style="--days:'+days.length+'">'+bars+'</div></section><section class="wish-panel"><div class="wish-panel-title"><h3>获得的五星</h3><span>'+five.length+' 个</span></div>'+five.slice(0,12).map(record=>wishRecordRow(record,true)).join('')+(five.length>12?'<p class="wish-footnote">其余五星在更多中查看明细。</p>':'')+(five.length?'':'<p>这个范围没有五星记录。</p>')+'</section></div>'};
}
document.addEventListener('change',event=>{
 if(!event.target.dataset.previewDistribution||S.overlay?.kind!=='collection-dist-filters')return;
 const key=event.target.dataset.previewDistribution,value=event.target.value,draft=S.overlay.draft;
 draft[key]=event.target.checked?[...new Set([...draft[key],value])]:draft[key].filter(id=>id!==value);
});

let collectionDrag=null,collectionPressTimer=0,collectionBlockClick=0;
function collectionAssign(scope,member,folderId){
 S.collectionFolders.forEach(folder=>{if(folder.scope===scope)folder.members=folder.members.filter(id=>id!==member);});
 const target=collectionFolder(folderId);if(target&&!target.members.includes(member))target.members.push(member);
 const gridScope=target?'home:'+target.id:'home';if(S.widgetPositions?.[gridScope])delete S.widgetPositions[gridScope][member];
}
function collectionDragStart(drag){
 drag.active=true;const rect=drag.element.getBoundingClientRect();drag.rect=rect;
 const ghost=drag.element.cloneNode(true);ghost.classList.add('collection-drag-ghost');ghost.style.width=rect.width+'px';ghost.style.height=rect.height+'px';ghost.style.left=rect.left+'px';ghost.style.top=rect.top+'px';document.body.append(ghost);drag.ghost=ghost;
 drag.element.style.opacity='.3';
}
document.addEventListener('pointerdown',event=>{
 const element=event.target.closest('[data-grid-item],[data-collection-tool]');if(!element||event.button!==0)return;
 if(element.dataset.collectionTool&&event.target.closest('.icon-btn'))return;
 const grid=element.closest('[data-grid-scope]'),kind=grid?'home':'tools',scope=grid?.dataset.gridScope||'tools';
 collectionDrag={element,id:element.dataset.gridItem||element.dataset.collectionTool,scope,kind,grid,x:event.clientX,y:event.clientY,lastX:event.clientX,lastY:event.clientY,active:false,before:clone(S.widgetPositions||{}),pointerId:event.pointerId};
 clearTimeout(collectionPressTimer);if(S.sortMode===kind)collectionDragStart(collectionDrag);else collectionPressTimer=setTimeout(()=>{if(collectionDrag)collectionDragStart(collectionDrag);},420);
},true);
document.addEventListener('pointermove',event=>{
 const drag=collectionDrag;if(!drag)return;drag.lastX=event.clientX;drag.lastY=event.clientY;
 if(!drag.active){if(Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>10){clearTimeout(collectionPressTimer);collectionDrag=null;}return;}
 event.preventDefault();drag.ghost.style.left=drag.rect.left+event.clientX-drag.x+'px';drag.ghost.style.top=drag.rect.top+event.clientY-drag.y+'px';
 document.querySelectorAll('.collection-drop-target').forEach(node=>node.classList.remove('collection-drop-target'));
 const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-folder-id],[data-collection-exit]');
 if(target&&target!==drag.element&&!drag.id.startsWith('@folder:'))target.classList.add('collection-drop-target');
},{passive:false});
function collectionDragFinish(event,cancelled=false){
 clearTimeout(collectionPressTimer);const drag=collectionDrag;collectionDrag=null;if(!drag)return;
 if(!drag.active)return;drag.ghost.remove();drag.element.style.opacity='';collectionBlockClick=performance.now()+500;
 const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-folder-id],[data-collection-exit]');
 document.querySelectorAll('.collection-drop-target').forEach(node=>node.classList.remove('collection-drop-target'));
 if(cancelled){render();return;}
 if(target&&!drag.id.startsWith('@folder:')) {
  const folder=collectionFolder(target.dataset.folderId),scope=folder?.scope||target.dataset.collectionExit;
  if(scope===drag.kind)collectionAssign(scope,drag.id,folder?.id);
 } else if(drag.kind==='home') {
  const rect=drag.grid.getBoundingClientRect(),scale=previewScale(),stepX=(rect.width+12*scale)/4,stepY=84*scale,item=collectionGridItems(drag.scope).find(item=>item.id===drag.id);
  if(item){const [w,h]=item.size.split('x').map(Number),cell={column:Math.max(0,Math.min(4-w,Math.round((drag.rect.left+event.clientX-drag.x-rect.left)/stepX))),row:Math.max(0,Math.min(256-h,Math.round((drag.rect.top+event.clientY-drag.y-rect.top)/stepY)))};S.widgetPositions[drag.scope]=collectionPlace(collectionGridItems(drag.scope),S.widgetPositions[drag.scope],drag.id,cell);S.sortUndo={grid:true,positions:drag.before};}
 } else {
  const row=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-collection-tool]'),targetId=row?.dataset.collectionTool;
  const ids=S.overlay?.kind==='collection-open'?collectionFolder(S.overlay.id)?.members:S.toolOrder;
  if(ids&&targetId&&drag.id!==targetId){const from=ids.indexOf(drag.id),to=ids.indexOf(targetId);if(from>=0&&to>=0){ids.splice(from,1);ids.splice(to,0,drag.id);}}
 }
 render();toast('整理已保存');
}
document.addEventListener('pointerup',event=>collectionDragFinish(event));
document.addEventListener('pointercancel',event=>collectionDragFinish(event,true));
document.addEventListener('click',event=>{if(performance.now()<collectionBlockClick){event.preventDefault();event.stopImmediatePropagation();}},true);
