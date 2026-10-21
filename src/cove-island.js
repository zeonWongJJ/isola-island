import * as THREE from 'three';
import { COVE } from './layout.js';
import { addSurfaceDetail } from './surface-detail.js';

// A single continuous horseshoe, open toward +Z. The inner beach, village
// terrace and outside rock share vertices; there are no overlapping land disks.
export const COVE_START=.55, COVE_END=Math.PI*2-.55;
const bands=[[-.18,-.20],[0,.035],[.12,.43],[.27,1.05],[.84,1.05],[.88,1.28],[1,.72],[1.045,-.45]];
export function covePoint(a,t){
 const inner=1+.035*Math.sin(a*5+.8),outer=1+.045*Math.sin(a*5)+.022*Math.cos(a*9);
 const end=Math.min(a-COVE_START,COVE_END-a);
 const taper=.04+.96*Math.sqrt(THREE.MathUtils.smoothstep(end,0,.35));
 const shapedT=.5+(t-.5)*taper;
 const x=THREE.MathUtils.lerp(3.2*inner,7.5*outer,shapedT)*Math.sin(a);
 const z=THREE.MathUtils.lerp(3.35*inner,6.5*outer,shapedT)*Math.cos(a);
 let y=-.45;
 for(let i=1;i<bands.length;i++)if(t<=bands[i][0]){y=THREE.MathUtils.lerp(bands[i-1][1],bands[i][1],(t-bands[i-1][0])/(bands[i][0]-bands[i-1][0]));break;}
 y=THREE.MathUtils.lerp(.03,y,THREE.MathUtils.smoothstep(end,0,.23));
 return new THREE.Vector3(x,y,z);
}
export function coveTerrainGeometry(){
 const p=[],c=[],segments=100;
 const tri=(a,b,d,color)=>{for(const v of[a,b,d]){p.push(...v.toArray());c.push(color.r,color.g,color.b)}};
 for(let i=0;i<segments;i++)for(let j=0;j<bands.length-1;j++){
  const a=COVE_START+(COVE_END-COVE_START)*i/segments,b=COVE_START+(COVE_END-COVE_START)*(i+1)/segments;
  const t=bands[j][0],u=bands[j+1][0],col=new THREE.Color(j<2?0xd8c99e:j===2?0xc1bb83:j<5?0x829359:0x929b8a);
  col.multiplyScalar(.96+.035*Math.sin(i*.8+j));
  tri(covePoint(a,t),covePoint(a,u),covePoint(b,t),col);tri(covePoint(b,t),covePoint(a,u),covePoint(b,u),col);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));g.computeVertexNormals();return g;
}
export const coveStreet=Array.from({length:55},(_,i)=>{
 const p=covePoint(.94+(5.33-.94)*i/54,.42).setY(1.075);
 // The waterside promenade passes in front of the fort and its stair bed.
 p.z=Math.max(p.z,-3.38+Math.pow(Math.abs(p.x)/5,2)*.15);
 if(p.x<0&&p.z>0)p.x-=.60*THREE.MathUtils.smoothstep(p.z,0,1.0);
 return p.toArray();
});
function streetJoin(p){
 let nearest,distance=Infinity;
 for(let i=1;i<coveStreet.length;i++){
  const a=new THREE.Vector3(...coveStreet[i-1]),b=new THREE.Vector3(...coveStreet[i]),delta=b.clone().sub(a);
  const q=a.clone().addScaledVector(delta,THREE.MathUtils.clamp(new THREE.Vector3(...p).sub(a).dot(delta)/delta.lengthSq(),0,1));
  if(q.distanceToSquared(new THREE.Vector3(...p))<distance){distance=q.distanceToSquared(new THREE.Vector3(...p));nearest=q.toArray();}
 }
 return nearest;
}
const spur=(...points)=>[streetJoin(points[0]),...points];
export const coveConnections=[
 spur([4.9,1.075,3.14]),
 spur([5.39,1.075,-1.744]),
 spur([5.244,1.075,.775]),
 spur([-5.078,1.075,-1.045]),
 spur([2.8,1.075,-3.6],[2.8,1.075,-4.35],[2.25,1.075,-4.35]),
 spur([-5.25,1.075,1.4]),
];

