import assert from 'node:assert/strict';
import test from 'node:test';
import * as T from 'three';
import {createCoveIsland,coveConnections,coveStreet} from '../src/cove-island.js';
import {createArchitecture} from '../src/architecture.js';
import {createNature} from '../src/nature.js';
import {createHarbor} from '../src/harbor.js';
import {createLifeDetails} from '../src/life-details.js';
import {COVE} from '../src/layout.js';
const cove=createCoveIsland({A:createArchitecture(T),N:createNature(T),H:createHarbor(T),D:createLifeDetails()});
const down=new T.Vector3(0,-1,0),ray=new T.Raycaster();
function ground(x,y,z){ray.set(new T.Vector3(COVE.x+x,y,COVE.z+z),down);return ray.intersectObjects(cove.surfaces,false)[0]?.point.y;}
test('cove roads, fort stairs, cottage foundations and planted roots have real support',()=>{
 for(const {points,width}of cove.routes)for(let j=1;j<points.length;j++){
  const a=new T.Vector3(...points[j-1]),b=new T.Vector3(...points[j]),d=b.clone().sub(a),n=Math.ceil(d.length()/.12),side=new T.Vector3(d.z,0,-d.x).normalize();
  for(let k=0;k<=n;k++)for(const edge of[-.35,0,.35]){
   const p=a.clone().lerp(b,k/n).addScaledVector(side,width*edge),y=ground(p.x,p.y+.10,p.z);
   assert.ok(y!==undefined&&p.y-y<.16&&y-p.y<.10,`Unsupported route at ${p.toArray()} (ground ${y})`);
  }
 }
 for(const b of cove.buildings)for(const x of[-1.1,1.1])for(const z of[-1,1]){
  const p=new T.Vector3(x,0,z).multiplyScalar(b.scale.x).applyAxisAngle(new T.Vector3(0,1,0),b.rotation.y).add(b.position),y=ground(p.x,1.4,p.z);
  assert.ok(Math.abs(y-1.05)<.07,`${b.name} foundation leaves its terrace`);
 }
 for(const p of cove.plants)assert.ok(Math.abs(ground(p.position.x,1.4,p.position.z)-p.position.y)<.04);
 // Every spur starts exactly on the continuous bay street.
 for(const route of coveConnections){const p=new T.Vector3(...route[0]);let distance=Infinity;
  for(let i=1;i<coveStreet.length;i++){const a=new T.Vector3(...coveStreet[i-1]),b=new T.Vector3(...coveStreet[i]),line=new T.Line3(a,b);distance=Math.min(distance,line.closestPointToPoint(p,true,new T.Vector3()).distanceTo(p));}
  assert.ok(distance<.001,'A cottage or arrival route is disconnected from the main street');
 }
});
test('cove street, cottage approaches and fort stairs stay clear at walking height',()=>{
 const probe=new T.Raycaster();
 for(const {points}of cove.routes)for(let i=1;i<points.length;i++){
  const a=new T.Vector3(...points[i-1]).add(new T.Vector3(COVE.x,.5,COVE.z));
  const b=new T.Vector3(...points[i]).add(new T.Vector3(COVE.x,.5,COVE.z)),d=b.clone().sub(a);
  if(d.length()<.03)continue;
  probe.set(a,d.clone().normalize());probe.far=d.length();
  assert.equal(probe.intersectObject(cove.root,true).length,0,`Blocked walking route near ${a.toArray()}`);
 }
});
test('the bay stays open for boats, the island clears existing land, and night spill remains local',()=>{
 for(let z=-2.5;z<=4;z+=.25)for(const x of[-.8,0,.8])assert.equal(ground(x,8,z),undefined,'The navigable bay is blocked by land');
 const box=new T.Box3().setFromObject(cove.root);assert.ok(box.max.x<-15,'New island enters the existing western reefs');
 assert.ok(box.max.y<8,'New fort competes with the main lighthouse height');
 cove.update(1,1);for(const {light}of cove.lights){assert.ok(light.intensity<=2.4);assert.ok(light.distance<=3);}
 cove.update(2,0);for(const {light}of cove.lights)assert.equal(light.visible,false);
 const hullY=cove.boat.position.y;cove.update(7,0);assert.ok(Math.abs(cove.boat.position.y-hullY)<.08);
});
