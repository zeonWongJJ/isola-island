import * as THREE from 'three';

// The entrance faces east (+X); its hollow must also be cut out of every terrain tier.
export const CAVE = Object.freeze({x:8.8,y:.45,z:-1.9,scale:.95,back:6.0});
export function inCaveApproach(x,y,z,padding=0){
 return x>6.8-padding&&x<13.6+padding&&Math.abs(z-CAVE.z)<1.72+padding&&y<3.6;
}

export function carveCaveOpening(geometry){
 const radius=1.10,archCenter=CAVE.y+1.14*CAVE.scale;
 const outline=[[-radius,CAVE.y-.025],[radius,CAVE.y-.025]];
 for(let i=0;i<=16;i++){const a=i/16*Math.PI;outline.push([Math.cos(a)*radius,archCenter+Math.sin(a)*radius]);}
 const planes=[v=>v[0]-CAVE.back,v=>13.7-v[0]];
 for(let i=0;i<outline.length;i++){
  const a=outline[i],b=outline[(i+1)%outline.length],dx=b[0]-a[0],dy=b[1]-a[1];
  planes.push(v=>dx*(v[1]-a[1])-dy*(v[2]-CAVE.z-a[0]));
 }
 const p=geometry.getAttribute('position'),c=geometry.getAttribute('color'),positions=[],colors=[];
 function emit(poly){for(let i=1;i<poly.length-1;i++)for(const v of [poly[0],poly[i],poly[i+1]]){positions.push(...v.slice(0,3));colors.push(...v.slice(3));}}
 function clip(poly,plane,inside){
  const result=[];
  for(let i=0;i<poly.length;i++){
   const a=poly[i],b=poly[(i+1)%poly.length],da=plane(a),db=plane(b);
   const aIn=inside?da>=0:da<=0,bIn=inside?db>=0:db<=0;
   if(aIn)result.push(a);
   if(aIn!==bIn){const t=da/(da-db);result.push(a.map((value,k)=>THREE.MathUtils.lerp(value,b[k],t)));}
  }
  return result;
 }
 for(let i=0;i<p.count;i+=3){
  let poly=Array.from({length:3},(_,j)=>[p.getX(i+j),p.getY(i+j),p.getZ(i+j),c.getX(i+j),c.getY(i+j),c.getZ(i+j)]);
  // Most terrain triangles are nowhere near the small entrance volume.
  if(poly.every(v=>v[0]<CAVE.back)||poly.every(v=>v[2]<CAVE.z-radius)||poly.every(v=>v[2]>CAVE.z+radius)||poly.every(v=>v[1]>archCenter+radius)||poly.every(v=>v[1]<CAVE.y-.025)){emit(poly);continue;}
  for(const plane of planes){
   if(poly.length<3)break;
   emit(clip(poly,plane,false));
   poly=clip(poly,plane,true);
  }
  // What remains lies inside the tunnel and is deliberately removed.
 }
 // Widen the open approach beyond the mouth, so adjacent grassy ledges do not
 // overhang the portal when it is viewed from either side.
 const sourcePositions=positions.slice(),sourceColors=colors.slice();positions.length=0;colors.length=0;
 const mouth=CAVE.x-.15;
 const approach=[v=>v[0]-mouth,v=>13.7-v[0],v=>v[1]-(CAVE.y-.025),v=>3.85-v[1],v=>1.85+(v[0]-mouth)*.30-(v[2]-CAVE.z),v=>1.85+(v[0]-mouth)*.30+(v[2]-CAVE.z)];
 for(let i=0;i<sourcePositions.length;i+=9){
  let poly=Array.from({length:3},(_,j)=>[...sourcePositions.slice(i+j*3,i+j*3+3),...sourceColors.slice(i+j*3,i+j*3+3)]);
  if(poly.every(v=>v[0]<mouth)||poly.every(v=>v[1]>3.85)||poly.every(v=>v[1]<CAVE.y-.025)){emit(poly);continue;}
  for(const plane of approach){if(poly.length<3)break;emit(clip(poly,plane,false));poly=clip(poly,plane,true);}
 }
 const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));result.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));result.computeVertexNormals();geometry.dispose();return result;
}
