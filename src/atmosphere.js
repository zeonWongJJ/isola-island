import * as THREE from 'three';

const noiseGLSL=`
float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
`;
export function createAtmosphere(scene,pixelRatio=1){
 const root=new THREE.Group();root.name='360 degree sky';scene.add(root);
 const weights=new THREE.Vector3(1,0,0),target=new THREE.Vector3(1,0,0),time={value:0};
 const sunDirection=new THREE.Vector3(-.53,.026,-.848).normalize();
 const moonDirection=new THREE.Vector3(-.54,.047,-.842).normalize();
 const dayHorizon=new THREE.Color(0xc1e3e1),duskHorizon=new THREE.Color(0xf2ba8f),nightHorizon=new THREE.Color(0x18344e);
 const horizon=dayHorizon.clone();
 const skyMaterial=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,depthTest:false,uniforms:{uWeights:{value:weights},uSun:{value:sunDirection}},
  vertexShader:`varying vec3 vDirection;void main(){vDirection=normalize(position);vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position=p.xyww;}`,
  fragmentShader:`uniform vec3 uWeights,uSun;varying vec3 vDirection;${noiseGLSL}
   void main(){vec3 d=normalize(vDirection);float h=pow(max(d.y,0.),.46);
    vec3 day=mix(vec3(.533,.769,.761),vec3(.105,.427,.740),h);
    vec3 dusk=mix(vec3(.887,.496,.275),vec3(.130,.089,.235),h);
    vec3 night=mix(vec3(.009,.030,.074),vec3(.0015,.005,.023),h);
    float solar=pow(max(0.,dot(d,uSun)),18.);dusk+=vec3(.33,.10,.015)*solar;
    vec3 c=day*uWeights.x+dusk*uWeights.y+night*uWeights.z;
    // A restrained misty band adds depth behind the real star points.
    float band=exp(-pow((d.x*.46+d.y*.71-d.z*.35-.27)*7.,2.));
    float dust=noise(d*35.)*.62+noise(d*89.)*.38;
    c+=vec3(.018,.024,.043)*band*dust*uWeights.z;
    if(d.y<0.)c=mix(c,c*.66,smoothstep(0.,.5,-d.y));
    gl_FragColor=vec4(c,1.);
    #include <colorspace_fragment>
   }`});
 const dome=new THREE.Mesh(new THREE.SphereGeometry(1200,48,32),skyMaterial);dome.name='Day dusk and night sky dome';dome.renderOrder=-1000;dome.frustumCulled=false;root.add(dome);
 const orbGeometry=new THREE.SphereGeometry(1,48,32);
 const sunMaterial=new THREE.MeshBasicMaterial({color:0xfff3c4,transparent:true,toneMapped:false,fog:false});
 const sun=new THREE.Mesh(orbGeometry,sunMaterial);sun.name='Sun';sun.position.copy(sunDirection).multiplyScalar(1050);sun.scale.setScalar(20);sun.renderOrder=-850;root.add(sun);
 const haloMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uOpacity:{value:1},uColor:{value:new THREE.Color(0xffdda1)}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`varying vec2 vUv;uniform float uOpacity;uniform vec3 uColor;void main(){float r=length(vUv*2.-1.);float a=exp(-r*r*7.)*(1.-smoothstep(.45,1.,r));gl_FragColor=vec4(uColor,a*uOpacity*.20);#include <colorspace_fragment>}`.replace(';#include',';\n#include')});
 const halo=new THREE.Mesh(new THREE.PlaneGeometry(180,180),haloMaterial);halo.name='Soft sunlight halo';halo.position.copy(sun.position);halo.renderOrder=-860;root.add(halo);
 const moonMaterial=new THREE.ShaderMaterial({transparent:true,uniforms:{uOpacity:{value:0}},
  vertexShader:`varying vec3 vLocal,vNormal;void main(){vLocal=normalize(position);vNormal=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`varying vec3 vLocal,vNormal;uniform float uOpacity;${noiseGLSL}
   void main(){vec3 p=normalize(vLocal);float maria=noise(p*4.)*.6+noise(p*12.)*.25+noise(p*36.)*.15;
    float crater=pow(max(0.,1.-abs(noise(p*23.)-.53)*17.),3.);
    float shade=.83+.17*dot(normalize(vNormal),normalize(vec3(-.3,.5,1.)));
    vec3 c=mix(vec3(.38,.46,.54),vec3(.88,.91,.86),smoothstep(.23,.76,maria))*shade+crater*.06;
    gl_FragColor=vec4(c,uOpacity);
    #include <colorspace_fragment>
   }`});
 const moon=new THREE.Mesh(orbGeometry,moonMaterial);moon.name='Cratered moon';moon.position.copy(moonDirection).multiplyScalar(1040);moon.scale.setScalar(16);moon.renderOrder=-850;root.add(moon);
 const moonHalo=halo.clone();moonHalo.material=haloMaterial.clone();moonHalo.material.uniforms={uOpacity:{value:0},uColor:{value:new THREE.Color(0xa8c9ed)}};moonHalo.name='Moonlight halo';moonHalo.position.copy(moon.position);moonHalo.scale.setScalar(.75);root.add(moonHalo);
 let seed=21781;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const starPositions=[],starSizes=[],starPhases=[],starColors=[];
 for(let i=0;i<3600;i++){
  const a=rnd()*Math.PI*2,y=.006+Math.pow(rnd(),2.2)*.99,r=Math.sqrt(1-y*y);
  starPositions.push(Math.cos(a)*r*1120,y*1120,Math.sin(a)*r*1120);
  starSizes.push(i%71===0?3.5:1.0+rnd()*1.65);starPhases.push(rnd()*6.283);
  const color=new THREE.Color([0xf4f1dd,0xd5e8ff,0xadcaf5,0xffe2ba][i%4]);starColors.push(color.r,color.g,color.b);
 }
 const starGeo=new THREE.BufferGeometry();starGeo.setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3));starGeo.setAttribute('aSize',new THREE.Float32BufferAttribute(starSizes,1));starGeo.setAttribute('aPhase',new THREE.Float32BufferAttribute(starPhases,1));starGeo.setAttribute('color',new THREE.Float32BufferAttribute(starColors,3));
 const starMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,vertexColors:true,uniforms:{uTime:time,uOpacity:{value:0},uRatio:{value:pixelRatio}},
  vertexShader:`attribute float aSize,aPhase;uniform float uRatio,uTime;varying vec3 vColor;varying float vShine;void main(){vColor=color;vShine=.74+.26*sin(uTime*.65+aPhase);gl_PointSize=aSize*uRatio;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform float uOpacity;varying vec3 vColor;varying float vShine;void main(){float r=length(gl_PointCoord*2.-1.);float a=(1.-smoothstep(.10,1.,r))*uOpacity*vShine;gl_FragColor=vec4(vColor,a);#include <colorspace_fragment>}`.replace(';#include',';\n#include')});
 const stars=new THREE.Points(starGeo,starMaterial);stars.name='Twinkling stars';stars.renderOrder=-900;root.add(stars);
 // The same volumetric cloud banks surround the whole island, rather than following the camera.
 const puffs=[],clouds=[];
 for(let i=0;i<24;i++){
  const angle=i/24*Math.PI*2+.07*rnd(),radius=195+rnd()*100;
  const cloud={angle,radius,y:23+rnd()*25,speed:.0005+rnd()*.0005};clouds.push(cloud);
  const count=7+Math.floor(rnd()*5);
  for(let j=0;j<count;j++)puffs.push({cloud,offset:new THREE.Vector3((rnd()-.5)*24,(rnd()-.3)*5,(rnd()-.5)*8),scale:new THREE.Vector3(5+rnd()*5,2.5+rnd()*3,3+rnd()*3)});
 }
 const cloudMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uWeights:{value:weights},uOpacity:{value:.94}},
  vertexShader:`varying vec3 vCloudNormal;void main(){vec4 p=vec4(position,1.);vec3 n=normal;
   #ifdef USE_INSTANCING
   p=instanceMatrix*p;vec3 scale=vec3(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz),length(instanceMatrix[2].xyz));n=normal/scale;
   #endif
   vCloudNormal=normalize(n);gl_Position=projectionMatrix*modelViewMatrix*p;}`,
  fragmentShader:`uniform vec3 uWeights;uniform float uOpacity;varying vec3 vCloudNormal;
   void main(){float light=smoothstep(-.55,.95,dot(normalize(vCloudNormal),normalize(vec3(-.4,.8,.3))));
    vec3 day=mix(vec3(.47,.62,.68),vec3(.97,.985,.95),light);
    vec3 dusk=mix(vec3(.32,.16,.24),vec3(1.,.65,.40),light);
    vec3 night=mix(vec3(.015,.028,.060),vec3(.10,.17,.28),light);
    gl_FragColor=vec4(day*uWeights.x+dusk*uWeights.y+night*uWeights.z,uOpacity);
    #include <colorspace_fragment>
   }`});
 const cloudMesh=new THREE.InstancedMesh(new THREE.SphereGeometry(1,16,10),cloudMaterial,puffs.length);cloudMesh.name='Drifting cloud banks';cloudMesh.renderOrder=-700;cloudMesh.frustumCulled=false;scene.add(cloudMesh);
 const dummy=new THREE.Object3D(),cloudDay=new THREE.Color(0xf5f8f2),cloudDusk=new THREE.Color(0xffad86),cloudNight=new THREE.Color(0x425675);
 const dawnSun=new THREE.Color(0xfff3c4),settingSun=new THREE.Color(0xffa63d);
 const atmosphere={root,weights,sunDirection,moonDirection,horizon,stars,cloudMesh,sun,moon,
  setTheme(name){target.set(name==='day'?1:0,name==='sunset'?1:0,name==='night'?1:0);},
  update(t,dt,camera){
   weights.lerp(target,1-Math.exp(-dt*2.5));time.value=t;root.position.copy(camera.position);
   horizon.setRGB(dayHorizon.r*weights.x+duskHorizon.r*weights.y+nightHorizon.r*weights.z,dayHorizon.g*weights.x+duskHorizon.g*weights.y+nightHorizon.g*weights.z,dayHorizon.b*weights.x+duskHorizon.b*weights.y+nightHorizon.b*weights.z);
   sunMaterial.opacity=weights.x+weights.y;sunMaterial.color.copy(dawnSun).lerp(settingSun,weights.y);sun.visible=sunMaterial.opacity>.002;
   sun.scale.setScalar(20+weights.y*9);sunDirection.set(-.53,.026-weights.y*.020,-.848).normalize();sun.position.copy(sunDirection).multiplyScalar(1050);
   halo.position.copy(sun.position);halo.quaternion.copy(camera.quaternion);haloMaterial.uniforms.uOpacity.value=weights.x*.6+weights.y*1.8;haloMaterial.uniforms.uColor.value.copy(sunMaterial.color);
   moonMaterial.uniforms.uOpacity.value=weights.z;moon.visible=weights.z>.002;moonHalo.quaternion.copy(camera.quaternion);moonHalo.material.uniforms.uOpacity.value=weights.z*.48;
   starMaterial.uniforms.uOpacity.value=weights.z*.95;stars.visible=weights.z>.002;
   cloudMaterial.uniforms.uOpacity.value=.94*weights.x+.84*weights.y+.42*weights.z;
   puffs.forEach((p,i)=>{const a=p.cloud.angle+t*p.cloud.speed;dummy.position.set(Math.cos(a)*p.cloud.radius+p.offset.x,p.cloud.y+p.offset.y,Math.sin(a)*p.cloud.radius+p.offset.z);dummy.scale.copy(p.scale);dummy.updateMatrix();cloudMesh.setMatrixAt(i,dummy.matrix);});cloudMesh.instanceMatrix.needsUpdate=true;
  }};
 return atmosphere;
}
