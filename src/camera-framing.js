import * as THREE from 'three';

export const PLACE_BOUNDS=[
 [[-2.85,4.9,-6.4],[1.0,13.65,-.3]],
 [[.5,8.1,-6.0],[3.6,10.65,-3.1]],
 [[-1.8,1.75,-3.4],[3.75,9.65,3.25]],
 [[2.9,1.7,.25],[7.3,4.6,4.85]],
 [[-8.45,3.25,-1.1],[-2.5,5.95,3.65]],
 [[-3.8,.45,2.8],[6.2,4.05,8.6]],
 [[2.7,.05,8.5],[10.7,5.5,16.1]],
 [[-7.4,.05,6.25],[-2.8,3.6,10.65]],
 [[7.35,.4,-3.6],[9.25,3.65,-.2]],
 [[15.15,.35,-6.3],[18.7,4.75,-2.4]],
];
export const OVERVIEW_POINTS=[[-11,.4,0],[-8,.4,8],[0,.4,10],[8,.4,7],[9,4,-4],[0,8.4,-7.8],[-7,4.7,-5],[-.4,13.7,-5.1],[8.8,.2,15.9],[10.5,5.1,13.3],[19,1,-4.4],[15.5,4.8,-4.8]];

export function fitPlaceCamera({look,offset,bounds,points,viewport,width,height,fov=37,minDistance=5,padding=1.10}){
 const target=new THREE.Vector3(...look),backward=new THREE.Vector3(...offset).normalize();
 const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),backward).normalize();
 const up=new THREE.Vector3().crossVectors(backward,right).normalize();
 const vertical=Math.tan(THREE.MathUtils.degToRad(fov/2))*viewport.height/height/padding;
 const horizontal=Math.tan(THREE.MathUtils.degToRad(fov/2))*width/height*viewport.width/width/padding;
 let distance=minDistance;
 const samples=points||[bounds[0][0],bounds[1][0]].flatMap(x=>[bounds[0][1],bounds[1][1]].flatMap(y=>[bounds[0][2],bounds[1][2]].map(z=>[x,y,z])));
 for(const sample of samples){
  const point=new THREE.Vector3(...sample).sub(target),depth=point.dot(backward);
  distance=Math.max(distance,depth+Math.abs(point.dot(right))/horizontal,depth+Math.abs(point.dot(up))/vertical,depth+.6);
 }
 return{target,position:target.clone().addScaledVector(backward,distance),distance};
}

export function applyViewportOffset(camera,viewport,width,height){
 camera.setViewOffset(width,height,width/2-(viewport.x+viewport.width/2),height/2-(viewport.y+viewport.height/2),width,height);
 camera.updateProjectionMatrix();
}
