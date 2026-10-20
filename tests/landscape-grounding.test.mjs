import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { TERRACES } from '../src/layout.js';
import { terraceGeometry } from '../src/terrain.js';
import { carveWalkways } from '../src/stair-cut.js';
import { carveCaveOpening } from '../src/cave-layout.js';
import { createLandscapeDetails } from '../src/landscape-detail.js';

test('path shoulders and grass roots follow real carved terrain instead of spanning gaps',()=>{
 const surfaces=[],cliffs=[],material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
 for(const t of TERRACES){
  const g=terraceGeometry(...t);
  surfaces.push(new THREE.Mesh(carveWalkways(carveCaveOpening(g.top)),material));
  cliffs.push(new THREE.Mesh(carveWalkways(carveCaveOpening(g.cliff)),material));
 }
 const paths=[
  {points:[[-3.4,3.51,3.2],[-6.16,3.51,3.2],[-6.16,3.51,.85]],width:.28},
  {points:[[-2.2,8.32,-4.27],[-2.2,8.32,-4.5],[-1.8,8.32,-4.5]],width:.74},
  // An intentionally unsupported route must produce no floating paving.
  {points:[[30,3.51,30],[32,3.51,30]],width:.4},
 ];
 const {group,roots}=createLandscapeDetails({surfaces,cliffs,paths});
 const earth=group.getObjectByName('Landscape earth').geometry.getAttribute('position');
 assert.ok(earth.count>100&&roots.length>20,'The check must include actual path dressing and planted roots');
 const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
 for(let i=0;i<earth.count;i++){
  const p=new THREE.Vector3().fromBufferAttribute(earth,i);ray.set(p.clone().add(new THREE.Vector3(0,.10,0)),down);ray.far=.15;
  const hit=ray.intersectObjects(surfaces,false)[0];
  assert.ok(hit&&p.y-hit.point.y>=.007&&p.y-hit.point.y<.012,`Shoulder at ${p.toArray()} must be attached to real ground`);
 }
 for(const root of roots){
  ray.set(new THREE.Vector3(...root).add(new THREE.Vector3(0,.10,0)),down);ray.far=.15;
  const hit=ray.intersectObjects(surfaces,false)[0];
  assert.ok(hit&&Math.abs(hit.point.y-root[1])<.001,'Every added grass root needs a terrain foundation');
 }
 const stones=group.getObjectByName('Landscape stone').geometry.getAttribute('position');
 for(let i=0;i<stones.count;i++)assert.ok(stones.getX(i)<25,'Unsupported path must not produce floating stones');
});
