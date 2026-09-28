// The three playable species. Each builder returns a rig in its own native
// units plus a pose() function; the Dino wrapper handles blending between
// poses, knockouts, sleep, the gold skin and accessories.
import * as THREE from 'three';
import { TAU, mat, mesh, grp, limb, makeEye, MaterialSet, lerp, smooth } from './kit.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------------------------------------------------------------- T-REX
function buildRex() {
  const M = new MaterialSet();
  const skin = M.add('skin', mat(0x5b7c40));
  const ridge = M.add('ridge', mat(0x3e5a2c));
  const belly = M.add('belly', mat(0xa4ad6c));
  const ivory = M.add('ivory', mat(0xf3e9cc, { roughness: 0.6 }));
  const eyeM = M.add('eye', mat(0xffc93c, { emissive: 0x442200 }));
  const black = M.add('pupil', mat(0x151010));
  const gum = M.add('gum', mat(0x8a2e2e));

  const root = grp();
  const hips = grp(0, 4.3, 0);
  root.add(hips);

  const torso = mesh(new THREE.IcosahedronGeometry(1, 1), skin, 0.6, 0.3, 0);
  torso.scale.set(2.6, 1.35, 1.12);
  torso.rotation.z = 0.18;
  const bellyM = mesh(new THREE.IcosahedronGeometry(1, 1), belly, 1.0, -0.35, 0);
  bellyM.scale.set(1.9, 0.9, 0.98);
  bellyM.rotation.z = 0.25;
  const haunch = mesh(new THREE.IcosahedronGeometry(1, 1), skin, -0.4, 0.1, 0);
  haunch.scale.set(1.5, 1.2, 1.25);
  hips.add(torso, bellyM, haunch);
  for (let i = 0; i < 7; i++) {
    const sp = mesh(new THREE.ConeGeometry(0.2, 0.55, 4), ridge, -1.3 + i * 0.55, 1.45 + Math.sin((i / 6) * Math.PI) * 0.25, 0);
    sp.rotation.z = -0.25;
    hips.add(sp);
  }

  const neck = grp(2.3, 0.9, 0);
  hips.add(neck);
  const neckM = mesh(new THREE.CylinderGeometry(0.58, 0.72, 1.7, 8), skin, 0.55, 0.45, 0);
  neckM.rotation.z = -0.67;
  neck.add(neckM);
  const head = grp(1.05, 1.05, 0);
  neck.add(head);
  head.add(mesh(new THREE.BoxGeometry(2.5, 1.05, 1.25), skin, 1.0, 0.2, 0));
  const snoutTop = mesh(new THREE.BoxGeometry(1.2, 0.3, 1.05), skin, 1.55, 0.8, 0);
  snoutTop.rotation.z = -0.12;
  const brow = mesh(new THREE.BoxGeometry(0.7, 0.22, 1.35), ridge, 0.45, 0.78, 0);
  brow.rotation.z = -0.25;
  head.add(snoutTop, brow, mesh(new THREE.BoxGeometry(2.2, 0.08, 1.05), gum, 1.05, -0.33, 0));
  const eyes = [];
  [-1, 1].forEach((s) => {
    const e = makeEye(0.17, eyeM, black, s);
    e.group.position.set(0.5, 0.5, s * 0.6);
    head.add(e.group);
    eyes.push(e);
    head.add(mesh(new THREE.SphereGeometry(0.07, 6, 5), black, 2.2, 0.55, s * 0.35));
  });
  for (let i = 0; i < 7; i++) {
    [-1, 1].forEach((s) => {
      const tooth = mesh(new THREE.ConeGeometry(0.075, 0.3, 4), ivory, 0.25 + i * 0.32, -0.46, s * 0.47);
      tooth.rotation.z = Math.PI;
      head.add(tooth);
    });
  }
  const jaw = grp(-0.1, -0.3, 0);
  head.add(jaw);
  jaw.add(mesh(new THREE.BoxGeometry(2.2, 0.36, 1.05), skin, 1.05, -0.2, 0));
  jaw.add(mesh(new THREE.BoxGeometry(1.9, 0.08, 0.8), gum, 1.0, 0.0, 0));
  jaw.add(mesh(new THREE.BoxGeometry(1.8, 0.2, 0.95), belly, 0.95, -0.42, 0));
  for (let i = 0; i < 6; i++) {
    [-1, 1].forEach((s) => jaw.add(mesh(new THREE.ConeGeometry(0.065, 0.26, 4), ivory, 0.45 + i * 0.3, 0.1, s * 0.43)));
  }
  const mouth = grp(2.5, -0.3, 0);
  head.add(mouth);
  const headTop = grp(0.4, 0.95, 0);
  head.add(headTop);

  const arms = [];
  [-1, 1].forEach((s) => {
    const sh = grp(2.25, -0.25, s * 0.78);
    hips.add(sh);
    sh.add(mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.55, 6), skin, 0, -0.27, 0));
    const el = grp(0, -0.55, 0);
    sh.add(el);
    const fore = mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.45, 6), skin, 0.12, -0.18, 0);
    fore.rotation.z = 0.6;
    el.add(fore);
    [-0.06, 0.06].forEach((z) => {
      const cl = mesh(new THREE.ConeGeometry(0.04, 0.18, 4), ivory, 0.33, -0.36, z);
      cl.rotation.z = Math.PI * 0.85;
      el.add(cl);
    });
    arms.push({ sh, el, s });
  });

  const tail = [];
  let parent = grp(-1.9, 0.35, 0);
  hips.add(parent);
  [[0.9, 2.0], [0.62, 1.9], [0.4, 1.8], [0.22, 1.7]].forEach(([r, len]) => {
    const seg = grp();
    parent.add(seg);
    const cone = mesh(new THREE.ConeGeometry(r, len, 7), skin, -len / 2, 0, 0);
    cone.rotation.z = Math.PI / 2;
    const sp = mesh(new THREE.ConeGeometry(0.14, 0.4, 4), ridge, -len * 0.4, r * 0.75, 0);
    sp.rotation.z = 0.5;
    seg.add(cone, sp);
    tail.push(seg);
    const next = grp(-len * 0.92, 0, 0);
    seg.add(next);
    parent = next;
  });

  const legs = [];
  [-1, 1].forEach((s) => {
    const hip = grp(-0.3, -0.3, s * 0.85);
    hips.add(hip);
    const thigh = mesh(new THREE.IcosahedronGeometry(1, 1), skin, 0.1, -0.85, 0);
    thigh.scale.set(0.8, 1.3, 0.55);
    hip.add(thigh);
    const knee = grp(0, -1.9, 0);
    hip.add(knee);
    knee.add(mesh(new THREE.CylinderGeometry(0.3, 0.22, 2.0, 7), skin, 0, -1.0, 0));
    const ankle = grp(0, -1.95, 0);
    knee.add(ankle);
    ankle.add(mesh(new THREE.BoxGeometry(1.2, 0.28, 0.62), ridge, 0.35, -0.08, 0));
    [-0.2, 0, 0.2].forEach((z) => {
      const cl = mesh(new THREE.ConeGeometry(0.07, 0.3, 4), ivory, 1.02, -0.1, z);
      cl.rotation.z = -Math.PI / 2;
      ankle.add(cl);
    });
    legs.push({ hip, knee, ankle });
  });

  function pose(p) {
    const { phase: ph, run, air, duck, roar, flail, sleep, dead, t } = p;
    const breathe = Math.sin(t * 2.2) * 0.05;
    hips.position.y = 4.25 + 0.2 * Math.cos(2 * ph) * run - duck * 1.35 - sleep * 1.9 + breathe * (1 - run);
    hips.rotation.z = -0.06 + 0.04 * Math.sin(2 * ph) * run - duck * 0.1 + air * 0.08 + sleep * 0.05;
    legs.forEach((lg, i) => {
      const q = ph + i * Math.PI;
      let a = 0.6 * Math.sin(q) * run;
      let k = -0.15 - 0.95 * Math.max(0, Math.cos(q)) * run - duck * 0.95;
      a = lerp(a, i ? 0.75 : 0.35, air);
      k = lerp(k, i ? -1.5 : -0.9, air);
      a = lerp(a, 1.35, sleep);
      k = lerp(k, -2.5, sleep);
      if (dead) { a = 0.3 * (i ? 1 : -1); k = -0.1; }
      lg.hip.rotation.z = a;
      lg.knee.rotation.z = k;
      lg.ankle.rotation.z = -(a + k) + 0.2 * Math.max(0, Math.cos(q)) * run;
    });
    tail.forEach((s, i) => {
      s.rotation.y = 0.14 * Math.sin(ph - i * 0.7) * run + (1 - run) * 0.05 * Math.sin(t * 1.3 - i);
      s.rotation.z = 0.05 + 0.06 * Math.sin(2 * ph - i * 0.8) * run + air * 0.08 - duck * 0.05 - sleep * 0.1;
    });
    const fl = 1 + flail * 2.5;
    arms.forEach((a) => {
      a.sh.rotation.z = -0.5 + 0.55 * Math.sin(ph * 3 + a.s + t * 6 * flail) * Math.min(1, run + flail) + flail * 0.8 + air * 0.6;
      a.sh.rotation.x = a.s * (0.2 + 0.25 * fl * Math.sin(ph * 4 + a.s + t * 20 * flail));
      a.el.rotation.z = 0.4 + 0.5 * Math.sin(ph * 5 + a.s * 2 + t * 25 * flail);
    });
    neck.rotation.z = -duck * 0.55 - sleep * 0.75 + roar * 0.25 + 0.03 * Math.sin(2 * ph) * run;
    head.rotation.z = -0.08 + duck * 0.25 + roar * 0.3 + sleep * 0.2;
    head.rotation.y = 0.06 * Math.sin(ph) * run;
    const chomp = (0.12 + 0.18 * Math.max(0, Math.sin(ph * 2))) * run;
    jaw.rotation.z = -(chomp * (1 - roar) + 0.95 * roar) - (dead ? 0.65 : 0) - sleep * 0.05;
  }

  return { root, M, eyes, mouth, headTop, pose, scale: 0.5, offsetX: -0.8, strideLen: 7.5 };
}