export function createCoveIsland({A,N,H,D}){
 const root=new THREE.Group();root.name='海盗秘湾岛 · The Corsair Cove';root.position.set(COVE.x,0,COVE.z);
 const boxGeo=new THREE.BoxGeometry(1,1,1),mats={};
 const palette={stone:0x8f9685,cap:0xc3b998,darkStone:0x656f69,wood:0x795335,plank:0xb28958,iron:0x383d3b,rope:0xb7a276,red:0x8c4136,blue:0x486970,roof:0x537a7a,roofFaded:0x638685};
 for(const[k,color]of Object.entries(palette))mats[k]=addSurfaceDetail(new THREE.MeshStandardMaterial({color,roughness:.94}),['wood','plank'].includes(k)?'wood':'limestone');
 for(const m of Object.values(mats)){m.emissive.set(0x24394d);m.emissiveIntensity=0;}
 const groundMat=addSurfaceDetail(new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide}),'limestone');
 const surfaces=[],routes=[],buildings=[];
 function put(o,x=0,y=0,z=0,s=1,r=0,parent=root){o.position.set(x,y,z);o.scale.multiplyScalar(s);o.rotation.y=r;parent.add(o);return o;}
 function mesh(geo,mat,x=0,y=0,z=0,parent=root){const o=new THREE.Mesh(geo,typeof mat==='string'?mats[mat]:mat);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
 function box(x,y,z,w,h,d,mat='stone',r=0,parent=root){const o=mesh(boxGeo,mat,x,y,z,parent);o.scale.set(w,h,d);o.rotation.y=r;return o;}
 function rod(a,b,r=.035,mat='rope',parent=root){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),d=vb.clone().sub(va);const o=mesh(new THREE.CylinderGeometry(r,r,d.length(),6),mat,...va.add(vb).multiplyScalar(.5).toArray(),parent);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o;}
 function curve(points,r=.025,mat='rope',parent=root){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),Math.max(8,points.length*3),r,5,false),mat,0,0,0,parent);}
 const land=mesh(coveTerrainGeometry(),groundMat);land.name='Continuous cove terrain';surfaces.push(land);
 function paving(points,width=.57){
  routes.push({points,width});
  for(let j=1;j<points.length;j++){
   const a=new THREE.Vector3(...points[j-1]),b=new THREE.Vector3(...points[j]),len=a.distanceTo(b),n=Math.ceil(len/.22),heading=Math.atan2(b.x-a.x,b.z-a.z);
   for(let i=0;i<n;i++){const p=a.clone().lerp(b,(i+.5)/n);box(p.x,p.y,p.z,width,.055,len/n-.012,(i+j)%4?'cap':'stone',heading);}
  }
 }
 // The short inner quay has a solid footing under every slab, with an open
 // walking surface above it. It never cuts through the fort foundation.
 for(let i=1;i<coveStreet.length;i++){
  const a=coveStreet[i-1],b=coveStreet[i];if(Math.min(a[2],b[2])> -2.4)continue;
  const len=Math.hypot(b[0]-a[0],b[2]-a[2]),r=Math.atan2(b[0]-a[0],b[2]-a[2]);
  surfaces.push(box((a[0]+b[0])/2,.31,(a[2]+b[2])/2,.79,1.48,len+.03,'stone',r));
 }
 paving(coveStreet,.60);coveConnections.forEach(p=>paving(p,.55));
 // Two inhabited arms have generous setbacks and doors facing the bay street.
 function cottage(x,z,s,r,roof,name){
  const o=put(A.house({roofColor:roof}),x,1.06,z,s,r);o.name=name;buildings.push(o);
  // Keep shared main-island materials untouched while giving this settlement aged timber.
  o.traverse(n=>{if(n.isMesh&&n.material.color?.getHex()===0xf1ddac)n.material=mats.wood;});
  return o;
 }
 const tavern=cottage(6.05,-1.45,.60,-Math.PI/2,0x577c7f,'The Rusty Anchor tavern');
 cottage(5.75,1.0,.46,-Math.PI/2,0x965b3b,'Fisher cottage');
 const workshop=cottage(-5.65,-1.3,.52,Math.PI/2,0x876048,'Shipwright workshop');
 // Tavern side yard, wooden tables, stools, hanging sign and rolled provisions.
 box(4.7,1.09,-2.77,1.7,.10,.65,'plank');
 for(const x of[4.25,5.15]){mesh(new THREE.CylinderGeometry(.25,.25,.07,12),'plank',x,1.54,-2.75);rod([x,1.13,-2.75],[x,1.51,-2.75],.055,'wood');for(const dx of[-.35,.35]){box(x+dx,1.29,-2.75,.20,.30,.20,'wood');}}
 rod([4.3,1.1,-2.08],[4.3,2.55,-2.08],.045,'wood');rod([4.3,2.5,-2.08],[4.8,2.5,-2.08],.04,'wood');box(4.62,2.27,-2.08,.42,.32,.05,'blue');
 // A small brass anchor, modeled on both faces of the tavern sign.
 for(const s of[-1,1]){rod([4.62,2.37,-2.08+s*.035],[4.62,2.15,-2.08+s*.035],.015,'rope');curve([[4.5,2.24,-2.08+s*.035],[4.54,2.15,-2.08+s*.035],[4.62,2.14,-2.08+s*.035],[4.70,2.15,-2.08+s*.035],[4.73,2.24,-2.08+s*.035]],.012);}
 // Short arrival pier, steps and a wide open route directly to the street.
 put(H.dock({length:2.8,width:1.0,lanterns:true}),4.9,.71,2.8,1,Math.PI);
 for(let i=0;i<4;i++)box(4.9,.72+i*.09,2.78+i*.12,1.02,.10,.16,'cap');
 
 // The shipyard projects into the sheltered inner bay. All piles reach below sea level.
 const deck={x:-3.6,z:.8,w:2.3,d:3.3,y:.77};
 for(let i=0;i<17;i++)box(deck.x,deck.y,deck.z-deck.d/2+(i+.5)*deck.d/17,deck.w,.12,deck.d/17-.018,'plank');
 for(const x of[-4.62,-2.58])for(const z of[-.65,.8,2.25]){rod([x,-.65,z],[x,.93,z],.10,'wood');box(x,1.02,z,.23,.10,.23,'plank');}
 for(let i=0;i<4;i++)box(-4.86-i*.13,.79+i*.09,1.4,.16,.11,.85,'cap');
 // Open timber shelter: rafters, individual shingles, bracing and hanging fishing nets.
 for(const x of[-4.65,-2.55])for(const z of[-.48,1.78]){rod([x,.8,z],[x,2.53,z],.075,'wood');rod([x,2.0,z],[x+(x<-3.5?.38:-.38),2.5,z],.045,'wood');}
 for(let i=0;i<9;i++){const z=-.65+i*.32;rod([-4.85,2.52,z],[-3.6,3.07,z],.045,'wood');rod([-3.6,3.07,z],[-2.35,2.52,z],.045,'wood');}
 for(const side of[-1,1])for(let j=0;j<5;j++)for(let i=0;i<9;i++){
  const x=-3.6+side*(j+.5)*.25,z=-.65+i*.32;
  const tile=box(x,3.1-(j+.5)*.11,z,.275,.045,.34,(i+j)%3?'roof':'roofFaded');tile.rotation.z=-side*.414;
 }
 put(D.fishingNet(),-4.66,1.15,.3,.62,Math.PI/2);
 // Repair slip with exposed ribs, keel, diagonal braces and spare planking.
 const hull=new THREE.Group();put(hull,-3.55,.87,2.55,.75,.1);
 rod([0,.03,-1.15],[0,.03,1.15],.045,'wood',hull);
 for(let i=0;i<9;i++){const z=-1.05+i*.26,w=.51*Math.sin((i+1)/10*Math.PI);curve([[-w,.48,z],[-w*.84,.20,z],[0,.06,z],[w*.84,.20,z],[w,.48,z]],.025,'plank',hull);}
 for(const x of[-.20,.20])rod([x,-.05,-1.1],[x,-.05,1.1],.06,'wood',hull);
 for(let i=0;i<4;i++)box(-3.1,.89+i*.055,1.35,.17,.045,1.1,'wood',.12);
 for(const x of[-3.95,-3.15]){rod([x,.75,2.15],[x,.08,4.1],.065,'wood');for(const z of[2.5,3.3])rod([x,-.4,z],[x,.64-(z-2.5)*.34,z],.06,'wood');}
 for(let i=0;i<9;i++)rod([-4.02,.72-i*.07,2.25+i*.20],[-3.08,.72-i*.07,2.25+i*.20],.04,'plank');
 // Pivoting dock crane, winding drum, pulley and a small suspended cargo crate.
 rod([-2.63,.83,-.45],[-2.63,3.05,-.45],.095,'wood');rod([-2.63,2.9,-.45],[-1.35,2.65,-.45],.075,'wood');rod([-2.63,1.83,-.45],[-1.58,2.69,-.45],.05,'wood');
 const drum=mesh(new THREE.CylinderGeometry(.16,.16,.36,10),'rope',-2.63,1.4,-.45);drum.rotation.z=Math.PI/2;
 curve([[-2.63,1.42,-.45],[-2.63,3.07,-.45],[-1.33,2.72,-.45],[-1.33,1.36,-.45]],.018,'iron');put(A.crate(),-1.33,1.05,-.45,.45); // visibly hung over the water
 for(let i=0;i<7;i++){put(i%3?A.barrel():A.crate(),-4.25+(i%2)*.40,.84,-.36+Math.floor(i/2)*.35,.42,i*.31);}
 // Old fort: a solid battered limestone plinth, entered from its east side.
 const plinth=box(-2.9,1.35,-5.12,3.8,3.5,2.22,'stone');plinth.name='Fort rock foundation';surfaces.push(plinth);
 box(-2.9,3.08,-5.12,3.95,.12,2.35,'cap');
 // Weathered masonry faces with recessed mortar, broad footings and buttresses.
 for(const z of[-6.25,-3.99])for(let row=0;row<8;row++)for(let i=0;i<9;i++){
  const x=-4.72+(i+.5+(row%2)*.15)*.39;
  box(x,1.12+row*.245,z,.375,.227,.075,(i+row)%7===0?'darkStone':'stone');
 }
 for(const x of[-4.79,-2.95,-1.04]){
  box(x,1.93,-3.91,.27,2.24,.28,'stone');box(x,1.08,-3.88,.42,.28,.43,'darkStone');box(x,3.05,-3.90,.36,.12,.37,'cap');
 }
 for(let i=0;i<4;i++)for(let j=0;j<6-i;j++)put(N.bush({scale:.12,seed:1300+i*10+j}),-4.5+i*.28+Math.sin(j)*.06,3.03-j*.23,-3.89);

 // Stone courses and irregularly lost crenellations make a ruin, not a fresh castle.
 for(const z of[-6.2,-4.04])for(let row=0;row<3;row++)for(let i=0;i<10;i++){
  const x=-4.65+(i+.5)*.35;if(z>-5&&i>6)continue;box(x,3.25+row*.19,z,.335,.175,.22,row===2?'cap':'stone');
  if(row===2&&i%2===0)box(x,3.91,z,.25,.32,.28,'cap');
 }
 for(const x of[-4.78,-1.02])for(let j=0;j<6;j++){const z=-6.1+j*.35;if(x>-2&&z>-4.8)continue;box(x,3.46,z,.24,.64,.33,'stone');}
 // A hollow watchtower preserves a readable dark interior and sea-facing slits.
 for(let row=0;row<10;row++)for(let i=0;i<18;i++){
  const a=(i+(row%2)*.5)*Math.PI*2/18;
  if(row>3&&row<7&&(i===2||i===8||i===14))continue;
  box(-3.65+Math.sin(a)*.68,3.25+row*.25,-5.3+Math.cos(a)*.68,.245,.235,.20,row%4===0?'darkStone':'stone',a);
 }
 for(let i=0;i<10;i++){const a=i*Math.PI/5;box(-3.65+Math.sin(a)*.69,5.9,-5.3+Math.cos(a)*.69,.27,.40,.25,'cap',a);}
 mesh(new THREE.CylinderGeometry(.56,.56,.08,18),'darkStone',-3.65,5.58,-5.3);
 rod([-3.65,5.6,-5.3],[-3.65,7.05,-5.3],.03,'wood');
 const flagGeo=new THREE.PlaneGeometry(.68,.35,10,3),fp=flagGeo.attributes.position;
 for(let i=0;i<fp.count;i++)fp.setZ(i,Math.sin(fp.getX(i)*7)*.07);
 const flagMat=new THREE.MeshStandardMaterial({color:0x863b33,side:THREE.DoubleSide,roughness:1});
 mesh(flagGeo,flagMat,-3.29,6.8,-5.3);
 // Supported straight stair is outside the plinth, ending exactly on its east lip.
 const stairA=[2.25,1.09,-4.35],stairB=[-.97,3.16,-4.35],count=22;
 const stairPoints=[];
 for(let i=0;i<count;i++){const t=i/(count-1),x=THREE.MathUtils.lerp(stairA[0],stairB[0],t),y=THREE.MathUtils.lerp(stairA[1],stairB[1],t);surfaces.push(box(x,(y+1)/2,-4.35,.18,Math.max(.08,y-1),.78,'stone'));surfaces.push(box(x,y,-4.35,.18,.06,.82,'cap'));stairPoints.push([x,y+.03,-4.35]);}
 routes.push({points:stairPoints,width:.72});paving([stairB,[-1.7,3.16,-4.35],[-2.35,3.16,-4.65]],.65);
 for(const z of[-4.78,-3.92]){rod([2.25,1.7,z],[-.97,3.77,z],.032,'rope');for(let i=0;i<6;i++){const t=i/5,x=2.25-3.22*t,y=1.12+2.07*t;rod([x,y,z],[x,y+.62,z],.035,'wood');}}
 // Fort artillery with wheels, bore openings and stacked cannonballs.
 for(const x of[-2.7,-1.8]){
  box(x,3.28,-5.65,.34,.19,.5,'wood');for(const dx of[-.19,.19])for(const z of[-5.80,-5.5]){const wheel=mesh(new THREE.CylinderGeometry(.11,.11,.06,9),'iron',x+dx,3.25,z);wheel.rotation.z=Math.PI/2;}
  rod([x,3.44,-5.45],[x,3.55,-6.15],.095,'iron');const bore=mesh(new THREE.CircleGeometry(.068,10),new THREE.MeshBasicMaterial({color:0x151c1e}),x,3.55,-6.22);bore.rotation.y=Math.PI;
 }
 for(let i=0;i<9;i++)mesh(new THREE.IcosahedronGeometry(.055,1),'iron',-1.45+(i%3)*.11,3.23+Math.floor(i/6)*.09,-5.4+Math.floor(i/3)*.1);
 // Rock aprons blend the fort into the outside coast; vines drape over the stone.
 for(let i=0;i<20;i++){const a=1.5+i/19*3.8,x=-2.9+Math.sin(a)*2,z=-5.15+Math.cos(a)*1.2;put(N.rock({size:.28+(i%3)*.08,seed:701+i,moss:i%2===0}),x,.9,z,1.1);}
 for(let i=0;i<7;i++){const x=-4.5+i*.46;curve([[x,3.2,-6.28],[x+.1,2.6,-6.35],[x-.1,1.8,-6.32]],.018,'wood');for(let j=0;j<6;j++)put(N.bush({scale:.10,seed:800+i*8+j}),x+Math.sin(j)*.08,3.1-j*.22,-6.32);}
 // Vegetation is rooted on the broad flat shoulder, with reserved street/door space.
 function nearRoutes(x,z,r=.7){return routes.some(({points,width})=>points.slice(1).some((b,i)=>{const a=points[i],dx=b[0]-a[0],dz=b[2]-a[2],len=dx*dx+dz*dz,t=len?THREE.MathUtils.clamp(((x-a[0])*dx+(z-a[2])*dz)/len,0,1):0;return Math.hypot(x-a[0]-t*dx,z-a[2]-t*dz)<r+width/2}));}
 const plants=[];
 for(let i=0;i<50;i++){
  const a=.90+i/49*4.48,p=covePoint(a,.68);
  if(p.z<-3.1&&p.x<2.8||nearRoutes(p.x,p.z,.35)||buildings.some(b=>Math.hypot(p.x-b.position.x,p.z-b.position.z)<1.1))continue;
  const o=i%4===0?N.palm({height:2.7,seed:900+i}):i%3===0?N.tree({height:1.7,seed:900+i}):N.bush({scale:.34,seed:900+i});
  plants.push(put(o,p.x,1.05,p.z,1,i*.5));
 }
 for(let i=0;i<100;i++){
  const a=.95+i/99*4.35,p=covePoint(a,.58+.12*Math.sin(i*2.4));
  if(p.z<-3.1&&p.x<2.8||nearRoutes(p.x,p.z,.16)||buildings.some(b=>Math.hypot(p.x-b.position.x,p.z-b.position.z)<.95))continue;
  put(N.bush({scale:.13+(i%4)*.035,seed:1500+i}),p.x,p.y,p.z,1,i);
 }
 for(let i=0;i<65;i++){
  const a=.82+i/64*4.64,p=covePoint(a,.92),s=.16+(i%5)*.06;
  put(N.rock({size:s,seed:1000+i,moss:i%3===0}),p.x,p.y-.10,p.z,1,i*.3);
  if(i%5===0){const q=covePoint(a,.29);if(!nearRoutes(q.x,q.z,.1))put(N.flowers({seed:1100+i}),q.x,q.y,q.z,.42);}
 }
 for(const [x,z]of[[-5.3,2.45],[-5.5,-2.3],[6,-2.7],[1,-5.5]])put(N.palm({height:2.5,seed:Math.round(x*95)}),x,1.05,z,.85);
 for(const [x,z]of[[4.2,-2.4],[-5.3,-.75],[3.3,-3.65]])put(D.signpost(),x,1.06,z,.6,.2);
 // Restrained pools of warm light, joined to the common day/dusk/night controls.
 const lights=[];
 for(const[x,y,z]of[[4.4,1.05,-2.15],[-4.65,.82,1.72],[-1.4,3.16,-4.6],[5.1,1.05,3.15]])put(A.lamp(),x,y,z,.60);
 for(const[x,y,z,power]of[[4.7,2.1,-2.7,2.4],[-3.65,1.9,.8,2.0],[-1.5,4.0,-4.4,1.4]]){
  const l=new THREE.PointLight(0xffad60,0,3,2);l.position.set(COVE.x+x,y,COVE.z+z);l.visible=false;lights.push({light:l,power});
 }
 const boat=put(H.rowboat(),3.85,.2,.45,.65,.15);boat.name='Cove ferry';
 // Detached so it can rock without forcing the static settlement into thousands of draws.
 root.remove(boat);boat.position.x+=COVE.x;boat.position.z+=COVE.z;
 for(const[x,z,r]of[[4.25,-2.95,.4],[-4.75,1.4,-.8],[-1.6,-4.55,1.2]])put(H.person({color:0x8eaaab}),x,z<-4?3.2:1.10,z,.8,r);
 const shore=Array.from({length:101},(_,i)=>covePoint(COVE_START+(COVE_END-COVE_START)*i/100,0));
 shore.push(...Array.from({length:101},(_,i)=>covePoint(COVE_END-(COVE_END-COVE_START)*i/100,1.04)));
 root.updateMatrixWorld(true);
 return{root,boat,lights,surfaces,routes,buildings,plants,shore,update(t,night){for(const m of Object.values(mats))m.emissiveIntensity=night*.12;boat.position.y=.20+Math.sin(t*.85)*.035;boat.rotation.z=Math.sin(t*.67)*.018;lights.forEach(({light,power})=>{const level=THREE.MathUtils.smoothstep(night,.04,.9);light.visible=level>.001;light.intensity=power*level});}};
}

