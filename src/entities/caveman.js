// The caveman rival, with three skins. Faces +x and runs away from the rex.
import * as THREE from 'three';
import { TAU, mat, mesh, grp, makeEye, lerp } from './kit.js';

const SKINS = {
  classic: { tunic: 0xc98a3a, spots: 0x4e2a12, hair: 0x2b1b12, skirt: 0xc98a3a, skin: 0xd49c6b },
  hunter: { tunic: 0x7b6a55, spots: 0xb9a78b, hair: 0x3a2a1c, skirt: 0x6a5846, skin: 0xc98f62, hood: 0x8a7760 },
  business: { tunic: 0xeceef3, spots: 0xb8202c, hair: 0x2e231b, skirt: 0x3c4150, skin: 0xd8a47a },
};

export class Caveman {
  constructor(skinId = 'classic') {
    this.skin = skinId;
    const P = SKINS[skinId];
    const cSkin = mat(P.skin);
    const tunicM = mat(P.tunic);
    const spotM = mat(P.spots);
    const hairM = mat(P.hair);
    const skirtM = mat(P.skirt);
    const white = mat(0xffffff, { roughness: 0.5 });
    const black = mat(0x111111);
    const mouthM = mat(0x3a1010);

    this.group = new THREE.Group();
    this.model = grp();
    this.model.scale.setScalar(0.72);
    this.group.add(this.model);

    const hips = grp(0, 1.86, 0);
    this.model.add(hips);
    const torso = grp();
    hips.add(torso);
    torso.add(mesh(new THREE.BoxGeometry(0.85, 1.15, 0.72), tunicM, 0, 0.55, 0));
    torso.add(mesh(new THREE.CylinderGeometry(0.5, 0.62, 0.45, 6), skirtM, 0, -0.05, 0));

    if (skinId === 'classic') {
      [[0.43, 0.8, 0.1], [0.43, 0.3, -0.2], [0.2, 0.6, 0.37], [-0.2, 0.2, 0.37], [0.1, 0.95, -0.37], [-0.43, 0.6, 0.1], [0.3, -0.1, 0.45]].forEach(([x, y, z]) => {
        const sp = mesh(new THREE.SphereGeometry(0.09, 6, 4), spotM, x, y, z);
        sp.scale.set(0.5, 1, 1);
        torso.add(sp);
      });
    } else if (skinId === 'hunter') {
      const ruff = mesh(new THREE.TorusGeometry(0.42, 0.14, 5, 10), spotM, 0, 1.12, 0);
      ruff.rotation.x = Math.PI / 2;
      torso.add(ruff);
      const trim = mesh(new THREE.TorusGeometry(0.58, 0.08, 4, 10), spotM, 0, -0.26, 0);
      trim.rotation.x = Math.PI / 2;
      torso.add(trim);
    } else {
      const tie = mesh(new THREE.BoxGeometry(0.06, 0.8, 0.16), spotM, 0.44, 0.55, 0);
      const knot = mesh(new THREE.BoxGeometry(0.08, 0.14, 0.2), spotM, 0.45, 1.02, 0);
      const collar = mesh(new THREE.BoxGeometry(0.9, 0.12, 0.76), white, 0, 1.1, 0);
      const belt = mesh(new THREE.BoxGeometry(0.88, 0.1, 0.75), black, 0, 0.02, 0);
      torso.add(tie, knot, collar, belt);
    }

    const head = grp(0.08, 1.55, 0);
    torso.add(head);
    head.add(mesh(new THREE.SphereGeometry(0.5, 14, 10), cSkin));
    if (skinId === 'business') {
      const hair = mesh(new THREE.SphereGeometry(0.53, 12, 8, 0, TAU, 0, Math.PI * 0.45), hairM, -0.04, 0.02, 0);
      const part = mesh(new THREE.BoxGeometry(0.5, 0.12, 0.3), hairM, 0.05, 0.47, 0.2);
      part.rotation.x = 0.4;
      head.add(hair, part);
      const beard = mesh(new THREE.IcosahedronGeometry(0.3, 1), hairM, 0.2, -0.33, 0);
      beard.scale.set(0.8, 0.7, 1.1);
      head.add(beard);
      [-1, 1].forEach((s) => {
        const lens = mesh(new THREE.TorusGeometry(0.1, 0.025, 4, 10), black, 0.5, 0.13, s * 0.17);
        lens.rotation.y = Math.PI / 2;
        head.add(lens);
      });
    } else {
      const hair = mesh(new THREE.IcosahedronGeometry(0.56, 1), hairM, -0.1, 0.2, 0);
      hair.scale.set(1, 0.72, 1.02);
      head.add(hair);
      const beard = mesh(new THREE.IcosahedronGeometry(0.4, 1), hairM, 0.18, -0.32, 0);
      beard.scale.set(0.9, 0.9, 1.15);
      head.add(beard);
    }
    if (skinId === 'hunter') {
      const hoodM = mat(P.hood);
      const hood = mesh(new THREE.SphereGeometry(0.62, 12, 8, Math.PI * 0.15, Math.PI * 1.7, 0, Math.PI * 0.62), hoodM, -0.05, 0.08, 0);
      hood.rotation.y = Math.PI / 2;
      head.add(hood);
      const tuskM = mat(0xf4ead0);
      [-1, 1].forEach((s) => {
        const tusk = mesh(new THREE.ConeGeometry(0.07, 0.5, 5), tuskM, 0.45, 0.45, s * 0.35);
        tusk.rotation.z = -1.1;
        tusk.rotation.x = s * 0.3;
        head.add(tusk);
        const ear = mesh(new THREE.SphereGeometry(0.22, 8, 6), hoodM, -0.1, 0.35, s * 0.55);
        ear.scale.set(0.5, 1, 0.3);
        head.add(ear);
      });
    }
    head.add(mesh(new THREE.SphereGeometry(0.13, 8, 6), cSkin, 0.5, 0.02, 0));
    if (skinId !== 'business') head.add(mesh(new THREE.BoxGeometry(0.16, 0.08, 0.55), hairM, 0.44, 0.25, 0));
    this.eyes = [-1, 1].map((s) => {
      const e = makeEye(0.1, white, black, s);
      e.group.position.set(0.42, 0.12, s * 0.18);
      head.add(e.group);
      return e;
    });
    const mouth = mesh(new THREE.BoxGeometry(0.1, 0.1, 0.26), mouthM, 0.5, -0.2, 0);
    head.add(mouth);

    // Front arm holds the skin's item.
    const itemArm = grp(0.02, 1.05, 0.5);
    torso.add(itemArm);
    itemArm.add(mesh(new THREE.CylinderGeometry(0.13, 0.12, 0.7, 7), skinId === 'business' ? tunicM : cSkin, 0, -0.35, 0));
    const hand = grp(0, -0.72, 0);
    itemArm.add(hand);
    hand.add(mesh(new THREE.SphereGeometry(0.14, 8, 6), cSkin));
    const item = grp();
    hand.add(item);
    if (skinId === 'classic') {
      const clubM = mat(0x6e4524);
      item.add(mesh(new THREE.CylinderGeometry(0.09, 0.12, 1.1, 6), clubM, 0, -0.45, 0));
      const ch = mesh(new THREE.IcosahedronGeometry(0.34, 0), clubM, 0, -1.1, 0);
      ch.scale.set(1, 1.45, 1);
      item.add(ch);
      item.rotation.z = -1.7;
    } else if (skinId === 'hunter') {
      const shaft = mat(0x8a6a44);
      item.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.0, 5), shaft, 0, -0.4, 0));
      const tip = mesh(new THREE.ConeGeometry(0.12, 0.45, 4), mat(0x5d6068, { roughness: 0.5 }), 0, -2.1, 0);
      tip.rotation.z = Math.PI;
      item.add(tip);
      item.rotation.z = -1.5;
    } else {
      const caseM = mat(0x5a3a22, { roughness: 0.6 });
      item.add(mesh(new THREE.BoxGeometry(0.75, 0.55, 0.2), caseM, 0, -0.4, 0));
      item.add(mesh(new THREE.TorusGeometry(0.12, 0.03, 4, 8, Math.PI), black, 0, -0.1, 0));
      item.add(mesh(new THREE.BoxGeometry(0.08, 0.06, 0.22), mat(0xd4b04a, { metalness: 0.6, roughness: 0.4 }), 0.2, -0.15, 0));
    }
    const throwArm = grp(0.02, 1.05, -0.5);
    torso.add(throwArm);
    throwArm.add(mesh(new THREE.CylinderGeometry(0.13, 0.12, 0.7, 7), skinId === 'business' ? tunicM : cSkin, 0, -0.35, 0));
    throwArm.add(mesh(new THREE.SphereGeometry(0.14, 8, 6), cSkin, 0, -0.72, 0));

    const legs = [-1, 1].map((s) => {
      const hip = grp(0, -0.05, s * 0.22);
      hips.add(hip);
      const legM = skinId === 'business' ? skirtM : cSkin;
      hip.add(mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.9, 7), legM, 0, -0.45, 0));
      const knee = grp(0, -0.9, 0);
      hip.add(knee);
      knee.add(mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.85, 7), legM, 0, -0.42, 0));
      const ankle = grp(0, -0.85, 0);
      knee.add(ankle);
      const footM = skinId === 'business' ? black : skinId === 'hunter' ? mat(0x5a4838) : cSkin;
      ankle.add(mesh(new THREE.BoxGeometry(0.42, 0.16, 0.24), footM, 0.1, -0.02, 0));
      return { hip, knee, ankle };
    });

    Object.assign(this, { hips, torso, head, mouth, itemArm, item, throwArm, legs });
    this.phase = 0;
    this.t = 0;
    this.airW = 0;
  }

  /**
   * s: { mode: 'run'|'idle'|'tumble', speed, air (0..1), glance (0..1), yell (0..1), throw (0..1), tumbleT }
   */
  update(dt, s) {
    this.t += dt;
    const t = this.t;
    if (s.mode === 'run') this.phase += dt * TAU * 2.2;
    const q = this.phase;
    const run = s.mode === 'run' ? 1 : 0;
    this.airW += ((s.air || 0) - this.airW) * Math.min(1, dt * 14);
    const air = this.airW;

    this.hips.position.y = 1.86 + 0.12 * Math.abs(Math.sin(q)) * run + Math.sin(t * 2) * 0.02 * (1 - run);
    this.legs.forEach((lg, i) => {
      const ph = q + i * Math.PI;
      let a = 0.85 * Math.sin(ph) * run;
      let k = -0.2 - 1.2 * Math.max(0, Math.cos(ph)) * run;
      a = lerp(a, i ? 0.9 : 0.2, air);
      k = lerp(k, i ? -1.6 : -0.7, air);
      lg.hip.rotation.z = a;
      lg.knee.rotation.z = k;
      lg.ankle.rotation.z = -(a + k) * 0.7;
    });
    this.torso.rotation.z = -0.22 * run + 0.1 * air;
    this.torso.rotation.y = 0.12 * Math.sin(q) * run;

    if (this.skin === 'business') {
      this.itemArm.rotation.z = 0.9 * Math.sin(q) * run + 0.15 * Math.sin(t * 1.5) * (1 - run);
      this.itemArm.rotation.x = -0.15;
      this.item.rotation.z = -this.itemArm.rotation.z * 0.8;
    } else if (this.skin === 'hunter') {
      this.itemArm.rotation.z = Math.PI - 0.3 + 0.2 * Math.sin(q) * run;
      this.itemArm.rotation.x = -0.2;
      this.item.rotation.z = -1.35 + 0.1 * Math.sin(q);
    } else {
      this.itemArm.rotation.z = Math.PI - 0.25 + 0.55 * Math.sin(q * 0.5) * run + 0.3 * Math.sin(t * 3) * (1 - run);
      this.itemArm.rotation.x = -0.25 + 0.2 * Math.sin(q * 0.5 + 1);
      this.item.rotation.z = -1.7 + 0.6 * Math.sin(q * 0.5 + 0.8);
    }
    const th = s.throw || 0;
    // A throw winds up overhead and snaps back over his shoulder toward the dino.
    this.throwArm.rotation.z = lerp(1.0 * Math.sin(q + Math.PI) * run, 2.4 - th * 3.6, th > 0 ? 1 : 0);

    const g = s.glance || 0;
    this.head.rotation.y = -2.2 * g;
    this.head.rotation.z = 0.15 * g;
    const y = s.yell || 0;
    this.mouth.scale.set(1, 1 + 3.2 * y + 0.6 * y * Math.abs(Math.sin(t * 30)), 1 + 0.4 * y);
    this.eyes.forEach((e) => e.set(s.mode === 'tumble' ? 'x' : 'open'));

    if (s.mode === 'tumble') {
      const k = s.tumbleT || 0;
      this.model.rotation.z = -k * 9;
      this.model.position.y = Math.max(0, 5 * k - 7 * k * k);
    } else {
      this.model.rotation.z = 0;
      this.model.position.y = 0;
    }
  }

  dispose() {
    this.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  }
}