// --------------------------------------------------------- VELOCIRAPTOR
function buildRaptor() {
  const M = new MaterialSet();
  const skin = M.add('skin', mat(0xc27a3e));
  const stripe = M.add('stripe', mat(0x5a311b));
  const belly = M.add('belly', mat(0xe6cda2));
  const feather = M.add('feather', mat(0x2f6d7a));
  const featherL = M.add('featherL', mat(0x86bdb3));
  const claw = M.add('claw', mat(0x2a2320, { roughness: 0.5 }));
  const ivory = M.add('ivory', mat(0xf4ecd2));
  const eyeM = M.add('eye', mat(0xf2e14a, { emissive: 0x332800 }));
  const black = M.add('pupil', mat(0x120c0a));
  const gum = M.add('gum', mat(0x7e2a2e));

  const root = grp();
  const hips = grp(0, 3.25, 0);
  root.add(hips);
  const body = mesh(new THREE.IcosahedronGeometry(1, 1), skin, 0.35, 0.2, 0);
  body.scale.set(1.9, 0.8, 0.72);
  body.rotation.z = 0.1;
  const bellyM = mesh(new THREE.IcosahedronGeometry(1, 1), belly, 0.7, -0.2, 0);
  bellyM.scale.set(1.3, 0.55, 0.62);
  hips.add(body, bellyM);
  for (let i = 0; i < 4; i++) {
    const st = mesh(new THREE.BoxGeometry(0.18, 0.1, 1.46), stripe, -0.6 + i * 0.5, 0.62 - Math.abs(i - 1.5) * 0.05, 0);
    st.rotation.z = 0.3;
    hips.add(st);
  }
  for (let i = 0; i < 8; i++) {
    const f = mesh(new THREE.BoxGeometry(0.42, 0.06, 0.2), i % 2 ? feather : featherL, -1.2 + i * 0.36, 0.95 - Math.abs(i - 3.5) * 0.04, 0);
    f.rotation.z = 0.5;
    hips.add(f);
  }

  const neck = grp(1.8, 0.45, 0);
  hips.add(neck);
  neck.add(limb(V3(0, 0, 0), V3(0.55, 1.1, 0), 0.34, skin, 0.26));
  const head = grp(0.6, 1.25, 0);
  neck.add(head);
  head.add(mesh(new THREE.BoxGeometry(1.1, 0.5, 0.52), skin, 0.4, 0.05, 0));
  const snout = mesh(new THREE.BoxGeometry(0.9, 0.32, 0.38), skin, 1.25, -0.02, 0);
  snout.rotation.z = -0.06;
  head.add(snout, mesh(new THREE.BoxGeometry(1.5, 0.05, 0.4), gum, 0.95, -0.2, 0));
  for (let i = 0; i < 3; i++) {
    const c = mesh(new THREE.BoxGeometry(0.3, 0.06, 0.12), i % 2 ? featherL : feather, -0.15 - i * 0.18, 0.3 + i * 0.05, 0);
    c.rotation.z = 0.5 + i * 0.1;
    head.add(c);
  }
  const eyes = [];
  [-1, 1].forEach((s) => {
    const e = makeEye(0.1, eyeM, black, s);
    e.group.position.set(0.45, 0.15, s * 0.26);
    head.add(e.group);
    eyes.push(e);
  });
  for (let i = 0; i < 6; i++) [-1, 1].forEach((s) => {
    const tooth = mesh(new THREE.ConeGeometry(0.04, 0.14, 4), ivory, 0.5 + i * 0.2, -0.26, s * 0.16);
    tooth.rotation.z = Math.PI;
    head.add(tooth);
  });
  const jaw = grp(0.05, -0.18, 0);
  head.add(jaw);
  jaw.add(mesh(new THREE.BoxGeometry(1.55, 0.18, 0.4), skin, 0.8, -0.1, 0));
  jaw.add(mesh(new THREE.BoxGeometry(1.3, 0.1, 0.36), belly, 0.75, -0.2, 0));
  const mouth = grp(1.7, -0.2, 0);
  head.add(mouth);
  const headTop = grp(0.3, 0.32, 0);
  head.add(headTop);

  const arms = [];
  [-1, 1].forEach((s) => {
    const sh = grp(1.55, -0.05, s * 0.5);
    hips.add(sh);
    sh.add(mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.8, 6), skin, 0, -0.4, 0));
    const el = grp(0, -0.8, 0);
    sh.add(el);
    el.add(mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.7, 6), skin, 0, -0.35, 0));
    const vane = mesh(new THREE.BoxGeometry(0.34, 0.95, 0.04), feather, -0.2, -0.4, s * 0.05);
    vane.rotation.z = -0.15;
    el.add(vane);
    [-0.06, 0, 0.06].forEach((z) => {
      const c = mesh(new THREE.ConeGeometry(0.035, 0.2, 4), claw, 0.06, -0.78, z);
      c.rotation.z = Math.PI * 0.9;
      el.add(c);
    });
    arms.push({ sh, el, s });
  });

  const tail = [];
  let parent = grp(-1.6, 0.3, 0);
  hips.add(parent);
  [[0.45, 1.3], [0.33, 1.3], [0.22, 1.3], [0.13, 1.2]].forEach(([r, len], i) => {
    const seg = grp();
    parent.add(seg);
    const cone = mesh(new THREE.ConeGeometry(r, len, 6), i % 2 ? skin : skin, -len / 2, 0, 0);
    cone.rotation.z = Math.PI / 2;
    seg.add(cone);
    if (i < 3) {
      const st = mesh(new THREE.BoxGeometry(0.1, r * 2.02, r * 2.02), stripe, -len * 0.5, 0, 0);
      seg.add(st);
    }
    tail.push(seg);
    const next = grp(-len * 0.95, 0, 0);
    seg.add(next);
    parent = next;
  });
  for (let i = 0; i < 5; i++) {
    const f = mesh(new THREE.BoxGeometry(0.7, 0.05, 0.16), i % 2 ? featherL : feather, -0.35, 0, 0);
    f.rotation.y = (i - 2) * 0.3;
    parent.add(f);
  }

  const legs = [];
  [-1, 1].forEach((s) => {
    const hip = grp(-0.15, -0.25, s * 0.48);
    hips.add(hip);
    const thigh = mesh(new THREE.IcosahedronGeometry(1, 1), skin, 0.05, -0.6, 0);
    thigh.scale.set(0.5, 0.85, 0.36);
    hip.add(thigh);
    const knee = grp(0.1, -1.35, 0);
    hip.add(knee);
    knee.add(mesh(new THREE.CylinderGeometry(0.16, 0.11, 1.3, 6), skin, 0, -0.65, 0));
    const ankle = grp(0, -1.3, 0);
    knee.add(ankle);
    ankle.add(mesh(new THREE.BoxGeometry(0.7, 0.16, 0.3), stripe, 0.22, -0.08, 0));
    const sickle = mesh(new THREE.ConeGeometry(0.06, 0.38, 4), claw, 0.18, 0.12, 0);
    sickle.rotation.z = -0.6;
    ankle.add(sickle);
    [-0.08, 0.08].forEach((z) => {
      const c = mesh(new THREE.ConeGeometry(0.045, 0.2, 4), claw, 0.62, -0.1, z);
      c.rotation.z = -Math.PI / 2;
      ankle.add(c);
    });
    legs.push({ hip, knee, ankle });
  });

  function pose(p) {
    const { phase: ph, run, air, duck, roar, flail, sleep, dead, t } = p;
    const breathe = Math.sin(t * 2.8) * 0.04;
    hips.position.y = 3.2 + 0.18 * Math.cos(2 * ph) * run - duck * 1.05 - sleep * 1.95 + breathe * (1 - run);
    hips.rotation.z = -0.1 + 0.05 * Math.sin(2 * ph) * run - duck * 0.06 + air * 0.12;
    legs.forEach((lg, i) => {
      const q = ph + i * Math.PI;
      let a = 0.75 * Math.sin(q) * run;
      let k = -0.2 - 1.1 * Math.max(0, Math.cos(q)) * run - duck * 1.0;
      a = lerp(a, i ? 0.9 : 0.4, air);
      k = lerp(k, i ? -1.8 : -1.1, air);
      a = lerp(a, 1.4, sleep);
      k = lerp(k, -2.6, sleep);
      if (dead) { a = 0.4 * (i ? 1 : -1); k = -0.2; }
      lg.hip.rotation.z = a;
      lg.knee.rotation.z = k;
      lg.ankle.rotation.z = -(a + k) * 0.9;
    });
    tail.forEach((s, i) => {
      s.rotation.y = 0.06 * Math.sin(ph - i * 0.5) * run + (1 - run) * 0.05 * Math.sin(t * 1.6 - i);
      s.rotation.z = 0.08 + 0.03 * Math.sin(2 * ph - i) * run + air * 0.05 - sleep * 0.1;
    });
    arms.forEach((a) => {
      const wave = Math.sin(ph * 2 + a.s + t * 22 * flail);
      a.sh.rotation.z = 0.5 + 0.35 * wave * Math.min(1, run + flail) + air * 0.9 + flail * 0.6 - sleep * 0.3;
      a.sh.rotation.x = a.s * (0.15 + 0.5 * flail * Math.abs(wave) + air * 0.4);
      a.el.rotation.z = 1.4 - air * 0.8 + 0.3 * wave * flail;
    });
    neck.rotation.z = -duck * 0.95 - sleep * 1.1 + roar * 0.15 + 0.04 * Math.sin(2 * ph) * run;
    head.rotation.z = -0.25 + duck * 0.7 + roar * 0.35 + sleep * 0.5;
    head.rotation.y = 0.1 * Math.sin(ph) * run * 0.5 + 0.2 * Math.sin(t * 0.7) * (1 - run) * (1 - sleep);
    const chomp = (0.05 + 0.12 * Math.max(0, Math.sin(ph * 2))) * run;
    jaw.rotation.z = -(chomp * (1 - roar) + 0.8 * roar) - (dead ? 0.55 : 0);
  }

  return { root, M, eyes, mouth, headTop, pose, scale: 0.5, offsetX: -0.4, strideLen: 6.5 };
}

