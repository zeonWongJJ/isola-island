import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { buildWorld } from '../src/world.js';
import { WALK_STAIRS,TERRACES } from '../src/layout.js';
import { terraceHeightAt } from '../src/terrain.js';

test('every stair route remains clear and walking paths stay supported',()=>{
 const scene=new THREE.Scene(),world=buildWorld(scene);scene.updateMatrixWorld(true);
 const meshes=[];scene.traverse(o=>{if(o.isMesh)meshes.push(o)});
 for(const {id,a,b,count,width}of WALK_STAIRS)for(let i=0;i<count;i++){
  const p=new THREE.Vector3(...a).lerp(new THREE.Vector3(...b),i/(count-1));
  const lateral=new THREE.Vector3(b[2]-a[2],0,a[0]-b[0]).normalize();
  for(const side of[-.34,0,.34]){
   const origin=p.clone().addScaledVector(lateral,side*width);origin.y+=1.65;
   const hit=new THREE.Raycaster(origin,new THREE.Vector3(0,-1,0),0,1.8).intersectObjects(meshes,false)[0];
   assert.ok(hit,`Missing ${id} tread ${i}`);
   assert.ok(Math.abs(hit.point.y-p.y-.036)<.05,`${id} tread ${i} at ${side} is covered by rock, paving or props (${hit.point.y-p.y}m)`);
  }
 }
 const layers=TERRACES.map(([cx,cz,rx,rz,top,bottom,color,phase])=>({cx,cz,rx,rz,top,phase}));
 for(const {points,width}of world.walkPaths)for(let i=1;i<points.length;i++){
  const a=new THREE.Vector3(...points[i-1]),b=new THREE.Vector3(...points[i]),side=new THREE.Vector3(b.z-a.z,0,a.x-b.x).normalize();
  for(let k=0;k<=12;k++)for(const s of[-.5,0,.5]){
   const p=a.clone().lerp(b,k/12).addScaledVector(side,width*s),ground=terraceHeightAt(p.x,p.z,layers);
   assert.ok(Math.abs(p.y-ground)<.18,`Walking path at ${p.toArray()} floats over a cliff or is buried`);
  }
 }
});