// Shore foam follows the actual concave outline, including both sides of the bay.
export function createCoveSurf(shore){
 const positions=[],uv=[],indices=[];
 for(let i=0;i<=shore.length;i++){
  const p=shore[i%shore.length],prev=shore[(i+shore.length-1)%shore.length],next=shore[(i+1)%shore.length];
  const normal=new THREE.Vector2(next.z-prev.z,prev.x-next.x).normalize();
  for(let j=0;j<2;j++){positions.push(COVE.x+p.x+normal.x*j*.65,.041,COVE.z+p.z+normal.y*j*.65);uv.push(i/shore.length,j);}
  if(i<shore.length){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{time:{value:0},night:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 vUv;uniform float time,night;void main(){float along=vUv.x*210.;float edge=.26+.13*sin(time*.75+sin(along*.3));float line=exp(-pow((vUv.y-edge)/.10,2.));float broken=smoothstep(-.3,.7,sin(along+sin(along*2.3)+time*.3));float fade=sin(vUv.y*3.14159);gl_FragColor=vec4(mix(vec3(.77,.94,.86),vec3(.18,.35,.41),night),line*broken*fade*.5);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 const mesh=new THREE.Mesh(g,material);mesh.name='Cove shoreline lapping foam';mesh.renderOrder=3;
 return{mesh,update(t,n){material.uniforms.time.value=t;material.uniforms.night.value=n}};
}
