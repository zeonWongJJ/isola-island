// World-space pigments stay continuous across the island's merged geometry.
const noise=`
float sdHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float sdNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(sdHash(i),sdHash(i+vec3(1,0,0)),f.x),mix(sdHash(i+vec3(0,1,0)),sdHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(sdHash(i+vec3(0,0,1)),sdHash(i+vec3(1,0,1)),f.x),mix(sdHash(i+vec3(0,1,1)),sdHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
`;
const pigments={
 meadow:`
  float grassy=step(diffuseColor.r*1.06,diffuseColor.g);
  float soil=sdNoise(sp*vec3(.85,.2,.85)),grain=sdNoise(sp*12.);
  diffuseColor.rgb*=1.-grassy*(.07-soil*.12);
  diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.10,1.015,.87),grassy*smoothstep(.48,.72,soil)*.5);
  diffuseColor.rgb*=.98+grain*.035;
 `,
 foliage:`
  float pigmentCloud=sdNoise(sp*5.5),leaf=sdNoise(sp*vec3(17.,12.,17.));
  diffuseColor.rgb*=.91+pigmentCloud*.16;
  diffuseColor.rgb*=mix(vec3(.97,1.,.98),vec3(1.12,1.07,.90),smoothstep(.60,.79,leaf)*.4);
 `,
 limestone:`
  float broad=sdNoise(sp*.72),grain=sdNoise(sp*8.5);
  float strata=abs(sin(sp.y*6.2+sdNoise(sp*vec3(.65,.22,.65))*5.5));
  float seam=(1.-smoothstep(.025,.14,strata))*smoothstep(.43,.68,sdNoise(sp*vec3(1.2,2.8,1.2)));
  float fissure=(1.-smoothstep(.035,.09,abs(sdNoise(sp*vec3(2.3,.7,2.3))-.5)))*smoothstep(.55,.72,broad);
  vec3 mineral=mix(vec3(.90,.98,1.055),vec3(1.065,1.015,.91),broad);
  diffuseColor.rgb*=mineral*(.91+grain*.14-seam*.095-fissure*.07);
  float moss=smoothstep(.60,.79,sdNoise(sp*1.35))*smoothstep(.18,.75,sn.y)*.18;
  diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.19,.28,.105),moss);
 `,
 plaster:`
  float wash=sdNoise(sp*1.3),grain=sdNoise(sp*18.);
  float rain=pow(sdNoise(sp*vec3(9.,.85,9.)),3.);
  diffuseColor.rgb*=.935+wash*.065+grain*.035-rain*.07;
  diffuseColor.rgb*=mix(vec3(.97,.99,1.02),vec3(1.025,1.,.965),wash);
 `,
 wood:`
  float grain=sdNoise(sp*vec3(26.,.8,26.));
  float fibers=sin(grain*12.+sp.y*.8)*.5+.5;
  float age=sdNoise(sp*1.7);
  diffuseColor.rgb*=.88+fibers*.10+age*.08;
  diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.92,.99,1.10),smoothstep(.5,.8,age)*.20);
 `,
 roof:`
  float pigment=sdNoise(sp*4.2),grain=sdNoise(sp*17.);
  diffuseColor.rgb*=.92+pigment*.11+grain*.035;
  diffuseColor.rgb*=mix(vec3(.98,.96,.94),vec3(1.02,1.015,.98),pigment);
 `,
};

pigments.cliff=pigments.limestone+`
 float bedding=sdNoise(vec3(sp.x*.52,sp.y*5.2,sp.z*.52));
 float bedEdge=smoothstep(.47,.57,bedding)*(1.-smoothstep(.60,.76,bedding));
 float upright=1.-smoothstep(.25,.75,abs(sn.y));
 diffuseColor.rgb*=1.-upright*bedEdge*.17;
 float weather=sdNoise(sp*vec3(2.6,.38,2.6));
 diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.78,.89,.85),upright*smoothstep(.58,.78,weather)*.30);
`;

export function addSurfaceDetail(material,kind){
 if(!pigments[kind])throw new Error('Unknown island surface: '+kind);
 const previous=material.onBeforeCompile,oldKey=material.customProgramCacheKey.bind(material);
 const previousKey=oldKey();
 material.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);
  shader.vertexShader='varying vec3 vSurfacePosition;varying vec3 vSurfaceNormal;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvSurfacePosition=(modelMatrix*vec4(transformed,1.)).xyz;vSurfaceNormal=normalize(mat3(modelMatrix)*objectNormal);');
  shader.fragmentShader='varying vec3 vSurfacePosition;varying vec3 vSurfaceNormal;\n'+noise+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n{vec3 sp=vSurfacePosition;vec3 sn=normalize(vSurfaceNormal);'+pigments[kind]+'}');
 };
 material.customProgramCacheKey=()=>previousKey+'-island-pigment-'+kind;
 material.userData.surfaceDetail=kind;
 return material;
}
