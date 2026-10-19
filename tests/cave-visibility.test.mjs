import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { buildWorld } from '../src/world.js';
import { CAVE } from '../src/cave-layout.js';

test('the cave approach stays open at different heights and viewing angles',()=>{
 const scene=new THREE.Scene(),world=buildWorld(scene);world.update(3,0,new THREE.PerspectiveCamera());world.update(5,1,new THREE.PerspectiveCamera());scene.updateMatrixWorld(true);
 const surfaces=[];scene.traverse(o=>{if(o.isMesh)surfaces.push(o)});
 for(const height of [1.35,1.7,2.15])for(const lateral of [-.3,0,.3]){
  const origin=new THREE.Vector3(13,height,CAVE.z+lateral);
  const direction=new THREE.Vector3(7.5,height,CAVE.z).sub(origin).normalize();
  const hit=new THREE.Raycaster(origin,direction,0,8).intersectObjects(surfaces,false)[0];
  assert.ok(hit,'The ray must reach the modeled cave interior');
  assert.ok(hit.point.x<=CAVE.x+.16,`Terrain or props block the entrance at height=${height}, offset=${lateral}: ${hit.point.toArray()}`);
  if(lateral===0&&height<=1.7)assert.ok(hit.point.x<CAVE.back+.3,'The central sightline should reach the recessed cave wall');
 }
});
