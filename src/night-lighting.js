import * as THREE from 'three';
import { HOUSES, PORT } from './layout.js';

function glowTexture(){
 const size=64,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const r=Math.hypot((x+.5)/size*2-1,(y+.5)/size*2-1),i=(y*size+x)*4;
  data[i]=data[i+1]=data[i+2]=255;
  data[i+3]=Math.round(Math.min(1,Math.exp(-r*r*9)*.27+Math.exp(-r*r*90)*.66)*(1-THREE.MathUtils.smoothstep(r,.72,1))*255);
 }
 const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);texture.needsUpdate=true;return texture;
}

export function createNightLighting(scene,roots){
 const sources=[],layer=new THREE.Group();layer.name='Warm lantern glows';scene.add(layer);
 const texture=glowTexture(),materials={};
 for(const kind of ['window','lantern','beacon'])materials[kind]=new THREE.SpriteMaterial({map:texture,color:kind==='window'?0xffa648:0xff922c,transparent:true,opacity:0,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending,toneMapped:false});
 function register(node,position,kind,size,normal){
  const sprite=new THREE.Sprite(materials[kind]||materials.lantern);sprite.name=kind+' light bloom';sprite.renderOrder=8;layer.add(sprite);
  sources.push({node,local:new THREE.Vector3(...position),kind,size,normal:normal?new THREE.Vector3(...normal):null,world:new THREE.Vector3(),sprite,index:sources.length});
 }
 for(const root of roots){root.updateWorldMatrix(true,true);root.traverse(node=>{
  if(node.userData.nightEmitter){const e=node.userData.nightEmitter;node.updateWorldMatrix(true,false);const scale=node.getWorldScale(new THREE.Vector3());register(node,[0,0,0],e.kind,e.kind==='beacon'?1.25:Math.max(scale.x,scale.y,scale.z)*(e.kind==='window'?2.3:3.8),e.kind==='window'?[0,0,1]:null)}
  for(const e of node.userData.nightEmitters||[]){const scale=node.getWorldScale(new THREE.Vector3()).x;register(node,e.position,e.kind,e.size*scale*3.8,null)}
 });}
 const lightSpecs=[
  [-1.35,3.3,5.85,11,4.6],[3.55,3.4,5.75,12,4.6],[1.5,3.3,6.4,9,4.4],
  ...[0,5,6].map(i=>{const[x,y,z,s,r]=HOUSES[i];return[x+1.9*s*Math.sin(r),y+1.8*s,z+1.9*s*Math.cos(r),i===0?5:7,3.8]}),
  [.6,9.6,-3.25,5,4.0],[-.4,12.5,-5.1,7,3.6],
  [PORT.landing.x,2.3,10.9,9,4.8],[-5.4,2.25,9.9,5.5,3.8],[PORT.ship.x+1.1,1.65,PORT.ship.z-.7,5,3.8]
 ];
 const lights=lightSpecs.map(([x,y,z,power,range],i)=>{const light=new THREE.PointLight(i%3===0?0xffad4c:0xff8b2d,0,range,2);light.position.set(x,y,z);light.visible=false;light.name='Lantern spill '+i;scene.add(light);return {light,power}});
 const cascadeLight=new THREE.PointLight(0x32bde7,0,7.5,2);cascadeLight.position.set(1.5,3.9,2.2);cascadeLight.visible=false;cascadeLight.name='Blue waterfall glow';scene.add(cascadeLight);
 const direction=new THREE.Vector3(),normal=new THREE.Vector3(),normalMatrix=new THREE.Matrix3();
 for(const s of sources)s.world.copy(s.local).applyMatrix4(s.node.matrixWorld);
 return {sources,layer,lights,
  update(t,night,camera){
   // Twilight starts the lanterns gently; full night retains dark, cool unlit rock.
   const level=THREE.MathUtils.smoothstep(night,.025,.85);layer.visible=level>.001;
   for(const [kind,m]of Object.entries(materials))m.opacity=level*(kind==='window'?.28:kind==='beacon'?.58:.42);
   for(const s of sources){
    s.node.updateWorldMatrix(true,false);s.world.copy(s.local).applyMatrix4(s.node.matrixWorld);s.sprite.position.copy(s.world);
    if(camera){direction.copy(camera.position).sub(s.world).normalize();
     if(s.normal){normalMatrix.getNormalMatrix(s.node.matrixWorld);normal.copy(s.normal).applyMatrix3(normalMatrix).normalize();s.sprite.visible=normal.dot(direction)>.04;s.sprite.position.addScaledVector(normal,.045).addScaledVector(direction,.025)}
     else{s.sprite.position.addScaledVector(direction,s.kind==='beacon'?.20:.10);s.sprite.visible=true}
    }
    const size=s.size*(1+Math.sin(t*1.5+s.index*1.7)*.025);s.sprite.scale.setScalar(size);
   }
   lights.forEach(({light,power},i)=>{light.visible=level>.001;light.intensity=power*level*(.98+Math.sin(t*.8+i)*.02)});
   cascadeLight.visible=level>.001;cascadeLight.intensity=level*5;
  }};
}