// ---------------------------------------------------------- TRICERATOPS
function buildTrike() {
  const M = new MaterialSet();
  const skin = M.add('skin', mat(0x6c8458));
  const dark = M.add('dark', mat(0x4a5c3c));
  const belly = M.add('belly', mat(0xb8b48a));
  const frillM = M.add('frill', mat(0xc0553a, { side: THREE.DoubleSide }));
  const frillIn = M.add('frillIn', mat(0x86a266, { side: THREE.DoubleSide }));
  const horn = M.add('horn', mat(0xefe3c2, { roughness: 0.55 }));
  const beak = M.add('beak', mat(0x3b3830, { roughness: 0.6 }));
  const eyeM = M.add('eye', mat(0xffa436, { emissive: 0x331500 }));
  const black = M.add('pupil', mat(0x100c0a));

  const root = grp();
  const hips = grp(0, 3.0, 0);
  root.add(hips);
  const body = mesh(new THREE.IcosahedronGeometry(1, 1), skin, 0, 0.2, 0);
  body.scale.set(2.7, 1.45, 1.4);
  const bellyM = mesh(new THREE.IcosahedronGeometry(1, 1), belly, 0.2, -0.45, 0);
  bellyM.scale.set(2.2, 0.95, 1.2);
  hips.add(body, bellyM);
  for (let i = 0; i < 6; i++) {
    const bump = mesh(new THREE.DodecahedronGeometry(0.28, 0), dark, -1.7 + i * 0.7, 1.55 - Math.abs(i - 2.5) * 0.08, 0);
    hips.add(bump);
  }

  const neck = grp(2.3, 0.15, 0);
  hips.add(neck);
  neck.add(limb(V3(-0.4, 0, 0), V3(0.6, 0.1, 0), 0.9, skin, 0.75));
  const head = grp(0.75, 0.15, 0);
  neck.add(head);
  const skull = mesh(new THREE.BoxGeometry(1.5, 1.0, 1.1), skin, 0.55, 0.05, 0);
  skull.rotation.z = -0.25;
  head.add(skull);
  const snout = mesh(new THREE.BoxGeometry(0.9, 0.7, 0.8), skin, 1.35, -0.25, 0);
  snout.rotation.z = -0.35;
  head.add(snout);
  const beakTop = mesh(new THREE.ConeGeometry(0.34, 0.7, 4), beak, 1.95, -0.45, 0);
  beakTop.rotation.z = -Math.PI / 2 - 0.5;
  head.add(beakTop);
  const nose = mesh(new THREE.ConeGeometry(0.16, 0.6, 5), horn, 1.45, 0.3, 0);
  nose.rotation.z = -0.35;
  head.add(nose);
  [-1, 1].forEach((s) => {
    const h = mesh(new THREE.ConeGeometry(0.17, 1.7, 6), horn, 0.95, 1.0, s * 0.35);
    h.rotation.z = -0.95;
    head.add(h);
  });
  // Frill: two half discs facing forward, with a scalloped rim.
  const frill = grp(-0.1, 0.35, 0);
  head.add(frill);
  // CircleGeometry lies in xy; turning it a quarter about y maps angle a to (0, sin a, -cos a).
  const outer = new THREE.Mesh(new THREE.CircleGeometry(1.75, 16, -0.25, Math.PI + 0.5), frillM);
  outer.rotation.y = Math.PI / 2;
  outer.castShadow = true;
  const inner = new THREE.Mesh(new THREE.CircleGeometry(1.2, 14, 0, Math.PI), frillIn);
  inner.rotation.y = Math.PI / 2;
  inner.position.x = 0.03;
  frill.add(outer, inner);
  for (let i = 0; i <= 8; i++) {
    const a = -0.25 + ((Math.PI + 0.5) * i) / 8;
    const dir = V3(0, Math.sin(a), -Math.cos(a));
    const b = mesh(new THREE.ConeGeometry(0.13, 0.35, 4), horn);
    b.position.copy(dir).multiplyScalar(1.8);
    b.quaternion.setFromUnitVectors(V3(0, 1, 0), dir);
    frill.add(b);
  }
  frill.rotation.z = 0.5;
  const eyes = [];
  [-1, 1].forEach((s) => {
    const e = makeEye(0.14, eyeM, black, s);
    e.group.position.set(0.85, 0.3, s * 0.52);
    head.add(e.group);
    eyes.push(e);
  });
  const jaw = grp(0.9, -0.45, 0);
  head.add(jaw);
  const jawM = mesh(new THREE.BoxGeometry(1.0, 0.25, 0.7), skin, 0.4, -0.05, 0);
  jawM.rotation.z = -0.3;
  const beakLow = mesh(new THREE.ConeGeometry(0.22, 0.5, 4), beak, 0.95, -0.28, 0);
  beakLow.rotation.z = -Math.PI / 2 - 0.2;
  jaw.add(jawM, beakLow);
  const mouth = grp(2.2, -0.55, 0);
  head.add(mouth);
  const headTop = grp(0.3, 0.9, 0);
  head.add(headTop);

  const tail = [];
  let parent = grp(-2.4, 0.2, 0);
  hips.add(parent);
  [[0.75, 1.5], [0.45, 1.4], [0.22, 1.2]].forEach(([r, len]) => {
    const seg = grp();
    parent.add(seg);
    const cone = mesh(new THREE.ConeGeometry(r, len, 7), skin, -len / 2, 0, 0);
    cone.rotation.z = Math.PI / 2;
    seg.add(cone);
    tail.push(seg);
    const next = grp(-len * 0.9, 0, 0);
    seg.add(next);
    parent = next;
  });

  const legs = [];
  [[1.45, -0.55, 0.85, 1], [1.45, -0.55, -0.85, 1], [-1.35, -0.45, 0.95, 0], [-1.35, -0.45, -0.95, 0]].forEach(([x, y, z, front], i) => {
    const hip = grp(x, y, z);
    hips.add(hip);
    const up = mesh(new THREE.CylinderGeometry(front ? 0.36 : 0.46, 0.32, 1.25, 7), skin, 0, -0.6, 0);
    hip.add(up);
    const knee = grp(0, -1.2, 0);
    hip.add(knee);
    knee.add(mesh(new THREE.CylinderGeometry(0.3, 0.27, 1.05, 7), skin, 0, -0.5, 0));
    const foot = grp(0, -1.05, 0);
    knee.add(foot);
    foot.add(mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.22, 7), dark, 0.08, -0.08, 0));
    // Diagonal pairs move together: front-left with back-right.
    legs.push({ hip, knee, foot, front, off: (i === 0 || i === 3) ? 0 : Math.PI });
  });

  function pose(p) {
    const { phase: ph, run, air, duck, roar, flail, sleep, dead, t } = p;
    const breathe = Math.sin(t * 1.8) * 0.05;
    hips.position.y = 2.9 + 0.14 * Math.cos(2 * ph) * run - duck * 0.55 - sleep * 1.35 + breathe * (1 - run) - roar * 0.25;
    hips.rotation.z = 0.05 * Math.sin(ph) * run - duck * 0.08 + air * 0.05 - roar * 0.08;
    legs.forEach((lg) => {
      const q = ph + lg.off;
      let a = 0.5 * Math.sin(q) * run;
      let k = (lg.front ? 1 : -1) * (0.1 + 0.7 * Math.max(0, Math.cos(q)) * run) * -1;
      const sp = lg.front ? 0.9 : -0.9;
      a = lerp(a, sp, air);
      k = lerp(k, lg.front ? -0.3 : 0.3, air);
      a = lerp(a, lg.front ? 1.3 : -1.3, sleep);
      k = lerp(k, lg.front ? -2.2 : 2.2, sleep);
      a -= duck * (lg.front ? -0.25 : 0.1);
      if (dead) { a = lg.front ? 0.6 : -0.6; k = 0; }
      lg.hip.rotation.z = a;
      lg.knee.rotation.z = k;
      lg.foot.rotation.z = -(a + k);
    });
    tail.forEach((s, i) => {
      s.rotation.y = 0.12 * Math.sin(ph - i * 0.6) * run + flail * 0.5 * Math.sin(t * 18 - i) + (1 - run) * 0.05 * Math.sin(t - i);
      s.rotation.z = -0.1 + air * 0.15 - sleep * 0.1;
    });
    neck.rotation.z = -duck * 0.35 - sleep * 0.45 - roar * 0.35 + 0.03 * Math.sin(2 * ph) * run;
    head.rotation.z = -0.05 - duck * 0.15 - roar * 0.25 + sleep * 0.1;
    head.rotation.y = flail * 0.35 * Math.sin(t * 16) + 0.04 * Math.sin(ph) * run;
    jaw.rotation.z = -(0.05 * Math.max(0, Math.sin(ph * 2)) * run + 0.6 * roar) - (dead ? 0.5 : 0);
  }

  return { root, M, eyes, mouth, headTop, pose, scale: 0.5, offsetX: -0.5, strideLen: 7 };
}

