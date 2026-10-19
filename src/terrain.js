import * as THREE from 'three';

// One shoreline definition keeps the land, wet sand and advancing surf aligned.
const bump=(a,c,w)=>Math.exp(-Math.pow(Math.atan2(Math.sin(a-c),Math.cos(a-c))/w,2));
export const coastShape=(a,p)=>{
 const base=1+.055*Math.sin(a*5+p)+.04*Math.sin(a*9+p)+.014*Math.sin(a*17+p*2)+.055*Math.sin(a*3+p*.7)+.025*Math.cos(a*2-p);
 return Math.abs(p-.4)<.001?base-.105*bump(a,1.95,.34)+.09*bump(a,2.72,.3):base;
};
export const coastShapeGLSL=`
float coastBump(float a,float c,float w){return exp(-pow(atan(sin(a-c),cos(a-c))/w,2.));}
float coastShape(float a,float p){float base=1.+.055*sin(a*5.+p)+.04*sin(a*9.+p)+.014*sin(a*17.+p*2.)+.055*sin(a*3.+p*.7)+.025*cos(a*2.-p);return abs(p-.4)<.001?base-.105*coastBump(a,1.95,.34)+.09*coastBump(a,2.72,.3):base;}`;

export function terraceHeightAt(x,z,layers){
 let y=-.3;
 for(const l of layers){const dx=(x-l.cx)/l.rx,dz=(z-l.cz)/l.rz;if(Math.hypot(dx,dz)<coastShape(Math.atan2(dz,dx),l.phase)-.015)y=Math.max(y,l.top)}
 return y;
}

export function terraceGeometry(cx,cz,rx,rz,top,bottom,color,phase){
 const segments=96,bands=7,edge=[],tp=[],tc=[],cp=[],cc=[];
 const topColor=new THREE.Color(color),warm=new THREE.Color(0xb8b4a0),cool=new THREE.Color(0x8b9892);
 const hash=(i,j)=>{const n=Math.sin(i*127.1+j*311.7+phase*71.3)*43758.5453;return n-Math.floor(n)};
 const point=(i,j)=>{
  const a=i/segments*Math.PI*2,t=j/bands;
  const shift=Math.sin(a*11+j*1.7+phase)*.012*Math.sin(t*Math.PI);
  const angle=a+shift;
  const erosion=(.035*Math.sin(a*7+j*1.1+phase)+.022*Math.sin(a*19-j*.7))*Math.sin(t*Math.PI);
  const radius=coastShape(a,phase)*(1+.055*(1-t)+erosion);
  const uneven=Math.sin(a*6+j*1.8+phase)*.11*Math.sin(t*Math.PI);
  return[cx+Math.cos(angle)*rx*radius,bottom+(top-bottom)*t+uneven+.065*Math.sin(a*19+phase)*t,cz+Math.sin(angle)*rz*radius];
 };
 const push=(positions,colors,vertices,c)=>{for(const p of vertices){positions.push(...p);colors.push(c.r,c.g,c.b)}};
 for(let i=0;i<segments;i++){
  const a=point(i,bands),b=point(i+1,bands);edge.push([a[0],a[2]]);
  push(tp,tc,[[cx,top+.03,cz],b,a],topColor.clone().multiplyScalar(.96+hash(i,0)*.07));
  for(let j=0;j<bands;j++){
   const a=point(i,j),b=point(i+1,j),c=point(i,j+1),d=point(i+1,j+1);
   // Adjacent facets share a geological palette; seams step across the rock
   // instead of running as straight, differently colored columns.
   const blend=.43+.21*Math.sin(i*.21+phase)+.12*Math.sin(j*2.1+i*.12);
   const stone=warm.clone().lerp(cool,blend).multiplyScalar(.91+.12*hash(i,j));
   const triangles=(i+j)%2?[[a,c,d],[a,d,b]]:[[a,c,b],[b,c,d]];
   triangles.forEach((v,k)=>push(cp,cc,v,stone.clone().multiplyScalar(1-k*.025)));
  }
 }
 function geometry(pos,col){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.computeVertexNormals();return g}
 return{top:geometry(tp,tc),cliff:geometry(cp,cc),edge};
}
