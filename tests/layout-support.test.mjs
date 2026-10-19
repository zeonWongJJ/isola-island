import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { TERRACES,HOUSES,GARDENS,BRIDGES,PORT } from '../src/layout.js';
import { terraceHeightAt,terraceGeometry } from '../src/terrain.js';
import { carveCaveOpening } from '../src/cave-layout.js';
import { carveWalkways } from '../src/stair-cut.js';

const layers=TERRACES.map(([cx,cz,rx,rz,top,bottom,color,phase])=>({cx,cz,rx,rz,top,phase}));
test('cottage foundations stay on a single terrace',()=>{
 for(const[x,y,z,scale,angle]of HOUSES)for(const dx of[-1.125,0,1.125])for(const dz of[-1.025,0,1.025]){
  const px=x+scale*(dx*Math.cos(angle)+dz*Math.sin(angle)),pz=z+scale*(-dx*Math.sin(angle)+dz*Math.cos(angle));
  assert.equal(terraceHeightAt(px,pz,layers),y,`Cottage at ${x},${z} crosses a cliff at ${px},${pz}`);
 }
});
test('both bridge banks are supported and the sagging deck clears the water',()=>{
 for(const bridge of BRIDGES){
  const angle=Math.atan2(bridge.b[2]-bridge.a[2],bridge.b[0]-bridge.a[0]);
  for(const p of[bridge.a,bridge.b])for(const side of[-1,0,1]){
   const x=p[0]-Math.sin(angle)*side*(bridge.width/2+.06),z=p[2]+Math.cos(angle)*side*(bridge.width/2+.06);
   assert.equal(terraceHeightAt(x,z,layers),p[1],`Bridge bank at ${x},${z} has no land below it`);
  }
  assert.ok(bridge.deckY+.04-bridge.sag-.05>bridge.waterY,'Even the bottom of the center planks must clear the pool');
 }
});
test('piers start on shore and the merchant hull stays clear of the beach',()=>{
 for(const p of[PORT.landing,PORT.beachPier])assert.equal(terraceHeightAt(p.x,p.z,layers),.48);
 const s=PORT.ship;
 for(const x of[-1.42,0,1.42])for(const z of[-3.6,0,3.8]){
  const px=s.x+s.scale*(x*Math.cos(s.rotation)+z*Math.sin(s.rotation)),pz=s.z+s.scale*(-x*Math.sin(s.rotation)+z*Math.cos(s.rotation));
  assert.ok(terraceHeightAt(px,pz,layers)<0,'The hull must sit entirely in water');
 }
});

test('actual carved terrain still supports cottage and garden corners',()=>{
 const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),surfaces=[];
 for(const t of TERRACES){const terrain=terraceGeometry(...t);for(const g of[terrain.top,terrain.cliff])surfaces.push(new THREE.Mesh(carveWalkways(carveCaveOpening(g)),material));}
 const footprints=[...HOUSES.map(([x,y,z,scale,angle])=>({x,y,z,scale,angle,width:2.25,depth:2.05,plinth:.24})),...GARDENS.map(p=>({...p,angle:0,y:p.y-.04,plinth:.14}))];
 for(const p of footprints)for(const dx of[-p.width/2,0,p.width/2])for(const dz of[-p.depth/2,0,p.depth/2]){
  const x=p.x+p.scale*(dx*Math.cos(p.angle)+dz*Math.sin(p.angle)),z=p.z+p.scale*(-dx*Math.sin(p.angle)+dz*Math.cos(p.angle));
  const top=p.y+.04+p.scale*p.plinth;
  const hit=new THREE.Raycaster(new THREE.Vector3(x,top+.08,z),new THREE.Vector3(0,-1,0),0,p.scale*p.plinth+.30).intersectObjects(surfaces,false)[0];
  assert.ok(hit&&hit.point.y>=p.y-.13&&hit.point.y<=top+.01,`Foundation at ${x},${z} lost its terrain support or has rock above its plinth`);
 }
});