const BUILDERS = { rex: buildRex, raptor: buildRaptor, trike: buildTrike };

// Speech-line dashes used for the roar. Shared by all species.
function makeRoarDashes() {
  const g = new THREE.Group();
  const m = new THREE.MeshBasicMaterial({ color: 0xfff4de, transparent: true, opacity: 0, depthWrite: false });
  const dashes = [];
  for (let i = 0; i < 9; i++) {
    const ang = -0.9 + (i / 8) * 1.8;
    const zAng = ((i % 3) - 1) * 0.35;
    const dir = new THREE.Vector3(Math.cos(ang) * Math.cos(zAng), Math.sin(ang), Math.sin(zAng) * Math.cos(ang)).normalize();
    const d = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.16, 0.16), m);
    d.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
    g.add(d);
    dashes.push({ d, dir, phase: (i % 2) * 0.5 });
  }
  return {
    group: g,
    update(roar, t) {
      m.opacity = Math.min(1, roar * 1.6);
      g.visible = roar > 0.01;
      for (const o of dashes) {
        const f = (t * 2.4 + o.phase) % 1;
        o.d.position.copy(o.dir).multiplyScalar(1 + f * 4);
        o.d.scale.x = 0.6 + 0.8 * (1 - f);
      }
    },
  };
}

