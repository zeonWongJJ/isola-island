import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { fitPlaceCamera, applyViewportOffset, PLACE_BOUNDS, OVERVIEW_POINTS, OVERVIEW_LOOK, MAX_ORBIT_DISTANCE } from '../src/camera-framing.js';
import { PIRATE, COVE } from '../src/layout.js';

const layouts=[
 {width:390,height:844,viewport:{x:14,y:160,width:286,height:530}},
 {width:390,height:844,viewport:{x:14,y:156,width:286,height:674}},
 {width:844,height:390,viewport:{x:14,y:80,width:750,height:226}},
 {width:1440,height:900,viewport:{x:332,y:204,width:1010,height:500}},
 {width:1440,height:900,viewport:{x:22,y:92,width:1320,height:786}},
];
const looks=[[-.4,10.2,-4.5],[1,8.8,-4.3],[.9,5.5,-.5],[2.5,2.7,3.8],[-5.3,4,1],[1.2,2.6,4.5],[6.4,2.3,11.8],[-4.8,1.2,7.8],[8.45,1.75,-1.9],[16.9,1.8,-4.6],PIRATE.look,COVE.look];
const offsets=[[8,5,11],[8,4,8],[7,7.5,14],[7,4,10],[-7,5,9],[3,5,10],[9,5,11],[4,5,10],[8.4,1.65,1.5],[6,5,9],PIRATE.offset,COVE.offset];
test('every destination fits the unobstructed viewport on phone, landscape and desktop',()=>{
 for(const layout of layouts)for(let i=0;i<PLACE_BOUNDS.length;i++){
  const framing=fitPlaceCamera({...layout,look:looks[i],offset:offsets[i],bounds:PLACE_BOUNDS[i]});
  const camera=new THREE.PerspectiveCamera(37,layout.width/layout.height,.1,1800);camera.position.copy(framing.position);camera.lookAt(framing.target);applyViewportOffset(camera,layout.viewport,layout.width,layout.height);camera.updateMatrixWorld();
  const {x,y,width,height}=layout.viewport;
  const center=framing.target.clone().project(camera);
  assert.ok(Math.abs((center.x*.5+.5)*layout.width-(x+width/2))<.01);
  assert.ok(Math.abs((.5-center.y*.5)*layout.height-(y+height/2))<.01);
  for(const px of[PLACE_BOUNDS[i][0][0],PLACE_BOUNDS[i][1][0]])for(const py of[PLACE_BOUNDS[i][0][1],PLACE_BOUNDS[i][1][1]])for(const pz of[PLACE_BOUNDS[i][0][2],PLACE_BOUNDS[i][1][2]]){
   const p=new THREE.Vector3(px,py,pz).project(camera),sx=(p.x*.5+.5)*layout.width,sy=(.5-p.y*.5)*layout.height;
   assert.ok(sx>=x&&sx<=x+width&&sy>=y&&sy<=y+height,`Place ${i} is clipped at ${layout.width}×${layout.height}`);
   assert.ok(p.z>0&&p.z<1);
  }
 }
});
test('the island overview fits without exceeding the orbit zoom range',()=>{
 for(const layout of layouts){const framing=fitPlaceCamera({...layout,look:OVERVIEW_LOOK,offset:[29,7,38],points:OVERVIEW_POINTS,minDistance:48});assert.ok(framing.distance<=MAX_ORBIT_DISTANCE);}
});
