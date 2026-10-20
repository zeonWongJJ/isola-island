import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PIRATE } from './layout.js';

// The ship is built in its own frame: +Z is the bow, Y=0 is the waterline.
// Its submerged keel, deck, cabins and rigging are complete on all four sides.
export function createPirateShip() {
  const root = new THREE.Group();
  root.name = '黑潮号 · 三桅海盗船';
  const time = { value: 0 }, materials = {}, originals = new Set();
  const material = (name, color, extra = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: .82, ...extra });
    m.name = `Black Tide · ${name}`;
    materials[name] = m;
    return m;
  };
  material('oak', 0x60402a);
  material('oakLight', 0x865a35);
  material('tar', 0x232d31);
  material('seam', 0x35291e);
  material('deck', 0xa47c4b);
  material('deckLight', 0xb48e58);
  material('brass', 0xb58b45, { metalness: .48, roughness: .43 });
  material('iron', 0x30383a, { metalness: .65, roughness: .51 });
  material('muzzle', 0x080e12);
  material('rope', 0x96805b);
  material('ivory', 0xd5c6a3);
  material('red', 0x91372e);
  material('glass', 0xe5af57, { emissive: 0xffa43c, emissiveIntensity: .12, roughness: .3 });
  materials.glass.userData = { glow: true, nightMultiplier: .65 };
  material('lamp', 0xf7ca7b, { emissive: 0xffab4e, emissiveIntensity: .15 });
  materials.lamp.userData = { glow: true, nightMultiplier: .85 };
  for (const [name, color] of [['sail', 0x303b43], ['sailPatch', 0x414b50], ['sailMark', 0xd5c8a8], ['flag', 0x8a3029]]) {
    const m = material(name, color, { side: THREE.DoubleSide, roughness: 1 });
    m.onBeforeCompile = shader => {
      shader.uniforms.uShipTime = time;
      shader.vertexShader = 'uniform float uShipTime; attribute float sailFlex; varying vec3 vClothPosition;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vClothPosition=position;
        transformed.z += sailFlex * (.035*sin(position.x*3.4-uShipTime*1.35) + .018*sin(position.y*6.1+uShipTime*1.8));
      `);
      shader.fragmentShader = 'varying vec3 vClothPosition;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        float weave=.5+.5*sin(vClothPosition.x*135.)*sin(vClothPosition.y*138.);
        float faded=.5+.5*sin(vClothPosition.x*3.7+sin(vClothPosition.y*5.1))*sin(vClothPosition.y*2.2);
        diffuseColor.rgb*=.92+weave*.055+faded*.13;
      `);
    };
    m.customProgramCacheKey = () => 'black-tide-cloth-v1';
  }
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const sphere = new THREE.SphereGeometry(1, 12, 8);
  const up = new THREE.Vector3(0, 1, 0);
  function mesh(g, geo, name, p = [0, 0, 0], scale) {
    originals.add(geo);
    const m = new THREE.Mesh(geo, materials[name]);
    m.position.set(...p);
    if (scale) m.scale.set(...scale);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    return m;
  }
  const box = (g, p, size, name = 'oak') => mesh(g, cube, name, p, size);
  const ball = (g, p, size, name) => mesh(g, sphere, name, p, size);
  const cylinder = (g, p, r, h, name = 'oak', top = r, segments = 10) =>
    mesh(g, new THREE.CylinderGeometry(top, r, h, segments), name, p);
  function rod(g, a, b, radius = .018, name = 'rope', segments = 6) {
    const av = new THREE.Vector3(...a), bv = new THREE.Vector3(...b), d = bv.clone().sub(av);
    const m = cylinder(g, av.add(bv).multiplyScalar(.5).toArray(), radius, d.length(), name, radius, segments);
    m.quaternion.setFromUnitVectors(up, d.normalize());
    return m;
  }
  const chain = (g, points, radius = .018, name = 'rope') => {
    for (let i = 1; i < points.length; i++) rod(g, points[i - 1], points[i], radius, name);
  };
  const curve = (g, points, radius = .025, name = 'brass', segments = 28) =>
    mesh(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), segments, radius, 6, false), name);
  const ring = (g, p, radius, tube, name = 'brass') =>
    mesh(g, new THREE.TorusGeometry(radius, tube, 6, 18), name, p);
  const emitters = [];
  function lantern(g, p, size = .22) {
    const [x, y, z] = p;
    const glass = box(g, p, [size * .68, size, size * .68], 'lamp');
    glass.userData.shipEmitter = { size: size * 3.5, kind: 'lantern' };
    cylinder(g, [x, y + size * .64, z], size * .66, size * .27, 'iron', .02, 4).rotation.y = Math.PI / 4;
    box(g, [x, y - size * .56, z], [size, size * .12, size], 'brass');
    for (const dx of [-1, 1]) for (const dz of [-1, 1])
      rod(g, [x + dx * size * .36, y - size * .5, z + dz * size * .36], [x + dx * size * .36, y + size * .5, z + dz * size * .36], .013, 'iron');
    ring(g, [x, y + size * .88, z], size * .17, .012, 'iron');
  }
  function barrel(g, x, y, z, scale = 1) {
    const b = new THREE.Group(); g.add(b); b.position.set(x, y, z); b.scale.setScalar(scale);
    mesh(b, new THREE.LatheGeometry([new THREE.Vector2(.22, 0), new THREE.Vector2(.27, .1), new THREE.Vector2(.29, .32), new THREE.Vector2(.26, .56), new THREE.Vector2(.22, .63)], 12), 'oakLight');
    for (const h of [.09, .29, .55]) cylinder(b, [0, h, 0], h === .29 ? .293 : .266, .033, 'iron');
    cylinder(b, [0, .635, 0], .22, .025, 'deck');
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      chain(b, [[Math.cos(a) * .224, 0, Math.sin(a) * .224], [Math.cos(a) * .292, .3, Math.sin(a) * .292], [Math.cos(a) * .224, .63, Math.sin(a) * .224]], .006, 'seam');
    }
  }
  function coil(g, x, y, z, radius = .23) {
    for (let i = 0; i < 3; i++) {
      const r = ring(g, [x, y + .018 * i, z], radius - i * .035, .015, 'rope');
      r.rotation.x = -Math.PI / 2;
    }
    curve(g, [[x + radius, y, z], [x + radius + .15, y, z + .12], [x + radius + .24, y, z + .08]], .012, 'rope', 10);
  }
  function skull(g, p, scale = 1, rotation = 0) {
    const s = new THREE.Group(); s.position.set(...p); s.scale.setScalar(scale); s.rotation.y = rotation; g.add(s);
    ball(s, [0, .12, 0], [.31, .32, .19], 'ivory');
    ball(s, [-.115, .16, .165], [.085, .10, .044], 'muzzle');
    ball(s, [.115, .16, .165], [.085, .10, .044], 'muzzle');
    box(s, [0, -.02, .185], [.065, .08, .03], 'muzzle').rotation.z = Math.PI / 4;
    box(s, [0, -.13, .035], [.29, .16, .22], 'ivory');
    for (let i = 0; i < 5; i++) box(s, [-.12 + i * .06, -.20, .11], [.045, .10, .07], 'ivory');
    for (const side of [-1, 1]) {
      rod(s, [-.40, -.42 * side, -.05], [.40, .42 * side, -.05], .048, 'ivory');
      for (const end of [-1, 1]) for (const d of [-1, 1])
        ball(s, [.40 * end + d * .035, .42 * side * end + d * .028, -.05], [.068, .064, .06], 'ivory');
    }
  }

  // Continuous hull rings, planking and a submerged keel.
  const stations = [
    [-4.8, 1.15, 2.02], [-4.25, 1.52, 1.98], [-3.3, 1.72, 1.83],
    [-1.8, 1.83, 1.70], [0, 1.85, 1.68], [1.7, 1.72, 1.78],
    [3.1, 1.38, 1.98], [4.3, .83, 2.22], [5.1, .19, 2.48], [5.35, .025, 2.60],
  ];
  const section = [[-1, 1], [-1.035, .74], [-1, .48], [-.85, .22], [-.49, .02], [0, -.05], [.49, .02], [.85, .22], [1, .48], [1.035, .74], [1, 1]];
  const hullPoint = ([z, w, h], [x, v]) => [w * x, -.72 + (h + .72) * v, z];
  const hp = [], hi = [];
  stations.forEach(station => section.forEach(s => hp.push(...hullPoint(station, s))));
  for (let j = 0; j < stations.length - 1; j++) for (let i = 0; i < section.length - 1; i++) {
    const a = j * section.length + i, b = a + section.length;
    hi.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const hull = new THREE.BufferGeometry();
  hull.setAttribute('position', new THREE.Float32BufferAttribute(hp, 3)); hull.setIndex(hi); hull.computeVertexNormals();
  mesh(root, hull, 'oak');
  // The transom closes the stern below the cabin.
  const transom = new THREE.Shape();
  section.forEach((s, i) => { const p = hullPoint(stations[0], s); i ? transom.lineTo(p[0], p[1]) : transom.moveTo(p[0], p[1]); });
  transom.closePath();
  mesh(root, new THREE.ShapeGeometry(transom), 'oak', [0, 0, -4.8]).rotation.y = Math.PI;
  function hullWidth(z, fraction) {
    let j = 0;
    while (j < stations.length - 2 && z > stations[j + 1][0]) j++;
    const a = stations[j], b = stations[j + 1], t = THREE.MathUtils.clamp((z - a[0]) / (b[0] - a[0]), 0, 1);
    const w = THREE.MathUtils.lerp(a[1], b[1], t), h = THREE.MathUtils.lerp(a[2], b[2], t);
    return [w * fraction, h];
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const v = .28 + i * .084;
      chain(root, stations.map(s => hullPoint(s, [side * (.91 + .12 * Math.sin(v * Math.PI)), v])), i % 3 === 0 ? .045 : .013, i === 6 ? 'brass' : i % 3 === 0 ? 'tar' : 'seam');
    }
    chain(root, stations.map(s => hullPoint(s, [side * 1.01, 1])), .075, 'brass');
    for (let z = -4.4; z < 4.6; z += .47) {
      const [w, h] = hullWidth(z, 1.025);
      for (const y of [.38, .84, 1.47]) {
        if (y > h - .12) continue;
        ball(root, [side * w, y, z], [.022, .027, .027], 'brass');
      }
    }
  }
  rod(root, [0, -.72, -4.7], [0, -.72, 4.4], .09, 'tar');
  box(root, [0, -.13, -4.95], [.16, 1.25, .45], 'tar');
  for (const y of [-.4, .05, .55]) box(root, [0, y, -4.93], [.24, .07, .5], 'iron');

  // Plank deck, raised poop and forecastle, with readable seams.
  function deck(z0, z1, height, factor = .96) {
    const rows = stations.filter(s => s[0] > z0 && s[0] < z1).map(s => [s[0], s[1]]);
    rows.unshift([z0, hullWidth(z0, 1)[0]]); rows.push([z1, hullWidth(z1, 1)[0]]);
    const outline = new THREE.Shape();
    rows.forEach(([z, w], i) => i ? outline.lineTo(-w * factor, -z) : outline.moveTo(-w * factor, -z));
    [...rows].reverse().forEach(([z, w]) => outline.lineTo(w * factor, -z)); outline.closePath();
    const d = mesh(root, new THREE.ShapeGeometry(outline), 'deck', [0, height, 0]); d.rotation.x = -Math.PI / 2;
    for (let z = z0 + .06, row = 0; z < z1; z += .22, row++) {
      const w = hullWidth(z, factor)[0] - .045;
      rod(root, [-w, height + .007, z], [w, height + .007, z], .008, 'seam');
      for (let x = -w + (row % 3) * .42; x < w; x += 1.25) rod(root, [x, height + .008, z], [x, height + .008, Math.min(z + .20, z1)], .007, 'seam');
    }
  }
  deck(-4.7, 5.1, 1.75);
  deck(-4.73, -2.95, 3.22);
  deck(3.35, 4.95, 2.27, .88);
  function rail(points, height = .5) {
    chain(root, points.map(p => [p[0], p[1] + height, p[2]]), .040, 'brass');
    chain(root, points.map(p => [p[0], p[1] + height * .48, p[2]]), .023, 'oakLight');
    for (const p of points) rod(root, p, [p[0], p[1] + height, p[2]], .030, 'oakLight');
  }
  for (const side of [-1, 1]) {
    const pts = [];
    for (let z = -2.8; z <= 4.95; z += .32) {
      const [w, h] = hullWidth(z, .98);
      pts.push([side * w, Math.max(1.76, h), z]);
    }
    rail(pts);
    rail(Array.from({ length: 7 }, (_, i) => { const z = -4.65 + i * .275; return [side * hullWidth(z, .97)[0], 3.23, z]; }), .45);
    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      box(root, [side * 1.17, 1.77 + t * 1.45, -1.93 - t * .99], [.51, .09, .18], 'deckLight');
    }
    rod(root, [side * 1.43, 2.25, -1.9], [side * 1.43, 3.69, -2.95], .027, 'brass');
    for (const t of [0, .5, 1]) rod(root, [side * 1.43, 1.76 + 1.45 * t, -1.9 - t * 1.05], [side * 1.43, 2.25 + 1.44 * t, -1.9 - t * 1.05], .023, 'oak');
  }
  rail(Array.from({ length: 9 }, (_, i) => [-1.15 + i * .2875, 3.24, -4.80]), .46);

  // A stern cabin with two tiers of glazed windows, gilded balcony and a door.
  box(root, [0, 2.44, -3.90], [2.25, 1.44, 1.65], 'tar');
  box(root, [0, 3.17, -3.90], [2.55, .14, 1.9], 'brass');
  box(root, [0, 1.80, -4.03], [2.45, .12, 1.72], 'brass');
  const windowLocations = [];
  function windowPane(g, x, y, z, width, height, angle = 0) {
    const frame = new THREE.Group(); frame.position.set(x, y, z); frame.rotation.y = angle; g.add(frame);
    const pane = box(frame, [0, 0, .018], [width, height, .045], 'glass');
    pane.userData.shipEmitter = { kind: 'window', size: width * 2.2 };
    for (const side of [-1, 1]) {
      box(frame, [side * width / 2, 0, .06], [.045, height + .08, .07], 'brass');
      box(frame, [0, side * height / 2, .06], [width + .06, .04, .07], 'brass');
    }
    box(frame, [0, 0, .065], [.03, height, .04], 'oak');
    box(frame, [0, 0, .065], [width, .028, .04], 'oak');
    windowLocations.push([x, y, z]);
  }
  for (const x of [-.83, -.41, 0, .41, .83]) {
    windowPane(root, x, 2.49, -4.75, .31, .65, Math.PI);
    windowPane(root, x * .92, 1.29, -4.825, .24, .31, Math.PI);
  }
  for (const side of [-1, 1]) {
    for (const z of [-4.38, -3.85, -3.32]) windowPane(root, side * 1.14, 2.48, z, .36, .59, side * Math.PI / 2);
    curve(root, [[side * 1.15, 1.95, -4.6], [side * 1.43, 2.04, -4.8], [side * 1.38, 2.13, -5.0], [side * .8, 2.13, -5.04]], .05);
    for (let z = -4.55; z < -3.1; z += .23) rod(root, [side * 1.3, 1.89, z], [side * 1.3, 2.16, z], .025, 'brass');
    chain(root, [[side * 1.3, 2.16, -4.6], [side * 1.3, 2.16, -3.1]], .045, 'brass');
    lantern(root, [side * 1.36, 3.70, -4.64], .30);
    rod(root, [side * 1.30, 3.23, -4.65], [side * 1.36, 3.45, -4.64], .045, 'iron');
  }
  curve(root, [[-1.1, 3.22, -4.88], [-.72, 3.47, -4.88], [0, 3.66, -4.88], [.72, 3.47, -4.88], [1.1, 3.22, -4.88]], .065);
  skull(root, [0, 3.42, -4.96], .42, Math.PI);
  box(root, [0, 2.24, -3.05], [.63, .96, .07], 'oakLight');
  for (let x = -.24; x <= .24; x += .12) rod(root, [x, 1.80, -3.003], [x, 2.67, -3.003], .009, 'seam');
  box(root, [0, 2.57, -2.99], [.36, .26, .035], 'glass');
  ring(root, [.20, 2.2, -2.97], .045, .012);
  lantern(root, [-.52, 2.65, -3.02], .18);

  // Seven ports on each broadside, hinged lids, muzzle bores and iron bands.
  const gunPorts = [];
  for (const side of [-1, 1]) for (const z of [-3.45, -2.35, -1.25, -.15, .95, 2.05, 3.15]) {
    const x = side * hullWidth(z, 1.024)[0], y = 1.10 + (Math.abs(z) > 2.9 ? .09 : 0);
    const port = new THREE.Group(); port.position.set(x, y, z); port.rotation.y = side * Math.PI / 2; root.add(port);
    box(port, [0, 0, .025], [.48, .42, .055], 'muzzle');
    for (const a of [-1, 1]) {
      box(port, [a * .26, 0, .06], [.045, .48, .10], 'brass');
      box(port, [0, a * .23, .06], [.55, .045, .10], 'oakLight');
    }
    const lid = box(port, [0, .32, .16], [.50, .07, .42], 'oak'); lid.rotation.x = -.35;
    for (const a of [-1, 1]) box(port, [a * .16, .35, .12], [.04, .035, .29], 'iron');
    rod(port, [0, -.03, -.05], [0, -.03, .55], .095, 'iron', 12);
    for (const zz of [.19, .46]) { const r = ring(port, [0, -.03, zz], .096, .017, 'iron'); r.scale.setScalar(1); }
    mesh(port, new THREE.CircleGeometry(.075, 16), 'muzzle', [0, -.03, .553]);
    gunPorts.push([x + side * .55, y, z]);
  }
  // Two deck guns have visible wheeled carriages.
  for (const side of [-1, 1]) {
    const gun = new THREE.Group(); root.add(gun); gun.position.set(side * 1.36, 1.77, 2.35); gun.rotation.y = side * Math.PI / 2;
    box(gun, [0, .12, -.15], [.33, .22, .50], 'oakLight');
    for (const x of [-.20, .20]) for (const z of [-.33, .02])
      cylinder(gun, [x, .12, z], .115, .065, 'tar').rotation.z = Math.PI / 2;
    rod(gun, [0, .30, -.45], [0, .37, .45], .105, 'iron', 12);
    mesh(gun, new THREE.CircleGeometry(.078, 12), 'muzzle', [0, .37, .453]);
    coil(root, side * 1.05, 1.78, 1.65, .17);
  }

  // Quarterdeck wheel, compass binnacle, main hatch and capstan.
  const wheel = new THREE.Group(); root.add(wheel); wheel.position.set(0, 3.94, -3.48);
  ring(wheel, [0, 0, 0], .36, .040, 'oakLight');
  ring(wheel, [0, 0, .01], .29, .018, 'brass');
  for (let i = 0; i < 10; i++) {
    const a = i * Math.PI / 5;
    rod(wheel, [0, 0, 0], [Math.cos(a) * .47, Math.sin(a) * .47, 0], .027, 'oakLight');
    ball(wheel, [Math.cos(a) * .47, Math.sin(a) * .47, 0], [.040, .040, .040], 'brass');
  }
  ball(wheel, [0, 0, .02], [.09, .09, .07], 'brass');
  rod(root, [0, 3.22, -3.50], [0, 3.94, -3.50], .075, 'oak');
  box(root, [.68, 3.49, -3.65], [.31, .5, .31], 'oak');
  cylinder(root, [.68, 3.77, -3.65], .19, .11, 'brass');
  cylinder(root, [.68, 3.83, -3.65], .15, .018, 'ivory');
  rod(root, [.57, 3.85, -3.65], [.79, 3.85, -3.65], .014, 'red');
  box(root, [0, 1.81, .95], [1.15, .12, .87], 'tar');
  for (let i = 0; i < 8; i++) box(root, [-.49 + i * .14, 1.90, .95], [.035, .045, .78], 'oakLight');
  for (let i = 0; i < 6; i++) box(root, [0, 1.885, .59 + i * .14], [1.08, .035, .035], 'oak');
  cylinder(root, [0, 2.03, 3.95], .24, .48, 'oakLight');
  cylinder(root, [0, 2.29, 3.95], .33, .09, 'iron');
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    rod(root, [0, 2.30, 3.95], [Math.cos(a) * .66, 2.30, 3.95 + Math.sin(a) * .66], .033, 'oakLight');
  }
  for (const [x, z, s] of [[-.95, -.8, .78], [-1.30, -1.2, .68], [.95, -.9, .74], [.95, .12, .63], [-.85, -4, .65]])
    barrel(root, x, z < -3 ? 3.24 : 1.76, z, s);
  for (const [x, z] of [[-1.05, .60], [.85, -1.6]]) {
    box(root, [x, 1.96, z], [.42, .40, .44], 'oakLight');
    for (const dx of [-.17, .17]) box(root, [x + dx, 1.96, z + .23], [.045, .41, .03], 'brass');
    rod(root, [x - .18, 1.79, z + .24], [x + .18, 2.13, z + .24], .022, 'oak');
  }
  coil(root, -1.05, 3.24, -3.63);
  coil(root, .70, 2.29, 4.08, .21);
  // Open treasure chest and a navigator's chart on the aft deck.
  box(root, [.55, 3.38, -4.25], [.51, .28, .34], 'oak');
  const lid = box(root, [.55, 3.64, -4.37], [.54, .075, .36], 'oakLight'); lid.rotation.x = -1.0;
  for (const x of [.38, .72]) box(root, [x, 3.39, -4.06], [.045, .29, .027], 'brass');
  for (let i = 0; i < 18; i++) cylinder(root, [.36 + (i % 5) * .085, 3.54 + (i % 3) * .012, -4.36 + Math.floor(i / 5) * .065], .037, .015, 'brass', .037, 8);
  box(root, [-.55, 3.58, -4.02], [.62, .07, .45], 'oakLight');
  for (const x of [-.78, -.32]) for (const z of [-4.18, -3.88]) box(root, [x, 3.39, z], [.045, .33, .045], 'oak');
  box(root, [-.55, 3.625, -4.02], [.49, .012, .31], 'ivory');
  chain(root, [[-.72, 3.636, -4.07], [-.58, 3.636, -3.98], [-.44, 3.636, -4.10], [-.35, 3.636, -3.94]], .007, 'red');
  lantern(root, [-.93, 3.86, -4.16], .18);

  // Long bowsprit, gilt head rails, carved figurehead and hanging anchors.
  rod(root, [0, 2.23, 3.9], [0, 3.48, 7.72], .095, 'oakLight', 10);
  rod(root, [0, 2.60, 5.18], [0, 3.62, 8.12], .046, 'tar');
  for (let i = 0; i < 12; i++) {
    const t = i / 11, z = 4.1 + t * 3.42, y = 2.30 + t * 1.12;
    cylinder(root, [0, y, z], .106 - t * .02, .055, 'rope').rotation.x = Math.PI / 2 - .32;
  }
  skull(root, [0, 2.31, 5.32], .83);
  for (const side of [-1, 1]) {
    for (let j = 0; j < 3; j++) curve(root, [[side * 1.52, 1.47 + j * .22, 2.65], [side * 1.2, 1.34 + j * .25, 3.65], [side * .43, 1.81 + j * .23, 4.88], [side * .15, 2.60 + j * .06, 5.44]], .035);
    curve(root, [[side * .24, 2.50, 5.38], [side * .66, 2.42, 5.09], [side * .74, 2.70, 4.90], [side * .49, 2.78, 5.08]], .045);
    const anchor = new THREE.Group(); root.add(anchor); anchor.position.set(side * 1.27, .64, 3.25); anchor.rotation.z = side * -.27;
    ring(anchor, [0, .45, 0], .095, .023, 'iron');
    rod(anchor, [0, .42, 0], [0, -.39, 0], .045, 'iron');
    rod(anchor, [-.22, .22, 0], [.22, .22, 0], .046, 'oak');
    curve(anchor, [[-.36, -.20, 0], [-.29, -.44, 0], [0, -.52, 0], [.29, -.44, 0], [.36, -.20, 0]], .042, 'iron');
    for (const s of [-1, 1]) {
      const fluke = mesh(anchor, new THREE.ConeGeometry(.10, .23, 3), 'iron', [s * .33, -.22, 0]); fluke.rotation.z = s * .40;
    }
    curve(root, [[side * 1.1, 2.1, 3.42], [side * 1.44, 1.55, 3.28], [side * 1.27, 1.10, 3.25]], .021, 'iron');
    lantern(root, [side * .92, 2.98, 3.65], .22);
  }

  // Cloth shapes carry their emblem on the same curved surface (both faces).
  function skullShape() {
    const s = new THREE.Shape();
    s.moveTo(-.23, -.08); s.bezierCurveTo(-.42, .05, -.38, .46, 0, .47);
    s.bezierCurveTo(.38, .46, .42, .05, .23, -.08);
    s.lineTo(.18, -.13); s.lineTo(.17, -.34); s.lineTo(-.17, -.34); s.lineTo(-.18, -.13); s.closePath();
    for (const x of [-.14, .14]) {
      const hole = new THREE.Path(); hole.absellipse(x, .14, .094, .112, 0, Math.PI * 2, true); s.holes.push(hole);
    }
    const nose = new THREE.Path(); nose.moveTo(0, .025); nose.lineTo(.062, -.10); nose.lineTo(-.062, -.10); nose.closePath(); s.holes.push(nose);
    for (const x of [-.10, 0, .10]) {
      const tooth = new THREE.Path(); tooth.moveTo(x - .014, -.23); tooth.lineTo(x + .014, -.23); tooth.lineTo(x + .014, -.33); tooth.lineTo(x - .014, -.33); tooth.closePath(); s.holes.push(tooth);
    }
    return s;
  }
  function cloth(g, { z, top, w, h, emblem = false, yaw = -.64 }) {
    const rig = new THREE.Group(); rig.position.set(0, top, z); rig.rotation.y = yaw; g.add(rig);
    const point = (x, y, out = 0) => {
      const v = -y / h, u = x / w + .5;
      return [x * (1 - .13 * v), y + .15 * Math.sin(u * Math.PI) * v,
        .48 * Math.sin(Math.PI * u) * Math.sin(Math.PI * v) + .028 * Math.sin(u * Math.PI * 10) * Math.sin(v * Math.PI) + out];
    };
    const cols = 18, rows = 12, positions = [], indices = [];
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
      const u = i / cols, v = j / rows;
      const tear = j === rows ? (.055 + (i % 5 === 1 ? .14 : 0)) * (i % 3) : 0;
      positions.push(...point((u - .5) * w, -h * v + tear));
    }
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const a = j * (cols + 1) + i;
      indices.push(a, a + cols + 1, a + 1, a + 1, a + cols + 1, a + cols + 2);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geo.setIndex(indices); geo.computeVertexNormals();
    mesh(rig, geo, 'sail');
    rod(rig, [-w * .57, .035, 0], [w * .57, .035, 0], .055, 'tar', 8);
    for (const x of [-w * .42, 0, w * .42]) {
      rod(rig, [x, .09, -.035], [x, -.04, .045], .018, 'rope');
    }
    for (const u of [-.5, .5]) chain(rig, Array.from({ length: 13 }, (_, i) => point(w * u, -h * i / 12)), .014, 'rope');
    for (let u = -.35; u < .4; u += .175) chain(rig, Array.from({ length: 13 }, (_, i) => point(w * u, -h * i / 12, .009)), .006, 'sailPatch');
    for (const [px, py, pw, ph] of [[-.27 * w, -.65 * h, w * .12, h * .18], [.32 * w, -.80 * h, w * .13, h * .14]]) {
      const patch = new THREE.PlaneGeometry(pw, ph, 3, 3);
      const p = patch.getAttribute('position');
      for (let i = 0; i < p.count; i++) p.setXYZ(i, ...point(p.getX(i) + px, p.getY(i) + py, .012));
      patch.computeVertexNormals(); mesh(rig, patch, 'sailPatch');
      for (let i = 0; i < 6; i++) {
        const x = px - pw * .45 + pw * .9 * i / 5;
        rod(rig, point(x, py + ph * .50, .022), point(x, py + ph * .39, .023), .007, 'rope');
      }
    }
    if (emblem) {
      const scale = Math.min(w * .47, h * .62), cy = -h * .46;
      for (const face of [-1, 1]) {
        const skullGeo = new THREE.ShapeGeometry(skullShape(), 10), p = skullGeo.getAttribute('position');
        for (let i = 0; i < p.count; i++) p.setXYZ(i, ...point(p.getX(i) * scale, p.getY(i) * scale + cy, face * .020));
        skullGeo.computeVertexNormals(); mesh(rig, skullGeo, 'sailMark');
        for (const side of [-1, 1]) {
          const a = point(-.41 * scale, cy - .48 * scale - side * .15 * scale, face * .024);
          const b = point(.41 * scale, cy - .48 * scale + side * .15 * scale, face * .024);
          rod(rig, a, b, .045 * scale, 'sailMark');
          for (const p of [a, b]) for (const d of [-1, 1]) ball(rig, [p[0] + d * .026 * scale, p[1] + d * .032 * scale, p[2]], [.062 * scale, .052 * scale, .018], 'sailMark');
        }
      }
    }
    rig.updateMatrixWorld(true);
    for (const side of [-1, 1]) {
      const corner = new THREE.Vector3(...point(side * w / 2, -h)).applyMatrix4(rig.matrixWorld);
      rod(root, corner.toArray(), [side * 1.55, 1.95, z + .60], .017, 'rope');
      const end = new THREE.Vector3(side * w * .55, 0, 0).applyMatrix4(rig.matrixWorld);
      rod(root, [0, top + .65, z], end.toArray(), .013, 'rope');
    }
  }
  const masts = [
    { z: -2.65, height: 8.9, top: 6.55, w: 3.12, h: 2.30, nest: 6.95 },
    { z: -.05, height: 11.15, top: 7.48, w: 4.65, h: 3.05, nest: 8.17 },
    { z: 2.64, height: 9.7, top: 6.83, w: 3.65, h: 2.56, nest: 7.35 },
  ];
  for (const [index, m] of masts.entries()) {
    rod(root, [0, 1.74, m.z], [0, m.height, m.z], index === 1 ? .115 : .095, 'oak', 12);
    for (let y = 2; y < m.height; y += .70) cylinder(root, [0, y, m.z], index === 1 ? .122 : .102, .048, 'iron');
    cloth(root, { z: m.z + .09, top: m.top, w: m.w, h: m.h, emblem: index === 1 });
    cloth(root, { z: m.z + .07, top: m.height - .65, w: m.w * .65, h: index === 1 ? 1.52 : 1.22 });
    cylinder(root, [0, m.nest, m.z], .43, .13, 'oakLight', .49, 12);
    const nestRing = ring(root, [0, m.nest + .48, m.z], .48, .031); nestRing.rotation.x = Math.PI / 2;
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      rod(root, [Math.cos(a) * .44, m.nest, m.z + Math.sin(a) * .44], [Math.cos(a) * .48, m.nest + .48, m.z + Math.sin(a) * .48], .024, 'oakLight');
    }
    lantern(root, [.35, m.nest + .24, m.z + .27], .14);
    // Four shrouds on each side and a fine ladder of horizontal ratlines.
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const z = m.z - .49 + i * .32;
        rod(root, [side * 1.61, 1.95, z], [side * .13, m.nest - .06, m.z], .015, 'rope');
        cylinder(root, [side * 1.67, 1.89, z], .074, .12, 'oak').rotation.z = Math.PI / 2;
      }
      for (let y = 2.14; y < m.nest - .15; y += .23) {
        const t = (y - 1.95) / (m.nest - .06 - 1.95), x = side * THREE.MathUtils.lerp(1.61, .13, t);
        rod(root, [x, y, m.z - .49 * (1 - t)], [x, y, m.z + .47 * (1 - t)], .010, 'rope');
      }
    }
    // Forked red-and-black pennants at the masthead.
    const flag = new THREE.Group(); flag.position.set(0, m.height - .04, m.z); flag.rotation.y = -.40; root.add(flag);
    const fs = new THREE.Shape(); fs.moveTo(0, 0); fs.lineTo(.93, -.03); fs.lineTo(.72, -.22); fs.lineTo(1.05, -.37); fs.lineTo(.62, -.45); fs.lineTo(0, -.35); fs.closePath();
    mesh(flag, new THREE.ShapeGeometry(fs), index === 1 ? 'flag' : 'sail');
    const symbol = new THREE.ShapeGeometry(skullShape(), 6);
    symbol.scale(.24, .24, .24); symbol.translate(.32, -.18, .018); mesh(flag, symbol, 'sailMark');
    rod(root, [0, m.height - .52, m.z], [0, m.height + .12, m.z], .028, 'brass');
  }
  rod(root, [0, 10.6, -.05], [0, 9.15, 2.64], .022, 'rope');
  rod(root, [0, 10.6, -.05], [0, 8.4, -2.65], .022, 'rope');
  rod(root, [0, 8.5, -2.65], [0, 3.45, -4.80], .022, 'rope');
  rod(root, [0, 9.15, 2.64], [0, 3.62, 8.12], .025, 'rope');
  rod(root, [0, .30, 4.85], [0, 3.60, 8.10], .024, 'rope');
  for (const side of [-1, 1]) rod(root, [side * 1.3, 1.55, 3.2], [0, 3.60, 8.10], .02, 'rope');
  // Curved triangular headsail below the forestay.
  const v = [new THREE.Vector3(.03, 8.60, 2.90), new THREE.Vector3(.03, 3.78, 7.70), new THREE.Vector3(.03, 3.47, 3.28)];
  const jp = [], ji = [], n = 13, lookup = [];
  for (let i = 0; i <= n; i++) {
    lookup[i] = [];
    for (let j = 0; j <= n - i; j++) {
      const u = i / n, w = j / n, p = v[0].clone().multiplyScalar(1 - u - w).addScaledVector(v[1], u).addScaledVector(v[2], w);
      p.x += .46 * Math.sin(u * Math.PI) * Math.sin(w * Math.PI);
      lookup[i][j] = jp.length / 3; jp.push(...p.toArray());
    }
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < n - i; j++) {
    ji.push(lookup[i][j], lookup[i + 1][j], lookup[i][j + 1]);
    if (j < n - i - 1) ji.push(lookup[i + 1][j], lookup[i + 1][j + 1], lookup[i][j + 1]);
  }
  const jib = new THREE.BufferGeometry(); jib.setAttribute('position', new THREE.Float32BufferAttribute(jp, 3)); jib.setIndex(ji); jib.computeVertexNormals(); mesh(root, jib, 'sail');
  chain(root, [...v.map(p => p.toArray()), v[0].toArray()], .014, 'rope');
  for (const [x, z] of [[-1.55, -.75], [1.55, -.75]]) lantern(root, [x, 2.35, z], .18);

  // Bake static parts in ship coordinates. Glow anchors survive batching and
  // follow the same gently rocking root as the windows and lanterns.
  root.updateMatrixWorld(true);
  const batches = new Map();
  let parts = 0;
  root.traverse(o => {
    if (!o.isMesh) return;
    parts++;
    if (o.userData.shipEmitter) {
      const e = o.userData.shipEmitter;
      emitters.push({ position: o.getWorldPosition(new THREE.Vector3()).toArray(), kind: e.kind, size: e.size / 3.8 });
    }
    const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    geo.applyMatrix4(o.matrixWorld);
    for (const key of Object.keys(geo.attributes)) if (!['position', 'normal'].includes(key)) geo.deleteAttribute(key);
    if (!geo.getAttribute('normal')) geo.computeVertexNormals();
    const flex = new Float32Array(geo.getAttribute('position').count);
    if (['sail', 'sailPatch', 'sailMark', 'flag'].some(k => materials[k] === o.material)) flex.fill(1);
    geo.setAttribute('sailFlex', new THREE.BufferAttribute(flex, 1));
    if (!batches.has(o.material)) batches.set(o.material, []);
    batches.get(o.material).push(geo);
  });
  root.clear();
  for (const [mat, geos] of batches) {
    const geo = mergeGeometries(geos, false);
    geo.computeBoundingSphere(); geo.computeBoundingBox();
    const m = new THREE.Mesh(geo, mat); m.name = mat.name; m.castShadow = m.receiveShadow = true; root.add(m);
    geos.forEach(g => g.dispose());
  }
  originals.forEach(g => g.dispose());
  root.userData.nightEmitters = emitters;
  root.userData.staticBatch = { originalMeshes: parts, mergedDrawCalls: batches.size };
  root.position.set(PIRATE.x, PIRATE.y, PIRATE.z);
  root.scale.setScalar(PIRATE.scale);
  root.rotation.y = PIRATE.rotation;

  // Local spill has a short range and never washes out the whole ship.
  const lights = [[0, 2.50, -4.93, 2.4, 3.2], [0, 3.85, -3.55, 2.1, 3.8], [0, 2.6, 3.65, 1.5, 3.3]].map(([x, y, z, power, range]) => {
    const light = new THREE.PointLight(0xffb05e, 0, range, 2);
    light.position.set(x, y, z); light.name = 'Black Tide lantern spill'; root.add(light);
    return { light, power };
  });
  // A restrained cool ambient floor keeps dark canvas and tar readable against
  // the night sea. It is intentionally much dimmer than the actual lanterns.
  const moonlit = Object.entries(materials).filter(([name]) => !['glass', 'lamp', 'muzzle'].includes(name));
  for (const [, m] of moonlit) { m.emissive.set(0x263b53); m.emissiveIntensity = 0; }
  return {
    root, gunPorts, masts, windowLocations,
    update(t, night) {
      time.value = t;
      root.position.y = PIRATE.y + Math.sin(t * .58) * .042;
      root.rotation.z = Math.sin(t * .47) * .009;
      root.rotation.x = Math.sin(t * .41 + 1) * .006;
      const level = THREE.MathUtils.smoothstep(night, .025, .85);
      for (const [name, m] of moonlit)
        m.emissiveIntensity = level * (name === 'sailMark' || name === 'ivory' ? .30 : name === 'sail' || name === 'tar' ? .22 : .15);
      for (const { light, power } of lights) {
        light.visible = level > .001;
        light.intensity = power * level * (.98 + .02 * Math.sin(t * 1.3));
      }
    },
  };
}

