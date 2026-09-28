// Small helpers for building low-poly models out of primitives.
import * as THREE from 'three';

export const TAU = Math.PI * 2;

export function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, metalness: 0, ...opts });
}

export function mesh(geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function grp(x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  return g;
}

/** A cylinder stretched between two points. */
export function limb(a, b, r, material, r2 = r * 0.85) {
  const d = b.clone().sub(a);
  const len = d.length();
  const c = mesh(new THREE.CylinderGeometry(r2, r, len, 7), material);
  c.position.copy(a).add(b).multiplyScalar(0.5);
  c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return c;
}

/**
 * An eye that can blink, close and turn into an X when the owner is knocked out.
 * Faces +x by default; place it on the side of a head.
 */
export function makeEye(r, irisMat, pupilMat, side) {
  const g = new THREE.Group();
  const open = new THREE.Group();
  const ball = mesh(new THREE.SphereGeometry(r, 10, 8), irisMat);
  const pupil = mesh(new THREE.SphereGeometry(r * 0.5, 8, 6), pupilMat, r * 0.55, 0, side * r * 0.55);
  open.add(ball, pupil);
  const x = new THREE.Group();
  const barGeo = new THREE.BoxGeometry(r * 0.35, r * 2.4, r * 0.35);
  const b1 = mesh(barGeo, pupilMat);
  const b2 = mesh(barGeo, pupilMat);
  b1.rotation.x = 0.8;
  b2.rotation.x = -0.8;
  x.add(b1, b2);
  x.position.z = side * r * 0.6;
  x.visible = false;
  g.add(open, x);
  return {
    group: g,
    set(state) {
      // state: 'open' | 'blink' | 'closed' | 'x'
      open.visible = state !== 'x';
      x.visible = state === 'x';
      open.scale.y = state === 'open' ? 1 : 0.12;
    },
  };
}

/** Remember material colors so a skin override (like gold) can be undone. */
export class MaterialSet {
  constructor() {
    this.list = [];
  }
  add(name, material) {
    material.userData.base = { color: material.color.getHex(), metalness: material.metalness, roughness: material.roughness, emissive: material.emissive.getHex() };
    material.userData.role = name;
    this.list.push(material);
    this[name] = material;
    return material;
  }
  gold(on) {
    for (const m of this.list) {
      const b = m.userData.base;
      if (on && m.userData.role !== 'eye' && m.userData.role !== 'pupil') {
        const c = new THREE.Color(b.color);
        const hsl = {};
        c.getHSL(hsl);
        m.color.setHSL(0.12, 0.75, 0.35 + hsl.l * 0.45);
        m.metalness = 0.85;
        m.roughness = 0.3;
        m.emissive.setHex(0x221400);
      } else {
        m.color.setHex(b.color);
        m.metalness = b.metalness;
        m.roughness = b.roughness;
        m.emissive.setHex(b.emissive);
      }
    }
  }
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const smooth = (x) => { const c = clamp01(x); return c * c * (3 - 2 * c); };
