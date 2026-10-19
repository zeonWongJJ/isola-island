import * as THREE from 'three';
import { WALK_STAIRS } from './layout.js';

// Remove the rock above the stair bed, including the lip of the summit terrace.
// The solid masonry staircase fills this opening from below.
export function carveStairCorridor(geometry,stair){
 const {a,b,width}=stair,dx=b[0]-a[0],dz=b[2]-a[2],length=Math.hypot(dx,dz),ux=dx/length,uz=dz/length;
 const along=v=>(v[0]-a[0])*ux+(v[2]-a[2])*uz;
 const across=v=>(v[0]-a[0])*-uz+(v[2]-a[2])*ux;
 const planes=[v=>along(v)+.20,v=>length+.26-along(v),v=>width/2+.10-across(v),v=>width/2+.10+across(v),v=>v[1]-(a[1]+(b[1]-a[1])*along(v)/length-.30)];
 const p=geometry.getAttribute('position'),c=geometry.getAttribute('color'),positions=[],colors=[];
 const emit=poly=>{for(let i=1;i<poly.length-1;i++)for(const v of[poly[0],poly[i],poly[i+1]]){positions.push(...v.slice(0,3));colors.push(...v.slice(3));}};
 function clip(poly,plane,inside){const out=[];for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],da=plane(a),db=plane(b),ai=inside?da>=0:da<=0,bi=inside?db>=0:db<=0;
  if(ai)out.push(a);if(ai!==bi){const t=da/(da-db);out.push(a.map((v,k)=>THREE.MathUtils.lerp(v,b[k],t)));}
 }return out;}
 for(let i=0;i<p.count;i+=3){let poly=Array.from({length:3},(_,j)=>[p.getX(i+j),p.getY(i+j),p.getZ(i+j),c.getX(i+j),c.getY(i+j),c.getZ(i+j)]);
  if(planes.some(plane=>poly.every(v=>plane(v)<0))){emit(poly);continue;}
  for(const plane of planes){if(poly.length<3)break;emit(clip(poly,plane,false));poly=clip(poly,plane,true);}
 }
 const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));result.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));result.computeVertexNormals();geometry.dispose();return result;
}

export function carveWalkways(geometry){
 for(const stair of WALK_STAIRS)geometry=carveStairCorridor(geometry,stair);
 return geometry;
}
