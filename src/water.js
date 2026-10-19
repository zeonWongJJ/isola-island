import * as THREE from 'three';
import { coastShape, coastShapeGLSL } from './terrain.js';
import { REMOTE } from './layout.js';

const noiseGLSL = `
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
${coastShapeGLSL}
`;

export function createWaterSystem(scene,{seaStacks=[]}={}){
 const time={value:0},night={value:0};
 const deep={value:new THREE.Color(0x469eab)};
 const shoreData=[new THREE.Vector4(0,1,12.32,10.01),new THREE.Vector4(REMOTE.x,REMOTE.z,REMOTE.rx*1.1,REMOTE.rz*1.1),...seaStacks.map(([x,z,s])=>new THREE.Vector4(x,z,s*1.05,s*.94))];
 const material=new THREE.ShaderMaterial({
  uniforms:{uTime:time,uNight:night,uDeep:deep,uDusk:{value:0},uSkyTint:{value:new THREE.Color(0xc1e3e1)},uLightDirection:{value:new THREE.Vector3(-.53,.026,-.848).normalize()},uHarborLights:{value:Array.from({length:20},()=>new THREE.Vector4())},uShores:{value:shoreData}},
  vertexShader:`varying vec3 vWorld;void main(){vec4 w=modelMatrix*vec4(position,1.);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`
   uniform float uTime,uNight,uDusk;uniform vec3 uDeep,uSkyTint,uLightDirection;uniform vec4 uShores[${shoreData.length}];uniform vec4 uHarborLights[20];varying vec3 vWorld;
   ${noiseGLSL}
   void main(){
    vec2 p=vWorld.xz;
    // Independent directions and wavelengths avoid the old checkerboard pattern.
    vec2 slope=vec2(0.);
    slope+=cos(dot(p,vec2(.83,.55))*.85-uTime*.95)*vec2(.83,.55)*.031;
    slope+=cos(dot(p,vec2(-.42,.91))*1.37-uTime*.68)*vec2(-.42,.91)*.023;
    slope+=cos(dot(p,vec2(.21,.98))*2.83+uTime*.87)*vec2(.21,.98)*.008;
    slope+=vec2(noise(p*2.2+uTime*.09)-.5,noise(p*2.2+19.-uTime*.07)-.5)*.022;
    vec3 n=normalize(vec3(-slope.x,1.,-slope.y)),view=normalize(cameraPosition-vWorld);
    float d=100.;
    for(int i=0;i<${shoreData.length};i++){
     vec4 s=uShores[i];vec2 q=(p-s.xy)/s.zw;
     float shape=i<2?coastShape(atan(q.y,q.x),i==0?.4:2.1):1.;
     d=min(d,(length(q)/shape-1.)*min(s.z,s.w));
    }
    float shallow=exp(-max(d,0.)*.48);
    vec3 turquoise=mix(vec3(.09,.59,.52),vec3(.015,.13,.20),uNight);
    turquoise=mix(turquoise,vec3(.32,.31,.25),uDusk*.38);
    vec3 color=mix(uDeep,turquoise,shallow*.73);
    float cloud=noise(p*.12+vec2(uTime*.012,0.));color*=.94+cloud*.10;
    float swell=sin(dot(p,vec2(.71,.70))*.93-uTime*.72+noise(p*.24)*1.6);
    float ripple=sin(dot(p,vec2(-.48,.88))*4.8-uTime*1.3+noise(p*.85)*3.);
    float glint=pow(max(0.,ripple),14.)*smoothstep(.49,.74,noise(p*1.65+uTime*.08))*smoothstep(.34,.64,noise(p*.45-uTime*.03));
    color+=vec3(.075,.13,.12)*glint*(.35+.65*shallow)*(1.-uNight*.6);
    color*=1.+swell*.035;
    // Soft, irregular caustic flecks in the shallows, without hard grid lines.
    vec2 c=p*2.15+vec2(sin(p.y*.5+uTime*.3),sin(p.x*.4-uTime*.27))*.22;
    float caustic=pow(max(0.,1.-abs(noise(c+uTime*.06)-.52)*11.),5.);
    color+=vec3(.16,.24,.16)*caustic*shallow*.17*(1.-uNight*.7);
    float fresnel=pow(1.-max(dot(n,view),0.),4.);
    vec3 sky=uSkyTint;
    color=mix(color,sky,fresnel*(.48-uDusk*.24));
    vec3 light=normalize(uLightDirection);
    float reflection=pow(max(dot(reflect(-light,n),view),0.),150.);
    vec3 reflectionColor=mix(mix(vec3(.84,.79,.53),vec3(1.,.38,.09),uDusk),vec3(.30,.47,.64),uNight);
    color+=reflectionColor*reflection*(.48+uDusk*1.1);
    // Each dock lantern has its own mirrored position; moving ripples break
    // the warm reflection into short streaks instead of an orange painted patch.
    if(uNight>.025){for(int i=0;i<20;i++){
     vec4 lamp=uHarborLights[i];
     vec2 toward=normalize(cameraPosition.xz-lamp.xz+vec2(.0001));
     vec2 mirror=(cameraPosition.xz*lamp.y+lamp.xz*max(cameraPosition.y,.1))/(max(cameraPosition.y,.1)+lamp.y);
     vec2 delta=p-mirror;float across=dot(delta,vec2(-toward.y,toward.x));float along=dot(delta,toward);
     float distortion=(noise(vec2(along*3.,float(i)+uTime*.4))-.5)*.3;
     float streak=exp(-pow((across+distortion)/(.08+abs(along)*.045),2.))*exp(-pow(abs(along)/(.75+lamp.y*.25),1.4));
     float broken=(.04+.96*pow(.5+.5*sin(along*22.+uTime*2.3+float(i)*1.7),8.))*(.3+.7*noise(vec2(along*4.+uTime*.4,float(i)*4.)));
     color+=vec3(1.0,.37,.055)*streak*broken*lamp.w*.34;
    }}
    float haze=1.-exp(-pow(length(cameraPosition-vWorld)/280.,1.7));
    color=mix(color,sky,haze*.92);
    gl_FragColor=vec4(color,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`
 });
 // Keep the existing daylight/sunset/night color transition API.
 material.color=deep.value;
 const ocean=new THREE.Mesh(new THREE.PlaneGeometry(1400,1400),material);ocean.name='Ocean with directional wave normals';ocean.rotation.x=-Math.PI/2;ocean.position.y=.018;scene.add(ocean);
 const surfMeshes=[];
 function surf({x,z,rx,rz,phase=0,beach=false,scale=1}){
  const segments=beach?256:96,rows=24,positions=[],uv=[],indices=[];
  const inward=beach?-.68:-.05,outward=beach?2.5:Math.min(.9,rx*.8);
  for(let i=0;i<=segments;i++){
   const a=i/segments*Math.PI*2,shape=coastShape(a,phase);
   const coastX=Math.cos(a)*rx*shape,coastZ=Math.sin(a)*rz*shape;
   const radial=new THREE.Vector2(coastX,coastZ).normalize();
   for(let j=0;j<=rows;j++){
    const d=THREE.MathUtils.lerp(inward,outward,j/rows);
    const beachSlope=.36*11/Math.hypot(coastX,coastZ);
    const y=beach?Math.max(.035,.028-d*beachSlope)+.006:.038;
    positions.push(x+coastX+radial.x*d,y,z+coastZ+radial.y*d);uv.push(i/segments,d);
    if(i<segments&&j<rows){const k=i*(rows+1)+j;indices.push(k,k+1,k+rows+1,k+1,k+rows+2,k+rows+1)}
   }
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
  const surfMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{uTime:time,uNight:night,uScale:{value:scale},uBeach:{value:beach?1:0}},
   vertexShader:`varying vec2 vUv;varying vec3 vWorld;void main(){vUv=uv;vec4 p=modelMatrix*vec4(position,1.);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
   fragmentShader:`uniform float uTime,uNight,uScale,uBeach;varying vec2 vUv;varying vec3 vWorld;${noiseGLSL}
    void main(){
     float d=vUv.y;vec2 p=vWorld.xz;
     float variation=noise(p*.53+vec2(uTime*.06,0.));
     // The front advances toward shore, then breaks into foam that fades in place.
     float section=noise(vec2(cos(vUv.x*6.283),sin(vUv.x*6.283))*3.6);
     float cycle=fract(uTime*.115+section*.72+variation*.11);
     float front=mix(2.1*uScale,-.42*uScale,smoothstep(0.,.82,cycle));
     float thickness=mix(.055,.18,1.-smoothstep(-.1,1.6,d))*uScale;
     float curledFront=front+(noise(p*2.4+uTime*.035)-.5)*.16*uScale;
     float edge=exp(-pow((d-curledFront)/(thickness+.035*variation),2.));
     float lace=noise(p*9.-uTime*.12)*.55+noise(p*18.+uTime*.13)*.45;
     float foam=edge*(.38+.46*smoothstep(.23,.66,lace));
     float wake=smoothstep(front-.025,front+.17,d)*(1.-smoothstep(front+.2,front+.78*uScale,d));
     foam+=wake*smoothstep(.48,.76,lace)*.32;
     float life=smoothstep(0.,.12,cycle)*(1.-smoothstep(.78,1.,cycle));
     float breakup=smoothstep(.22,.65,noise(vec2(vUv.x*93.+variation*3.,uTime*.18)));
     foam*=life*breakup;
     float retreat=exp(-pow((d-(front+.32*uScale))/(.07*uScale),2.));
     foam+=retreat*smoothstep(.48,.72,lace)*life*.16*breakup;
     float swashFront=-.10-.30*sin(uTime*.67+variation*1.7);
     float lapping=exp(-pow((d-swashFront)/.065,2.))*smoothstep(.26,.62,lace);
     foam+=uBeach*lapping*(.32+.16*sin(uTime*.67+variation*1.7));
     // A thin translucent wash reaches the sloping sand and disappears as it drains.
     float wash=uBeach*smoothstep(front-.02,front+.14,d)*(1.-smoothstep(-.05,.40,d))*.24*life;
     float alpha=clamp(foam*.85+wash,0.,.86);
     alpha*=smoothstep(-.72,-.55,d)*(1.-smoothstep(2.05*uScale,2.5*uScale,d));
     vec3 foamColor=mix(vec3(.88,.98,.90),vec3(.26,.49,.56),uNight);
     vec3 washColor=mix(vec3(.14,.57,.49),vec3(.035,.16,.22),uNight);
     gl_FragColor=vec4(mix(washColor,foamColor,clamp(foam*3.,0.,1.)),alpha);
     #include <tonemapping_fragment>
     #include <colorspace_fragment>
    }`});
  const o=new THREE.Mesh(geo,surfMaterial);o.name=beach?'Breaking surf and receding beach wash':'Broken foam around rocks';o.renderOrder=3;scene.add(o);surfMeshes.push(o);
 }
 surf({x:0,z:1,rx:12.32,rz:10.01,phase:.4,beach:true});
 surf({x:REMOTE.x,z:REMOTE.z,rx:REMOTE.rx*1.1,rz:REMOTE.rz*1.1,phase:2.1,scale:.5});
 seaStacks.forEach(([x,z,s],i)=>surf({x,z,rx:s*1.05,rz:s*.94,phase:i*.71,scale:Math.min(.55,s*.4)}));
 // Replace the vertical sandy slab with an actual damp, gently sloped shoreline.
 const positions=[],colors=[],indices=[],rings=12,segments=256;
 for(let i=0;i<=segments;i++){
  const a=i/segments*Math.PI*2,rr=coastShape(a,.4);
  for(let j=0;j<=rings;j++){
   const r=THREE.MathUtils.lerp(.965,1.19,j/rings),d=(r-1.10)*10;
   const y=Math.max(-.3,.028-d*.36);
   positions.push(Math.cos(a)*11.2*rr*r,y,1+Math.sin(a)*9.1*rr*r);
   const wet=THREE.MathUtils.smoothstep(r,1.035,1.14),c=new THREE.Color(0xeed8a0).lerp(new THREE.Color(0xaaa67b),wet*.65);
   const grain=(Math.sin(a*127.+j*2.7)*.5+.5)*.018;
   const tidalBand=Math.exp(-Math.pow((r-1.067)/.013,2))*(.035+.018*Math.sin(a*27.));
   c.multiplyScalar(.98+grain-tidalBand);colors.push(c.r,c.g,c.b);
   if(i<segments&&j<rings){const k=i*(rings+1)+j;indices.push(k,k+rings+1,k+1,k+1,k+rings+1,k+rings+2)}
  }
 }
 const sandGeo=new THREE.BufferGeometry();sandGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));sandGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));sandGeo.setIndex(indices);sandGeo.computeVertexNormals();
 const sand=new THREE.Mesh(sandGeo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.93,side:THREE.DoubleSide}));sand.name='Dry sand to wet sloping beach';sand.receiveShadow=true;scene.add(sand);
 return{material,setHarborLights(lights){material.uniforms.uHarborLights.value=lights},setAtmosphere(sky){material.uniforms.uDusk.value=sky.weights.y;material.uniforms.uSkyTint.value.copy(sky.horizon);material.uniforms.uLightDirection.value.copy(sky.weights.z>.5?sky.moonDirection:sky.sunDirection)},update(t,n){time.value=t;night.value=n},surfMeshes};
}
