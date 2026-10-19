import * as THREE from 'three';

export function createLifeDetails(){
 const time={value:0},cube=new THREE.BoxGeometry(1,1,1),ball=new THREE.IcosahedronGeometry(1,0);
 const palette={wood:0x987046,dark:0x65533d,rope:0xb5a079,clay:0xbd7956,soil:0x625238,leaf:0x4c893f,cream:0xe5d5af,blue:0x69979e,coral:0xc77660,flower:0xe6b95c};
 const mats=Object.fromEntries(Object.entries(palette).map(([k,c])=>[k,new THREE.MeshStandardMaterial({color:c,roughness:.95,flatShading:true})]));
 const cloth=[mats.cream,mats.blue,mats.coral].map(m=>{const c=m.clone();c.side=THREE.DoubleSide;c.onBeforeCompile=s=>{s.uniforms.uBreezeTime=time;s.vertexShader='uniform float uBreezeTime;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.z+=sin(position.x*4.+uBreezeTime*1.35)*.028;');};c.customProgramCacheKey=()=> 'island-linen-breeze';return c});
 function mesh(g,geo,m,p,s=[1,1,1]){const o=new THREE.Mesh(geo,typeof m==='string'?mats[m]:m);o.position.set(...p);o.scale.set(...s);o.castShadow=true;o.receiveShadow=true;g.add(o);return o}
 function box(g,p,s,m='wood'){return mesh(g,cube,m,p,s)}
 function rod(g,a,b,r=.025,m='wood'){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),v=vb.clone().sub(va);const o=mesh(g,new THREE.CylinderGeometry(r,r,v.length(),5),m,va.add(vb).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o}
 function flowerpot(){const g=new THREE.Group();g.name='Terracotta doorstep flowers';mesh(g,new THREE.CylinderGeometry(.17,.115,.23,8),'clay',[0,.115,0]);mesh(g,new THREE.CylinderGeometry(.18,.18,.04,8),'clay',[0,.235,0]);mesh(g,new THREE.CircleGeometry(.15,8),'soil',[0,.258,0]).rotation.x=-Math.PI/2;
  for(let i=0;i<6;i++){const a=i*2.4,h=.34+(i%3)*.055;rod(g,[0,.23,0],[Math.cos(a)*.105,h,Math.sin(a)*.105],.012,'leaf');mesh(g,ball,'leaf',[Math.cos(a)*.08,.3,Math.sin(a)*.08],[.09,.035,.055]);mesh(g,ball,i%2?'flower':'coral',[Math.cos(a)*.105,h,Math.sin(a)*.105],[.055,.038,.055])}return g}
 function signpost(){const g=new THREE.Group();g.name='Carved wooden wayfinding';box(g,[0,.58,0],[.075,1.16,.075],'dark');
  for(let i=0;i<2;i++){const s=new THREE.Shape();s.moveTo(-.4,-.11);s.lineTo(.29,-.11);s.lineTo(.44,0);s.lineTo(.29,.11);s.lineTo(-.4,.11);s.closePath();const o=mesh(g,new THREE.ExtrudeGeometry(s,{depth:.045,bevelEnabled:false}),'wood',[0,.98-i*.29,.02]);if(i)o.rotation.y=Math.PI;
   for(let j=0;j<3;j++)box(g,[-.25+j*.095,.98-i*.29,.072],[.055,.018,.008],'cream');
  }return g}
 function laundry(){const g=new THREE.Group();g.name='Laundry drying in the sea breeze';for(const x of [-1.1,1.1])rod(g,[x,0,0],[x,1.38,0],.035,'dark');
  const pts=Array.from({length:17},(_,i)=>[-1.1+i*2.2/16,1.35-.14*Math.sin(i/16*Math.PI),0]);for(let i=1;i<pts.length;i++)rod(g,pts[i-1],pts[i],.012,'rope');
  for(let i=0;i<4;i++){const x=-.77+i*.51,y=1.35-.14*Math.sin((x+1.1)/2.2*Math.PI);const shape=new THREE.Shape();if(i%2){shape.moveTo(-.18,0);shape.lineTo(.18,0);shape.lineTo(.19,-.49);shape.lineTo(-.18,-.46)}else{shape.moveTo(-.13,0);shape.lineTo(-.24,-.1);shape.lineTo(-.18,-.23);shape.lineTo(-.12,-.17);shape.lineTo(-.12,-.46);shape.lineTo(.12,-.46);shape.lineTo(.12,-.17);shape.lineTo(.18,-.23);shape.lineTo(.24,-.1);shape.lineTo(.13,0)}shape.closePath();mesh(g,new THREE.ShapeGeometry(shape,4),cloth[i%3],[x,y,-.01]);for(const s of [-1,1])box(g,[x+s*.11,y+.015,.005],[.025,.065,.035],'wood')}
  return g}
 function fishingNet(){const g=new THREE.Group();g.name='Fishing net and cork floats';const at=(i,j)=>[-.72+i*.16,.12+j*.125-.10*Math.sin(i/9*Math.PI),Math.sin(j/6*Math.PI)*.14];
  for(let i=0;i<=9;i++)for(let j=0;j<=6;j++){if(i<9&&j<6)rod(g,at(i,j),at(i+1,j+1),.006,'rope');if(i<9&&j>0)rod(g,at(i,j),at(i+1,j-1),.006,'rope');}
  for(let i=0;i<6;i++){const p=at(i*1.8,6);mesh(g,ball,'clay',p,[.045,.035,.03])}return g}
 function driftwood(){const g=new THREE.Group();g.name='Salt-worn driftwood';rod(g,[-.46,.05,.06],[.43,.08,-.05],.045,'wood');rod(g,[.04,.065,0],[.27,.1,.21],.023,'cream');rod(g,[-.25,.05,.07],[-.36,.09,-.1],.018,'wood');return g}
 function shell(){const g=new THREE.Group();g.name='Small scallop shell';const fan=new THREE.SphereGeometry(.07,8,4,0,Math.PI);mesh(g,fan,'cream',[0,.015,0],[1,.26,1]);for(let i=0;i<5;i++){const a=i/4*Math.PI;rod(g,[0,.027,0],[Math.cos(a)*.065,.025,Math.sin(a)*.065],.003,'clay')}return g}
 return{flowerpot,signpost,laundry,fishingNet,driftwood,shell,update(t){time.value=t}};
}
