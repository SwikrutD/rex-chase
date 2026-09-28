// A small pooled particle system for dust, shattered debris and sparkles.
import * as THREE from 'three';

const GEO = {
  dust: new THREE.IcosahedronGeometry(0.35, 0),
  chunk: new THREE.TetrahedronGeometry(0.28, 0),
  spark: new THREE.OctahedronGeometry(0.12, 0),
};

export class Particles {
  constructor(scene, size = 220) {
    this.pool = [];
    for (let i = 0; i < size; i++) {
      const m = new THREE.Mesh(GEO.dust, new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, flatShading: true, roughness: 1, depthWrite: false }));
      m.visible = false;
      m.castShadow = false;
      scene.add(m);
      this.pool.push({ m, age: 0, life: 0, v: new THREE.Vector3(), spin: new THREE.Vector3(), s0: 1, grow: 0, g: 0, kind: 'dust', scroll: true });
    }
    this.i = 0;
  }

  spawn(kind, pos, opts = {}) {
    const p = this.pool[this.i++ % this.pool.length];
    p.kind = kind;
    p.m.geometry = GEO[kind === 'debris' ? 'chunk' : kind === 'spark' ? 'spark' : 'dust'];
    p.m.material.color.setHex(opts.color ?? 0xc9a174);
    p.m.material.emissive.setHex(kind === 'spark' ? 0x886600 : 0x000000);
    p.m.position.copy(pos);
    p.v.set(opts.vx ?? 0, opts.vy ?? 0, opts.vz ?? 0);
    p.spin.set(Math.random() * 8 - 4, Math.random() * 8 - 4, Math.random() * 8 - 4);
    p.age = 0;
    p.life = opts.life ?? 0.8;
    p.s0 = opts.size ?? 1;
    p.grow = opts.grow ?? (kind === 'dust' ? 1.8 : 0);
    p.g = opts.gravity ?? (kind === 'debris' ? 30 : kind === 'dust' ? -1 : 0);
    p.scroll = opts.scroll ?? true;
    p.m.visible = true;
    p.m.scale.setScalar(p.s0);
    return p;
  }

  dustBurst(pos, n, power = 1, color) {
    for (let i = 0; i < n; i++) {
      this.spawn('dust', pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 0.15, (Math.random() - 0.5) * 0.8)), {
        vx: (Math.random() - 0.7) * 3 * power, vy: 0.8 + Math.random() * 1.8 * power, vz: (Math.random() - 0.5) * 2.5 * power,
        size: (0.35 + Math.random() * 0.4) * power, life: 0.6 + Math.random() * 0.5, color,
      });
    }
  }

  shatter(pos, color, n = 18) {
    for (let i = 0; i < n; i++) {
      this.spawn('debris', pos.clone().add(new THREE.Vector3(Math.random() * 1.2 - 0.6, Math.random() * 1.6, Math.random() * 0.8 - 0.4)), {
        vx: 4 + Math.random() * 10, vy: 5 + Math.random() * 9, vz: (Math.random() - 0.5) * 9,
        size: 0.6 + Math.random() * 1.1, life: 1.1 + Math.random() * 0.5, color,
      });
    }
    this.dustBurst(pos, 8, 1.4);
  }

  sparkle(pos, color = 0xffe38a, n = 12) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.spawn('spark', pos.clone(), { vx: Math.cos(a) * 4, vy: Math.sin(a) * 4 + 1, vz: (Math.random() - 0.5) * 3, size: 1, life: 0.5, color });
    }
  }

  update(dt, speed) {
    for (const p of this.pool) {
      if (!p.m.visible) continue;
      p.age += dt;
      if (p.age >= p.life) { p.m.visible = false; continue; }
      const k = p.age / p.life;
      p.v.y -= p.g * dt;
      p.m.position.addScaledVector(p.v, dt);
      if (p.scroll) p.m.position.x -= speed * dt;
      if (p.kind === 'debris' && p.m.position.y < 0.1) { p.m.position.y = 0.1; p.v.y *= -0.35; p.v.x *= 0.6; }
      if (p.kind === 'dust') p.v.multiplyScalar(0.96);
      p.m.rotation.x += p.spin.x * dt;
      p.m.rotation.y += p.spin.y * dt;
      p.m.scale.setScalar(p.s0 * (1 + p.grow * k));
      p.m.material.opacity = p.kind === 'debris' ? Math.min(1, (1 - k) * 3) : 0.8 * (1 - k);
    }
  }

  clear() { for (const p of this.pool) p.m.visible = false; }
}
