import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { buildWorld } from '../src/world.js';

test('painted materials retain vertex colors on merged plants and buildings',()=>{
 const scene=new THREE.Scene();buildWorld(scene);let painted=0;
 scene.traverse(o=>{
  if(!o.isMesh)return;
  for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.vertexColors){
   painted++;const color=o.geometry.getAttribute('color');
   assert.ok(color,'A vertex-colored material without a color attribute renders black');
   assert.equal(color.count,o.geometry.getAttribute('position').count);
   assert.ok(color.array.some(c=>c>0),'Paint colors cannot all be black');
  }
 });
 assert.ok(painted>0);
});
