// Obstacles, pickups and thrown projectiles. Each is a plain object with a
// Three.js group and a hitbox that the game keeps in sync.
import * as THREE from 'three';
import { TAU, mat, mesh, grp } from './kit.js';
import { OBSTACLE } from '../config.js';

const M = {
  cactus: mat(0x4f8a3c),
  cactusD: mat(0x3a6b2d),
  spine: mat(0xe8e0b8),
  flower: mat(0xff6f9b, { emissive: 0x3a0a1a }),
  wood: mat(0x8a6238),
  ptero: mat(0x7d6488),
  pteroD: mat(0x54405e),
  membrane: new THREE.MeshStandardMaterial({ color: 0xa98cb8, roughness: 0.8, side: THREE.DoubleSide, flatShading: true }),
  beak: mat(0xe0b060),
  black: mat(0x121212, { roughness: 0.4 }),
  led: new THREE.MeshBasicMaterial({ color: 0x44ff66 }),
  rock: mat(0x6e625a),
  rockD: mat(0x4b423d),
  thrown: mat(0xa0582f),
  thrownD: mat(0x6f3a1f),
  craterIn: new THREE.MeshBasicMaterial({ color: 0x1a0e0a }),
  glow: new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.8 }),
  smoke: new THREE.MeshStandardMaterial({ color: 0x5c5456, transparent: true, opacity: 0.5, flatShading: true, depthWrite: false }),
  bone: mat(0xf5ecd6, { emissive: 0x4a3a10, roughness: 0.5 }),
  snow: mat(0xf2f6ff, { roughness: 0.9 }),
  mug: mat(0xf4f1ea, { roughness: 0.4 }),
  coffee: mat(0x3b2416),
  eye: mat(0xffe07a, { emissive: 0x332200 }),
};

function signTexture(text) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = '#c9a26b'; x.fillRect(0, 0, 128, 64);
  x.strokeStyle = '#6b4a2a'; x.lineWidth = 6; x.strokeRect(3, 3, 122, 58);
  x.fillStyle = '#2a1a10';
  x.font = 'bold 40px monospace';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, 64, 34);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function saguaro(height, seed) {
  const g = new THREE.Group();
  const r = 0.26;
  g.add(mesh(new THREE.CylinderGeometry(r, r * 1.08, height - r, 8), M.cactus, 0, (height - r) / 2, 0));
  g.add(mesh(new THREE.SphereGeometry(r, 8, 6, 0, TAU, 0, Math.PI / 2), M.cactus, 0, height - r, 0));
  const arms = height > 2 ? 2 : 1;
  for (let i = 0; i < arms; i++) {
    const side = (i + seed) % 2 ? 1 : -1;
    const y = height * (0.35 + 0.15 * i + (seed % 3) * 0.04);
    const reach = 0.42;
    const up = height * 0.28;
    const arm = mesh(new THREE.CylinderGeometry(0.15, 0.15, reach, 6), M.cactusD, side * reach / 2 + side * r * 0.5, y, 0);
    arm.rotation.z = Math.PI / 2;
    const vert = mesh(new THREE.CylinderGeometry(0.15, 0.15, up, 6), M.cactusD, side * (reach + r * 0.4), y + up / 2, 0);
    const cap = mesh(new THREE.SphereGeometry(0.15, 6, 4, 0, TAU, 0, Math.PI / 2), M.cactusD, side * (reach + r * 0.4), y + up, 0);
    g.add(arm, vert, cap);
  }
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU + seed;
    const s = mesh(new THREE.ConeGeometry(0.025, 0.14, 3), M.spine, Math.cos(a) * r, 0.3 + ((i * 0.37) % 1) * (height - 0.6), Math.sin(a) * r);
    s.rotation.z = -Math.cos(a) * Math.PI / 2;
    s.rotation.x = Math.sin(a) * Math.PI / 2;
    g.add(s);
  }
  if (seed % 3 === 0) g.add(mesh(new THREE.DodecahedronGeometry(0.12, 0), M.flower, 0, height + 0.02, 0));
  return g;
}

