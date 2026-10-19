import { addSurfaceDetail } from './surface-detail.js';

/** Small, hand-built storybook buildings. All dimensions are in island metres. */
export function createArchitecture(THREE) {
  const geometry = new Map();
  const materials = new Map();
  const mat = (color, options = {}) => {
    const key = `${color}:${JSON.stringify(options)}`;
    if (!materials.has(key)) {
      const m = new THREE.MeshStandardMaterial({ color, roughness: .88, ...options });
      if (options.emissive) m.userData.glow = true;
      else if(!options.transparent){
        if([0x604029,0x9d6438,0xc28b4d,0x447e98].includes(color))addSurfaceDetail(m,'wood');
        else if([0xf1ddac,0xf2ead3].includes(color))addSurfaceDetail(m,'plaster');
        else if([0xc7b894,0x958d79].includes(color))addSurfaceDetail(m,'limestone');
      }
      materials.set(key, m);
    }
    return materials.get(key);
  };
  const C = { cream: 0xf1ddac, dark: 0x604029, wood: 0x9d6438, lightWood: 0xc28b4d,
    stone: 0xc7b894, stoneDark: 0x958d79, roof: 0xdb7d30, roofDark: 0xa45024,
    blue: 0x447e98, glass: 0x9ed3d0, green: 0x477a32, leaf: 0x6b9d3d, metal: 0x453c32 };
  const shared = (key, make) => {
    if (!geometry.has(key)) geometry.set(key, make());
    return geometry.get(key);
  };
  const boxGeo = shared('box', () => new THREE.BoxGeometry(1, 1, 1));
  const sphereGeo = shared('sphere', () => new THREE.IcosahedronGeometry(1, 0));
  const mesh = (group, geo, material, x=0, y=0, z=0) => {
    const o = new THREE.Mesh(geo, material); o.position.set(x,y,z);
    o.castShadow = true; o.receiveShadow = true; if(material.userData.glow)o.userData.nightEmitter={kind:"window"}; group.add(o); return o;
  };
  const box = (g, x,y,z, w,h,d, color, options) => {
    const o = mesh(g,boxGeo, typeof color === 'object' ? color : mat(color,options),x,y,z);
    o.scale.set(w,h,d); return o;
  };
  const cylinder = (g,x,y,z,rt,rb,h,color,n=12,options) => mesh(g,
    shared(`c:${rt}:${rb}:${h}:${n}`,()=>new THREE.CylinderGeometry(rt,rb,h,n)),
    typeof color === 'object' ? color : mat(color,options),x,y,z);
  const ball = (g,x,y,z,r,color) => {const o=mesh(g,sphereGeo,mat(color),x,y,z);o.scale.setScalar(r);return o;};
  const torus = (g,x,y,z,r,t,color) => {
    const o=mesh(g,shared(`t:${r}:${t}`,()=>new THREE.TorusGeometry(r,t,5,20)),mat(color),x,y,z);
    o.rotation.x=Math.PI/2; return o;
  };
  const beam = (g,a,b,r,color=C.wood) => {
    const v1=new THREE.Vector3(...a),v2=new THREE.Vector3(...b),delta=v2.clone().sub(v1);
    const o=cylinder(g,...v1.clone().add(v2).multiplyScalar(.5).toArray(),r,r,delta.length(),color,6);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()); return o;
  };
  const roofMaterials=new Map();
  function roofMaterial(color){if(!roofMaterials.has(color))roofMaterials.set(color,addSurfaceDetail(new THREE.MeshStandardMaterial({color,vertexColors:true,roughness:.98}),'roof'));return roofMaterials.get(color)}
  function tileRoofGeometry(length,depth,seed){return shared('shingles:'+length+':'+depth+':'+seed,()=>{
    const positions=[],colors=[],rows=6,cols=7,step=length/rows,pitch=depth/cols;
    const hash=(a,b)=>{const v=Math.sin(a*91.7+b*53.3+seed*.001)*43758.5453;return v-Math.floor(v)};
    function triangle(a,b,c,shade){for(const p of[a,b,c]){positions.push(...p);colors.push(shade,shade*.98,shade*.95)}}
    for(let row=0;row<rows;row++)for(let col=-1;col<cols;col++){
      const x0=-length/2+row*step+.006,x1=x0+step-.009;
      const center=-depth/2+(col+.5+(row%2)*.5)*pitch;
      const z0=Math.max(-depth/2,center-pitch/2+.008),z1=Math.min(depth/2,center+pitch/2-.008);
      if(z1-z0<.035)continue;
      const y=.094+(hash(row,col)-.5)*.011,shade=.87+hash(row+1,col+3)*.20;
      const a=[x0,y,z0],b=[x1,y+.005,z0],c=[x1,y+.005,z1],d=[x0,y,z1],m=[(x0+x1)/2,y+.025,(z0+z1)/2];
      triangle(a,m,b,shade*.97);triangle(b,m,c,shade);triangle(c,m,d,shade*1.02);triangle(d,m,a,shade*.98);
      const a0=[x0,.035,z0],b0=[x1,.035,z0],c0=[x1,.035,z1],d0=[x0,.035,z1];
      for(const[q,r,s,t]of[[a,a0,b0,b],[b,b0,c0,c],[c,c0,d0,d],[d,d0,a0,a]]){triangle(q,s,r,shade*.84);triangle(q,t,s,shade*.84)}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
  })}
  const windowMaterial = mat(0xf8c766,{emissive:0xff9b28,emissiveIntensity:.15,roughness:.5});
  windowMaterial.userData.nightMultiplier=1.3;
  const flowerColors = [0xffd649,0xf16b78,0xf5a7a7,0xf7e6af];
  function windowAt(g,x,y,z,rotation=0,flower=true) {
    const w=new THREE.Group();w.position.set(x,y,z);w.rotation.y=rotation;g.add(w);
    box(w,0,0,0,.52,.62,.07,C.dark);
    box(w,0,.015,.047,.41,.49,.025,windowMaterial);
    box(w,0,0,.07,.035,.53,.04,C.dark);
    box(w,0,0,.07,.44,.035,.04,C.dark);
    box(w,-.34,0,.045,.16,.62,.075,C.blue);
    box(w,.34,0,.045,.16,.62,.075,C.blue);
    box(w,0,-.34,.1,.78,.08,.19,C.lightWood);
    if(flower){
      box(w,0,-.44,.17,.65,.15,.23,C.wood);
      for(let i=0;i<3;i++) {ball(w,-.22+i*.22,-.35,.2,.14,C.green);ball(w,-.22+i*.22,-.24,.22,.08,flowerColors[i]);}
    }
  }
  function house({x=0,y=0,z=0,scale=1,rotation=0,roofColor=C.roof}={}) {
    const g=new THREE.Group();g.name='Timbered island cottage';
    g.position.set(x,y,z);g.rotation.y=rotation;g.scale.setScalar(scale);
    box(g,0,.12,0,2.25,.24,2.05,C.stone);
    box(g,0,1.08,0,2,1.92,1.8,C.cream);
    // Triangle gables are solid on both ends, so the building works from every angle.
    const gable=shared('gable',()=>{
      const s=new THREE.Shape();s.moveTo(-1,0);s.lineTo(1,0);s.lineTo(1,.15);s.lineTo(0,1.01);s.lineTo(-1,.15);s.closePath();
      return new THREE.ExtrudeGeometry(s,{depth:1.8,bevelEnabled:false});
    });
    mesh(g,gable,mat(C.cream),0,2.04,-.9);
    const rise=1.03, run=1.19, angle=Math.atan2(rise,run), length=Math.hypot(rise,run);
    for(const side of [-1,1]){
      const roof=new THREE.Group();roof.position.set(side*run/2,2.04+rise/2,0);roof.rotation.z=-side*angle;g.add(roof);
      box(roof,0,0,0,length,.13,2.26,roofColor);
      mesh(roof,tileRoofGeometry(length,2.26,roofColor+side),roofMaterial(roofColor));
      box(g,side*1.14,2.04,0,.12,.18,2.32,C.dark);
    }
    cylinder(g,0,3.07,0,.085,.085,2.4,C.roofDark,8).rotation.x=Math.PI/2;
    for(const zFace of [-.915,.915]){
      for(const px of [-.95,0,.95])box(g,px,1.1,zFace,.1,1.93,.09,C.dark);
      box(g,0,.34,zFace,2.05,.12,.09,C.dark);
      box(g,0,1.88,zFace,2.05,.12,.09,C.dark);
      beam(g,[-.92,2.08,zFace],[0,2.88,zFace],.055,C.dark);
      beam(g,[.92,2.08,zFace],[0,2.88,zFace],.055,C.dark);
      box(g,0,2.43,zFace,.09,.89,.09,C.dark);
    }
    for(const px of [-1.01,1.01]){
      box(g,px,1.88,0,.08,.12,1.8,C.dark);box(g,px,.34,0,.08,.12,1.8,C.dark);
    }
    box(g,-.49,.78,.941,.59,1.19,.08,C.dark);
    box(g,-.49,.76,.995,.46,1.04,.06,C.wood);
    for(let i=0;i<3;i++)box(g,-.65+i*.16,.76,1.031,.018,1.02,.012,C.dark);
    ball(g,-.33,.78,1.075,.045,0xd7ad57);
    box(g,-.49,.18,1.1,.8,.15,.47,C.stoneDark);
    windowAt(g,.48,1.17,.94,0,true);
    windowAt(g,1.03,1.17,0,Math.PI/2,true);
    windowAt(g,-1.03,1.17,0,-Math.PI/2,false);
    windowAt(g,.45,1.17,-.94,Math.PI,false);
    box(g,.65,2.83,-.5,.35,1.04,.35,C.stoneDark);
    box(g,.65,3.34,-.5,.44,.13,.44,C.stone);
    box(g,.65,3.41,-.5,.27,.025,.27,C.dark);
    const awning=box(g,-.49,1.53,1.19,.91,.09,.67,roofColor);awning.rotation.x=.16;
    for(const px of [-.87,-.11])box(g,px,.85,1.45,.065,1.48,.065,C.dark);
    return g;
  }
  function lighthouse(){
    const g=new THREE.Group();g.name='Lighthouse';
    cylinder(g,0,.15,0,1.18,1.25,.3,C.stone,16);
    cylinder(g,0,2.52,0,.56,.94,4.8,0xf2ead3,14);
    for(const h of [1.1,3.4]) {
      const top=.94-(h+.165-.12)*.38/4.8+.012;
      const bottom=.94-(h-.165-.12)*.38/4.8+.012;
      cylinder(g,0,h,0,top,bottom,.33,0xc7603f,14);
    }
    cylinder(g,0,4.93,0,.95,.75,.22,C.stoneDark,16);
    torus(g,0,5.44,0,.87,.035,C.metal);
    for(let i=0;i<12;i++){
      const a=i/12*Math.PI*2;box(g,Math.sin(a)*.87,5.22,Math.cos(a)*.87,.035,.47,.035,C.metal);
    }
    cylinder(g,0,5.5,0,.51,.51,.94,C.glass,10,{transparent:true,opacity:.55,roughness:.2});
    for(let i=0;i<8;i++){
      const a=i/8*Math.PI*2;box(g,Math.sin(a)*.51,5.5,Math.cos(a)*.51,.055,.95,.055,C.dark);
    }
    cylinder(g,0,5.12,0,.58,.58,.12,C.dark,12);
    const beacon=cylinder(g,0,5.52,0,.23,.23,.58,0xffdfa0,12,{emissive:0xffb94f,emissiveIntensity:.65});
    beacon.userData.nightEmitter={kind:"beacon"};beacon.material.userData.nightMultiplier=1.65;
    g.userData.beacon=beacon;
    cylinder(g,0,6.27,0,0,.85,.72,0xb94c34,12);
    cylinder(g,0,6.64,0,.04,.04,.34,C.dark,8);
    ball(g,0,6.84,0,.09,0xe3af57);
    for(const h of [1.7,3.05,4.15]){
      box(g,0,h,.96-h*.078,.3,.48,.09,C.dark);
      box(g,0,h,.99-h*.078,.19,.35,.08,windowMaterial);
    }
    box(g,0,.62,.93,.52,.94,.1,C.dark);
    box(g,0,.57,1,.39,.82,.07,C.wood);
    for(let i=0;i<3;i++)box(g,0,.06+i*.07,1.25-i*.12,.72,.13,.3,C.stone);
    return g;
  }
  function windmill(){
    const g=new THREE.Group();g.name='Windmill';
    cylinder(g,0,.12,0,1.25,1.3,.24,C.stone,10);
    cylinder(g,0,1.9,0,.69,1.05,3.56,C.cream,10);
    cylinder(g,0,3.62,0,.82,.82,.18,C.dark,10);
    cylinder(g,0,4.15,0,0,1.05,1.08,C.roof,10);
    for(let i=0;i<10;i++){
      const a=i*Math.PI/5;beam(g,[Math.sin(a)*1.03,.25,Math.cos(a)*1.03],[Math.sin(a)*.69,3.54,Math.cos(a)*.69],.047,C.dark);
    }
    box(g,0,.71,1.05,.58,1.12,.09,C.dark);box(g,0,.7,1.11,.44,.95,.06,C.wood);
    windowAt(g,0,2.02,.88,0,false);
    const rotor=new THREE.Group();rotor.position.set(0,3.28,1.18);g.add(rotor);g.userData.rotor=rotor;
    for(let i=0;i<4;i++){
      const blade=new THREE.Group();blade.rotation.z=i*Math.PI/2+.36;rotor.add(blade);
      box(blade,0,1.34,0,.11,2.55,.1,C.dark);
      box(blade,.24,1.63,.025,.55,1.65,.05,0xf0deaf);
      for(let k=0;k<6;k++)box(blade,.24,.85+k*.3,.065,.61,.045,.04,C.wood);
      box(blade,.5,1.61,.06,.045,1.76,.045,C.wood);
    }
    cylinder(rotor,0,0,.13,.21,.21,.3,C.wood,12).rotation.x=Math.PI/2;
    ball(rotor,0,0,.31,.12,C.dark);
    return g;
  }
  function stall({color=0xc9553d}={}){
    const g=new THREE.Group();g.name='Market stall';
    box(g,0,.35,0,1.65,.62,.8,C.wood);
    for(let i=0;i<7;i++)box(g,-.72+i*.24,.35,.415,.025,.58,.025,C.dark);
    box(g,0,.7,0,1.78,.12,.96,C.lightWood);
    for(const x of [-.76,.76])for(const z of [-.37,.37])box(g,x,.91,z,.07,1.8,.07,C.dark);
    for(let i=0;i<7;i++){
      const roof=box(g,-.78+i*.26,1.75,0,.255,.055,1.16,i%2?0xf7e3b0:color);roof.rotation.x=.14;
      box(g,-.78+i*.26,1.59,.575,.255,.2,.035,i%2?0xf7e3b0:color);
    }
    for(let i=0;i<3;i++){
      box(g,-.5+i*.5,.79,0,.42,.12,.55,C.dark);
      for(let j=0;j<3;j++)ball(g,-.61+i*.5+j*.1,.91,(j%2)*.19-.09,.115,[0xe78b31,0x99b94d,0xeecb50][i]);
    }
    for(const x of [-.58,.58]){box(g,x,1.45,.45,.13,.19,.13,windowMaterial).userData.nightEmitter={kind:"lantern"};box(g,x,1.57,.45,.19,.055,.19,C.dark);}
    return g;
  }
  function fountain(){
    const g=new THREE.Group();g.name='Town square fountain';
    cylinder(g,0,.11,0,1.28,1.35,.22,C.stone,20);
    cylinder(g,0,.29,0,1.16,1.2,.19,C.stoneDark,20);
    cylinder(g,0,.4,0,1.1,1.1,.04,0x63d1d9,24,{roughness:.18,metalness:.05});
    torus(g,0,.39,0,1.16,.11,C.stone);
    cylinder(g,0,.71,0,.21,.33,.78,C.stone,12);
    cylinder(g,0,1.04,0,.67,.25,.2,C.stone,16);
    cylinder(g,0,1.16,0,.6,.6,.04,0x6cd8df,20,{roughness:.2});
    torus(g,0,1.14,0,.64,.065,C.stone);
    cylinder(g,0,1.39,0,.1,.17,.45,C.stone,10);
    ball(g,0,1.63,0,.18,0x6fc9d3);
    const water=mat(0xa1e8e6,{transparent:true,opacity:.7,roughness:.15});
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3;
      beam(g,[Math.sin(a)*.6,1.1,Math.cos(a)*.6],[Math.sin(a)*.68,.43,Math.cos(a)*.68],.025,water);
    }
    return g;
  }
  function gazebo(){
    const g=new THREE.Group();g.name='Clifftop gazebo';
    cylinder(g,0,.14,0,1.2,1.27,.28,C.stone,6);
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3,x=Math.sin(a),z=Math.cos(a);
      cylinder(g,x,1.25,z,.065,.075,2.26,C.dark,6);
      if(i!==0){
        const b=(i+1)*Math.PI/3;
        beam(g,[x,.8,z],[Math.sin(b),.8,Math.cos(b)],.045,C.lightWood);
      }
    }
    box(g,0,1.97,0,.2,.3,.2,windowMaterial).userData.nightEmitter={kind:"lantern"};
    cylinder(g,0,2.76,0,0,1.53,1.0,C.roof,6);
    cylinder(g,0,2.28,0,1.5,1.5,.12,C.dark,6);
    cylinder(g,0,3.29,0,.05,.05,.2,C.dark,8);ball(g,0,3.42,0,.09,0xd5aa55);
    return g;
  }
  function barrel(){
    const g=new THREE.Group();g.name='Barrel';
    cylinder(g,0,.36,0,.27,.27,.64,C.wood,10);
    cylinder(g,0,.35,0,.3,.3,.44,C.lightWood,10);
    for(const y of [.12,.57])torus(g,0,y,0,.283,.028,C.metal);
    cylinder(g,0,.69,0,.25,.25,.035,C.wood,10);
    for(let i=0;i<10;i++){
      const a=i*Math.PI/5;box(g,Math.sin(a)*.301,.35,Math.cos(a)*.301,.016,.42,.016,C.wood);
    }
    return g;
  }
  function crate(){
    const g=new THREE.Group();g.name='Wooden crate';
    box(g,0,.29,0,.58,.58,.58,C.lightWood);
    for(const s of [-1,1]){
      for(const y of [.07,.5])box(g,0,y,s*.3,.63,.065,.055,C.wood);
      const brace=box(g,0,.29,s*.33,.065,.69,.04,C.wood);brace.rotation.z=s*.77;
      for(const x of [-.23,.23])box(g,s*.3,.29,x,.055,.59,.065,C.wood);
    }
    return g;
  }
  function lamp(){
    const g=new THREE.Group();g.name='Harbour lantern';
    cylinder(g,0,.06,0,.14,.19,.12,C.stoneDark,8);
    cylinder(g,0,.92,0,.045,.07,1.75,C.dark,8);
    box(g,0,1.84,0,.3,.1,.3,C.metal);
    box(g,0,2.04,0,.23,.34,.23,windowMaterial).userData.nightEmitter={kind:"lantern"};
    for(const x of [-.14,.14])for(const z of [-.14,.14])box(g,x,2.04,z,.025,.36,.025,C.dark);
    cylinder(g,0,2.3,0,0,.25,.22,C.dark,4).rotation.y=Math.PI/4;
    return g;
  }
  return {house,lighthouse,windmill,stall,fountain,gazebo,barrel,crate,lamp};
}
