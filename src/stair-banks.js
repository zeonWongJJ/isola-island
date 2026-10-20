import * as THREE from 'three';

// Subtracting a corridor from surface triangles leaves open cut faces. These
// return walls close the two exposed banks while keeping the entire flight open.
export function stairBankGeometry(surfaces,stairs){
 const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0),positions=[],colors=[];
 function height(x,z){ray.set(new THREE.Vector3(x,20,z),down);return ray.intersectObjects(surfaces,false)[0]?.point.y??-.3;}
 function emit(a,b,c){for(const p of[a,b,c]){positions.push(...p);colors.push(.43,.45,.39);}}
 for(const {a,b,width}of stairs){
  const dx=b[0]-a[0],dz=b[2]-a[2],length=Math.hypot(dx,dz),ux=dx/length,uz=dz/length;
  const count=Math.ceil((length+.46)/.045);
  for(const side of[-1,1]){
   let previous=null;
   for(let i=0;i<=count;i++){
    const s=-.20+(length+.46)*i/count,x=a[0]+ux*s-uz*side*(width/2+.10),z=a[2]+uz*s+ux*side*(width/2+.10);
    const floor=a[1]+(b[1]-a[1])*s/length-.30,top=height(x,z);
    const current={x,z,top,floor};
    if(previous){
     const p=previous;
     if(p.top>p.floor||top>floor){
      const lowA=[p.x,p.floor,p.z],highA=[p.x,Math.max(p.top,p.floor),p.z],lowB=[x,floor,z],highB=[x,Math.max(top,floor),z];
      if(side===1){emit(lowA,highA,highB);emit(lowA,highB,lowB);}else{emit(lowA,highB,highA);emit(lowA,lowB,highB);}
     }
    }
    previous=current;
   }
  }
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();return geometry;
}
