import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createAtmosphere } from '../src/atmosphere.js';

test('sun and moon fit the default overview on phone, tablet and desktop',()=>{
 for(const [width,height]of [[390,844],[768,1024],[1440,900]]){
  const scene=new THREE.Scene(),sky=createAtmosphere(scene),camera=new THREE.PerspectiveCamera(37,width/height,.1,1800);
  const look=new THREE.Vector3(1,4.1,1.4),factor=Math.max(1,Math.pow(1.3/camera.aspect,.8))*(width<700?1.04:1);
  camera.position.copy(look).add(new THREE.Vector3(29,7,38).multiplyScalar(factor));camera.lookAt(look);camera.updateMatrixWorld();
  for(const mode of ['day','sunset','night']){
   sky.setTheme(mode);for(let frame=0;frame<240;frame++)sky.update(frame/60,1/60,camera);scene.updateMatrixWorld(true);
   const body=mode==='night'?sky.moon:sky.sun,point=body.getWorldPosition(new THREE.Vector3()).project(camera);
   assert.ok(Math.abs(point.x)<.8&&point.y<.78&&point.y>0,`${mode} is clipped or hidden under the controls at ${width}×${height}: ${point.toArray()}`);
   assert.ok(body.visible,`${mode}'s celestial body must be visible`);
   assert.ok(point.z<1&&point.z>0,'The body must be within the camera clipping range');
  }
 }
});