function makePartyHat() {
  const g = new THREE.Group();
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const x = c.getContext('2d');
  const cols = ['#ff5a7a', '#ffd23f', '#3fc1ff', '#7bdc6b'];
  for (let i = 0; i < 8; i++) { x.fillStyle = cols[i % 4]; x.fillRect(0, i * 8, 64, 8); }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const cone = mesh(new THREE.ConeGeometry(0.45, 1.2, 12), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }), 0, 0.6, 0);
  const pom = mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }), 0, 1.25, 0);
  g.add(cone, pom);
  g.rotation.z = -0.25;
  g.visible = false;
  return g;
}

function makeZzz() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  x.font = 'bold 52px monospace';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.lineWidth = 6;
  x.strokeStyle = '#1b1530';
  x.strokeText('Z', 32, 34);
  x.fillStyle = '#fff6e0';
  x.fillText('Z', 32, 34);
  const tex = new THREE.CanvasTexture(c);
  const sprites = [];
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    g.add(s);
    sprites.push(s);
  }
  return {
    group: g,
    update(w, t) {
      g.visible = w > 0.5;
      sprites.forEach((s, i) => {
        const f = (t * 0.45 + i / 3) % 1;
        s.position.set(0.4 + f * 1.2, 0.5 + f * 2.2, 0);
        const sc = 0.35 + f * 0.6;
        s.scale.set(sc, sc, 1);
        s.material.opacity = Math.sin(f * Math.PI) * w;
      });
    },
  };
}

