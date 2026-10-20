import * as THREE from 'three';
import { TERRACES, HOUSES, GARDENS, BRIDGES, WALK_STAIRS } from './layout.js';
import { inCaveApproach } from './cave-layout.js';
import { terraceShape, terraceHeightAt, terraceSurfacePoint } from './terrain.js';
import { addSurfaceDetail } from './surface-detail.js';

// All dressing is sampled against the carved terrain, not an ideal flat disk.
// One shared palette and three geometry batches keep this detail inexpensive.
export function createLandscapeDetails({surfaces,cliffs,paths}){
 const group=new THREE.Group();group.name='Rooted paths and weathered terrace edges';
 const layers=TERRACES.map(([cx,cz,rx,rz,top,bottom,color,phase])=>({cx,cz,rx,rz,top,bottom,phase}));
 const buffers=Object.fromEntries(['stone','earth','leaf'].map(k=>[k,{positions:[],colors:[]}]));
 const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0),roots=[];
 let seed=94817;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const sample=(x,z,y)=>{
  ray.set(new THREE.Vector3(x,y+.20,z),down);ray.near=0;ray.far=.40;
  const hit=ray.intersectObjects(surfaces,false)[0];
  return hit&&Math.abs(hit.point.y-y)<.18?hit.point.y:null;
 };
 const faceSample=(p,normal,offset=.014)=>{
  ray.set(new THREE.Vector3(...p).addScaledVector(normal,.6),normal.clone().negate());ray.near=0;ray.far=1;
  const hit=ray.intersectObjects(cliffs,false)[0];
  return hit&&hit.point.distanceTo(new THREE.Vector3(...p))<.20?hit.point.addScaledVector(hit.face.normal,offset).toArray():null;
 };
 function triangle(kind,a,b,c,color){const buf=buffers[kind],col=new THREE.Color(color);for(const p of[a,b,c]){buf.positions.push(...p);buf.colors.push(col.r,col.g,col.b);}}
 const distanceToSegment=(x,z,a,b)=>{const dx=b[0]-a[0],dz=b[2]-a[2],t=THREE.MathUtils.clamp(((x-a[0])*dx+(z-a[2])*dz)/(dx*dx+dz*dz),0,1);return Math.hypot(x-a[0]-dx*t,z-a[2]-dz*t);};
 const onStairs=(x,z,padding=.15)=>WALK_STAIRS.some(({a,b,width})=>distanceToSegment(x,z,a,b)<width/2+padding);
 const onPath=(x,z,padding=.10)=>paths.some(({points,width})=>points.slice(1).some((b,i)=>distanceToSegment(x,z,points[i],b)<width/2+padding));
 const local=(x,z,h)=>{const dx=x-h[0],dz=z-h[2],r=h[4];return[(dx*Math.cos(r)-dz*Math.sin(r))/h[3],(dx*Math.sin(r)+dz*Math.cos(r))/h[3]];};
 const inHouse=(x,z,padding=.12)=>HOUSES.some(h=>{const [u,v]=local(x,z,h);return Math.abs(u)<1.15+padding&&v> -1.08-padding&&v<1.55+padding;});
 const inGarden=(x,z)=>GARDENS.some(p=>Math.abs(x-p.x)<p.width*p.scale/2+.12&&Math.abs(z-p.z)<p.depth*p.scale/2+.12);
 const inWater=(x,z)=>[[.45,-2.65,.95,.65],[.9,.65,1.4,.78],[1,2.9,1.4,.7]].some(([cx,cz,rx,rz])=>((x-cx)/(rx+.12))**2+((z-cz)/(rz+.12))**2<1)||Math.abs(x-1)<1.15&&z>-2.15&&z<3.5;
 const clear=(x,z,y,r=.12)=>!onStairs(x,z,r)&&!onPath(x,z,r)&&!inHouse(x,z,r)&&!inGarden(x,z)&&!inWater(x,z)&&!inCaveApproach(x,y,z,.45)&&Math.hypot(x+.4,z+5.1)>1.12;

 // The polygon corners follow the actual ground, so shoulders cannot float
 // across a cliff, fill a stair cut, or hover over the edge of a grass terrace.
 function patch(x,z,y,rx,rz,color,kind='earth',lift=.009,angle=0){
  const h=sample(x,z,y);if(h===null||onStairs(x,z,.025))return false;
  const edge=[];
  for(let i=0;i<9;i++){
   const a=i/9*Math.PI*2,r=.85+random()*.23,u=Math.cos(a)*rx*r,v=Math.sin(a)*rz*r;
   const px=x+u*Math.cos(angle)+v*Math.sin(angle),pz=z-u*Math.sin(angle)+v*Math.cos(angle),py=sample(px,pz,y);
   if(py===null||onStairs(px,pz,.025))return false;
   edge.push([px,py+lift,pz]);
  }
  for(let i=0;i<edge.length;i++)triangle(kind,[x,h+lift,z],edge[(i+1)%edge.length],edge[i],color);
  return true;
 }
 function pebble(x,z,y,size){
  const h=sample(x,z,y);if(h===null)return;
  const ring=[];for(let i=0;i<5;i++){const a=i/5*Math.PI*2,r=size*(.8+random()*.3);ring.push([x+Math.cos(a)*r,h+.005,z+Math.sin(a)*r*.7]);}
  const tip=[x+size*.12,h+size*.45,z-size*.1];
  for(let i=0;i<5;i++)triangle('stone',ring[i],tip,ring[(i+1)%5],[0xb7b39d,0xc4bca4,0xa4aa93][i%3]);
 }
 function tuft(x,z,y,size=.15){
  const h=sample(x,z,y);if(h===null)return;
  roots.push([x,h,z]);
  for(let i=0;i<5;i++){
   const a=i*2.4+random(),r=size*(.55+random()*.5),dx=Math.cos(a),dz=Math.sin(a),w=size*.11;
   triangle('leaf',[x-dz*w,h+.008,z+dx*w],[x+dx*r*.65,h+r*.8,z+dz*r*.65],[x+dz*w,h+.008,z-dx*w],[0x768a4a,0x8c9b54,0x647e44][i%3]);
  }
 }
 function slab(x,z,y,width,length,angle){
  const outline=[[-.42,-.5],[.35,-.49],[.5,-.29],[.45,.39],[.27,.5],[-.47,.40]],top=[],bottom=[];
  for(const[u,v]of outline){const px=x+u*width*Math.cos(angle)+v*length*Math.sin(angle),pz=z-u*width*Math.sin(angle)+v*length*Math.cos(angle),h=sample(px,pz,y);if(h===null)return;top.push([px,h+.037,pz]);bottom.push([px,h+.009,pz]);}
  const h=sample(x,z,y);if(h===null)return;
  const center=[x,h+.040,z],color=[0xc9bea0,0xd4c7a5,0xc3b99d,0xd9cdb0][Math.floor(random()*4)];
  for(let i=0;i<6;i++){const j=(i+1)%6;triangle('stone',center,top[j],top[i],color);triangle('stone',bottom[i],top[i],top[j],0xa99f86);triangle('stone',bottom[i],top[j],bottom[j],0xa99f86);}
 }
 for(const {points,width}of paths)for(let j=1;j<points.length;j++){
  const a=points[j-1],b=points[j],dx=b[0]-a[0],dz=b[2]-a[2],length=Math.hypot(dx,dz),angle=Math.atan2(dx,dz),count=Math.ceil(length/.25);
  for(let k=0;k<=count;k++){
   const t=k/count,x=a[0]+dx*t,z=a[2]+dz*t,y=THREE.MathUtils.lerp(a[1],b[1],t);
   patch(x,z,y,width*.62,.22,k%3===0?0xa6a16f:0xada679,'earth',.009,angle);
   slab(x+(random()-.5)*width*.07,z+(random()-.5)*.03,y,width*(.88+random()*.12),.23+random()*.035,angle+(random()-.5)*.16);
   if(k%3)continue;
   const side=k%2?1:-1,s=width*.5+.08+random()*.06,px=x+Math.cos(angle)*s,pz=z-Math.sin(angle)*s;
   if(clear(px,pz,y,.025)){pebble(px,pz,y,.035+random()*.025);if(k%2===0)tuft(px+.04,pz-.03,y,.09);}
  }
 }
 // Broken limestone courses key cottages into their terraces. The door side
 // stays open; irregular stepping stones lead from each porch onto the clearing.
 for(const h of HOUSES){
  const[x,y,z,scale,r]=h,at=(u,v)=>[x+scale*(u*Math.cos(r)+v*Math.sin(r)),z+scale*(-u*Math.sin(r)+v*Math.cos(r))];
  for(const side of[-1,1])for(let i=0;i<7;i++){
   const u=side*1.14,v=-.88+i*.29,[px,pz]=at(u,v);
   if(onStairs(px,pz,.12)||onPath(px,pz,.02))continue;
   const [qx,qz]=at(u+side*.035,v),[ax,az]=at(u+side*.035,v-.13),[bx,bz]=at(u+side*.035,v+.13),low=y+.048,high=low+scale*(i%3===0?.16:.13);
   const a=[ax,low,az],b=[bx,low,bz],c=[bx,high,bz],d=[ax,high,az];
   const col=i%2?0xa49f89:0xb9ad91;
   if(side===-1){triangle('stone',a,b,c,col);triangle('stone',a,c,d,col);}else{triangle('stone',a,c,b,col);triangle('stone',a,d,c,col);}
   const [ix,iz]=at(side*1.11,v-.13),[jx,jz]=at(side*1.11,v+.13);
   triangle('stone',[ix,high,iz],d,c,col);triangle('stone',[ix,high,iz],c,[jx,high,jz],col);
   if(i%3===0&&clear(qx+Math.cos(r)*side*.09,qz-Math.sin(r)*side*.09,y))tuft(qx+Math.cos(r)*side*.09,qz-Math.sin(r)*side*.09,y,.12);
  }
  for(let i=0;i<4;i++){
   const [px,pz]=at(-.49+(random()-.5)*.08,1.65+i*.36);
   if(onStairs(px,pz,.08)||inHouse(px,pz,0)||inGarden(px,pz)||inWater(px,pz))continue;
   patch(px,pz,y,.34*scale,.29*scale,0xb1aa7d,'earth',.010,r);
   slab(px,pz,y,.63*scale,.31*scale,r+(random()-.5)*.12);
  }
 }
 // Grounded grass and rubble along stair and bridge approaches stop before
 // the treads. They soften the join without rebuilding a barrier at the landing.
 for(const {a,b,width}of [...WALK_STAIRS,...BRIDGES])for(const p of[a,b])for(const side of[-1,1]){
  const angle=Math.atan2(b[0]-a[0],b[2]-a[2]),x=p[0]+Math.cos(angle)*(width/2+.22)*side,z=p[2]-Math.sin(angle)*(width/2+.22)*side;
  if(clear(x,z,p[1],.07)){patch(x,z,p[1],.18,.15,0x929b64);tuft(x,z,p[1],.17);pebble(x+.05,z+.05,p[1],.07);}
 }
 // Short discontinuous seams follow the real eroded face. Small hanging
 // plants emerge from upper cracks, with bare rock between the clusters.
 for(const l of layers.slice(1,9))for(let k=0;k<72;k++){
  const angle=k/72*Math.PI*2,normal=new THREE.Vector3(Math.cos(angle)/l.rx,0,Math.sin(angle)/l.rz).normalize();
  for(const t of[.30,.60,.86]){
   if(random()<.46)continue;
   const p=terraceSurfacePoint(l,angle,t);
   if(terraceHeightAt(p[0]+normal.x*.13,p[2]+normal.z*.13,layers)>p[1]-.14||!clear(p[0],p[2],p[1],.22))continue;
   const spread=.024+random()*.028,band=.018+random()*.02;
   const v=(a,f)=>faceSample(terraceSurfacePoint(l,a,f),normal);
   const a=v(angle-spread,t),b=v(angle+spread,t),c=v(angle+spread,t+band/(l.top-l.bottom)),d=v(angle-spread,t+band/(l.top-l.bottom));
   if(!a||!b||!c||!d)continue;
   triangle('stone',a,c,b,0x939b8c);triangle('stone',a,d,c,0x939b8c);
   if(t<.8||k%4)continue;
   const length=.28+random()*.48;
   for(let n=0;n<7;n++){
    const q=faceSample(terraceSurfacePoint(l,angle+Math.sin(n*1.6)*.007,t-n*length/(6*(l.top-l.bottom))),normal,.028);
    if(!q)continue;
    const side=n%2?1:-1,tx=-normal.z,tz=normal.x,s=.055+random()*.035;
    triangle('leaf',[q[0],q[1]+.045,q[2]],[q[0]+tx*s*side+normal.x*.025,q[1]+.018,q[2]+tz*s*side+normal.z*.025],[q[0],q[1]-.04,q[2]],n%2?0x65834e:0x819956);
   }
  }
  // Small, irregular mats of groundcover are rooted back from the cliff lip.
  if(k%3)continue;
  const radius=terraceShape(l,angle)-.055,x=l.cx+Math.cos(angle)*l.rx*radius,z=l.cz+Math.sin(angle)*l.rz*radius;
  if(terraceHeightAt(x,z,layers)!==l.top||!clear(x,z,l.top,.23))continue;
  patch(x,z,l.top,.28+random()*.16,.17+random()*.12,0x829257,'leaf',.010,angle);
  tuft(x,z,l.top,.18+random()*.08);pebble(x+.10,z+.07,l.top,.06+random()*.04);
 }
 for(const[kind,buffer]of Object.entries(buffers)){
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(buffer.positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(buffer.colors,3));geo.computeVertexNormals();
  let material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:kind==='leaf'?THREE.DoubleSide:THREE.FrontSide});
  if(kind==='stone')material=addSurfaceDetail(material,'limestone');
  const mesh=new THREE.Mesh(geo,material);mesh.name='Landscape '+kind;mesh.castShadow=kind!=='earth';mesh.receiveShadow=true;group.add(mesh);
 }
 return{group,roots};
}
