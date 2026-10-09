// Preview instances use the same ownership model as the host; sample business data stays in its source account.
const WIDGET_PRESETS={phi:[['rks','RKS 趋势'],['rks-number','RKS 数值']],gacha:[['summary','单池进度'],['pools','多池概览'],['records','记录概况']]};
function ensureWidgetInstances(){
 S.widgetInstances??={};S.quickPins??=[];
 for(const id of S.homeOrder)if(!S.widgetInstances[id])S.widgetInstances[id]={plugin:id,preset:WIDGET_PRESETS[id]?.[0][0]||'status',account:id==='phi'?currentPhi()?.id:id==='gacha'?currentGacha()?.id:'',days:'30',pools:['character','weapon'],pool:'character',game:'all'};
}
function widgetPlugin(id){return S.widgetInstances?.[id]?.plugin||id;}
function widgetTitle(id){const p=widgetPlugin(id),w=S.widgetInstances?.[id];return WIDGET_PRESETS[p]?.find(t=>t[0]===w?.preset)?.[1]||PLUGINS[p]?.short||'小部件';}
function widgetSpark(points){
 if(!points.length)return '<small>此范围暂无历史</small>';
 if(points.length===1)return '<svg class="tile-spark" viewBox="0 0 160 40" aria-label="一条历史记录"><circle cx="80" cy="20" r="3" fill="currentColor"/></svg>';
 const low=Math.min(...points.map(p=>p.rks)),high=Math.max(...points.map(p=>p.rks)),begin=Date.parse(points[0].date),span=Math.max(1,Date.parse(points.at(-1).date)-begin);
 const path=points.map((p,i)=>`${i?'L':'M'}${3+154*(Date.parse(p.date)-begin)/span},${high===low?20:37-34*(p.rks-low)/(high-low)}`).join(' ');
 return `<svg class="tile-spark" viewBox="0 0 160 40" role="img" aria-label="${points.length} 个本地历史节点"><path d="${path}" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
}
function widgetBody(id){
 const w=S.widgetInstances[id],p=PLUGINS[w.plugin];
 if(!S.plugins[w.plugin]?.installed||!S.plugins[w.plugin].enabled)return `<strong>${esc(p.short)}</strong><p>插件未安装或已停用</p><small>配置已保留</small>`;
 if(w.plugin==='phi'){
  const account=S.phi.accounts.find(a=>a.id===w.account);
  if(!account)return '<strong>尚未配置档案</strong><small>长按卡片修改设置</small>';
  const points=isEmpty()?[]:HISTORY.filter(h=>!Number(w.days)||Date.parse(h.date)>=Date.UTC(2026,8,18)-(Number(w.days)-1)*86400000),delta=points.length>1?points.at(-1).rks-points[0].rks:null;
  const metric=`<span class="big-value">${isEmpty()?'—':(15.8236-(account.id==='p2'?3.3364:0)).toFixed(4)}</span><small>${esc(account.name)}</small><small>${w.days==='0'?'全部历史':`近 ${w.days} 天`} · ${delta===null?'历史不足':`${delta>=0?'+':''}${delta.toFixed(4)}`}</small>`;
  return `<span class="tile-title">${icon('chart')}${widgetTitle(id)}</span>${w.preset==='rks'&&S.wideTiles.includes(id)?`<span class="widget-wide-trend"><span>${metric}</span><span class="widget-trend-chart">${widgetSpark(points)}</span></span>`:metric+(w.preset==='rks'?widgetSpark(points):'')}`;

 }
 if(w.plugin==='gacha'){
  const accounts=S.gacha.accounts.filter(a=>w.game==='all'||a.game===w.game);
  if(w.preset==='records'){
   const records=accounts.flatMap(a=>S.gacha.recordSets?.[a.id]||[]).sort((a,b)=>b.date.localeCompare(a.date));
   return `<span class="tile-title">${icon('spark')}记录概况</span><div class="review-row">账号<strong>${accounts.length}</strong></div><div class="review-row">记录<strong>${records.length}</strong></div><small>${records[0]?`最新记录 ${records[0].date}`:'暂无本地记录'}</small>`;
  }
  const poolSummary=(account,type)=>{const pool=POOLS.find(p=>p.id===type),rows=(S.gacha.recordSets?.[account.id]||[]).filter(r=>r.pool===type).sort((a,b)=>b.date.localeCompare(a.date)),last=rows.findIndex(r=>r.rarity===5);return {pool,count:rows.length?last<0?rows.length:last:null};};
  if(w.preset==='pools'){
   previewPoolBindings(w);
   return '<span class="tile-title">'+icon('spark')+'原神 · 星穹铁道</span>'+w.pools.map(key=>{const [game,type]=key.split(':'),account=S.gacha.accounts.find(a=>a.id===w['account_'+game]);if(!account)return '<small>'+esc(game)+' · 账号已移除</small>';const {pool,count}=poolSummary(account,type);return '<div class="review-row"><span>'+esc(game)+' · '+esc(pool.label)+'</span><strong>'+(count===null?'—':count+'/'+pool.limit+' 抽')+'</strong></div>';}).join('');
  }
  const account=S.gacha.accounts.find(a=>a.id===w.account);if(!account)return '<strong>账号已移除</strong><small>长按卡片配置账号</small>';
  const heading='<span class="tile-title">'+icon('spark')+esc(account.game)+' · '+esc(account.uid)+'</span>';
  const {pool,count}=poolSummary(account,w.pool);return `${heading}<strong class="big-value">${count??'—'} <small>抽</small></strong><small>${esc(pool.label)}</small><div class="progress-track"><span style="width:${count===null?0:Math.min(100,count/pool.limit*100)}%"></span></div>`;
 }
 const [value,detail]=w.plugin==='access'?[S.services.filter(service=>service.enabled).length+' 个已启用',S.services.length+' 个服务']:w.plugin==='battery'?['82%','未充电 · 示例状态']:systemWidgetText(w.plugin);return `<span class="tile-title">${icon(p.icon)}${esc(p.short)}</span><strong>${esc(value)}</strong><small>${esc(detail)}</small>`;
}
function configuredHomeView(){
 ensureWidgetInstances();
 const ids=S.homeOrder.filter(id=>!S.hiddenWidgets.includes(id));
 const tiles=ids.map(id=>{const p=widgetPlugin(id);return `<button class="card home-tile ${S.wideTiles.includes(id)?'wide':''}" style="grid-column:span ${Number(S.widgetInstances[id]?.size?.split('x')[0]||2)};min-height:${Number(S.widgetInstances[id]?.size?.split('x')[1]||2)*72}px" data-tile="${id}" data-sortable="home" data-action="widget-open:${id}" aria-label="${esc(widgetTitle(id))}，长按配置或排列">${sortGrip()}${widgetBody(id)}</button>`;}).join('');
 const pins=S.quickPins.filter(id=>S.plugins[id]?.installed&&S.plugins[id].enabled);
 return {header:appBar('首页','Android Tool Suite','',true),html:`<div class="home-greeting"><div><h2>常用，一眼可见</h2></div><div class="actions">${btn(S.sortMode==='home'?'完成':'排列','sort-mode:home','text small')}${btn('小部件','add-widget','text small')}</div></div>${sortHint('home')}<div class="home-grid ${S.sortMode==='home'?'is-arranging':''}" data-sort-region="home">${tiles}</div>${pins.length?section('快速进入','你固定的工具')+`<div class="quick-tools">${pins.map(id=>`<div><button class="quick-tool" data-action="open:${id}">${mark(PLUGINS[id].icon,PLUGINS[id].color)}${esc(PLUGINS[id].short)}</button>${btn('管理',`quick-menu:${id}`,'text small')}</div>`).join('')}</div>`:''}`};
}
function openWidgetEditor(plugin,id){
 ensureWidgetInstances();const existing=id?S.widgetInstances[id]:null;
 S.widgetEditor={kind:'widget-config',plugin,id,draft:clone(existing||{plugin,preset:WIDGET_PRESETS[plugin]?.[0][0]||'status',account:plugin==='phi'?currentPhi()?.id:currentGacha()?.id,days:'30',pools:['character','weapon'],pool:'character',game:'all'}),wide:id?S.wideTiles.includes(id):false};S.widgetEditor.draft.size=existing?.size||(S.widgetEditor.wide?'4x2':'2x2');go('widgets/editor');
}
function widgetEditor(o){
 const w=o.draft;if(w.preset==='pools')w.size='4x2';const select=(key,label,options)=>`<label class="field">${label}<select class="input" data-widget-field="${key}">${options.map(([id,label])=>`<option value="${esc(id)}" ${String(w[key])===String(id)?'selected':''}>${esc(label)}</option>`).join('')}</select></label>`;
 const layouts=(WIDGET_PRESETS[o.plugin]||[['status','状态']]).flatMap(([preset,title])=>(preset==='pools'?['4x2']:['shizuku','access'].includes(o.plugin)?['1x1','1x2','2x1','2x2','4x2']:['2x2','4x2']).map(size=>[preset+'|'+size,title+' · '+size.replace('x','×')]));
 let body=`<label class="field">布局<select class="input" data-widget-layout>${layouts.map(([key,label])=>`<option value="${key}" ${key===w.preset+'|'+w.size?'selected':''}>${label}</option>`).join('')}</select></label>`;

 if(o.plugin==='phi')body+=select('account','固定档案',S.phi.accounts.map(a=>[a.id,a.name]))+select('days','历史范围',[['7','近7天'],['30','近30天'],['90','近90天'],['0','全部历史']]);
 if(o.plugin==='gacha'){
  if(w.preset==='records')body+=select('game','统计范围',[['all','全部游戏'],['原神','原神'],['星穹铁道','星穹铁道']]);
  else if(w.preset==='pools'){
   previewPoolBindings(w);
   for(const game of ['原神','星穹铁道'])body+=select('account_'+game,game+'固定账号',S.gacha.accounts.filter(a=>a.game===game).map(a=>[a.id,a.uid]));
   body+='<p>选择卡池（可跨游戏，最多四个）</p>'+['原神','星穹铁道'].map(game=>'<h3>'+game+'</h3>'+POOLS.map(p=>'<label class="review-row">'+p.label+'<input type="checkbox" data-widget-pool="'+game+':'+p.id+'" '+(w.pools.includes(game+':'+p.id)?'checked':'')+'></label>').join('')).join('');
  }else body+=select('account','固定账号',S.gacha.accounts.map(a=>[a.id,a.game+' · '+a.uid]))+select('pool','卡池',POOLS.map(p=>[p.id,p.label]));

 }

 return {title:o.id?'配置小部件':'添加小部件',sheet:true,body:body+notice('配置只作用于这张卡片；工具内浏览不改变首页。'),buttons:btn('取消','modal-close','outline')+btn('保存','widget-save')};
}
function saveWidgetEditor(){
 const o=S.widgetEditor||S.overlay,w=o.draft;if(w.preset==='pools'&&(!w.pools.length||w.pools.length>4)){toast('请选择一到四个卡池');return;}
 if(w.plugin==='phi'&&!S.phi.accounts.some(a=>a.id===w.account)||w.plugin==='gacha'&&w.preset==='summary'&&!S.gacha.accounts.some(a=>a.id===w.account)){toast('请选择有效账号');return;}
 const id=o.id||`${o.plugin}-${S.widgetSequence=(S.widgetSequence||0)+1}`;
 S.widgetInstances[id]=clone(w);if(!S.homeOrder.includes(id))S.homeOrder.push(id);if(!o.id)S.hiddenWidgets=S.hiddenWidgets.filter(x=>x!==id);
 if(w.size==='4x2'||w.preset==='pools'){if(!S.wideTiles.includes(id))S.wideTiles.push(id);}else S.wideTiles=S.wideTiles.filter(x=>x!==id);
 S.widgetEditor=null;closeOverlay(true);go('widgets',{replace:true,root:true});toast('小部件已保存');
}
document.addEventListener('change',event=>{
 const o=S.widgetEditor||S.overlay;if(o?.kind!=='widget-config')return;
 if(event.target.hasAttribute('data-widget-layout')){const [preset,size]=event.target.value.split('|');o.dirty=true;o.draft.preset=preset;o.draft.size=size;if(S.widgetEditor)render();else renderOverlay();return;}
 if(event.target.dataset.widgetField){o.dirty=true;o.draft[event.target.dataset.widgetField]=event.target.value;if(S.widgetEditor)render();else renderOverlay();}
 if(event.target.dataset.widgetPool){o.dirty=true;const id=event.target.dataset.widgetPool;o.draft.pools=event.target.checked?[...new Set([...o.draft.pools,id])]:o.draft.pools.filter(x=>x!==id);}
});

function widgetManagementView(sub){ensureWidgetInstances();
 if(sub==='editor'&&S.widgetEditor){const editor=widgetEditor(S.widgetEditor);return {header:appBar(editor.title),html:`<div class="content-limited widget-editor-page">${editor.body}</div>`,footer:`<div class="selection-footer">${btn('取消','back','outline')}${btn('保存','widget-save')}</div>`};}
 if(sub==='catalog'){const owners=Object.keys(PLUGINS).filter(id=>S.plugins[id].installed);return {header:appBar('添加小部件'),html:`<p class="page-intro">每張卡片单独配置内容与尺寸。</p>${owners.map(id=>section(PLUGINS[id].short)+(WIDGET_PRESETS[id]||[['status','状态']]).map(([type,title])=>row(PLUGINS[id].icon,title,S.plugins[id].enabled?'独立配置的首页卡片':'请先启用插件',S.plugins[id].enabled?`widget-create:${id}:${type}`:'noop')).join('')).join('')}`};}
 const ids=Object.keys(S.widgetInstances),owners=[...new Set(ids.map(id=>widgetPlugin(id)))];return {header:appBar('首页小部件','',btn('添加','go:widgets/catalog','text small')),html:`${section('已添加',ids.length+' 张独立卡片')}${owners.map(owner=>section(PLUGINS[owner]?.short||owner)+ids.filter(id=>widgetPlugin(id)===owner).map(id=>{const w=S.widgetInstances[id],account=owner==='phi'?S.phi.accounts.find(a=>a.id===w.account):S.gacha.accounts.find(a=>a.id===w.account),visible=!S.hiddenWidgets.includes(id);return `<div class="list-row"><button class="widget-setting-name grow" data-action="widget-config:${owner}:${id}"><strong>${esc(widgetTitle(id))}</strong><small>${account?esc(account.name)+' · ':''}${(w.size||(S.wideTiles.includes(id)?'4x2':'2x2')).replace('x','×')}</small></button><button class="widget-visibility-toggle" role="switch" aria-checked="${visible}" aria-label="在首页显示 ${esc(widgetTitle(id))}" data-action="widget-visibility:${id}">${visible?'显示':'隐藏'}</button>${ib('trash','移除小部件',`widget-remove:${id}`)}</div>`;}).join('')).join('')}`};
}

function openConfiguredWidget(id){let w=S.widgetInstances[id];if(!w)return;if(w.plugin==='phi'){if(!S.phi.accounts.some(a=>a.id===w.account)){toast('绑定档案已不存在，请重新配置');return;}S.phi.account=w.account;S.phi.trendDays=Number(w.days);showPlugin('phi');}
 else if(w.plugin==='gacha'){if(w.preset==='pools'){previewPoolBindings(w);const games=w.pools.map(key=>key.split(':')[0]),game=games.includes(currentGacha()?.game)?currentGacha().game:games[0];w={...w,account:w['account_'+game]};}const account=S.gacha.accounts.find(a=>a.id===w.account);if(w.preset==='records'){go('gacha/data');return;}if(!account){toast('绑定账号已不存在，请重新配置');return;}S.gacha.account=account.id;ensureGame(account.game);showPlugin('gacha');if(w.preset==='summary')go('gacha/pool/'+w.pool);}else showPlugin(w.plugin);}

function previewPoolBindings(w){
 const fallback=S.gacha.accounts.find(a=>a.id===w.account)||currentGacha();
 for(const game of ['原神','星穹铁道'])w['account_'+game]??=S.gacha.accounts.find(a=>a.game===game)?.id;
 w.pools=(w.pools||[]).map(key=>key.includes(':')?key:(fallback?.game||'原神')+':'+key);
}
