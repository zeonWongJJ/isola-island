import { addSurfaceDetail } from './surface-detail.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

/** Tropical, hand-built scenery. All props stand on local y=0. */
export function createNature(THREE) {
  const {
    Group, Mesh, InstancedMesh, Object3D, Vector3, Color, BufferGeometry,
    Float32BufferAttribute, MeshStandardMaterial, CylinderGeometry,
    SphereGeometry, IcosahedronGeometry, BoxGeometry, TorusGeometry,
    Shape, ExtrudeGeometry, DoubleSide,
  } = THREE;

  const material = (color, extra = {}) => new MeshStandardMaterial({ color, roughness: .94, ...extra });
  const materials = {
    bark: material('#89603d'), barkLight: material('#b78b55'),
    palmBark: material('#ffffff', { vertexColors: true }),
    palm: material('#4f8427', { side: DoubleSide }),
    palmLight: material('#78aa30', { side: DoubleSide }),
    palmDark: material('#286733', { side: DoubleSide }),
    leaf: material('#4c8242', {vertexColors:true,roughness:1}), leafLight: material('#83a94c', {vertexColors:true,roughness:1}),
    leafDeep: material('#326d46', {vertexColors:true,roughness:1}), leafGold: material('#9aae57', {vertexColors:true,roughness:1}),
    coconut: material('#936b32'), soil: material('#795031'), soilLight: material('#96633b'),
    orange: material('#f5a027'), red: material('#d84e31'), yellow: material('#f9ca4e'),
    petalPink: material('#e57da5'), petalWhite: material('#fff6d6'), petalBlue: material('#9aaff1'),
    stone: material('#afb2a2', { flatShading: true }), stoneLight: material('#d2c9ad'),
    stoneDeep: material('#828d82', { flatShading: true }), moss: material('#74944f'),
    earth: material('#b4a48a'), vine: material('#457d41'),
  };
  for(const key of ['stone','stoneLight','stoneDeep'])addSurfaceDetail(materials[key],'limestone');
  for(const key of ['bark','barkLight','palmBark'])addSurfaceDetail(materials[key],'wood');
  const breezeTime={value:0};
  for(const key of ['palm','palmLight','palmDark','leaf','leafLight','leafDeep','leafGold','vine']){
    const m=materials[key];m.onBeforeCompile=shader=>{
      shader.uniforms.uBreezeTime=breezeTime;
      shader.vertexShader='uniform float uBreezeTime;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloat breeze=sin(position.x*.7+position.z*.9+uBreezeTime*1.2);transformed.x+=breeze*.025;transformed.z+=sin(position.z*1.5+uBreezeTime*.9)*.018;');
    };m.customProgramCacheKey=()=> 'island-foliage-breeze';
  }
  for(const key of ['leaf','leafLight','leafDeep','leafGold'])addSurfaceDetail(materials[key],'foliage');
  const geometries = {
    box: new BoxGeometry(1, 1, 1),
    sphere: new SphereGeometry(1, 7, 5),
    leaf: new IcosahedronGeometry(1, 1),
    fruit: new IcosahedronGeometry(1, 1),
    cylinder: new CylinderGeometry(1, 1, 1, 7),
    tapered: new CylinderGeometry(.68, 1, 1, 7),
    rock: new IcosahedronGeometry(1, 1),
  };
  // Unequal lobes and a flatter underside replace the repeated spherical crowns.
  const canopyGeometries=Array.from({length:4},(_,variant)=>{
    const g=new IcosahedronGeometry(1,1),p=g.getAttribute('position'),colors=[];
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i),angle=Math.atan2(z,x);
      const lobe=1+.13*Math.sin(angle*5+variant*1.7)+.07*Math.sin(x*8+z*6+variant);
      const py=Math.max(-.48,y*.72+.065*Math.sin(x*5-z*4+variant));
      p.setXYZ(i,x*lobe,py,z*(lobe+.07*Math.sin(y*4+variant)));
      const light=.82+(y+1)*.105+.035*Math.sin(x*11+z*7+variant);
      colors.push(light*.98,light,light*.94);
    }
    g.setAttribute('color',new Float32BufferAttribute(colors,3));g.deleteAttribute('normal');g.deleteAttribute('uv');const smooth=mergeVertices(g);smooth.computeVertexNormals();g.dispose();return smooth;
  });
  geometries.leaf=canopyGeometries[0];
  const leafSprig=(()=>{
    const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute([
      -.24,0,0,0,.065,.09,.29,.015,0,
      -.24,0,0,.29,.015,0,0,-.012,-.09,
    ],3));g.setAttribute('color',new Float32BufferAttribute([.91,.94,.87,1,1,.94,.86,.91,.82,.86,.91,.82,.86,.91,.82,.73,.82,.70],3));g.computeVertexNormals();return g;
  })();
  const sprigMaterial=materials.leafLight.clone();sprigMaterial.side=DoubleSide;
  sprigMaterial.onBeforeCompile=materials.leafLight.onBeforeCompile;sprigMaterial.customProgramCacheKey=materials.leafLight.customProgramCacheKey;
  const random = (seed = 1) => {
    let a = (Number(seed) * 1237) | 0;
    return () => {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };
  const make = (geo, mat, position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0]) => {
    const m = new Mesh(geo, mat);
    m.position.set(...position); m.scale.set(...scale); m.rotation.set(...rotation);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  };
  // Group repeated small details into instanced draws rather than separate objects.
  function batch(group, geo, mat, transforms) {
    if (!transforms.length) return;
    const mesh = new InstancedMesh(geo, mat, transforms.length);
    const dummy = new Object3D();
    transforms.forEach((t, i) => {
      dummy.position.set(...(t.p || [0, 0, 0]));
      dummy.scale.set(...(t.s || [1, 1, 1]));
      dummy.rotation.set(...(t.r || [0, 0, 0]));
      dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
      if(t.c)mesh.setColorAt(i,new Color(t.c));
    });
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
    return mesh;
  }
  function branch(group, start, end, radius, mat = materials.bark, tip = .68) {
    const a = new Vector3(...start), b = new Vector3(...end);
    const dir = b.clone().sub(a);
    const m = make(geometries.tapered, mat, a.clone().add(b).multiplyScalar(.5).toArray(), [radius, dir.length(), radius]);
    m.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), dir.normalize());
    group.add(m);
    return m;
  }

  // A single pinnate frond, assembled from individually pointed leaflets.
  const frondGeometry = (() => {
    const points = [];
    const y = t => Math.sin(t * Math.PI) * .43 - .7 * t * t;
    const tri = (a, b, c) => points.push(...a, ...b, ...c);
    for (let i = 0; i < 15; i++) {
      const t = i / 15, t2 = (i + 1) / 15;
      tri([t * 2.25, y(t), -.025], [t2 * 2.25, y(t2), -.018], [t2 * 2.25, y(t2), .018]);
      tri([t * 2.25, y(t), -.025], [t2 * 2.25, y(t2), .018], [t * 2.25, y(t), .025]);
      if (i === 0) continue;
      const width = Math.sin(Math.PI * Math.pow(t, .75)) * .48;
      for (const sign of [-1, 1]) {
        const root = [t * 2.25, y(t), 0];
        const outer = [t * 2.25 + .18, y(t) - .055, sign * width];
        const tip = [t * 2.25 + .3, y(t) - .105, sign * width * .96];
        const back = [t * 2.25 + .12, y(t) + .018, sign * .035];
        tri(root, outer, back); tri(outer, tip, back);
      }
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(points, 3));
    g.computeVertexNormals();
    return g;
  })();

  function palm({ height = 3.5, seed = 1 } = {}) {
    const group = new Group(); group.name = 'Coconut palm';
    const rand = random(seed), bend = (rand() - .3) * height * .19;
    const sections = 18, sides = 8, positions = [], colors = [];
    const brown = new Color('#b29962'), dark = new Color('#8c7046');
    const center = t => new Vector3(bend * t * t, height * t, Math.sin(t * 1.8) * height * .026);
    const vertex = (j, i) => {
      const t = j / sections, p = center(t), angle = i / sides * Math.PI * 2;
      const radius = height * (.052 - .025 * t) * (j % 2 ? .95 : 1.03);
      return [p.x + Math.cos(angle) * radius, p.y, p.z + Math.sin(angle) * radius];
    };
    for (let j = 0; j < sections; j++) for (let i = 0; i < sides; i++) {
      const c = j % 3 === 0 ? dark : brown;
      const a = vertex(j, i), b = vertex(j, i + 1), c1 = vertex(j + 1, i + 1), d = vertex(j + 1, i);
      positions.push(...a, ...b, ...c1, ...a, ...c1, ...d);
      for (let k = 0; k < 6; k++) colors.push(c.r, c.g, c.b);
    }
    const trunk = new BufferGeometry();
    trunk.setAttribute('position', new Float32BufferAttribute(positions, 3));
    trunk.setAttribute('color', new Float32BufferAttribute(colors, 3));
    trunk.computeVertexNormals();
    group.add(make(trunk, materials.palmBark));
    const crown = center(1), count = 10;
    for (let i = 0; i < count; i++) {
      const angle = i / count * Math.PI * 2 + rand() * .2;
      const length = (.7 + rand() * .3) * height / 3.5;
      const leaf = make(frondGeometry, [materials.palm, materials.palmLight, materials.palmDark][i % 3],
        crown.toArray(), [length, length, length], [0, angle, .08 + rand() * .28]);
      group.add(leaf);
    }
    // Small erect new growth and nestled coconuts are visible even from above.
    for (let i = 0; i < 3; i++) {
      group.add(make(frondGeometry, materials.palmLight, crown.toArray(), [.4, .6, .48], [0, i * 2.1, .9]));
    }
    const nuts = [];
    for (let i = 0; i < 5; i++) {
      const a = i * 2.4, r = .18 * height / 3.5;
      nuts.push({ p: [crown.x + Math.cos(a) * r, crown.y - .14 - rand() * .12, crown.z + Math.sin(a) * r],
        s: [.14, .18, .14].map(n => n * height / 3.5) });
    }
    batch(group, geometries.fruit, materials.coconut, nuts);
    return group;
  }

  function tree({ height = 2.5, fruit = false, seed = 1 } = {}) {
    const group = new Group(); group.name = fruit ? 'Fruit tree' : 'Broadleaf tree';
    const rand = random(seed), s = height / 2.5;
    const lean=(rand()-.5)*.25*s;
    branch(group,[0,0,0],[lean*.35,height*.38,0],.115*s);
    branch(group,[lean*.35,height*.34,0],[lean,height*.72,.06*s],.078*s);
    const crowns = [[], [], [], []], fruits = [], sprigs=[],leafMats = [materials.leaf, materials.leafDeep, materials.leafLight, materials.leafGold];
    const count=fruit?9:10;
    for (let i = 0; i < count; i++) {
      const angle = i * 2.39996+seed*.13, layer=i<5?0:i<8?1:2;
      const radius = ((layer===0?.48:layer===1?.36:.16)+rand()*.15)*s;
      const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
      const y = height * (.58+layer*.13+rand()*.035);
      branch(group, [lean*.6, height * (.36+layer*.1), 0], [x, y-.06*s, z], .034 * s);
      const r = (.40+rand()*.15)*s;
      crowns[(i+seed)%4].push({p:[x,y,z],s:[r*(1.08+rand()*.20),r*(.83+rand()*.15),r],r:[(rand()-.5)*.3,rand()*6.28,(rand()-.5)*.25],c:new Color().setRGB(.94+rand()*.10,.95+rand()*.08,.93+rand()*.08)});
      for(let j=0;j<5;j++){const a=angle+j*1.26;const leafScale=(.65+rand()*.45)*s;sprigs.push({p:[x+Math.cos(a)*r*.92,y+(rand()-.25)*r*.5,z+Math.sin(a)*r*.92],s:[leafScale,leafScale,leafScale],r:[(rand()-.5)*.7,-a,(rand()-.5)*.5]})}
      if (fruit && layer<2) {
        for (let j = 0; j < 3; j++) {
          const a = angle + j * 1.8;
          fruits.push({ p: [x + Math.cos(a) * r * .85, y - r * (.25 + rand() * .23), z + Math.sin(a) * r * .85], s: [.075 * s, .08 * s, .075 * s] });
        }
      }
    }
    crowns.forEach((items, i) => batch(group, canopyGeometries[(seed+i)%4], leafMats[i], items));
    batch(group,leafSprig,sprigMaterial,sprigs);
    batch(group, geometries.fruit, seed % 2 ? materials.orange : materials.red, fruits);
    return group;
  }

  function bush({ scale = 1, seed = 1 } = {}) {
    const group = new Group(); group.name = 'Leafy shrub';
    const rand = random(seed), a = [], b = [];
    for (let i = 0; i < 5; i++) {
      const r = .23 + rand() * .13;
      (i % 2 ? a : b).push({ p: [(rand() - .5) * .65, r*.8 + rand() * .06, (rand() - .5) * .5], s: [r * 1.2, r*.85, r],r:[0,rand()*6.28,0] });
    }
    batch(group, geometries.leaf, materials.leaf, a);
    batch(group, geometries.leaf, materials.leafLight, b);
    group.scale.setScalar(scale);
    return group;
  }

  function flowers({ seed = 1, scale = 1 } = {}) {
    const group = new Group(); group.name = 'Wildflower patch';
    const rand = random(seed), stems = [], leaves = [], centers = [], petals = [[], [], []];
    for (let i = 0; i < 8; i++) {
      const x = (rand() - .5) * .85, z = (rand() - .5) * .7, h = .2 + rand() * .25;
      stems.push({ p: [x, h / 2, z], s: [.012, h, .012] });
      centers.push({ p: [x, h + .015, z], s: [.047, .027, .047] });
      for (let j = 0; j < 5; j++) {
        const a = j * Math.PI * 2 / 5;
        petals[i % 3].push({ p: [x + Math.cos(a) * .065, h, z + Math.sin(a) * .065], s: [.065, .026, .04], r: [0, -a, .16] });
      }
      leaves.push({ p: [x + .04, h * .5, z], s: [.085, .018, .033], r: [0, .4, .5] });
      leaves.push({ p: [x - .04, h * .36, z], s: [.075, .018, .03], r: [0, -.3, -.5] });
    }
    batch(group, geometries.cylinder, materials.leafDeep, stems);
    batch(group, geometries.sphere, materials.leaf, leaves);
    batch(group, geometries.sphere, materials.yellow, centers);
    [materials.petalPink, materials.petalWhite, materials.petalBlue].forEach((mat, i) => batch(group, geometries.sphere, mat, petals[i]));
    group.scale.setScalar(scale);
    return group;
  }

  const rockCache = new Map();
  function rock({ size = 1, seed = 1, moss = true } = {}) {
    const group = new Group(); group.name = 'Weathered limestone';
    const variant = Math.abs(seed | 0) % 17;
    if (!rockCache.has(variant)) {
      const g = geometries.rock.clone(), a = g.attributes.position;
      for (let i = 0; i < a.count; i++) {
        const x = a.getX(i), y = a.getY(i), z = a.getZ(i);
        const noise = Math.sin(x * 17.1 + y * 29.7 + z * 13.4 + variant * 3.1) * .13;
        a.setXYZ(i, x * (1 + noise), Math.max(-.65, y * (1 + noise)), z * (.82 + noise));
      }
      g.computeVertexNormals(); rockCache.set(variant, g);
    }
    group.add(make(rockCache.get(variant), variant % 3 ? materials.stone : materials.stoneDeep, [0, .65 * size, 0], [size, size, size], [0, seed * .73, 0]));
    if (moss) {
      group.add(make(geometries.leaf, materials.moss, [-.08 * size, 1.47 * size, .05 * size], [.58 * size, .13 * size, .45 * size]));
      group.add(make(geometries.leaf, materials.leaf, [.34 * size, 1.29 * size, -.16 * size], [.21 * size, .12 * size, .22 * size]));
    }
    return group;
  }

  function grass({ scale = 1, seed = 1 } = {}) {
    const group = new Group(); group.name = 'Grass tuft';
    const rand = random(seed), positions = [];
    for (let i = 0; i < 7; i++) {
      const a = rand() * Math.PI * 2, h = .18 + rand() * .22;
      const x = (rand() - .5) * .14, z = (rand() - .5) * .14;
      const w = .027;
      positions.push(x - Math.cos(a) * w, 0, z - Math.sin(a) * w,
        x + Math.cos(a) * w, 0, z + Math.sin(a) * w,
        x + Math.sin(a) * h * .42, h, z + Math.cos(a) * h * .42);
    }
    const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(positions, 3)); g.computeVertexNormals();
    group.add(make(g, materials.palmLight)); group.scale.setScalar(scale);
    return group;
  }

  function cropPlot({ width = 3, depth = 2, seed = 1 } = {}) {
    const group = new Group(); group.name = 'Kitchen garden';
    const rand = random(seed), ridges = [], fence = [], posts = [], stems = [], leaf1 = [], leaf2 = [], produce = [];
    group.add(make(geometries.box, materials.soil, [0, .07, 0], [width, .14, depth]));
    const rows = Math.max(2, Math.floor(depth / .55)), cols = Math.max(3, Math.floor(width / .5));
    for (let j = 0; j < rows; j++) {
      const z = -depth / 2 + (j + .5) * depth / rows;
      ridges.push({ p: [0, .16, z], s: [width * .94, .11, depth / rows * .52] });
      for (let i = 0; i < cols; i++) {
        const x = -width / 2 + (i + .5) * width / cols, h = .24 + rand() * .16;
        stems.push({ p: [x, .21 + h / 2, z], s: [.018, h, .018] });
        for (let k = 0; k < 5; k++) {
          const a = k * 2.4 + rand() * .3;
          (k % 2 ? leaf1 : leaf2).push({ p: [x + Math.cos(a) * .09, .24 + k * h / 6, z + Math.sin(a) * .09], s: [.13, .037, .07], r: [0, -a, .35] });
        }
        if (j % 2 === 0) produce.push({ p: [x + .045, .37, z + .075], s: [.06, .065, .06] });
      }
    }
    for (const z of [-depth / 2 - .04, depth / 2 + .04]) {
      for (let i = 0; i <= 4; i++) posts.push({ p: [-width / 2 + width * i / 4, .28, z], s: [.075, .56, .075] });
      for (const y of [.23, .45]) fence.push({ p: [0, y, z], s: [width + .09, .055, .055] });
    }
    for (const x of [-width / 2, width / 2]) {
      for (const y of [.23, .45]) fence.push({ p: [x, y, 0], s: [.055, .055, depth] });
    }
    batch(group, geometries.box, materials.soilLight, ridges);
    batch(group, geometries.box, materials.barkLight, [...posts, ...fence]);
    batch(group, geometries.cylinder, materials.leafDeep, stems);
    batch(group, geometries.sphere, materials.leaf, leaf1);
    batch(group, geometries.sphere, materials.leafLight, leaf2);
    batch(group, geometries.fruit, seed % 2 ? materials.red : materials.orange, produce);
    return group;
  }

  function ruin({ seed = 1 } = {}) {
    const group = new Group(); group.name = 'Lost island sanctuary';
    const rand = random(seed);
    group.add(make(geometries.box, materials.earth, [0, .08, 0], [3, .16, 2.7]));
    // Broken, genuine through-arch: the space remains open from every angle.
    const arch = new Shape();
    arch.moveTo(-1.35, .12); arch.lineTo(-1.35, 2.42); arch.lineTo(-.92, 2.42);
    arch.lineTo(-.92, 2.7); arch.lineTo(-.25, 2.7); arch.lineTo(-.25, 2.55);
    arch.lineTo(.7, 2.55); arch.lineTo(.7, 2.33); arch.lineTo(1.35, 2.33);
    arch.lineTo(1.35, .12); arch.lineTo(.6, .12); arch.lineTo(.6, 1.25);
    arch.absarc(0, 1.25, .6, 0, Math.PI, false); arch.lineTo(-.6, .12); arch.closePath();
    const archGeo = new ExtrudeGeometry(arch, { depth: .33, bevelEnabled: true, bevelThickness: .025, bevelSize: .025, bevelSegments: 1, steps: 1, curveSegments: 10 });
    group.add(make(archGeo, materials.stoneLight, [0, 0, -.82]));
    const blocks = [];
    // Separate arch stones, masonry joints and ruined columns.
    for (let i = 0; i < 9; i++) {
      const a = (i + .5) / 9 * Math.PI;
      blocks.push({ p: [Math.cos(a) * .72, 1.25 + Math.sin(a) * .72, -.43], s: [.23, .2, .12], r: [0, 0, a - Math.PI / 2] });
    }
    for (const x of [-1.19, 1.19]) {
      for (let j = 0; j < 6; j++) blocks.push({ p: [x, .31 + j * .34, -.43], s: [.26, .29, .13] });
      blocks.push({ p: [x, .21, .82], s: [.48, .22, .48] });
      blocks.push({ p: [x, .94, .82], s: [.29, 1.23, .29], r: [0, .03 * x, 0] });
      blocks.push({ p: [x, 1.58, .82], s: [.47, .17, .47] });
    }
    for (let i = 0; i < 5; i++) {
      blocks.push({ p: [-1.35, .3 + (i % 2) * .3, -.3 + Math.floor(i / 2) * .39], s: [.31, .29, .37] });
    }
    batch(group, geometries.box, materials.stone, blocks);
    const mosses = [], rubble = [];
    for (let i = 0; i < 11; i++) {
      mosses.push({ p: [-1.25 + rand() * 2.5, .19, -1.13 + rand() * 2.25], s: [.13 + rand() * .18, .035, .1 + rand() * .2] });
      if (i < 5) rubble.push({ p: [(rand() - .5) * 2.2, .25, .35 + rand() * .8], s: [.16, .12, .16], r: [rand(), rand(), rand()] });
    }
    batch(group, geometries.leaf, materials.moss, mosses);
    batch(group, geometries.rock, materials.stoneDeep, rubble);
    // Cascading ivy drapes one shoulder of the arch.
    const ivy = [];
    for (let i = 0; i < 15; i++) ivy.push({ p: [-.9 + Math.sin(i * .9) * .2, 2.63 - i * .105, -.36], s: [.13, .09, .06], r: [0, 0, Math.sin(i) * .6] });
    batch(group, geometries.leaf, materials.vine, ivy);
    return group;
  }

  return { palm, tree, bush, flowers, rock, cropPlot, ruin, grass, update(t){breezeTime.value=t} };
}
