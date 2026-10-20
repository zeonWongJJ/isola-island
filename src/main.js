import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createIcons, Shell, Image, Sun, Sunset, MoonStar, Navigation, Plus, Minus, Scan, Maximize, Minimize, Play, Pause, ArrowUpRight, MapPin, Mouse, Rotate3d, X, TowerControl, Waves, House, Wheat, Store, Anchor, Umbrella, Gem, Castle, Mountain, Expand, Shrink, Map, ChevronUp } from 'lucide';
import { buildWorld } from './world.js';
import { CAVE } from './cave-layout.js';
import { createAtmosphere } from './atmosphere.js';
import { PORT, REMOTE, PIRATE } from './layout.js';
import { createViewerUI } from './viewer-ui.js';
import { fitPlaceCamera, applyViewportOffset, PLACE_BOUNDS, OVERVIEW_POINTS, OVERVIEW_LOOK, MAX_ORBIT_DISTANCE } from './camera-framing.js';
import './style.css';
import './viewer.css';
const icons={Shell,Image,Sun,Sunset,MoonStar,Navigation,Plus,Minus,Scan,Maximize,Minimize,Play,Pause,ArrowUpRight,MapPin,Mouse,Rotate3d,X,TowerControl,Waves,House,Wheat,Store,Anchor,Umbrella,Gem,Castle,Mountain,Expand,Shrink,Map,ChevronUp};
const paintIcons=()=>createIcons({icons});paintIcons();
const places=[
 {name:'山顶灯塔',en:'THE LIGHTHOUSE',icon:'tower-control',pos:[-.4,13.7,-5.1],look:[-.4,10.2,-4.5],offset:[8,5,11],desc:'沿石阶登上最高处。白色灯塔守望远海，暖色塔顶、环形护栏与山顶观景台尽收眼底。'},
 {name:'山顶瞭望台',en:'THE LOOKOUT',icon:'mountain',pos:[2.05,10.8,-4.8],look:[1,8.8,-4.3],offset:[8,4,8],desc:'木亭、绳索护栏与崖边小路相连。转动视角，眺望层叠山崖和海面上的点点帆影。'},
 {name:'瀑布与湖泊',en:'THE CASCADES',icon:'waves',pos:[1,5.7,.8],look:[.9,5.5,-.5],offset:[7,7.5,14],desc:'山泉从高处落入两层碧蓝水潭。木桥跨过水道，桥头的石台阶接入山间步道，水花与涟漪在桥下流动。'},
 {name:'海岛居民区',en:'THE VILLAGE',icon:'house',pos:[4.1,4.3,3.7],look:[2.5,2.7,3.8],offset:[7,4,10],desc:'橙色瓦顶与蓝色屋顶错落相间。木梁、百叶窗、烟囱、门廊和窗台花箱，藏着小镇的日常。'},
 {name:'农场与果园',en:'THE ORCHARD',icon:'wheat',pos:[-5,4.2,2],look:[-5.3,4,1],offset:[-7,5,9],desc:'沿木栅栏走进整齐的菜畦，果树上结着小小的果实。山坡风车缓缓转动，花丛点缀田间小径。'},
 {name:'市集广场',en:'THE MARKET',icon:'store',pos:[1.1,3.5,4.95],look:[1.2,2.45,5.2],offset:[3,5,10],desc:'从沙滩石阶走进市集，绕过喷泉便可抵达两侧住宅。彩色摊位沿步道退让布置，低矮石栏围出临海广场。'},
 {name:'帆船与港口',en:'THE HARBOUR',icon:'anchor',pos:[PORT.ship.x,5.2,PORT.ship.z],look:[6.4,2.3,11.8],offset:[9,5,11],desc:'三桅帆船停靠伸入海湾的木码头。风帆、缆绳、桅杆、船舷与甲板层次分明，小舟随海浪轻轻起伏。'},
 {name:'沙滩营地',en:'THE BEACH',icon:'umbrella',pos:[PORT.umbrella.x,2.3,PORT.umbrella.z],look:[-4.8,1.2,7.8],offset:[-4,4,10],desc:'棕榈树沿着弯曲的浅色海岸伸展，条纹阳伞与小栈桥散落沙滩。放慢一点，看浪花围着礁石荡开。'},
 {name:'神秘洞穴',en:'THE BLUE GROTTO',icon:'gem',pos:[CAVE.x+.25,3.65,CAVE.z],look:[8.45,1.75,CAVE.z],offset:[8.4,1.65,1.5],desc:'东侧崖壁中藏着一片幽蓝。岩洞里生长着发光晶体，木栈桥通向水边，星夜时更显神秘。'},
 {name:'远海遗迹',en:'THE LOST ISLET',icon:'castle',pos:[REMOTE.x,3.7,REMOTE.z-.2],look:[REMOTE.x,1.8,REMOTE.z-.2],offset:[6,5,9],desc:'主岛之外，棕榈环绕着一座古老石砌遗迹。残缺拱门、断柱、碎石与攀爬藤蔓，静静等待来访。'},
 {name:'黑潮海盗船',en:'THE BLACK TIDE',icon:'anchor',pos:[PIRATE.x,10.9,PIRATE.z],look:PIRATE.look,offset:PIRATE.offset,desc:'黑潮号静泊在岛外。黑帆与骷髅纹章迎着海风，绳梯通向瞭望台；绕到船尾，看看窗廊、舵轮和亮着暖灯的甲板。'}
];
const placeCount=places.length;
document.documentElement.style.setProperty('--destination-count',placeCount);
document.querySelector('#explore-count').textContent=`${placeCount} 个目的地`;
document.querySelector('#drawer-summary').textContent=`${placeCount} 个目的地`;
document.querySelector('#place-number').textContent=`01 — ${placeCount}`;
const destinations=document.querySelector('#destinations'),markersWrap=document.querySelector('#markers');
places.forEach((p,i)=>{const button=document.createElement('button');button.className='destination';button.dataset.index=i;button.innerHTML=`<div><span class="index">${String(i+1).padStart(2,'0')}</span><i data-lucide="${p.icon}"></i></div><strong>${p.name}</strong><span class="english">${p.en}</span>`;button.addEventListener('click',()=>selectPlace(i));destinations.append(button);const m=document.createElement('button');m.className='marker';m.textContent=String(i+1).padStart(2,'0');m.setAttribute('aria-label',`查看${p.name}`);m.dataset.label=p.name;m.addEventListener('click',()=>selectPlace(i));markersWrap.append(m);p.marker=m;p.vector=new THREE.Vector3(...p.pos)});paintIcons();
const canvas=document.querySelector('#world');let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});}catch(e){document.querySelector('#loading p').textContent='当前浏览器未启用 WebGL，请启用硬件加速后重新打开。';throw e}
renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.75));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.22;
const scene=new THREE.Scene();scene.background=new THREE.Color(0xc1e3e1);scene.fog=new THREE.FogExp2(0xc1e3e1,.003);
const camera=new THREE.PerspectiveCamera(37,innerWidth/innerHeight,.1,1800);const defaultLook=new THREE.Vector3(...OVERVIEW_LOOK),defaultOffset=new THREE.Vector3(29,7,38);
const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.065;controls.minDistance=5;controls.maxDistance=MAX_ORBIT_DISTANCE;controls.minPolarAngle=.12;controls.maxPolarAngle=Math.PI*.49;controls.target.copy(defaultLook);controls.autoRotateSpeed=.45;controls.screenSpacePanning=false;controls.zoomSpeed=.75;controls.panSpeed=.55;
function overviewOffset(){return defaultOffset.clone().multiplyScalar(Math.max(1,Math.pow(1.3/camera.aspect,.8))*(innerWidth<700?1.04:1))}
camera.position.copy(defaultLook).add(overviewOffset());controls.update();
const hemi=new THREE.HemisphereLight(0xd5f3ff,0xa1a971,2.25);scene.add(hemi);const sun=new THREE.DirectionalLight(0xfff0d4,3.6);sun.position.set(-18,33,20);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-26,right:26,top:26,bottom:-26,near:1,far:100});sun.shadow.normalBias=.045;sun.shadow.bias=-.00015;sun.shadow.radius=3;scene.add(sun);const fill=new THREE.DirectionalLight(0xc2e9ef,.8);fill.position.set(15,10,-15);scene.add(fill);
const atmosphere=createAtmosphere(scene,renderer.getPixelRatio());
let world;try{world=buildWorld(scene);}catch(error){document.querySelector('#loading p').textContent='场景载入遇到问题，请刷新页面重试。';console.error(error);throw error;}
const themes={day:{bg:0xc1e3e1,sea:0x469eab,sun:0xffefd3,sunPower:2.6,hemi:1.6,exposure:1.08,glow:.15,night:0},sunset:{bg:0xe5b69a,sea:0x7d9f9e,sun:0xffae62,sunPower:3.1,hemi:1.25,exposure:1.13,glow:1.35,night:.17},night:{bg:0x112c43,sea:0x153d5a,sun:0x8cb7ed,sunPower:.68,hemi:.34,exposure:.93,glow:2.2,night:1}};
let currentTheme='day',night=0,labels=true,selected=-1,flight=null,auto=false,touring=false,tourTimer,toastTimer,themeTarget=themes.day;
let cameraManaged=true,viewRect;
const viewer=createViewerUI({onLayoutChange:()=>refreshFraming({duration:650}),paintIcons,placeCount});
function refreshFraming({duration=650,immediate=false}={}){
 camera.aspect=innerWidth/innerHeight;viewRect=viewer.safeViewport();applyViewportOffset(camera,viewRect,innerWidth,innerHeight);
 if(!cameraManaged)return;
 const p=selected>=0?places[selected]:null,offset=p?p.offset:defaultOffset.toArray();
 const framing=fitPlaceCamera({look:p?p.look:defaultLook.toArray(),offset,bounds:p?PLACE_BOUNDS[selected]:null,points:p?null:OVERVIEW_POINTS,viewport:viewRect,width:innerWidth,height:innerHeight,fov:camera.fov,minDistance:new THREE.Vector3(...offset).length()*(p ? .82 : 1)});
 flyTo(framing.target,framing.position,immediate?0:duration);
}
function showToast(text){const el=document.querySelector('#toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2400)}
function setTheme(name){atmosphere.setTheme(name);currentTheme=name;themeTarget=themes[name];document.body.dataset.theme=name;document.querySelectorAll('[data-time]').forEach(b=>{const active=b.dataset.time===name;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active)});if(name==='sunset')sun.position.set(-30,12,-14);else if(name==='night')sun.position.set(-10,25,-15);else sun.position.set(-18,33,20)}
function flyTo(target,position,duration=1600){controls.autoRotate=false;if(!duration||matchMedia('(prefers-reduced-motion:reduce)').matches){camera.position.copy(position);controls.target.copy(target);flight=null;controls.update();controls.autoRotate=auto;return;}flight={from:camera.position.clone(),fromTarget:controls.target.clone(),target:target.clone(),position:position.clone(),start:performance.now(),duration};}
function updateTourButton(){document.querySelector('#tour').innerHTML=`<span><i data-lucide="${touring?'pause':'play'}"></i>${touring?'暂停环岛漫游':'开启环岛漫游'}</span><i data-lucide="arrow-up-right"></i>`;paintIcons()}
function stopTour(){touring=false;clearTimeout(tourTimer);updateTourButton()}
function selectPlace(i,fromTour=false){if(!fromTour)stopTour();selected=i;cameraManaged=true;const p=places[i];document.querySelectorAll('.destination').forEach((b,j)=>{b.classList.toggle('active',i===j);b.setAttribute('aria-current',i===j?'location':'false')});places.forEach((p,j)=>p.marker.classList.toggle('selected',i===j));document.querySelector('#place-kicker').textContent=p.en;document.querySelector('#place-number').textContent=`${String(i+1).padStart(2,'0')} — ${placeCount}`;document.querySelector('#place-title').textContent=p.name;document.querySelector('#place-description').textContent=p.desc;viewer.selectPlace(p.name);refreshFraming({duration:1600});if(!viewer.compact)document.querySelector(`.destination[data-index="${i}"]`).scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});}
function home(){stopTour();selected=-1;cameraManaged=true;document.querySelectorAll('.destination').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-current','false')});places.forEach(p=>p.marker.classList.remove('selected'));document.querySelector('#place-kicker').textContent='THE ISLAND JOURNAL';document.querySelector('#place-number').textContent=`01 — ${placeCount}`;document.querySelector('#place-title').textContent='每一处，都值得停留。';document.querySelector('#place-description').textContent='从山顶的灯塔，到藏在崖壁里的蓝色洞穴。选一处风景，开始你的海岛漫游。';viewer.home();refreshFraming({duration:1600});}
function tourNext(){if(!touring)return;selectPlace((selected+1)%places.length,true);tourTimer=setTimeout(tourNext,7000)}
document.querySelectorAll('[data-time]').forEach(b=>b.addEventListener('click',()=>setTheme(b.dataset.time)));
document.querySelector('#tour').addEventListener('click',()=>{if(touring)stopTour();else{touring=true;updateTourButton();tourNext()}});
document.querySelector('#reset').addEventListener('click',home);document.querySelector('#brand-home').addEventListener('click',e=>{e.preventDefault();home()});
function zoom(factor){flight=null;cameraManaged=false;const offset=camera.position.clone().sub(controls.target);offset.multiplyScalar(factor).clampLength(controls.minDistance,controls.maxDistance);camera.position.copy(controls.target).add(offset);controls.update()}
document.querySelector('#zoom-in').addEventListener('click',()=>zoom(.82));document.querySelector('#zoom-out').addEventListener('click',()=>zoom(1.22));
document.querySelector('#labels-toggle').addEventListener('click',e=>{labels=!labels;markersWrap.style.display=labels?'':'none';e.currentTarget.setAttribute('aria-pressed',labels);e.currentTarget.querySelector('span').textContent=labels?'地标已显示':'地标已隐藏'});
document.querySelector('#auto-rotate').addEventListener('click',e=>{auto=!auto;controls.autoRotate=auto;e.currentTarget.setAttribute('aria-pressed',auto);e.currentTarget.querySelector('span').textContent=auto?'暂停环绕':'自动环绕';showToast(auto?'海风带你环岛一周':'已暂停自动环绕')});
const dialog=document.querySelector('#reference-dialog');document.querySelector('#reference-button').addEventListener('click',()=>dialog.showModal());document.querySelector('#close-reference').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
document.querySelector('#fullscreen').addEventListener('click',async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen()}catch{showToast('当前浏览器不支持全屏，可放大浏览器窗口查看')}});
document.addEventListener('fullscreenchange',()=>{document.querySelector('#fullscreen').innerHTML=`<i data-lucide="${document.fullscreenElement?'minimize':'maximize'}"></i>`;paintIcons()});
controls.addEventListener('start',()=>{flight=null;cameraManaged=false;if(touring)stopTour()});
canvas.addEventListener('keydown',e=>{const offset=camera.position.clone().sub(controls.target);const spherical=new THREE.Spherical().setFromVector3(offset);let handled=true;switch(e.key){case'ArrowLeft':spherical.theta+=.12;break;case'ArrowRight':spherical.theta-=.12;break;case'ArrowUp':spherical.phi=Math.max(.12,spherical.phi-.09);break;case'ArrowDown':spherical.phi=Math.min(Math.PI*.49,spherical.phi+.09);break;case'+':case'=':zoom(.9);break;case'-':zoom(1.1);break;case'Home':home();break;default:handled=false}if(handled){e.preventDefault();if(e.key.startsWith('Arrow')){cameraManaged=false;camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));flight=null;controls.update()}}});
let resizeFrame;window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>refreshFraming({duration:450}));});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();showToast('图形渲染已中断，请刷新页面恢复海岛。')});
const targetColor=new THREE.Color();let frame=0,lastTime=performance.now();const clock=new THREE.Clock();
refreshFraming({immediate:true});
function animate(){requestAnimationFrame(animate);const t=clock.getElapsedTime();const now=performance.now(),dt=Math.min((now-lastTime)/1000,.05);lastTime=now;
 if(flight){let p=Math.min(1,(now-flight.start)/flight.duration);p=p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;camera.position.lerpVectors(flight.from,flight.position,p);controls.target.lerpVectors(flight.fromTarget,flight.target,p);if(p>=1){flight=null;controls.autoRotate=auto}}
 controls.update();atmosphere.update(t,dt,camera);world.setAtmosphere(atmosphere);const k=1-Math.exp(-dt*3);scene.background.lerp(targetColor.set(themeTarget.bg),k);scene.fog.color.copy(scene.background);world.seaMat.color.lerp(targetColor.set(themeTarget.sea),k);sun.color.lerp(targetColor.set(themeTarget.sun),k);sun.intensity+=(themeTarget.sunPower-sun.intensity)*k;hemi.intensity+=(themeTarget.hemi-hemi.intensity)*k;renderer.toneMappingExposure+=(themeTarget.exposure-renderer.toneMappingExposure)*k;night+=(themeTarget.night-night)*k;world.glowMats.forEach(m=>m.emissiveIntensity+=(Math.max(themeTarget.glow*(1+((m.userData.nightMultiplier||1)-1)*night),m.userData.minGlow||0)-m.emissiveIntensity)*k);world.fallMaterial.uniforms.tint.value.lerp(targetColor.set(currentTheme==='night'?0x298dcd:0x46d9ed),k);world.update(t,night,camera);fill.intensity+=(.8-night*.56-fill.intensity)*k;fill.color.set(0xc2e9ef).lerp(targetColor.set(0x779cce),night);hemi.color.set(0xd5f3ff).lerp(targetColor.set(0x7199cd),night);hemi.groundColor.set(0xa1a971).lerp(targetColor.set(0x172a43),night);
 if(labels&&!viewer.immersive&&frame%2===0){places.forEach(p=>{const pos=p.vector.clone().project(camera);const x=(pos.x*.5+.5)*innerWidth,y=(-pos.y*.5+.5)*innerHeight;const visible=pos.z<1&&pos.z>0&&x>viewRect.x&&x<viewRect.x+viewRect.width&&y>viewRect.y&&y<viewRect.y+viewRect.height&&camera.position.distanceTo(p.vector)<camera.position.distanceTo(controls.target)+9;p.marker.style.left=x+'px';p.marker.style.top=y+'px';p.marker.style.opacity=visible?'1':'0';p.marker.style.pointerEvents=visible?'auto':'none';p.marker.setAttribute('tabindex',visible?'0':'-1')})}
 const angle=Math.atan2(camera.position.x-controls.target.x,camera.position.z-controls.target.z)*180/Math.PI;const needle=document.querySelector('#compass-needle');if(needle)needle.style.transform=`rotate(${-angle-45}deg)`;
 renderer.render(scene,camera);frame++;
 if(frame===3){document.querySelector('#loading').classList.add('done');window.__islandReady=true;window.__islandStats={details:world.details,triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls};}
}
animate();
