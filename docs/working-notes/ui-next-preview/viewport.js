// The phone is laid out at a fixed logical resolution. Only the surrounding
// review canvas scales; browser window height never changes app layout height.
const DEVICE_PROFILES = {
 phone: {width:412,height:916,ratio:'约 20:9'},
 compact: {width:360,height:800,ratio:'20:9'},
 wide: {width:960,height:720,ratio:'4:3'}
};
let viewportFrame=0,lastViewportScale=1;

function previewScale(){
 const width=ui.device.offsetWidth;
 return width>0?ui.device.getBoundingClientRect().width/width:1;
}
function devicePoint(clientX,clientY){
 const bounds=ui.device.getBoundingClientRect(),scale=previewScale()||1;
 return {x:(clientX-bounds.left)/scale-ui.device.clientLeft,y:(clientY-bounds.top)/scale-ui.device.clientTop};
}
function applyViewportProfile(){
 const profile=DEVICE_PROFILES[S.size]||DEVICE_PROFILES.phone;
 ui.device.style.setProperty('--device-width',profile.width+'px');
 ui.device.style.setProperty('--device-height',profile.height+'px');
 document.getElementById('zoom-choice').value=S.zoom||'fit';
 scheduleViewportFit();
}
function scheduleViewportFit(){
 if(viewportFrame)return;
 viewportFrame=requestAnimationFrame(()=>{viewportFrame=0;fitPreviewViewport();});
}
function fitPreviewViewport(){
 const area=document.getElementById('canvas-area'),frame=document.getElementById('device-viewport');
 if(!area||!frame)return;
 const profile=DEVICE_PROFILES[S.size]||DEVICE_PROFILES.phone,style=getComputedStyle(area);
 const width=Math.max(1,area.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight));
 const height=Math.max(1,area.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom));
 const manual={'75':.75,'100':1,'125':1.25}[S.zoom];
 const raw=manual??Math.max(.1,Math.min(1,width/profile.width,height/profile.height));
 const scale=Math.floor(raw*1000)/1000;
 if(Math.abs(lastViewportScale-scale)>.0001&&dragState)endDrag(true);
 lastViewportScale=scale;
 frame.style.width=profile.width*scale+'px';
 frame.style.height=profile.height*scale+'px';
 frame.style.borderRadius=(S.size==='wide'?22:36)*scale+'px';
 ui.device.style.setProperty('--preview-scale',scale);
 const metrics=document.getElementById('device-metrics');
 metrics.textContent=`${profile.width} × ${profile.height} 逻辑画布 · ${profile.ratio} · 显示 ${Math.round(scale*100)}%`;
 metrics.title='手机长宽比例固定。100% 表示一个逻辑单位对应一个浏览器 CSS 像素，不代表显示器上的物理尺寸与真机相同。';
}
function setupViewport(){
 new ResizeObserver(scheduleViewportFit).observe(document.getElementById('canvas-area'));
 window.addEventListener('resize',scheduleViewportFit);
}
