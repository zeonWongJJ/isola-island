import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createPirateShip } from '../src/pirate-ship.js';
import { PIRATE, PORT } from '../src/layout.js';
import { coastShape } from '../src/terrain.js';
import { SEA_STACKS } from '../src/sea-islets.js';
import { createNightLighting } from '../src/night-lighting.js';

test('the full pirate ship stays afloat and clear of shore, reefs and the working harbour', () => {
  const { root } = createPirateShip();
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  assert.ok(bounds.min.y < -.5 && bounds.max.y > 10, 'The keel must extend below the sea and the rigging above it');
  const framing = new THREE.Box3(new THREE.Vector3(...PIRATE.bounds[0]), new THREE.Vector3(...PIRATE.bounds[1]));
  assert.ok(framing.containsBox(bounds), 'The destination camera must contain the entire bowsprit and masthead');
  const shore = Array.from({ length: 360 }, (_, i) => {
    const a = i * Math.PI / 180, r = coastShape(a, .4) * 1.10;
    return [Math.cos(a) * 11.2 * r, 1 + Math.sin(a) * 9.1 * r];
  });
  let shoreDistance = Infinity, reefDistance = Infinity, harbourDistance = Infinity;
  const p = new THREE.Vector3();
  for (const mesh of root.children) {
    if (!mesh.isMesh) continue;
    const positions = mesh.geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i += 3) {
      p.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
      assert.ok(p.toArray().every(Number.isFinite));
      if (p.y > 3.5) continue;
      for (const [x, z] of shore) shoreDistance = Math.min(shoreDistance, Math.hypot(p.x - x, p.z - z));
      for (const [x, z, radius] of SEA_STACKS) reefDistance = Math.min(reefDistance, Math.hypot(p.x - x, p.z - z) - radius * 1.2);
      harbourDistance = Math.min(harbourDistance, Math.hypot(p.x - PORT.ship.x, p.z - PORT.ship.z));
    }
  }
  assert.ok(shoreDistance >= 5 && shoreDistance <= 10, `Anchorage should be offshore but part of the same scene: ${shoreDistance}`);
  assert.ok(reefDistance > 1.25, `Keep the hull and low bowsprit clear of reefs: ${reefDistance}`);
  assert.ok(harbourDistance > 6, 'The harbour entrance and moored merchant ship remain clear');
});

test('pirate lanterns follow the rocking ship and retain restrained night illumination', () => {
  const scene = new THREE.Scene(), ship = createPirateShip();
  scene.add(ship.root);
  const lighting = createNightLighting(scene, [ship.root]);
  const camera = new THREE.PerspectiveCamera(); camera.position.set(-5, 9, 32);
  for (const t of [0, 3, 10]) {
    ship.update(t, 1); lighting.update(t, 1, camera);
    ship.root.updateMatrixWorld(true);
    assert.ok(Math.abs(ship.root.position.y - PIRATE.y) <= .043, 'The hull should gently rock, not leave the water');
    for (const source of lighting.sources) {
      const expected = source.local.clone().applyMatrix4(ship.root.matrixWorld);
      assert.ok(expected.distanceTo(source.world) < .0001, 'Baked glow anchors must move with the same ship transform');
    }
  }
  const lights = ship.root.children.filter(o => o.isPointLight);
  assert.ok(lights.every(l => l.visible && l.intensity > 0 && l.intensity <= 2.4 && l.distance < 4));
  ship.update(12, 0);
  assert.ok(lights.every(l => !l.visible && l.intensity === 0), 'Day mode must turn off the local night spill');
  assert.ok(lighting.sources.some(s => s.kind === 'window') && lighting.sources.some(s => s.kind === 'lantern'));
  assert.ok(ship.root.userData.staticBatch.mergedDrawCalls <= 20, 'Fine rigging must be batched for the extra reflection pass');
});
