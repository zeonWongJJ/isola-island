import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { isletGeometry, SEA_STACKS } from '../src/sea-islets.js';
import { REMOTE } from '../src/layout.js';

test('islet crowns and sanctuary palm roots have a continuous rock foundation',()=>{
 const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
 for(const [i,[x,z,size,height]]of SEA_STACKS.entries()){
  const seed=i*7+4,rx=size*.95,rz=size*.84,mesh=new THREE.Mesh(isletGeometry({rx,rz,height,seed}),material);
  const px=Math.sin(seed)*rx*.11,pz=Math.cos(seed)*rz*.09;
  const hit=new THREE.Raycaster(new THREE.Vector3(px,height+1,pz),new THREE.Vector3(0,-1,0)).intersectObject(mesh)[0];
  assert.ok(hit&&Math.abs(hit.point.y-height)<.001,'Vegetation crown must be flat and supported');
 }
 const sanctuary=new THREE.Mesh(isletGeometry({rx:REMOTE.rx,rz:REMOTE.rz,height:1.3,seed:2.1,sanctuary:true}),material);
 for(const[x,z]of[[1,-.55],[-.8,-.7],[0,-.2]]){
  const hit=new THREE.Raycaster(new THREE.Vector3(x,3,z),new THREE.Vector3(0,-1,0)).intersectObject(sanctuary)[0];
  assert.ok(hit&&Math.abs(hit.point.y-1.3)<.001,'Ruins and palm roots must sit on the island crown');
 }
});