export function makeCactus(spec, seed = 0) {
  const d = OBSTACLE[spec.type];
  const g = new THREE.Group();
  const vis = spec.type === 'cactusS' ? 1.75 : 2.65;
  for (let i = 0; i < spec.count; i++) {
    const c = saguaro(vis * (0.9 + ((seed + i * 7) % 5) * 0.03), seed + i);
    c.position.x = d.w / 2 + i * d.step;
    c.rotation.y = (seed + i) * 1.3;
    g.add(c);
  }
  if (spec.sign) {
    const post = mesh(new THREE.BoxGeometry(0.12, 1.5, 0.12), M.wood, d.w / 2 + 0.7, 0.75, 0.55);
    const board = mesh(new THREE.BoxGeometry(1.3, 0.65, 0.08), [M.wood, M.wood, M.wood, M.wood, new THREE.MeshStandardMaterial({ map: signTexture(spec.sign), roughness: 0.9 }), M.wood], d.w / 2 + 0.7, 1.55, 0.6);
    g.add(post, board);
  }
  return { group: g, debris: 0x4f8a3c, animate() {} };
}

export function makePtero(router = false) {
  const g = new THREE.Group();
  const body = grp(1.0, 0.5, 0);
  g.add(body);
  const torso = mesh(new THREE.IcosahedronGeometry(0.4, 1), M.ptero);
  torso.scale.set(1.6, 0.8, 0.8);
  body.add(torso);
  const head = grp(-0.7, 0.2, 0);
  body.add(head);
  head.add(mesh(new THREE.IcosahedronGeometry(0.24, 0), M.ptero));
  const beak = mesh(new THREE.ConeGeometry(0.1, 0.95, 4), M.beak, -0.55, -0.05, 0);
  beak.rotation.z = Math.PI / 2 + 0.1;
  const crest = mesh(new THREE.ConeGeometry(0.1, 0.8, 4), M.pteroD, 0.4, 0.1, 0);
  crest.rotation.z = -Math.PI / 2 - 0.25;
  head.add(beak, crest);
  [-1, 1].forEach((s) => head.add(mesh(new THREE.SphereGeometry(0.06, 6, 4), M.eye, -0.1, 0.07, s * 0.18)));
  const tail = mesh(new THREE.ConeGeometry(0.08, 0.6, 4), M.pteroD, 0.8, 0, 0);
  tail.rotation.z = Math.PI / 2;
  body.add(tail);
  const wings = [];
  [-1, 1].forEach((s) => {
    const pivot = grp(0, 0.05, s * 0.2);
    body.add(pivot);
    const shape = new THREE.Shape();
    shape.moveTo(-0.45, 0);
    shape.lineTo(-0.6, 1.9);
    shape.lineTo(-0.2, 1.75);
    shape.lineTo(0.2, 1.1);
    shape.lineTo(0.55, 0.45);
    shape.lineTo(0.45, 0);
    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(s * Math.PI / 2);
    const w = new THREE.Mesh(geo, M.membrane);
    w.castShadow = true;
    pivot.add(w);
    const bone = mesh(new THREE.CylinderGeometry(0.04, 0.03, 1.9, 4), M.pteroD, -0.5, 0, s * 0.95);
    bone.rotation.x = Math.PI / 2;
    pivot.add(bone);
    wings.push({ pivot, s });
  });
  let led = null;
  if (router) {
    const r = grp(0.1, -0.55, 0);
    body.add(r);
    r.add(mesh(new THREE.BoxGeometry(0.7, 0.18, 0.45), M.black));
    [-0.25, 0.25].forEach((x) => {
      const a = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.45, 4), M.black, x, 0.3, -0.12);
      a.rotation.z = x > 0 ? -0.3 : 0.3;
      r.add(a);
    });
    led = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.02), M.led.clone());
    led.position.set(0.15, 0.02, 0.235);
    r.add(led);
    r.add(mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 3), M.black, 0.1, 0.25, 0));
  }
  let t = Math.random() * 3;
  return {
    group: g,
    debris: 0x7d6488,
    animate(dt) {
      t += dt;
      const f = Math.sin(t * 10);
      wings.forEach((w) => { w.pivot.rotation.x = w.s * (0.25 + 0.75 * f); });
      body.position.y = 0.5 - f * 0.08;
      if (led) led.visible = Math.sin(t * 18) > -0.3;
    },
  };
}