export class Dino {
  constructor(speciesId) {
    this.species = speciesId;
    this.rig = BUILDERS[speciesId]();
    this.group = new THREE.Group(); // positioned by the game at (REX_X, y)
    this.topple = new THREE.Group(); // knockout rotation
    this.model = new THREE.Group();
    this.model.scale.setScalar(this.rig.scale);
    this.model.position.x = this.rig.offsetX;
    this.model.add(this.rig.root);
    this.topple.add(this.model);
    this.group.add(this.topple);

    this.dashes = makeRoarDashes();
    this.rig.mouth.add(this.dashes.group);
    this.hat = makePartyHat();
    this.rig.headTop.add(this.hat);
    this.zzz = makeZzz();
    this.rig.headTop.add(this.zzz.group);

    this.phase = 0;
    this.w = { run: 0, air: 0, duck: 0, sleep: 0 };
    this.deadT = -1;
    this.blinkIn = 2 + Math.random() * 3;
    this.t = 0;
  }

  setGolden(on) { this.rig.M.gold(on); }
  setHat(on) { this.hat.visible = on; }

  knockOut() { this.deadT = 0; }
  revive() { this.deadT = -1; this.topple.rotation.set(0, 0, 0); this.topple.position.set(0, 0, 0); }

  /** s: { mode, speed, roar, flail } */
  update(dt, s) {
    this.t += dt;
    const target = {
      run: s.mode === 'run' || s.mode === 'duck' ? 1 : 0,
      air: s.mode === 'air' ? 1 : 0,
      duck: s.mode === 'duck' ? 1 : 0,
      sleep: s.mode === 'sleep' ? 1 : 0,
    };
    const rate = { run: 8, air: 14, duck: 18, sleep: 2.5 };
    for (const k in this.w) this.w[k] += (target[k] - this.w[k]) * Math.min(1, dt * rate[k]);
    if (s.mode !== 'dead') this.phase += (dt * (s.speed || 0) * TAU) / this.rig.strideLen;

    const dead = s.mode === 'dead';
    if (dead && this.deadT >= 0) {
      this.deadT += dt;
      const k = smooth(this.deadT / 0.45);
      const bounce = this.deadT > 0.45 ? Math.exp(-(this.deadT - 0.45) * 7) * Math.sin((this.deadT - 0.45) * 22) * 0.08 : 0;
      this.topple.rotation.x = -1.3 * k + bounce;
      this.topple.position.y = 0.25 * k;
    }

    this.blinkIn -= dt;
    let eye = 'open';
    if (this.blinkIn < 0) { eye = 'blink'; if (this.blinkIn < -0.12) this.blinkIn = 2 + Math.random() * 4; }
    if (this.w.sleep > 0.5) eye = 'closed';
    if (s.roar > 0.3) eye = 'open';
    if (dead) eye = 'x';
    this.rig.eyes.forEach((e) => e.set(eye));

    this.rig.pose({
      phase: this.phase,
      run: this.w.run * (dead ? 0 : 1),
      air: this.w.air,
      duck: this.w.duck,
      sleep: this.w.sleep,
      roar: s.roar || 0,
      flail: s.flail || 0,
      dead,
      t: this.t,
    });
    this.dashes.update(s.roar || 0, this.t);
    this.zzz.update(this.w.sleep, this.t);
  }

  dispose() {
    this.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
  }
}