// Slow, broken surface ripples for an anchored vessel, not a fast ship's wake.
export function createPirateRipples() {
  const positions = [], strengths = [];
  for (const side of [-1, 1]) for (let band = 0; band < 3; band++) {
    for (let i = 0; i < 96; i++) {
      const z = -5.1 + i / 95 * 10.7, t = (z + 5.1) / 10.7;
      const width = Math.pow(Math.sin(Math.PI * t), .58) * 1.94 + .12 + band * .26;
      const nextZ = z + .105;
      const pts = [[side * width, z], [side * (width + .055), z], [side * width, nextZ], [side * (width + .055), nextZ]];
      for (const index of [0, 2, 1, 1, 2, 3]) {
        positions.push(pts[index][0], 0, pts[index][1]);
        strengths.push((1 - band * .22) * Math.sin(Math.PI * t));
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('strength', new THREE.Float32BufferAttribute(strengths, 1));
  const uniforms = { time: { value: 0 }, night: { value: 0 } };
  const material = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `attribute float strength; varying float vStrength; varying vec2 vP; uniform float time;
      void main(){vStrength=strength;vP=position.xz;vec3 p=position;
      p.x+=sin(position.z*2.3-time*.65)*.055;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader: `varying float vStrength;varying vec2 vP;uniform float time;uniform float night;
      void main(){float broken=smoothstep(.1,.55,sin(vP.y*7.+sin(vP.y*13.)+time*.7));
      gl_FragColor=vec4(mix(vec3(.76,.92,.89),vec3(.25,.48,.58),night),broken*vStrength*.40);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = 'Black Tide waterline ripples';
  mesh.position.set(PIRATE.x, .055, PIRATE.z); mesh.rotation.y = PIRATE.rotation; mesh.scale.setScalar(PIRATE.scale);
  return { mesh, update(t, night) { uniforms.time.value = t; uniforms.night.value = night; } };
}
