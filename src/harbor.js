import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Hand-built maritime miniatures. Every factory returns a self-contained Group. */
export function createHarbor(THREE) {
  const C = {
    wood: 0x98602e, plank: 0xb57e43, lightWood: 0xcd9b5e, darkWood: 0x593923,
    trim: 0xe3b965, rope: 0x85684b, canvas: 0xf5e6bd, canvasAlt: 0xe7d6ab,
    roof: 0xc97735, metal: 0x49453c, red: 0xce5939,
  };
  const materials = {};
  const mat = (name, color, options = {}) => materials[name] ||= new THREE.MeshStandardMaterial({ color, roughness: .87, ...options });
  Object.entries(C).forEach(([name, color]) => mat(name, color));
  const breezeTime={value:0};
  materials.red.onBeforeCompile=shader=>{shader.uniforms.uBreezeTime=breezeTime;shader.vertexShader='uniform float uBreezeTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.z+=.055*sin(position.x*7.-uBreezeTime*2.1)*smoothstep(0.,.5,position.x);');};
  materials.red.customProgramCacheKey=()=> 'island-pennant-breeze';
  mat('canvas', C.canvas, { side: THREE.DoubleSide, roughness: 1 });
  materials.canvas.side = THREE.DoubleSide;
  mat('canvasAlt', C.canvasAlt, { side: THREE.DoubleSide, roughness: 1 });
  materials.canvasAlt.side = THREE.DoubleSide;
  mat('glass', 0x69b8b0, { roughness: .24, metalness: .1 });
  mat('lantern', 0xffce76, { emissive: 0xff9b32, emissiveIntensity: .5 });
  materials.lantern.userData.glow = true;
  materials.lantern.userData.nightMultiplier = 1.7;
  mat('stone', 0x8b9892, { flatShading: true });
  mat('stoneLight', 0xadb2a0, { flatShading: true });
  mat('caveDark', 0x11212a);
  mat('crystal', 0x258fa9, { emissive: 0x0986a6, emissiveIntensity: .55, roughness: .36, flatShading: true });
  materials.crystal.userData.glow = true;
  materials.crystal.userData.minGlow = .55;
  materials.crystal.userData.nightMultiplier = .3;
  mat('crystalDim', 0x327b8e, { emissive: 0x086780, emissiveIntensity: .4, roughness: .42, flatShading: true });
  materials.crystalDim.userData={glow:true,minGlow:.4,nightMultiplier:.25};
  mat('pool', 0x087c9b, { roughness: .18, metalness: .16 });
  mat('white', 0xf5efda);
  mat('skin', 0xe4b585);
  mat('hair', 0x4b352a);
  mat('pants', 0x416277);
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const cylinders = new Map();
  const cylinderGeometry = (sides = 8, taper = 1) => {
    const key = `${sides}/${taper}`;
    if (!cylinders.has(key)) cylinders.set(key, new THREE.CylinderGeometry(taper, 1, 1, sides));
    return cylinders.get(key);
  };
  const sphere = new THREE.SphereGeometry(1, 8, 6);
  const vector = (a) => new THREE.Vector3(...a);
  const up = new THREE.Vector3(0, 1, 0);
  const mesh = (group, geometry, material, position = [0, 0, 0], scale) => {
    const obj = new THREE.Mesh(geometry, typeof material === 'string' ? materials[material] : material);
    obj.position.set(...position);
    if (scale) obj.scale.set(...scale);
    obj.castShadow = true;
    obj.receiveShadow = true;
    if(material==='lantern')obj.userData.nightEmitter={kind:"lantern"};
    group.add(obj);
    return obj;
  };
  const box = (group, dimensions, position, material = 'wood') => mesh(group, cube, material, position, dimensions);
  const cyl = (group, radius, height, position, material = 'wood', sides = 8, taper = 1) => mesh(group, cylinderGeometry(sides, taper), material, position, [radius, height, radius]);
  const rod = (group, a, b, radius = .025, material = 'rope', sides = 5) => {
    const start = vector(a), end = vector(b), diff = end.clone().sub(start);
    const obj = cyl(group, radius, diff.length(), start.add(end).multiplyScalar(.5).toArray(), material, sides);
    obj.quaternion.setFromUnitVectors(up, diff.normalize());
    return obj;
  };
  const chain = (group, points, radius = .021, material = 'rope') => {
    for (let i = 1; i < points.length; i++) rod(group, points[i - 1], points[i], radius, material);
  };
  const lantern = (group, x, y, z, size = .2) => {
    box(group, [size * .72, size, size * .72], [x, y, z], 'lantern');
    cyl(group, size * .59, size * .23, [x, y + size * .63, z], 'metal', 4, .2).rotation.y = Math.PI / 4;
    box(group, [size, size * .14, size], [x, y - size * .56, z], 'metal');
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) rod(group, [x + dx * size * .37, y - size * .52, z + dz * size * .37], [x + dx * size * .37, y + size * .5, z + dz * size * .37], size * .04, 'metal');
  };
  const barrel = (group, x, y, z, scale = 1) => {
    cyl(group, .21 * scale, .47 * scale, [x, y + .24 * scale, z], 'wood', 10, .92);
    for (const yy of [.08, .36]) cyl(group, .217 * scale, .035 * scale, [x, y + yy * scale, z], 'metal', 10);
    cyl(group, .192 * scale, .018 * scale, [x, y + .481 * scale, z], 'lightWood', 10);
  };

  // Miniature rigging contains hundreds of individual pieces. Bake those pieces
  // into root-local geometry, retaining one mesh per material and every triangle.
  // Multi-material sails are split by their material groups before merging.
  function mergeStaticMeshes(group) {
    group.updateMatrixWorld(true);
    const inverseRoot = group.matrixWorld.clone().invert();
    const byMaterial = new Map();
    const nightEmitters=[];
    let originalDrawCalls = 0, originalMeshes = 0;
    const keep = (material, geometry) => {
      if (!byMaterial.has(material)) byMaterial.set(material, []);
      byMaterial.get(material).push(geometry);
    };
    group.traverse(object => {
      if (!object.isMesh) return;
      if(object.userData.nightEmitter){const pos=object.getWorldPosition(new THREE.Vector3()).applyMatrix4(inverseRoot),scale=object.getWorldScale(new THREE.Vector3());nightEmitters.push({position:pos.toArray(),kind:object.userData.nightEmitter.kind,size:Math.max(scale.x,scale.y,scale.z)});}
      originalMeshes++;
      const baked = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
      baked.applyMatrix4(inverseRoot.clone().multiply(object.matrixWorld));
      // No maritime material uses a texture or vertex color; consistent
      // attributes let procedural boxes, cylinders and custom cloth merge.
      for (const attribute of Object.keys(baked.attributes)) {
        if (attribute !== 'position' && attribute !== 'normal') baked.deleteAttribute(attribute);
      }
      if (!baked.getAttribute('normal')) baked.computeVertexNormals();
      if (Array.isArray(object.material)) {
        originalDrawCalls += baked.groups.length;
        for (const part of baked.groups) {
          const sliced = new THREE.BufferGeometry();
          for (const attribute of ['position', 'normal']) {
            const source = baked.getAttribute(attribute);
            sliced.setAttribute(attribute, new THREE.Float32BufferAttribute(
              source.array.slice(part.start * 3, (part.start + part.count) * 3), 3,
            ));
          }
          keep(object.material[part.materialIndex], sliced);
        }
        baked.dispose();
      } else {
        originalDrawCalls++;
        baked.clearGroups();
        keep(object.material, baked);
      }
    });
    group.clear();
    for (const [material, pieces] of byMaterial) {
      const geometry = mergeGeometries(pieces, false);
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      const combined = new THREE.Mesh(geometry, material);
      combined.name = `${group.name} · ${material.name || material.uuid.slice(0, 8)}`;
      combined.castShadow = true;
      combined.receiveShadow = true;
      group.add(combined);
      for (const piece of pieces) piece.dispose();
    }
    group.userData.nightEmitters=nightEmitters;
    group.userData.staticBatch = { originalMeshes, originalDrawCalls, mergedDrawCalls: byMaterial.size };
    return group;
  }

  function sail(group, { z, top, height, width, billow = .46 }) {
    const cols = 10, rows = 8, positions = [], indices = [];
    const point = (u, v) => [
      (u - .5) * width * (1 - .11 * v),
      top - v * height + .16 * Math.sin(u * Math.PI) * v,
      z + billow * Math.sin(Math.PI * u) * Math.sin(Math.PI * v) + .06 * Math.sin(u * Math.PI * 5) * Math.sin(v * Math.PI),
    ];
    for (let row = 0; row <= rows; row++) for (let col = 0; col <= cols; col++) positions.push(...point(col / cols, row / rows));
    const geom = new THREE.BufferGeometry();
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const a = row * (cols + 1) + col, b = a + 1, c = a + cols + 1, d = c + 1;
      const start = indices.length;
      indices.push(a, c, b, b, c, d);
      geom.addGroup(start, 6, col % 4 === 0 ? 1 : 0);
    }
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    mesh(group, geom, [materials.canvas, materials.canvasAlt]);
    rod(group, [-width * .57, top + .035, z], [width * .57, top + .035, z], .055, 'darkWood');
    for (const u of [0, 1]) chain(group, Array.from({ length: 9 }, (_, i) => point(u, i / 8)), .017, 'rope');
    chain(group, Array.from({ length: 11 }, (_, i) => point(i / 10, 1)), .017, 'rope');
    for (const u of [.25, .5, .75]) chain(group, Array.from({ length: 7 }, (_, i) => point(u, i / 6)), .007, 'canvasAlt');
  }

  function triangularSail(group, vertices, billow = .2) {
    const [a, b, c] = vertices.map(vector), center = a.clone().add(b).add(c).divideScalar(3);
    center.x += billow;
    const positions = [...a.toArray(), ...b.toArray(), ...c.toArray(), ...center.toArray()];
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setIndex([0, 1, 3, 1, 2, 3, 2, 0, 3]);
    geom.computeVertexNormals();
    mesh(group, geom, 'canvas');
    chain(group, [...vertices, vertices[0]], .016, 'rope');
  }

  function ship({ scale = 1 } = {}) {
    const g = new THREE.Group();
    g.name = '远航帆船';
    // A lofted hull, with a rounded belly and sharply rising bow.
    const stations = [
      [-3.6, .65, .95], [-3.1, 1.12, .91], [-2.2, 1.36, .83],
      [-.8, 1.42, .8], [.8, 1.32, .83], [2.1, 1.02, .95], [3.15, .54, 1.18], [3.8, .03, 1.36],
    ];
    const section = [[-1, 1], [-.98, .68], [-.76, .25], [-.32, 0], [0, -.07], [.32, 0], [.76, .25], [.98, .68], [1, 1]];
    const positions = [], indices = [];
    stations.forEach(([z, w, h]) => section.forEach(([x, y]) => positions.push(x * w, .05 + y * h, z)));
    for (let j = 0; j < stations.length - 1; j++) for (let i = 0; i < section.length - 1; i++) {
      const a = j * section.length + i, b = a + section.length;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
    const hull = new THREE.BufferGeometry();
    hull.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); hull.setIndex(indices); hull.computeVertexNormals();
    mesh(g, hull, mat('hull', C.wood, { side: THREE.DoubleSide, flatShading: true }));
    // Gold-colored rubbing strakes describe the hull from any viewing angle.
    for (const side of [-1, 1]) {
      for (const height of [.4, .7, 1]) chain(g, stations.map(([z, w, h]) => [side * w * (height === .4 ? .86 : .99), .05 + h * height, z]), height === 1 ? .063 : .035, height === 1 ? 'trim' : 'darkWood');
      for (let i = 1; i < stations.length - 1; i++) {
        const [z, w, h] = stations[i];
        chain(g, [[side * w, h + .05, z], [side * w * .98, h * .68 + .05, z], [side * w * .76, h * .25 + .05, z]], .027, 'lightWood');
      }
    }
    const deckShape = new THREE.Shape();
    stations.forEach(([z, w], i) => i ? deckShape.lineTo(-w, z) : deckShape.moveTo(-w, z));
    [...stations].reverse().forEach(([z, w]) => deckShape.lineTo(w, z));
    deckShape.closePath();
    const deck = mesh(g, new THREE.ShapeGeometry(deckShape), mat('deck', C.lightWood, { side: THREE.DoubleSide }), [0, .86, 0]);
    deck.rotation.x = Math.PI / 2;
    // Deck planking is laid lengthwise, with fine dark seams.
    for (let x = -1.2; x <= 1.2; x += .2) {
      const end = 3.45 - Math.abs(x) * 1.55;
      rod(g, [x, .873, -3.1], [x, .873, end], .008, 'darkWood');
    }
    box(g, [1.38, .92, .9], [0, 1.36, -2.7], 'darkWood');
    box(g, [1.6, .14, 1.05], [0, 1.91, -2.7], 'trim');
    box(g, [.75, .58, .035], [0, 1.42, -3.165], 'glass');
    for (const x of [-.27, 0, .27]) box(g, [.035, .61, .05], [x, 1.42, -3.19], 'trim');
    for (const side of [-1, 1]) {
      box(g, [.032, .4, .48], [side * .7, 1.46, -2.7], 'glass');
      box(g, [.06, .43, .038], [side * .73, 1.46, -2.7], 'trim');
    }
    box(g, [.4, .63, .035], [0, 1.22, -2.235], 'wood');
    cyl(g, .025, .025, [.12, 1.23, -2.2], 'trim', 8).rotation.x = Math.PI / 2;
    box(g, [.7, .1, .9], [0, .97, .15], 'darkWood');
    for (let i = 0; i < 5; i++) box(g, [.045, .04, .85], [-.28 + i * .14, 1.04, .15], 'wood');
    // Fine deck guardrails and a decorative raised stern.
    for (const side of [-1, 1]) {
      const rail = [];
      stations.slice(0, -1).forEach(([z, w, h]) => {
        const yy = Math.max(.94, h + .05);
        rod(g, [side * w * .96, yy, z], [side * w * .96, yy + .37, z], .033, 'darkWood');
        rail.push([side * w * .96, yy + .37, z]);
      });
      rail.push([0, 1.63, 3.79]);
      chain(g, rail, .045, 'trim');
    }
    rod(g, [-.65, 1.35, -3.6], [.65, 1.35, -3.6], .045, 'trim');
    for (const z of [-2.1, -.8, .55, 1.65]) for (const side of [-1, 1]) {
      const w = z > 1 ? 1.06 : 1.34;
      cyl(g, .13, .04, [side * w, .58, z], 'darkWood', 12).rotation.z = Math.PI / 2;
      cyl(g, .083, .045, [side * (w + .025), .58, z], 'glass', 12).rotation.z = Math.PI / 2;
    }
    // Three masts, square sails, crow's nest, shrouds and ratlines.
    const masts = [
      { z: -2.05, h: 5.25, w: 2.05, sailTop: 4.6, sailH: 1.72 },
      { z: -.2, h: 7.1, w: 3.5, sailTop: 5.13, sailH: 2.25 },
      { z: 2.0, h: 6.15, w: 2.8, sailTop: 4.62, sailH: 1.94 },
    ];
    masts.forEach((m, index) => {
      rod(g, [0, .88, m.z], [0, m.h, m.z], index === 1 ? .09 : .072, 'darkWood', 8);
      sail(g, { z: m.z + .06, top: m.sailTop, height: m.sailH, width: m.w });
      if (index > 0) sail(g, { z: m.z + .035, top: m.h - .5, height: .96, width: m.w * .73, billow: .23 });
      for (const side of [-1, 1]) {
        rod(g, [side * .95, 1.12, m.z - .2], [0, m.h - .8, m.z], .018, 'rope');
        rod(g, [side * .95, 1.12, m.z + .35], [0, m.h - .8, m.z], .018, 'rope');
        for (let yy = 1.4; yy < m.h - 1; yy += .32) {
          const t = (yy - 1.12) / (m.h - 1.92);
          rod(g, [side * .95 * (1 - t), yy, m.z - .2 * (1 - t)], [side * .95 * (1 - t), yy, m.z + .35 * (1 - t)], .011, 'rope');
        }
        rod(g, [side * m.w * .48, m.sailTop - m.sailH, m.z + .06], [side * .92, 1.2, m.z + .65], .016, 'rope');
      }
      const flagShape = new THREE.Shape();
      flagShape.moveTo(0, 0); flagShape.lineTo(.68, -.08); flagShape.lineTo(.5, -.23); flagShape.lineTo(.68, -.36); flagShape.lineTo(0, -.3); flagShape.closePath();
      const flag = mesh(g, new THREE.ShapeGeometry(flagShape), mat('flag', C.red, { side: THREE.DoubleSide }), [0, m.h - .03, m.z]);
      flag.rotation.y = -.3;
    });
    cyl(g, .26, .2, [0, 5.52, -.2], 'wood', 10, 1.25);
    cyl(g, .34, .06, [0, 5.65, -.2], 'trim', 10);
    rod(g, [0, 1.28, 3.2], [0, 2.09, 5.08], .07, 'darkWood');
    rod(g, [0, 5.9, 2], [0, 2.09, 5.08], .021, 'rope');
    triangularSail(g, [[.035, 5.3, 2.08], [.035, 2.2, 4.72], [.035, 2.28, 2.32]], .28);
    rod(g, [0, 1.15, -3.52], [0, 6.85, -.2], .02, 'rope');
    rod(g, [0, 6.9, -.2], [0, 5.95, 2], .02, 'rope');
    barrel(g, -.8, .88, -1.35, .8); barrel(g, .8, .88, -.85, .7);
    box(g, [.4, .34, .4], [.73, 1.05, 1.1], 'wood');
    for (const x of [-.7, .7]) lantern(g, x, 1.93, -3.25, .2);
    // Wheel at the elevated stern.
    const wheel = new THREE.Group(); wheel.position.set(0, 1.65, -2.02); g.add(wheel);
    mesh(wheel, new THREE.TorusGeometry(.23, .026, 5, 14), 'darkWood');
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3;
      rod(wheel, [0, 0, 0], [Math.cos(angle) * .31, Math.sin(angle) * .31, 0], .02, 'wood');
    }
    rod(g, [0, .87, -2.02], [0, 1.64, -2.02], .055, 'wood');
    mergeStaticMeshes(g);
    g.scale.setScalar(scale);
    return g;
  }

  function dock({ length = 8, width = 1.8, lanterns = true } = {}) {
    const g = new THREE.Group(); g.name = '木栈桥';
    const count = Math.ceil(length / .34), step = length / count;
    for (let i = 0; i < count; i++) box(g, [width, .13, step - .025], [0, .04 + (i % 7 === 0 ? .012 : 0), (i + .5) * step], i % 3 ? 'plank' : 'lightWood');
    for (const x of [-width * .34, width * .34]) box(g, [.14, .22, length], [x, -.11, length / 2], 'darkWood');
    const spans = Math.max(2, Math.ceil(length / 1.7));
    for (const side of [-1, 1]) {
      const x = side * (width * .5 + .04);
      for (let i = 0; i <= spans; i++) {
        const z = length * i / spans;
        cyl(g, .095, 2.1, [x, -.45, z], 'darkWood', 7);
        cyl(g, .12, .07, [x, .62, z], 'lightWood', 8);
        cyl(g, .109, .08, [x, .35, z], 'rope', 8);
        if (i < spans) chain(g, [[x, .42, z], [x, .29, z + length / spans / 2], [x, .42, z + length / spans]], .024, 'rope');
        if (lanterns && (i === 0 || i === spans)) {
          rod(g, [x, .65, z], [x, 1.15, z], .04, 'darkWood');
          lantern(g, x, 1.24, z, .21);
        }
      }
    }
    // A tied-up coil and a pair of cargo barrels make the end of the pier readable.
    mesh(g, new THREE.TorusGeometry(.15, .024, 5, 16), 'rope', [width * .25, .13, length - .55]).rotation.x = Math.PI / 2;
    if (width > 1.4) { barrel(g, -width * .24, .12, length * .36, .7); barrel(g, -width * .22, .12, length * .36 + .36, .6); }
    return g;
  }

  function bridge({ length = 5, width = 1.2, sag = .16 } = {}) {
    const g = new THREE.Group(); g.name = '悬索木桥';
    const count = Math.ceil(length / .22), step = length / count;
    const h = x => .04 - sag * Math.sin(Math.PI * x / length);
    for (let i = 0; i < count; i++) {
      const x = (i + .5) * step;
      const plank = box(g, [step - .021, .1, width], [x, h(x), 0], i % 3 ? 'plank' : 'lightWood');
      plank.rotation.z = -sag * Math.PI / length * Math.cos(Math.PI * x / length);
    }
    for (const side of [-1, 1]) {
      const z = side * width * .56;
      for (const x of [0, length]) {
        rod(g, [x, -.5, z], [x, 1.08, z], .075, 'darkWood', 7);
        cyl(g, .11, .07, [x, 1.11, z], 'lightWood', 8);
      }
      for (const offset of [-.1, .9]) chain(g, Array.from({ length: count + 1 }, (_, i) => [i * step, h(i * step) + offset, z]), .035, 'rope');
      for (let i = 0; i <= count; i += 3) {
        const x = i * step;
        rod(g, [x, h(x) - .08, z], [x, h(x) + .9, z], .018, 'rope');
      }
    }
    for(const x of [length*.2,length*.8])for(const side of [-1,1])lantern(g,x,h(x)+.75,side*width*.56,.14);
    return g;
  }

  function rowboat() {
    const g = new THREE.Group(); g.name = '小木船';
    const outline = [[0, -1.15], [-.29, -.88], [-.43, -.4], [-.45, .28], [-.3, .87], [0, 1.2], [.3, .87], [.45, .28], [.43, -.4], [.29, -.88]];
    const p = [], idx = [];
    outline.forEach(([x, z]) => { p.push(x * .7, .04, z * .87, x, .38, z); });
    for (let i = 0; i < outline.length; i++) {
      const j = (i + 1) % outline.length;
      idx.push(i * 2, j * 2, i * 2 + 1, i * 2 + 1, j * 2, j * 2 + 1);
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); geometry.setIndex(idx); geometry.computeVertexNormals();
    mesh(g, geometry, mat('boatHull', C.wood, { side: THREE.DoubleSide, flatShading: true }));
    const floorShape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x * .73, z * .85)));
    const floor = mesh(g, new THREE.ShapeGeometry(floorShape), mat('boatFloor', C.darkWood, { side: THREE.DoubleSide }), [0, .085, 0]); floor.rotation.x = Math.PI / 2;
    chain(g, [...outline, outline[0]].map(([x, z]) => [x, .39, z]), .032, 'trim');
    for (const z of [-.53, .12, .64]) box(g, [z > .5 ? .53 : .77, .055, .19], [0, .3, z], 'lightWood');
    for (const side of [-1, 1]) {
      rod(g, [side * .15, .48, -.4], [side * 1.16, .21, .55], .022, 'wood');
      const oar = box(g, [.12, .025, .42], [side * 1.18, .2, .58], 'lightWood'); oar.rotation.y = side * -.8;
    }
    return mergeStaticMeshes(g);
  }

  function umbrella() {
    const g = new THREE.Group(); g.name = '海滩阳伞';
    cyl(g, .027, 1.52, [0, .76, 0], 'lightWood', 6);
    const segments = 10, radius = .87;
    const parasolRed = mat('parasolRed', 0xe27745, { side: THREE.DoubleSide });
    const parasolCream = mat('parasolCream', 0xffe6b3, { side: THREE.DoubleSide });
    for (let i = 0; i < segments; i++) {
      const a = i * Math.PI * 2 / segments, b = (i + 1) * Math.PI * 2 / segments;
      const mid = (a + b) * .5;
      const positions = [0, 1.64, 0, Math.cos(a) * radius * .56, 1.46, Math.sin(a) * radius * .56, Math.cos(b) * radius * .56, 1.46, Math.sin(b) * radius * .56, Math.cos(a) * radius, 1.22, Math.sin(a) * radius, Math.cos(b) * radius, 1.22, Math.sin(b) * radius, Math.cos(mid) * radius * .98, 1.16, Math.sin(mid) * radius * .98];
      const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex([0, 1, 2, 1, 3, 5, 1, 5, 2, 2, 5, 4]); geometry.computeVertexNormals();
      mesh(g, geometry, i % 2 ? parasolCream : parasolRed);
      chain(g, [[0, 1.61, 0], [Math.cos(a) * radius * .56, 1.44, Math.sin(a) * radius * .56], [Math.cos(a) * radius, 1.21, Math.sin(a) * radius]], .012, 'lightWood');
    }
    cyl(g, .038, .11, [0, 1.68, 0], 'darkWood', 7, .4);
    return g;
  }

  function cave() {
    const g = new THREE.Group(); g.name = '蓝晶秘洞';
    // This arch is open all the way to the floor; a recessed dark back creates depth.
    const arch = new THREE.Shape();
    arch.moveTo(-1.82, 0); arch.lineTo(-1.82, 1.23);
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI - i * Math.PI / 12;
      arch.lineTo(Math.cos(a) * 1.82, 1.23 + Math.sin(a) * 1.82);
    }
    arch.lineTo(1.82, 0); arch.lineTo(1.08, 0); arch.lineTo(1.08, 1.14);
    for (let i = 0; i <= 12; i++) {
      const a = i * Math.PI / 12;
      arch.lineTo(Math.cos(a) * 1.08, 1.14 + Math.sin(a) * 1.08);
    }
    arch.lineTo(-1.08, 0); arch.closePath();
    const geometry = new THREE.ExtrudeGeometry(arch, { depth: 2.8, steps: 1, bevelEnabled: true, bevelSize: .13, bevelThickness: .13, bevelSegments: 1, curveSegments: 10 });
    mesh(g, geometry, 'stone', [0, 0, -2.8]);
    const dark = new THREE.Shape(); dark.moveTo(-1.16, 0); dark.lineTo(-1.16, 1.18);
    dark.absarc(0, 1.18, 1.16, Math.PI, 0, true); dark.lineTo(1.16, 0); dark.closePath();
    mesh(g, new THREE.ShapeGeometry(dark), 'caveDark', [0, 0, -2.78]);
    // Individual pale angular stones make the mouth read as a natural limestone cut.
    const rock = new THREE.IcosahedronGeometry(1, 0);
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * i / 8;
      const stone = mesh(g, rock, i % 3 ? 'stone' : 'stoneLight', [Math.cos(a) * 1.49, 1.17 + Math.sin(a) * 1.49, .05], [.35 + (i % 2) * .1, .42, .3]);
      stone.rotation.z = a; stone.rotation.y = i * .7;
    }
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
      const stone = mesh(g, rock, i % 2 ? 'stoneLight' : 'stone', [side * 1.51, .23 + i * .41, .04], [.41, .37, .34]);
      stone.rotation.set(.17 * i, i, side * .2);
    }
    const pool = mesh(g, new THREE.CircleGeometry(1.1, 32), 'pool', [0, .012, -1.2], [1, 1.48, 1]); pool.rotation.x = -Math.PI / 2;
    for (let i = 0; i < 18; i++) {
      const side = i % 2 ? -1 : 1;
      const z = -.35 - (i % 5) * .48, x = side * (.70 + (i % 3) * .07), h = .38 + (i % 4) * .17;
      const crystal = cyl(g, .07 + (i % 2) * .025, h, [x, h / 2 + .045, z], i%3?'crystal':'crystalDim', 5, .06);
      crystal.rotation.z = side * (.13 + i % 3 * .1);
      crystal.rotation.x=.08*Math.sin(i*2.7);
      cyl(g,.045,h*.52,[x-side*.10,h*.26+.03,z+.07],'crystalDim',5,.04).rotation.z=-side*.22;
      mesh(g,rock,'stone',[x,.04,z],[.16,.085,.13]);
    }
    for (let i = 0; i < 9; i++) {
      const stalactite = cyl(g, .075 + i % 2 * .04, .3 + i % 3 * .15, [-.7 + (i%5) * .35, 2.05 + .13 * Math.sin(i), -.5 - (i % 3) * .8], 'stone', 5, .05);
      stalactite.rotation.z = Math.PI;
    }
    lantern(g, -1.14, .45, .2, .18);
    // A low inner landing leaves the crystal beds and boat visible above it.
    for(let i=0;i<13;i++)box(g,[.36,.065,.18],[-.54,.13,-2.35+i*.2],i%3?'plank':'lightWood');
    for(const z of [-2.35,-1.55,-.75,.05]){
      rod(g,[-.75,-.3,z],[-.75,.43,z],.035,'darkWood');
      rod(g,[-.75,.4,z],[-.75,.4,Math.min(.1,z+.8)],.012,'rope');
      rod(g,[-.34,-.3,z],[-.34,.14,z],.03,'darkWood');
    }
    const skiff=rowboat();skiff.position.set(.32,.025,-1.45);skiff.scale.setScalar(.38);g.add(skiff);
    rod(g,[.22,.16,-1.13],[-.30,.22,-.75],.012,'rope');
    lantern(g,-.76,.47,-1.92,.13);
    return g;
  }

  function person({ color = 0xb65b3b } = {}) {
    const g = new THREE.Group(); g.name = '岛民';
    const shirt = mat(`shirt-${color}`, color);
    for (const side of [-1, 1]) {
      rod(g, [side * .055, .06, 0], [side * .045, .25, 0], .035, 'pants', 6);
      box(g, [.074, .045, .11], [side * .055, .025, .018], 'darkWood');
      rod(g, [side * .087, .34, 0], [side * .126, .24, .01], .026, shirt, 6);
      mesh(g, sphere, 'skin', [side * .127, .235, .01], [.027, .03, .027]);
    }
    cyl(g, .087, .18, [0, .307, 0], shirt, 7, .76);
    mesh(g, sphere, 'skin', [0, .451, 0], [.071, .078, .068]);
    mesh(g, sphere, 'hair', [0, .49, -.011], [.073, .043, .07]);
    return g;
  }

  function seagull() {
    const g = new THREE.Group(); g.name = '海鸥';
    mesh(g, sphere, 'white', [0, 0, 0], [.06, .055, .17]);
    mesh(g, sphere, 'white', [0, .055, .13], [.045, .045, .05]);
    rod(g, [0, .047, .17], [0, .04, .23], .015, 'trim', 4);
    for (const side of [-1, 1]) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, .07, side * .24, .1, -.01, side * .52, .015, -.17, side * .2, .025, -.12, 0, 0, -.13], 3));
      geometry.setIndex([0, 1, 3, 1, 2, 3, 0, 3, 4]); geometry.computeVertexNormals();
      mesh(g, geometry, mat('feather', 0xfff5de, { side: THREE.DoubleSide }));
      const tipGeometry = new THREE.BufferGeometry();
      tipGeometry.setAttribute('position', new THREE.Float32BufferAttribute([side * .38, .055, -.08, side * .52, .015, -.17, side * .3, .038, -.13], 3)); tipGeometry.computeVertexNormals();
      mesh(g, tipGeometry, mat('wingtip', 0x657375, { side: THREE.DoubleSide }));
    }
    return g;
  }

  return { ship, dock, bridge, rowboat, umbrella, cave, person, seagull, update(t){breezeTime.value=t} };
}
