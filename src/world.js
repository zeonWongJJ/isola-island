import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createArchitecture } from './architecture.js';
import { createNature } from './nature.js';
import { createHarbor } from './harbor.js';
import { createWaterSystem } from './water.js';
import { CAVE, carveCaveOpening, inCaveApproach } from './cave-layout.js';
import { createNightLighting } from './night-lighting.js';
import { terraceGeometry, coastShape, terraceShape, terraceHeightAt } from './terrain.js';
import { createLifeDetails } from './life-details.js';
import { TERRACES, HOUSES, GARDENS, PORT, REMOTE, BRIDGES, WALK_STAIRS, MARKET, MARKET_PATHS } from './layout.js';
import { addSurfaceDetail } from './surface-detail.js';
import { carveWalkways } from './stair-cut.js';
import { createSeaIslets, SEA_STACKS } from './sea-islets.js';
import { createLandscapeDetails } from './landscape-detail.js';
import { stairBankGeometry } from './stair-banks.js';

export function buildWorld(scene){
 const staticWorld=new THREE.Group();scene.add(staticWorld);
 const animated=new THREE.Group();scene.add(animated);
 const A=createArchitecture(THREE), N=createNature(THREE), H=createHarbor(THREE);
 const D=createLifeDetails();
 let seed=70213;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const materials=new Map();
 const mat=(c)=>{if(!materials.has(c))materials.set(c,new THREE.MeshStandardMaterial({color:c,roughness:.9,flatShading:true}));return materials.get(c)};
 const boxGeo=new THREE.BoxGeometry(1,1,1),sphere=new THREE.IcosahedronGeometry(1,0);
 function add(o,x=0,y=0,z=0,s=1,r=0,parent=staticWorld){o.position.set(x,y,z);o.scale.multiplyScalar(s);o.rotation.y=r;parent.add(o);return o}
 function mesh(geo,material,x,y,z,sx=1,sy=1,sz=1){const o=new THREE.Mesh(geo,material);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;o.receiveShadow=true;staticWorld.add(o);return o}
 function box(x,y,z,w,h,d,c){return mesh(boxGeo,mat(c),x,y,z,w,h,d)}
 function line(points,color,r=.035,parent=staticWorld){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const o=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(8,points.length*3),r,5,false),mat(color));parent.add(o);return o}
 const layers=[],groundSurfaces=[],cliffSurfaces=[],uncutSurfaces=[];
 const terrainMaterial=addSurfaceDetail(new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}),'meadow');
 const cliffMaterial=addSurfaceDetail(new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true}),'cliff');
 function land(cx,cz,rx,rz,top,bottom,color=0x7e9f49,phase=0){
  const terrain=terraceGeometry(cx,cz,rx,rz,top,bottom,color,phase);
  uncutSurfaces.push(new THREE.Mesh(terrain.top.clone(),terrainMaterial));
  const ground=carveWalkways(carveCaveOpening(terrain.top)),normals=ground.getAttribute('normal');
  for(let i=0;i<normals.count;i++)normals.setXYZ(i,0,1,0);
  groundSurfaces.push(mesh(ground,terrainMaterial,0,0,0));cliffSurfaces.push(mesh(carveWalkways(carveCaveOpening(terrain.cliff)),cliffMaterial,0,0,0));
  layers.push({cx,cz,rx,rz,top,bottom,phase});return terrain.edge;
 }
 function disc(x,y,z,rx,rz,c){const o=mesh(new THREE.CircleGeometry(1,64),mat(c),x,y,z,rx,rz,1);o.rotation.x=-Math.PI/2;return o}
 // A broad warm beach wraps the village; limestone terraces rise toward the lighthouse.
 TERRACES.forEach(t=>land(...t));
 const heightAt=(x,z)=>terraceHeightAt(x,z,layers);
 const plantHasClearance=(x,z,y,radius=.5)=>{
  for(let i=0;i<8;i++){const a=i*Math.PI/4;if(heightAt(x+Math.cos(a)*radius,z+Math.sin(a)*radius)>y+.25||heightAt(x+Math.cos(a)*.16,z+Math.sin(a)*.16)<y-.25)return false;}
  return true;
 };
 const stairRoutes=WALK_STAIRS.map(({a,b,width})=>[a[0],a[2],b[0],b[2],width]);
 const nearStairs=(x,z,padding=.25)=>stairRoutes.some(([ax,az,bx,bz,width])=>{const dx=bx-ax,dz=bz-az,t=THREE.MathUtils.clamp(((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz),0,1);return Math.hypot(x-ax-t*dx,z-az-t*dz)<width/2+padding});
 // Pale walking paths and individual stepping stones bind the inhabited terraces.
 const walkPaths=[];
 function path(points,width=.5){walkPaths.push({points,width});}
 const nearPath=(x,z,padding=.25)=>walkPaths.some(({points,width})=>points.slice(1).some((b,i)=>{const a=points[i],dx=b[0]-a[0],dz=b[2]-a[2],t=THREE.MathUtils.clamp(((x-a[0])*dx+(z-a[2])*dz)/(dx*dx+dz*dz),0,1);return Math.hypot(x-a[0]-dx*t,z-a[2]-dz*t)<width/2+padding}));
 function steps(a,b,width=1.4,n=14){const heading=Math.atan2(b[0]-a[0],b[2]-a[2]);for(let i=0;i<n;i++){const p=new THREE.Vector3(...a).lerp(new THREE.Vector3(...b),i/(n-1));box(p.x,p.y-.12,p.z,width,.25,.32,0xcabf9e).rotation.y=heading}}
 path([[-3,3.51,3.04],[-3.4,3.51,3.04],[-3.4,3.51,.6],[-3.5,3.51,.15]],.34);
 path([[-3.4,3.51,3.2],[-6.16,3.51,3.2],[-6.16,3.51,.85]],.28);
 path([[-6.16,3.51,3.2],[-7.15,3.51,2.98],[-7.75,3.51,2.65],[-8.15,3.51,1.9],[-8.3,3.51,1.2],[-8.3,3.51,-.6],[-8.2,3.51,-.88]],.24);
 path([[-7.85,4.76,-2.53],[-7.85,4.76,-4.65],[-7.15,4.76,-5],[-5.65,4.76,-4.52]],.28);
 path([[-2.72,8.32,-5.2],[-1.65,8.32,-6.25],[.55,8.32,-6.25],[1.2,8.32,-5.9],[1.2,8.32,-4.05]],.34);
 // Paving stops at the actual terrace edge instead of floating beyond a disk.
 const paving=[],pavingColors=[];
 for(let x=-3.1;x<5.7;x+=.22)for(let z=3.4;z<7.0;z+=.22){
  const corners=[[x,z],[x+.22,z],[x,z+.22],[x+.22,z+.22]];
  if(corners.some(([px,pz])=>heightAt(px,pz)!==1.75||nearStairs(px,pz,.13)||((px-1.35)/4.4)**2+((pz-4.95)/2.25)**2>1))continue;
  const c=new THREE.Color((Math.floor(x*7+z*9)%3)?0xd9c9a7:0xcdbd99);
  for(const k of [0,2,1,1,2,3]){paving.push(corners[k][0],1.795,corners[k][1]);pavingColors.push(c.r,c.g,c.b)}
 }
 const pavement=new THREE.BufferGeometry();pavement.setAttribute('position',new THREE.Float32BufferAttribute(paving,3));pavement.setAttribute('color',new THREE.Float32BufferAttribute(pavingColors,3));pavement.computeVertexNormals();mesh(pavement,terrainMaterial,0,0,0);
 path([[-5.5,.53,6.85],[-3.9,.53,6.95],[-1.5,.53,7.6],[1.1,.53,8.5],[3.4,.53,7.8],[5.1,.53,6.85]],.7);
 path([[-6.4,.53,6.6],[-5.95,.53,6.9],[-5.5,.53,6.85]],.4);
 path([[-3.45,1.81,4.90],[-3,1.81,4.98]],.34);
 for(const route of MARKET_PATHS)path(route.points,route.width);
 // Every route has a carved corridor and a solid stone bed down to its lower bank.
 for(const {a,b,width,count,rail}of WALK_STAIRS){const run=Math.hypot(b[0]-a[0],b[2]-a[2]),heading=Math.atan2(b[0]-a[0],b[2]-a[2]);
  for(let i=0;i<count;i++){
   const t=i/(count-1),p=new THREE.Vector3(...a).lerp(new THREE.Vector3(...b),t),bottom=a[1]-.14;
   box(p.x,(p.y+bottom)/2,p.z,width+.20,p.y-bottom,run/(count-1)+.025,0xc8bea1).rotation.y=heading;
   // Thin, slightly projecting nosings distinguish the individual treads.
   box(p.x,p.y+.018,p.z,width+.20,.036,run/(count-1)+.026,i%4===0?0xd5cbae:0xded3b6).rotation.y=heading;
  }
  if(rail!==false)for(const side of[-1,1]){
   const lateral=new THREE.Vector3(Math.cos(heading),0,-Math.sin(heading)).multiplyScalar(side*(width/2+.035));
   for(let i=0;i<=6;i++){const t=i/6,p=new THREE.Vector3(...a).lerp(new THREE.Vector3(...b),t).add(lateral);box(p.x,p.y+.32,p.z,.055,.64,.055,0x936d45);}
   line([[a[0]+lateral.x,a[1]+.66,a[2]+lateral.z],[b[0]+lateral.x,b[1]+.66,b[2]+lateral.z]],0xb08a55,.035);
  }
  // Close the over-cut lip behind the last tread with a supported landing.
  const ux=(b[0]-a[0])/run,uz=(b[2]-a[2])/run;
  box(b[0]+ux*.16,b[1]-.07,b[2]+uz*.16,width+.20,.16,.42,0xd5cbae).rotation.y=heading;
  box(a[0]-ux*.11,a[1]-.07,a[2]-uz*.11,width+.20,.16,.40,0xd5cbae).rotation.y=heading;
 }
 mesh(stairBankGeometry(uncutSurfaces,WALK_STAIRS),cliffMaterial,0,0,0);
 uncutSurfaces.forEach(o=>o.geometry.dispose());
 path([[-2.2,8.32,-4.27],[-2.2,8.32,-4.5],[-1.8,8.32,-4.5]],.74);
 path([[-1.8,8.32,-4.5],[-1.3,8.32,-4.05],[-.4,8.32,-3.95],[.7,8.32,-4.05],[1.2,8.32,-4.05],[2.55,8.32,-3.95]],.40);
 // Water terraces, spilling streams and their animated white foam.
 const waterMats=[],falls=[],ripples=[];
 const mistPositions=[],mistSeeds=[];
 const poolMat=new THREE.MeshStandardMaterial({color:0x39c9d0,roughness:.23,metalness:.15,transparent:true,opacity:.94});waterMats.push(poolMat);
 function pool(x,y,z,rx,rz){const o=mesh(new THREE.CircleGeometry(1,64),poolMat,x,y,z,rx,rz,1);o.rotation.x=-Math.PI/2;
  for(let i=0;i<24;i++){const a=i/24*Math.PI*2;const rock=add(N.rock({size:.12+rnd()*.12,seed:i+30}),x+Math.cos(a)*rx,y-.09,z+Math.sin(a)*rz,1);rock.scale.y=.55;}
  for(let i=0;i<4;i++){const r=new THREE.Mesh(new THREE.RingGeometry(.4+i*.26,.42+i*.26,48),new THREE.MeshBasicMaterial({color:0xdbffff,transparent:true,opacity:.3,side:THREE.DoubleSide}));r.rotation.x=-Math.PI/2;r.position.set(x,y+.03,z);animated.add(r);ripples.push(r)}
 }
 pool(.45,8.38,-2.65,.95,.65);pool(.9,5.05,.65,1.4,.78);pool(1,1.9,2.9,1.4,.7);
 // A short overflow channel joins the summit pool to the actual cliff lip.
 const overflow=mesh(new THREE.PlaneGeometry(.58,1.0,1,8),poolMat,.75,8.38,-1.76);overflow.rotation.x=-Math.PI/2;
 const fallMaterial=new THREE.ShaderMaterial({side:THREE.DoubleSide,transparent:true,uniforms:{time:{value:0},tint:{value:new THREE.Color(0x46d9ed)}},
 vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`varying vec2 vUv;uniform float time;uniform vec3 tint;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
 void main(){vec2 p=vUv;float flow=noise(vec2(p.x*17.,p.y*4.+time*1.7));float strand=noise(vec2(p.x*46.+sin(p.y*6.+time)*.7,p.y*2.+time*2.));float fine=pow(max(0.,sin(p.x*121.+sin(p.y*6.+time)*.8)),13.);vec3 c=mix(tint*.69,tint*1.2,flow);c=mix(c,vec3(.86,.97,.96),pow(strand,3.)*.63+fine*.20);float edge=smoothstep(0.,.07,p.x)*smoothstep(0.,.07,1.-p.x);gl_FragColor=vec4(c,edge*(.78+flow*.17));
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 function waterfall(x,top,z0,bottom,z1,width){const g=new THREE.PlaneGeometry(width,Math.hypot(top-bottom,z1-z0),26,40);const o=new THREE.Mesh(g,fallMaterial);o.position.set(x,(top+bottom)/2,(z0+z1)/2);o.rotation.x=-Math.atan2(z1-z0,top-bottom);animated.add(o);falls.push(o);
  for(let i=0;i<36;i++){const b=new THREE.Mesh(sphere,new THREE.MeshBasicMaterial({color:0xe9ffff,transparent:true,opacity:.6+rnd()*.3}));b.scale.set(.025+rnd()*.025,.07+rnd()*.1,.025);b.userData={x:x+(rnd()-.5)*width,top,bottom,z0,z1,phase:rnd()};animated.add(b);drops.push(b)}
  for(let i=0;i<22;i++){const a=rnd()*Math.PI*2;mesh(sphere,mat(0xcde4d8),x+Math.cos(a)*width*.55,bottom+.025,z1+Math.sin(a)*.34,.08+rnd()*.12,.025,.06+rnd()*.13)}
  for(let i=0;i<42;i++){mistPositions.push(x,bottom+.06,z1+.08);mistSeeds.push(rnd(),rnd(),rnd(),width)}
  for(let i=0;i<3;i++){const r=new THREE.Mesh(new THREE.RingGeometry(.20,.22,48),new THREE.MeshBasicMaterial({color:0xe2f6ee,transparent:true,opacity:.18,side:THREE.DoubleSide,depthWrite:false}));r.rotation.x=-Math.PI/2;r.position.set(x,bottom+.045,z1+.1);r.userData.impact=true;animated.add(r);ripples.push(r)}
 }
 const drops=[];waterfall(.9,8.4,-1.35,5.08,.48,1.45);waterfall(1,5.08,1.43,1.93,2.7,1.65);
 const mistGeo=new THREE.BufferGeometry();mistGeo.setAttribute('position',new THREE.Float32BufferAttribute(mistPositions,3));mistGeo.setAttribute('seed',new THREE.Float32BufferAttribute(mistSeeds,4));
 const mistNight={value:0};
 const mist=new THREE.Points(mistGeo,new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uTime:fallMaterial.uniforms.time,uNight:mistNight},
 vertexShader:`uniform float uTime,uNight;attribute vec4 seed;varying float vOpacity;void main(){float life=fract(seed.x+uTime*.23);vec3 p=position;float a=seed.y*6.283;float spread=(.18+life*.68)*seed.w;p.x+=cos(a)*spread*.65;p.z+=sin(a)*spread*.3+life*.17;p.y+=life*.5+sin(seed.y*15.+uTime)*.025;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=min(48.,(.20+seed.z*.3+life*.3)*550./max(1.,-mv.z));vOpacity=smoothstep(0.,.15,life)*pow(1.-life,1.4)*.15*(1.-uNight*.55);}`,
 fragmentShader:`varying float vOpacity;void main(){float r=length(gl_PointCoord-.5)*2.;float a=pow(max(0.,1.-r*r),2.)*vOpacity;gl_FragColor=vec4(.72,.90,.91,a);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`}));mist.name='Fine waterfall spray';mist.frustumCulled=false;animated.add(mist);
 for(const bridge of BRIDGES){
  const a=new THREE.Vector3(...bridge.a),b=new THREE.Vector3(...bridge.b),direction=b.clone().sub(a).setY(0).normalize();
  const length=Math.hypot(b.x-a.x,b.z-a.z),rotation=-Math.atan2(b.z-a.z,b.x-a.x);
  add(H.bridge({length,width:bridge.width,sag:bridge.sag}),a.x,bridge.deckY,a.z,1,rotation);
  for(const [p,sign]of[[a,-1],[b,1]]){
   const footing=box(p.x,(p.y-.12+bridge.deckY)/2,p.z,.44,bridge.deckY-p.y+.12,bridge.width+.3,0xb7ad92);footing.rotation.y=rotation;
   const approachLength=bridge===BRIDGES[0]&&sign===-1?.32:.55;
   const approach=p.clone().addScaledVector(direction,sign*approachLength);
   steps([approach.x,p.y+.055,approach.z],[p.x,bridge.deckY+.04,p.z],bridge.width+.12,4);
  }
 }
 path([[-1.55,8.31,-2.75],[-1.55,8.31,-3.8],[-1.6,8.31,-4.5]],.36);
 path([[2.3,8.31,-2.99],[2.55,8.31,-3.5],[2.55,8.31,-3.95]],.32);
 steps([2.55,8.34,-3.95],[2.32,8.48,-4.33],.36,4);
 path([[-1.3,4.96,.48],[-1.55,4.96,-.05],[-2.2,4.96,-.40]],.4);
 path([[-3.7,4.96,-1.83],[-2.92,4.96,-1.83],[-2.92,4.96,-.40],[-2.2,4.96,-.40]],.24);
 path([[3.55,4.96,1.43],[3.75,4.96,1.28],[3.75,4.96,.4],[3.3,4.96,.4],[3.3,4.96,1.07]],.32);
 path([[3.75,4.96,.4],[4.15,4.96,.15],[4.75,4.96,-.15],[5.85,4.96,-.95]],.30);
 path([[5.85,6.16,-3.57],[6.2,6.16,-3.7],[6.6,6.16,-4.6],[6.2,6.16,-5.6],[5.95,6.16,-5.85]],.28);
 path([[4.37,4.96,-7.14],[3.95,4.96,-7.05],[3.36,4.96,-7.25]],.28);
 const lighthouse=add(A.lighthouse(),-.4,8.3,-5.1,.76);const beacon=lighthouse.userData.beacon;
 const lookout=add(A.gazebo(),2.05,8.3,-4.8,.62);
 // Hilltop railing, rope fences and ledge paths.
 for(let i=0;i<18;i++){const a=.1+i/17*Math.PI*1.12;const x=Math.cos(a)*3.25,z=-4.2+Math.sin(a)*2.7;if(!nearStairs(x,z,.16))box(x,8.6,z,.07,.65,.07,0x9d6c36);}
 {let points=[];for(let i=0;i<=64;i++){const a=.1+i/64*Math.PI*1.12,x=Math.cos(a)*3.25,z=-4.2+Math.sin(a)*2.7;if(nearStairs(x,z,.15)){if(points.length>1)line(points,0xb78e57,.025);points=[];}else points.push([x,8.76,z]);}if(points.length>1)line(points,0xb78e57,.025);}
 const mill=add(A.windmill(),-6.4,4.72,-3.7,.68);const rotor=mill.userData.rotor;if(rotor){rotor.updateWorldMatrix(true,false);const p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();rotor.matrixWorld.decompose(p,q,s);rotor.removeFromParent();animated.add(rotor);rotor.position.copy(p);rotor.quaternion.copy(q);rotor.scale.copy(s)}
 const houses=HOUSES;
 for(const[x,y,z,s,r,col]of houses){const home=add(A.house({roofColor:col}),x,heightAt(x,z)+.04,z,s,r);add(D.flowerpot(),.9,0,1.25,.7,0,home);const marketCottage=y===1.75&&x<0;add(A.barrel(),marketCottage ? .6 : -1.25,0,marketCottage ? -1.28 : .55,.45,0,home);}
 add(D.laundry(),-5.55,heightAt(-5.55,-2)+.04,-2,.82,-.12);
 add(D.laundry(),4.8,heightAt(4.8,-4.1)+.04,-4.1,.65,Math.PI/2);
 for(const[x,y,z,r]of[[-4.0,1.82,4.9,.2],[-5.8,3.49,2.85,-.4],[3.4,4.96,-.05,-.3],[-1.9,8.3,-5.5,.6]])add(D.signpost(),x,y,z,.7,r);
 add(A.fountain(),MARKET.fountain.x,1.80,MARKET.fountain.z,MARKET.fountain.scale);
 const stalls=MARKET.stalls;
 for(const p of stalls)add(A.stall({color:p.color}),p.x,heightAt(p.x,p.z)+.025,p.z,p.scale,p.rotation);
 // A low, continuous parapet gives the plaza a deliberate edge. Its two
 // stair openings remain generous instead of fencing off the entrances.
 {const l=layers[1];let previous=null;
  for(let i=0;i<=80;i++){
   const a=.91+i/80*1.35,r=terraceShape(l,a)-.045,x=l.cx+Math.cos(a)*l.rx*r,z=l.cz+Math.sin(a)*l.rz*r;
   if(heightAt(x,z)!==1.75||nearStairs(x,z,.23)){previous=null;continue;}
   if(previous){const dx=x-previous[0],dz=z-previous[1],length=Math.hypot(dx,dz);box((x+previous[0])/2,1.89,(z+previous[1])/2,.13,.30,length+.015,0xb9b396).rotation.y=Math.atan2(dx,dz);box((x+previous[0])/2,2.06,(z+previous[1])/2,.18,.055,length+.02,0xd4c8a8).rotation.y=Math.atan2(dx,dz);}
   previous=[x,z];
  }
 }
 // Cobblestones are scattered in the market plaza rather than a painted texture.
 for(let i=0;i<170;i++){let x=-1.7+rnd()*7,z=2.9+rnd()*3.7;if(heightAt(x,z)!==1.75||((x-1.4)/3.7)**2+((z-4.4)/2.6)**2>1)continue;const o=mesh(new THREE.CylinderGeometry(.09,.11,.025,5),mat([0xc8b998,0xe4d6b7,0xc1b699][i%3]),x,1.82,z,1,1,.8);o.rotation.y=rnd()*6.28}
 // Farm, orchard and kitchen garden.
 for(const p of GARDENS)add(N.cropPlot(p),p.x,p.y,p.z,p.scale);
 for(const[x,z]of[[-8,0],[-7.9,-1.3],[-5.4,1],[-5.9,.1],[-3.7,1.2],[-8.2,2]]){const y=heightAt(x,z),treeSeed=Math.floor(rnd()*1000);if(plantHasClearance(x,z,y)&&!nearStairs(x,z,.5)&&!nearPath(x,z,.45))add(N.tree({height:1.9,fruit:true,seed:treeSeed}),x,y,z,.65);}
 // Port boardwalk and three-masted merchant ship.
 const {landing,quay,beachPier,ship:shipLayout}=PORT;
 add(H.dock(landing),landing.x,landing.y,landing.z);
 add(H.dock(quay),quay.x,quay.y,quay.z,1,Math.PI/2);
 add(H.dock(beachPier),beachPier.x,beachPier.y,beachPier.z,1,beachPier.rotation);
 const ship=add(H.ship(),shipLayout.x,shipLayout.y,shipLayout.z,shipLayout.scale,shipLayout.rotation,animated);
 const boat1=add(H.rowboat(),-.7,.22,12.35,.72,.65,animated);const boat2=add(H.rowboat(),11.25,.2,5.9,.62,-.3,animated);
 const sloop=add(H.ship(),-13.8,.12,6.2,.30,.8,animated);
 add(H.umbrella(),PORT.umbrella.x,.55,PORT.umbrella.z,.76,.5);add(H.umbrella(),8.0,.56,5.75,.72,-.5);
 for(let i=0;i<5;i++){add(A.barrel(),landing.x+(i%2?-.24:.28),.79,8.7+i*.53,.42);if(i%2===0)add(A.crate(),quay.x+.7+i*.7,.79,quay.z,.35)}
 add(D.fishingNet(),landing.x+.52,.81,9.9,.7,Math.PI/2);add(D.fishingNet(),-5.45,.77,9.25,.65,-.24);
 steps([5.1,.53,6.65],[5.1,.76,7.25],.94,5);
 // Cave on the eastern face, with a boardwalk into its crystal-lit interior.
 const cave=add(H.cave(),CAVE.x,CAVE.y,CAVE.z,CAVE.scale,Math.PI/2);
 add(H.dock({length:5.55,width:.64,lanterns:false}),7.5,.52,CAVE.z-.35,1,Math.PI/2);
 const caveLight=new THREE.PointLight(0x42dbff,5,4.8,2);caveLight.position.set(7.4,1.4,CAVE.z);scene.add(caveLight);
 // Surrounding limestone sea stacks and a remote ruined sanctuary.
 const seaStacks=SEA_STACKS,islets=createSeaIslets(N);
 for(let i=0;i<seaStacks.length;i++){const[x,z,size,height]=seaStacks[i];add(islets.stack({size,height,seed:i*7+4}),x,0,z);}
 add(islets.sanctuary(REMOTE),REMOTE.x,0,REMOTE.z);
 add(N.ruin(),REMOTE.x,1.3,REMOTE.z-.2,.65,.3);add(N.palm({height:3.8,seed:351}),REMOTE.x+1,1.3,REMOTE.z-.55,.7);add(N.palm({height:2.8,seed:353}),REMOTE.x-.8,1.3,REMOTE.z-.7,.65);
 // Dense organic vegetation follows the terraces, leaving the lived-in clearings open.
 const palms=[[-8.7,3.4],[-9,-.9],[-8.5,-4.8],[-4.7,-6.4],[-2,-6.3],[2.2,-6.3],[5.8,-5.6],[7.4,-3.7],[7.7,-1.4],[6.9,3.2],[7.9,5.1],[-6.7,7],[-7.2,8],[-4.7,9.3],[.1,6.7],[-2,5.4],[3.3,6.6],[-4.4,4.3],[5.3,-7.0]];
 palms.forEach(([x,z],i)=>{const y=heightAt(x,z);if(y>=0&&!inCaveApproach(x,y,z,.2)&&!nearStairs(x,z,1.2)&&!nearPath(x,z,.45)){const h=2.1+rnd()*1.4,rotation=rnd()*6.28;if(plantHasClearance(x,z,y,.3))add(N.palm({height:h,seed:i*13+3}),x,y,z,.85,rotation)}});
 for(let i=0;i<120;i++){
  const x=-9.5+rnd()*18,z=-7.2+rnd()*11.6,y=heightAt(x,z);
  if(inCaveApproach(x,y,z,.45)||nearStairs(x,z,.7)||nearPath(x,z,.65))continue;
  if(y<1.3|| (Math.abs(x-1)<2.1&&z>-3&&z<3.5)|| (z>2.5&&x>-4&&x<6)|| (x<-2&&x>-7.8&&z>-1.9&&z<3.1))continue;
  if(houses.some(h=>Math.hypot(h[0]-x,h[2]-z)<1.5)||Math.hypot(x+.4,z+5.1)<1.35)continue;
  const h=1.4+rnd()*1.3,scale=.65+rnd()*.26,rotation=rnd()*6.28;
  if(plantHasClearance(x,z,y,.7))add(N.tree({height:h,seed:i*19}),x,y,z,scale,rotation);
 }
 for(let i=0;i<230;i++){
  const x=-9.8+rnd()*19.5,z=-7+rnd()*13,y=heightAt(x,z);
  if(inCaveApproach(x,y,z,.25)||nearStairs(x,z,.2)||nearPath(x,z,.25))continue;
  if(y<1.3||(Math.abs(x-1)<2.1&&z>-3&&z<3.5)||(z>3&&x>-3.4&&x<6.1))continue;
  if(houses.some(h=>Math.hypot(h[0]-x,h[2]-z)<1.25))continue;
  add(i%3===0?N.flowers({seed:i}):N.bush({scale:.35+rnd()*.3}),x,y+.03,z,i%3===0?.55:1,rnd()*6.28);
 }
 // Cliff ledges, lichen and fractured limestone columns.
 for(let i=0;i<110;i++){
  const a=rnd()*Math.PI*2,r=8.5+rnd()*.8,x=-.6+Math.cos(a)*r,z=-1+Math.sin(a)*r*.74;
  if(z>4.1||inCaveApproach(x,1,z,.6)||nearStairs(x,z,.35))continue;const y=heightAt(x,z);
  add(N.rock({size:.3+rnd()*.6,seed:i+200}),x,.6+rnd()*.7,z,1).scale.y=1+rnd()*2;
  if(i%3===0)add(N.bush({scale:.3}),x,y-.1,z,1);
 }
 // Broken shoulders, scree and hanging plants soften each exposed terrace.
 for(const l of layers.slice(1,TERRACES.length))for(let i=0;i<36;i++){
  const sample=Math.sin(i*91.7+l.top*13.8)*43758.5453,scatter=sample-Math.floor(sample);
  if(scatter<.38)continue;
  const a=i/36*Math.PI*2+.07*Math.sin(i*2.4+l.phase),r=terraceShape(l,a);
  const x=l.cx+Math.cos(a)*l.rx*r,z=l.cz+Math.sin(a)*l.rz*r;
  const nx=Math.cos(a),nz=Math.sin(a),ground=heightAt(x+nx*.6,z+nz*.6);
  if(ground>=l.top-.4||inCaveApproach(x,ground,z,.6)||nearStairs(x,z,.4)||(Math.abs(x-1)<1.45&&z>-2.5&&z<3.4))continue;
  const h=l.top-ground;if(h<.5)continue;
  const s=.14+scatter*.19;
  const rock=add(N.rock({size:s,seed:900+i*13+Math.floor(l.top*10),moss:i%3===0}),x-nx*.13,l.top-s*.85,z-nz*.13,1,a);rock.scale.set(1.35,.8,1.05);
  if(i%2===0){const b=add(N.rock({size:.16+(i%3)*.07,seed:1200+i,moss:false}),x+nx*.24,ground-.05,z+nz*.24,1,a);b.scale.y=.55;}
  if(i%3===0){const length=Math.min(h*.75,.55+(i%5)*.16),points=[];
   for(let k=0;k<7;k++){const t=k/6;points.push([x+nx*(.03+Math.sin(t*Math.PI)*.15)+Math.sin(k*1.2)*.04,l.top+.04-length*t,z+nz*(.03+Math.sin(t*Math.PI)*.15)]);}
   line(points,0x52734a,.012);
   points.forEach((p,k)=>{if(k)mesh(sphere,mat(k%2?0x5b8449:0x739451),p[0]+.05*Math.sin(k*2.4),p[1],p[2],.09,.055,.045)});
  }
 }
 // Small tide-line discoveries stay clear of the cave entrance and piers.
 for(let i=0;i<64;i++){
  const a=i/64*Math.PI*2,r=1.035+(i%5)*.009,shape=coastShape(a,.4);
  const x=Math.cos(a)*11.2*shape*r,z=1+Math.sin(a)*9.1*shape*r;
  if(inCaveApproach(x,.5,z,.5)||(x>3.7&&x<6.3&&z>6))continue;
  const y=Math.max(-.3,.028-(r-1.10)*10*.36)+.012;
  if(i%13===0)add(D.driftwood(),x,y,z,.7,a+1.1);
  else if(i%3===0)add(D.shell(),x,y,z,.75+(i%4)*.12,a);
  else {const pebble=add(N.rock({size:.06+(i%4)*.018,seed:1600+i,moss:false}),x,y-.03,z,1,a);pebble.scale.set(1.3,.42,.8);}
 }
 for(let i=0;i<11;i++){const a=.18+i/10*Math.PI*1.02,x=Math.cos(a)*3.18,z=-4.2+Math.sin(a)*2.62;if(!nearStairs(x,z,.16))add(A.lamp(),x,8.28,z,.27);}
 // Beach objects, lanterns, small residents and flying gulls reward closer inspection.
 for(const[x,y,z]of[[-4.6,.53,6],[1.95,1.8,6.65],[3.85,1.8,5.15],[5.1,.7,8.2],[5.1,.7,11.3],[3.4,.7,12],[-5.35,.7,10],[4.1,5,.25],[-1.55,8.3,-2.35]])add(A.lamp(),x,y,z,.6);
 for(let i=0,count=0;i<160&&count<14;i++){const x=-2+rnd()*7,z=3.4+rnd()*2.9;
  if(heightAt(x,z)!==1.75||Array.from({length:8},(_,j)=>j*Math.PI/4).some(a=>heightAt(x+Math.cos(a)*.65,z+Math.sin(a)*.65)!==1.75)||nearStairs(x,z,.25)||nearPath(x,z,.15)||Math.hypot(x-MARKET.fountain.x,z-MARKET.fountain.z)<1.0||Math.abs(x-1)<1.6&&z<3.8||houses.some(h=>Math.hypot(h[0]-x,h[2]-z)<h[3]*1.8)||stalls.some(s=>Math.hypot(s.x-x,s.z-z)<.85))continue;
  add(H.person({color:[0xe4ae55,0x578f99,0xd47355,0xede8d0][i%4]}),x,1.84,z,.85,rnd()*6.28);count++;
 }
 for(let i=0;i<5;i++)add(H.person({color:0xe4bf6c}),5.0,.79,8.4+i*.65,.8,rnd()*6.28);
 const birds=[];for(let i=0;i<9;i++){const b=H.seagull();animated.add(b);birds.push(b)}
 const fireflies=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(Array.from({length:240},(_,i)=>i%3===1?1+rnd()*9:(rnd()-.5)*22),3)),new THREE.PointsMaterial({color:0xffd98a,size:.065,transparent:true,opacity:0}));animated.add(fireflies);
 const landscape=createLandscapeDetails({surfaces:groundSurfaces,cliffs:cliffSurfaces,paths:walkPaths});staticWorld.add(landscape.group);
 const nightLighting=createNightLighting(scene,[staticWorld,animated]);
 const waterSystem=createWaterSystem(scene,{seaStacks});const seaMat=waterSystem.material;
 // Merge static geometry by material to preserve thousands of model details with a compact draw-call budget.
 staticWorld.updateMatrixWorld(true);const buckets=new Map(),glowMats=new Set();let meshes=0;
 const geometryTemplates=new Map(),coloredMaterials=new Map();
 const instanceMatrix=new THREE.Matrix4(),worldMatrix=new THREE.Matrix4(),instanceColor=new THREE.Color();
 staticWorld.traverse(o=>{
  if(!o.isMesh||Array.isArray(o.material))return;
  if(!geometryTemplates.has(o.geometry))geometryTemplates.set(o.geometry,o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone());
  const template=geometryTemplates.get(o.geometry),hasInstanceColor=o.isInstancedMesh&&o.instanceColor;
  let material=o.material;
  if(hasInstanceColor){
   // Instance colors multiply the existing diffuse/vertex colors; keep all base material properties.
   if(!coloredMaterials.has(material)){
    const colored=material.clone();colored.vertexColors=true;
    colored.onBeforeCompile=material.onBeforeCompile;colored.customProgramCacheKey=material.customProgramCacheKey;
    coloredMaterials.set(material,colored);
   }
   material=coloredMaterials.get(material);
  }
  if(material.userData.glow)glowMats.add(material);
  const count=o.isInstancedMesh?o.count:1;meshes+=count;
  for(let i=0;i<count;i++){
   const geo=template.clone();
   if(o.isInstancedMesh){o.getMatrixAt(i,instanceMatrix);worldMatrix.multiplyMatrices(o.matrixWorld,instanceMatrix)}else worldMatrix.copy(o.matrixWorld);
   geo.applyMatrix4(worldMatrix);
   if(hasInstanceColor){
    o.getColorAt(i,instanceColor);
    const base=o.material.vertexColors?template.getAttribute('color'):null;
    const components=base?.itemSize===4?4:3,vertices=geo.getAttribute('position').count;
    const colors=new Float32Array(vertices*components);
    for(let v=0;v<vertices;v++){
     const offset=v*components;
     colors[offset]=(base?base.getX(v):1)*instanceColor.r;
     colors[offset+1]=(base?base.getY(v):1)*instanceColor.g;
     colors[offset+2]=(base?base.getZ(v):1)*instanceColor.b;
     if(components===4)colors[offset+3]=base.getW(v);
    }
    geo.setAttribute('color',new THREE.BufferAttribute(colors,components));
   }
   // Shared foliage materials also shade stems and garden leaves that have no
   // painted vertex colors. White keeps their material color intact after merging.
   if(material.vertexColors&&!geo.getAttribute('color')){
    const neutral=new Float32Array(geo.getAttribute('position').count*3);neutral.fill(1);
    geo.setAttribute('color',new THREE.BufferAttribute(neutral,3));
   }
   const attributes=Object.keys(geo.attributes).sort().map(name=>{
    const a=geo.attributes[name];return name+':'+a.itemSize+':'+a.normalized+':'+a.array.constructor.name;
   }).join(',');
   const key=material.uuid+attributes;
   if(!buckets.has(key))buckets.set(key,{material,geos:[]});
   buckets.get(key).geos.push(geo);
  }
 });
 geometryTemplates.forEach(g=>g.dispose());
 scene.remove(staticWorld);const batched=new THREE.Group();batched.name='Detailed island';scene.add(batched);
 for(const{material,geos}of buckets.values()){try{const g=mergeGeometries(geos,false);if(g){const o=new THREE.Mesh(g,material);o.castShadow=true;o.receiveShadow=true;batched.add(o)}}catch(e){console.warn('Geometry batch skipped',e)}geos.forEach(g=>g.dispose())}
 animated.traverse(o=>{if(o.isMesh)for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m.userData?.glow)glowMats.add(m)});
 const shipY=ship.position.y,sloopY=sloop.position.y;
 return {walkPaths,nightLighting,setAtmosphere:waterSystem.setAtmosphere,details:meshes,waterMats,seaMat,fallMaterial,fireflies,caveLight,glowMats,update(t,night,camera){
 waterSystem.update(t,night);nightLighting.update(t,night,camera);N.update(t);D.update(t);H.update(t);fallMaterial.uniforms.time.value=t;mistNight.value=night;
 if(rotor)rotor.rotateZ(.003);ship.position.y=shipY+Math.sin(t*.7)*.06;ship.rotation.z=Math.sin(t*.6)*.012;sloop.position.y=sloopY+Math.sin(t*.9)*.05;boat1.position.y=.22+Math.sin(t*1.2)*.045;boat2.rotation.z=Math.sin(t*.7)*.05;
 for(const d of drops){const u=(t*.42+d.userData.phase)%1;d.position.set(d.userData.x,d.userData.top+(d.userData.bottom-d.userData.top)*u,d.userData.z0+(d.userData.z1-d.userData.z0)*u+.06)}
 ripples.forEach((r,i)=>{const u=(t*(r.userData.impact?.38:.24)+i*.24)%1;r.scale.setScalar(r.userData.impact?1+u*3.6:.65+u*.6);r.material.opacity=Math.sin(u*Math.PI)*(r.userData.impact?.20:.24)*(1-night*.38)});
 birds.forEach((b,i)=>{const a=t*.07+i*.8;b.position.set(Math.cos(a)*(11+i*.4),10+Math.sin(a*1.5)*1.3+i*.3,Math.sin(a)*(8+i*.2));b.rotation.y=-a;b.rotation.z=Math.sin(t*3+i)*.1});
 fireflies.rotation.y=Math.sin(t*.02)*.1;fireflies.material.opacity=night*(.55+Math.sin(t*.7)*.15);
 }};
}
