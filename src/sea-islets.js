import * as THREE from 'three';
import { addSurfaceDetail } from './surface-detail.js';

export const SEA_STACKS=[[-12,-5,1.5,2.8],[-13,-1,.7,1.5],[-11.7,8.6,1.1,2.0],[-8.8,11.8,.85,1.2],[-6.8,14.2,1.0,2.1],[-2.3,16.5,.7,1.1],[4.3,16.6,.65,.85],[12.9,8.1,.85,1.85],[11.8,-5.3,1.0,2.0],[-8,-12,.8,1.4],[4.5,-11,1.3,2.4],[9.8,-10.5,.7,1.4]];

// Shared, connected rings retain a sculpted silhouette without the triangular
// spikes of an enlarged prop boulder. The dark lower rings mark the wet tide line.
export function isletGeometry({rx,rz,height,seed=1,sanctuary=false}){
 const positions=[],colors=[],segments=sanctuary?36:20;
 const variants=[
  [[-.45,.95],[-.08,1],[.13,.95],[height*.27,.84],[height*.55,.77],[height*.74,.56],[height,.46]],
  [[-.45,.9],[-.08,1],[.13,.90],[height*.32,.86],[height*.35,.75],[height*.68,.62],[height,.52]],
  [[-.45,.95],[-.08,1],[.13,.94],[height*.25,.82],[height*.55,.72],[height*.57,.65],[height*.85,.61],[height,.40]],
 ];
 const profile=sanctuary?[[-.50,1.00],[-.08,1.0],[.12,.99],[.31,.96],[.46,.90],[.54,.74],[.92,.71],[height,.69]]:variants[seed%3];
 const hash=(i,j)=>{const n=Math.sin(i*73.17+j*29.4+seed*11.3)*43758.54;return n-Math.floor(n)};
 function point(i,j){const a=i/segments*Math.PI*2,[y,r]=profile[j],t=j/(profile.length-1);
  const shape=1+(sanctuary?.09:.14)*Math.sin(a*3+seed)+(sanctuary?.045:.09)*Math.sin(a*5+seed*.7)+.035*Math.cos(a*9-seed);
  const broken=1+.04*Math.sin(a*4+j*.72+seed);
  const seam=j===profile.length-1||j<2?0:Math.min(height*.055,.13)*Math.sin(a*3+seed)*Math.sin(t*Math.PI);
  return[Math.cos(a)*rx*r*shape*broken+Math.sin(seed)*rx*.11*t,y+seam,Math.sin(a)*rz*r*shape*broken+Math.cos(seed)*rz*.09*t];
 }
 function push(v,c){for(const p of v){positions.push(...p);colors.push(c.r,c.g,c.b);}}
 for(let j=0;j<profile.length-1;j++)for(let i=0;i<segments;i++){
  const y=(profile[j][0]+profile[j+1][0])/2;
  const base=sanctuary&&y<.48?new THREE.Color(y<0?0x8b9e8e:0xdfd1ae):new THREE.Color(y<.04?0x687e78:0xa8aea1);
  base.lerp(new THREE.Color(0xc4bea5),y>.04?.12+.16*Math.sin(i*.43+seed):0).multiplyScalar(.92+hash(i,j)*.11);
  if(!sanctuary&&j%3===0&&j>2)base.multiplyScalar(.91);
  const a=point(i,j),b=point(i+1,j),c=point(i,j+1),d=point(i+1,j+1);
  push([a,c,b],base);push([b,c,d],base.clone().multiplyScalar(.985));
 }
 const top=profile.length-1,center=[Math.sin(seed)*rx*.11,height,Math.cos(seed)*rz*.09];
 for(let i=0;i<segments;i++){
  const grass=new THREE.Color(sanctuary?0x7e965c:0x829262).multiplyScalar(.92+hash(i,top)*.12);
  push([center,point(i+1,top),point(i,top)],grass);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
}

export function createSeaIslets(N){
 const stone=addSurfaceDetail(new THREE.MeshStandardMaterial({vertexColors:true,roughness:.97,flatShading:true}),'limestone');
 const leafMat=new THREE.MeshStandardMaterial({color:0x779254,side:THREE.DoubleSide,roughness:1});
 const blade=new THREE.BufferGeometry();blade.setAttribute('position',new THREE.Float32BufferAttribute([-.035,0,0,0,.15,.015,.025,0,0],3));blade.computeVertexNormals();
 const put=(g,o,x,y,z,s=1,r=0)=>{o.position.set(x,y,z);o.scale.multiplyScalar(s);o.rotation.y=r;g.add(o);return o;};
 function mass(options){const o=new THREE.Mesh(isletGeometry(options),stone);o.castShadow=o.receiveShadow=true;return o;}
 function stack({size,height,seed}){
  const group=new THREE.Group();group.name='Layered limestone islet';
  group.add(mass({rx:size*.95,rz:size*.84,height,seed}));
  const cx=Math.sin(seed)*size*.95*.11,cz=Math.cos(seed)*size*.84*.09;
  // Low rubble fans at the foot, with one larger shoulder rather than a single cone.
  for(let k=0;k<5;k++){const a=k*2.4+seed,s=size*(.12+(k%3)*.045),r=size*.69;
   const rock=put(group,N.rock({size:s,seed:seed*17+k,moss:k===0}),Math.cos(a)*r,-.02,Math.sin(a)*r*.83);rock.scale.set(1.25,.65+(k%2)*.35,.9);
  }
  const shoulder=put(group,N.rock({size:size*.34,seed:seed+100,moss:false}),-size*.48,height*.24,size*.17);shoulder.scale.set(.7,height/size*1.35,.95);
  for(let k=0;k<3;k++){const a=k*2.1+seed;
   put(group,N.bush({scale:.13+(k%2)*.035,seed:seed+k}),cx+Math.cos(a)*size*.23,height,cz+Math.sin(a)*size*.18);
  }
  // Rooted vegetation is restricted to the flat crown; smaller reefs stay bare.
  if(height>1.9&&size>1.0)put(group,N.palm({height:1.55,seed:seed+99}),cx+size*.06,height,cz-size*.06,.65,seed*.7);
  if(size>.9)put(group,N.flowers({seed}),cx-size*.16,height+.01,cz+size*.08,.28);
  for(let k=0;k<11;k++){const a=k*2.4+seed,r=size*(.12+.18*((k*7)%11)/11);
   put(group,new THREE.Mesh(blade,leafMat),cx+Math.cos(a)*r,height,cz+Math.sin(a)*r*.8,.5+(k%3)*.16,a);
  }
  return group;
 }
 function sanctuary({rx,rz}){
  const group=new THREE.Group();group.name='Sanctuary limestone shore';group.add(mass({rx,rz,height:1.3,seed:2.1,sanctuary:true}));
  for(let i=0;i<13;i++){const a=i*2.4,r=.82+(i%3)*.045,s=.10+(i%4)*.045;
   const rock=put(group,N.rock({size:s,seed:420+i,moss:i%4===0}),Math.cos(a)*rx*r,.16,Math.sin(a)*rz*r);rock.scale.set(1.4,.52,1.05);
  }
  for(const[x,z]of[[-1.05,.15],[.75,.65],[-.65,-.8]])put(group,N.bush({scale:.22,seed:Math.round(x*100)}),x,1.3,z);
  put(group,N.flowers({seed:41}),-.8,1.31,.65,.38);
  return group;
 }
 return{stack,sanctuary};
}
