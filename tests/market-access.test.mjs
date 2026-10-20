import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { buildWorld } from '../src/world.js';
import { MARKET, MARKET_PATHS, TERRACES } from '../src/layout.js';
import { terraceGeometry } from '../src/terrain.js';
import { carveWalkways } from '../src/stair-cut.js';
import { carveCaveOpening } from '../src/cave-layout.js';

test('market stalls have solid terrain beneath their feet and a setback from the cliff',()=>{
 const surfaces=[],material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
 for(const t of TERRACES){const g=terraceGeometry(...t);for(const geo of[g.top,g.cliff])surfaces.push(new THREE.Mesh(carveWalkways(carveCaveOpening(geo)),material));}
 for(const p of MARKET.stalls)for(const u of[-1,0,1])for(const v of[-1,0,1]){
  // Include space outside the posts, not just the tiny center of the counter.
  const dx=u*(.95*p.scale+.20),dz=v*(.60*p.scale+.20),x=p.x+dx*Math.cos(p.rotation)+dz*Math.sin(p.rotation),z=p.z-dx*Math.sin(p.rotation)+dz*Math.cos(p.rotation);
  const hit=new THREE.Raycaster(new THREE.Vector3(x,2.05,z),new THREE.Vector3(0,-1,0),0,.5).intersectObjects(surfaces,false)[0];
  assert.ok(hit&&Math.abs(hit.point.y-1.78)<.10,`Stall at ${p.x},${p.z} has no foundation/setback at ${x},${z}`);
 }
});

test('the beach entrance, fountain loop and both cottage approaches remain unobstructed',()=>{
 const scene=new THREE.Scene();buildWorld(scene);scene.updateMatrixWorld(true);
 const surfaces=[],failures=[];scene.traverse(o=>{if(o.isMesh)surfaces.push(o)});
 for(const {id,points,width}of MARKET_PATHS)for(let j=1;j<points.length;j++){
  const a=new THREE.Vector3(...points[j-1]),b=new THREE.Vector3(...points[j]),side=new THREE.Vector3(b.z-a.z,0,a.x-b.x).normalize();
  for(let k=0;k<=12;k++)for(const s of[-.38,0,.38]){
   // Islanders are ~.45 units tall; a porch awning overhead is intentional.
   const p=a.clone().lerp(b,k/12).addScaledVector(side,width*s),origin=p.clone();origin.y+=.65;
   const hit=new THREE.Raycaster(origin,new THREE.Vector3(0,-1,0),0,.85).intersectObjects(surfaces,false)[0];
   if(!hit||Math.abs(hit.point.y-p.y)>=.13)failures.push(`${id} at ${p.toArray()}: ${hit?.point.y}`);
  }
 }
 const examples=MARKET_PATHS.flatMap(({id})=>failures.filter(f=>f.startsWith(id+' at ')).slice(0,3));
 assert.equal(failures.length,0,'Blocked or unsupported market paths:\n'+examples.join('\n'));
});