export function makeCrater() {
  const g = new THREE.Group();
  const d = OBSTACLE.crater;
  const pit = new THREE.Mesh(new THREE.CircleGeometry(1, 16), M.craterIn);
  pit.rotation.x = -Math.PI / 2;
  pit.scale.set(d.w * 0.48, 0.9, 1);
  pit.position.set(d.w / 2, 0.02, 0);
  const glow = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.6, 16), M.glow);
  glow.rotation.x = -Math.PI / 2;
  glow.scale.set(d.w * 0.4, 0.7, 1);
  glow.position.set(d.w / 2, 0.03, 0);
  g.add(pit, glow);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const r = 0.18 + (i % 3) * 0.06;
    const rock = mesh(new THREE.DodecahedronGeometry(r, 0), i % 2 ? M.rock : M.rockD, d.w / 2 + Math.cos(a) * d.w * 0.5, r * 0.6, Math.sin(a) * 0.95);
    rock.rotation.set(i, i * 2, 0);
    g.add(rock);
  }
  const puffs = [];
  for (let i = 0; i < 5; i++) {
    const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 0), M.smoke);
    g.add(p);
    puffs.push({ p, o: i / 5 });
  }
  let t = 0;
  return {
    group: g,
    debris: 0x6e625a,
    animate(dt) {
      t += dt;
      puffs.forEach(({ p, o }) => {
        const f = (t * 0.5 + o) % 1;
        p.position.set(d.w / 2 + Math.sin(f * 5 + o * 9) * 0.3, 0.2 + f * 3, Math.cos(f * 4 + o) * 0.3);
        p.scale.setScalar(0.5 + f * 1.6);
      });
      glow.material.opacity = 0.55 + 0.3 * Math.sin(t * 6);
    },
  };
}

export function makeBone() {
  const g = new THREE.Group();
  const inner = grp(0.45, 0.45, 0);
  g.add(inner);
  const shaft = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.8, 6), M.bone);
  shaft.rotation.z = Math.PI / 2;
  inner.add(shaft);
  [-1, 1].forEach((sx) => [-1, 1].forEach((sy) => inner.add(mesh(new THREE.SphereGeometry(0.13, 8, 6), M.bone, sx * 0.42, sy * 0.1, 0))));
  inner.rotation.z = 0.5;
  let t = Math.random() * 6;
  return {
    group: g,
    debris: 0xf5ecd6,
    animate(dt) {
      t += dt;
      inner.rotation.y = t * 2.5;
      inner.position.y = 0.45 + Math.sin(t * 4) * 0.12;
    },
  };
}

export function makeProjectile(kind) {
  const g = new THREE.Group();
  const spin = grp(0.35, 0.35, 0);
  g.add(spin);
  let debris = 0x6e625a;
  if (kind === 'snowball') {
    spin.add(mesh(new THREE.IcosahedronGeometry(0.42, 1), M.snow));
    debris = 0xf2f6ff;
  } else if (kind === 'mug') {
    spin.add(mesh(new THREE.CylinderGeometry(0.27, 0.24, 0.56, 10), M.mug));
    const handle = mesh(new THREE.TorusGeometry(0.13, 0.04, 5, 8), M.mug, 0.27, 0, 0);
    spin.add(handle);
    const top = mesh(new THREE.CircleGeometry(0.21, 10), M.coffee, 0, 0.251, 0);
    top.rotation.x = -Math.PI / 2;
    spin.add(top);
    debris = 0xf4f1ea;
  } else {
    // Warm sandstone so a thrown rock never blends in with the grey scenery rocks.
    const r = mesh(new THREE.DodecahedronGeometry(0.42, 0), M.thrown);
    r.scale.set(1.1, 0.9, 1);
    spin.add(r);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU;
      spin.add(mesh(new THREE.TetrahedronGeometry(0.1, 0), M.thrownD, Math.cos(a) * 0.36, Math.sin(a) * 0.3, 0.2));
    }
    debris = 0xa0582f;
  }
  return {
    group: g,
    debris,
    animate(dt) { spin.rotation.z += dt * 9; },
  };
}
