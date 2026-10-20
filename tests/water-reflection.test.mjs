import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createWaterSystem } from '../src/water.js';

test('ocean reflection follows the orbit camera, clips underwater geometry and restores render state',()=>{
 const scene=new THREE.Scene(),water=createWaterSystem(scene),{ocean,surfMeshes}=water;
 const camera=new THREE.PerspectiveCamera(37,1.5,.1,1800);
 camera.setViewOffset(1440,960,-110,-20,1440,960);
 scene.updateMatrixWorld(true);surfMeshes[1].visible=false;
 const previousTarget={name:'main target'};let target=previousTarget,captures=0;
 const renderer={xr:{enabled:true},shadowMap:{autoUpdate:true},autoClear:true,
  getRenderTarget:()=>target,setRenderTarget:t=>{target=t;},
  state:{buffers:{depth:{setMask(){}}}},
  render(s,mirror){
   captures++;
   assert.equal(s,scene);assert.equal(ocean.visible,false,'Ocean must not reflect itself recursively');
   assert.ok(surfMeshes.every(o=>!o.visible),'Foam overlays should not be mirrored below the surface');
   assert.equal(target,ocean.getRenderTarget());
   assert.ok(Math.abs(mirror.position.y-(2*.018-camera.position.y))<.00001);
   assert.ok(Math.abs(mirror.position.x-camera.position.x)<.00001);
   assert.ok(Math.abs(mirror.position.z-camera.position.z)<.00001);
   assert.ok(new THREE.Vector3(0,.2,0).project(mirror).z>=-1,'Above-water island geometry must survive the clip plane');
   assert.ok(new THREE.Vector3(0,-.2,0).project(mirror).z< -1,'Underwater rock must not leak into the reflection');
  }
 };
 for(const position of[[29,11,38],[-18,9,12],[12,4,-10]]){
  camera.position.set(...position);camera.lookAt(1,3,0);camera.updateMatrixWorld(true);
  ocean.onBeforeRender(renderer,scene,camera);
  assert.equal(target,previousTarget);assert.equal(renderer.xr.enabled,true);assert.equal(renderer.shadowMap.autoUpdate,true);
  assert.equal(ocean.visible,true);assert.equal(surfMeshes[0].visible,true);assert.equal(surfMeshes[1].visible,false);
  // The eye ray toward a mirrored building must sample the real building
  // in the capture. Check that physical correspondence with panel view offsets.
  const building=new THREE.Vector3(2,7,1),mirrored=building.clone();mirrored.y=2*.018-building.y;
  const t=(camera.position.y-.018)/(camera.position.y-mirrored.y);
  const seaPoint=camera.position.clone().lerp(mirrored,t);
  const uv=new THREE.Vector4(seaPoint.x,-seaPoint.z,0,1).applyMatrix4(water.material.uniforms.textureMatrix.value);
  const screen=building.clone().project(ocean.camera);
  assert.ok(Math.abs(uv.x/uv.w-(screen.x*.5+.5))<.00001);
  assert.ok(Math.abs(uv.y/uv.w-(screen.y*.5+.5))<.00001);
 }
 assert.equal(captures,3);
 water.update(4.2,1);
 assert.equal(water.material.uniforms.uTime.value,4.2);
 assert.equal(water.material.uniforms.uNight.value,1,'Night changes must reach the cloned reflector uniforms');
 ocean.dispose();
});
