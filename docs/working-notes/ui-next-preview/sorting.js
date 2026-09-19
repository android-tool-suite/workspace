// Pointer position, layout order and animation are separate so scrolling and scaling stay accurate.
const sortAnimations=new WeakMap();
let sortSettling=false;
const sortDuration=n=>matchMedia('(prefers-reduced-motion: reduce)').matches?0:n;
const sortRegion=group=>ui.content.querySelector(`[data-sort-region="${group}"]`);
const sortNodes=group=>[...(sortRegion(group)?.querySelectorAll('[data-sortable]')||[])];
const sortKey=group=>group==='home'?'homeOrder':'toolOrder';
function sortHint(group){return S.sortMode===group?`<div class="sort-hint">${icon('move')}<span>拖动调整位置<small>也可用方向键移动，Esc 取消拖动</small></span>${btn('撤销','sort-undo','text small','history',S.sortUndo?.group!==group)}</div>`:'';}
function sortGrip(){return `<span class="sort-grip" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor">${[7,12,17].map(y=>`<circle cx="9" cy="${y}" r="1.6"/><circle cx="15" cy="${y}" r="1.6"/>`).join('')}</svg></span>`;}
function announceSort(message){document.getElementById('sort-live').textContent=message;}
function animateSortLayout(group,mutation,skip=null){
 const nodes=sortNodes(group),before=new Map(nodes.map(el=>[el,el.getBoundingClientRect()])),scale=previewScale();
 nodes.forEach(el=>sortAnimations.get(el)?.cancel());mutation();
 for(const el of nodes){if(el===skip)continue;const a=before.get(el),b=el.getBoundingClientRect(),dx=(a.left-b.left)/scale,dy=(a.top-b.top)/scale;if(Math.abs(dx)+Math.abs(dy)<.5)continue;
  const animation=el.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:'translate(0,0)'}],{duration:sortDuration(230),easing:'cubic-bezier(.2,.85,.2,1)'});sortAnimations.set(el,animation);
 }
}
function saveVisibleOrder(group,before){
 const visible=sortNodes(group).map(el=>el.dataset.tile),set=new Set(visible),queue=[...visible];
 S[sortKey(group)]=before.map(id=>set.has(id)?queue.shift():id);
 S.sortUndo={group,before:[...before]};
}
function undoSort(){
 const undo=S.sortUndo;if(!undo)return;const current=S[sortKey(undo.group)],restored=[...undo.before.filter(id=>current.includes(id)),...current.filter(id=>!undo.before.includes(id))];S[sortKey(undo.group)]=restored;S.sortUndo=null;
 const region=sortRegion(undo.group);if(region){const nodes=new Map(sortNodes(undo.group).map(el=>[el.dataset.tile,el]));animateSortLayout(undo.group,()=>restored.forEach(id=>{if(nodes.has(id))region.append(nodes.get(id));}));updateSortUndoControl();}else render();
 announceSort('已撤销上一次排序');toast('已恢复上一次顺序');
}
function updateSortUndoControl(){const control=ui.content.querySelector('[data-action="sort-undo"]');if(control)control.disabled=S.sortUndo?.group!==S.sortMode;}
function nudgeSort(group,id,delta,first=false){
 const region=sortRegion(group),nodes=sortNodes(group),index=nodes.findIndex(el=>el.dataset.tile===id);if(!region||index<0)return;
 const target=first?0:Math.max(0,Math.min(nodes.length-1,index+delta));if(index===target)return;
 const before=[...S[sortKey(group)]],node=nodes[index];S.overlay=null;renderOverlay();
 animateSortLayout(group,()=>{if(target>index)region.insertBefore(node,nodes[target].nextSibling);else region.insertBefore(node,nodes[target]);});
 saveVisibleOrder(group,before);updateSortUndoControl();node.focus({preventScroll:true});announceSort(`${PLUGINS[id].short}，第 ${target+1} / ${nodes.length} 位`);toast('顺序已调整','sort-undo','撤销');
}
function startSortDrag(d){
 if(dragState!==d||!d.tile.isConnected)return;
 d.active=true;const bounds=d.tile.getBoundingClientRect(),point=devicePoint(bounds.left,bounds.top);
 d.offsetX=(d.x-bounds.left)/d.scale;d.offsetY=(d.y-bounds.top)/d.scale;
 d.ghost=document.createElement('div');d.ghost.className='sort-ghost';d.ghost.setAttribute('aria-hidden','true');d.ghost.style.width=d.tile.offsetWidth+'px';d.ghost.style.height=d.tile.offsetHeight+'px';
 const clone=d.tile.cloneNode(true);clone.classList.add('sort-preview');clone.removeAttribute('data-sortable');clone.removeAttribute('data-action');clone.removeAttribute('id');clone.tabIndex=-1;clone.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));clone.querySelectorAll('[data-action]').forEach(el=>el.removeAttribute('data-action'));
 d.ghost.append(clone);d.ghost.style.transform=`translate3d(${point.x}px,${point.y}px,0)`;ui.device.append(d.ghost);
 d.tile.classList.add('sort-placeholder');ui.device.classList.add('sorting-active');
 try{d.tile.setPointerCapture(d.pointerId);}catch{}
 d.frame=requestAnimationFrame(time=>{if(dragState!==d)return;d.ghost.classList.add('is-lifted');sortFrame(time);});
 announceSort(`已提起${PLUGINS[d.id].short}，拖动选择新位置`);
}
function sortFrame(time){
 const d=dragState;if(!d?.active)return;
 const dt=Math.min(32,time-(d.lastFrame||time-16));d.lastFrame=time;
 const content=ui.content.getBoundingClientRect(),canvas=document.getElementById('canvas-area'),canvasRect=canvas.getBoundingClientRect(),top=Math.max(content.top,canvasRect.top),bottom=Math.min(content.bottom,canvasRect.bottom),edge=48*d.scale;
 if(d.moved&&d.lastX>=content.left&&d.lastX<=content.right){
  const zone=d.lastY<top+edge?-Math.min(1,(top+edge-d.lastY)/edge):d.lastY>bottom-edge?Math.min(1,(d.lastY-bottom+edge)/edge):0;
  if(zone){const previous=ui.content.scrollTop;ui.content.scrollTop+=zone*10*dt/16;if(Math.abs(previous-ui.content.scrollTop)<.1)canvas.scrollTop+=zone*8*d.scale*dt/16;}
 }
 const point=devicePoint(d.lastX,d.lastY);d.ghost.style.transform=`translate3d(${point.x-d.offsetX}px,${point.y-d.offsetY}px,0)`;
 if(d.moved&&time-(d.lastSwap||0)>85&&d.lastY>=top&&d.lastY<=bottom){
  const region=sortRegion(d.group),rr=region.getBoundingClientRect(),nodes=sortNodes(d.group);
  const layout=el=>({left:rr.left+el.offsetLeft*d.scale,top:rr.top+el.offsetTop*d.scale,width:el.offsetWidth*d.scale,height:el.offsetHeight*d.scale});
  const source=layout(d.tile),inside=(r)=>d.lastX>=r.left&&d.lastX<=r.left+r.width&&d.lastY>=r.top&&d.lastY<=r.top+r.height;
  if(!inside(source)){
   const target=nodes.find(el=>el!==d.tile&&inside(layout(el)));
   if(target){const r=layout(target),horizontal=r.width<rr.width*.8&&Math.abs(r.top-source.top)<24*d.scale,after=horizontal?d.lastX>r.left+r.width/2:d.lastY>r.top+r.height/2;
    const current=nodes.indexOf(d.tile),targetIndex=nodes.indexOf(target),next=targetIndex+(after?1:0)-(current<targetIndex?1:0);
    if(next!==current){animateSortLayout(d.group,()=>region.insertBefore(d.tile,after?target.nextSibling:target),d.tile);d.lastSwap=time;d.changed=true;announceSort(`${PLUGINS[d.id].short}，第 ${next+1} / ${nodes.length} 位`);}
   }
  }
 }
 d.frame=requestAnimationFrame(sortFrame);
}
function flushSortBackground(){if(backgroundRenderPending){backgroundRenderPending=false;requestAnimationFrame(renderBackground);}}
function endDrag(cancelled=false,silent=false){
 clearTimeout(longPressTimer);const d=dragState;dragState=null;if(!d)return;cancelAnimationFrame(d.frame);if(!d.active){flushSortBackground();return;}
 try{d.tile.releasePointerCapture(d.pointerId);}catch{}
 suppressClickUntil=performance.now()+550;
 const bounds=ui.content.getBoundingClientRect();if(d.lastX<bounds.left||d.lastX>bounds.right||d.lastY<bounds.top||d.lastY>bounds.bottom)cancelled=true;
 const region=sortRegion(d.group);if(cancelled&&region){const map=new Map(sortNodes(d.group).map(el=>[el.dataset.tile,el]));animateSortLayout(d.group,()=>d.originalVisible.forEach(id=>{if(map.has(id))region.append(map.get(id));}),d.tile);}
 const order=sortNodes(d.group).map(el=>el.dataset.tile),changed=!cancelled&&JSON.stringify(order)!==JSON.stringify(d.originalVisible);
 if(changed)saveVisibleOrder(d.group,d.before);
 const finish=()=>{d.ghost?.remove();d.tile.classList.remove('sort-placeholder');ui.device.classList.remove('sorting-active');sortSettling=false;updateSortUndoControl();flushSortBackground();
  if(changed){announceSort(`${PLUGINS[d.id].short}已放置，排序完成`);toast('顺序已保存到当前预览','sort-undo','撤销');}
  else if(cancelled&&!silent)announceSort('已取消拖动，原顺序保留');
  else if(!cancelled&&!d.moved&&!silent)openTileMenu(d.tile,d.lastX,d.lastY);
 };
 if(silent||!d.tile.isConnected){finish();return;}
 const target=d.tile.getBoundingClientRect(),p=devicePoint(target.left,target.top);sortSettling=true;d.ghost.classList.remove('is-lifted');
 d.ghost.animate([{transform:d.ghost.style.transform},{transform:`translate3d(${p.x}px,${p.y}px,0)`}],{duration:sortDuration(180),easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'}).finished.then(finish,finish);
}
document.addEventListener('pointerdown',e=>{
 const tile=e.target.closest('[data-sortable]');if(!tile||S.overlay||e.button!==0||sortSettling)return;
 const group=tile.dataset.sortable;dragState={tile,id:tile.dataset.tile,group,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,scale:previewScale(),pointerId:e.pointerId,before:[...S[sortKey(group)]],originalVisible:sortNodes(group).map(el=>el.dataset.tile),active:false,moved:false};
 const d=dragState;clearTimeout(longPressTimer);if(S.sortMode===group)startSortDrag(d);else longPressTimer=setTimeout(()=>startSortDrag(d),420);
});
document.addEventListener('pointermove',e=>{const d=dragState;if(!d)return;d.lastX=e.clientX;d.lastY=e.clientY;const distance=Math.hypot(e.clientX-d.x,e.clientY-d.y)/d.scale;
 if(!d.active){if(distance>10){clearTimeout(longPressTimer);dragState=null;suppressClickUntil=performance.now()+250;}return;}
 if(distance>5)d.moved=true;if(d.moved)e.preventDefault();
},{passive:false});
document.addEventListener('touchmove',e=>{if(dragState?.active)e.preventDefault();},{passive:false});
document.addEventListener('pointerup',()=>endDrag());document.addEventListener('pointercancel',()=>endDrag(true));
window.addEventListener('blur',()=>endDrag(true,true));
