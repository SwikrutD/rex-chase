// Everything in the background: sky, sun and moon, stars, ground, parallax
// scenery, the day/night cross-fade and the meteor shower visuals.
import * as THREE from 'three';
import { TAU, mat, mesh, grp } from '../entities/kit.js';

const C = (h) => new THREE.Color(h);

const DAY = {
  skyTop: C(0x6fb0d8), skyBottom: C(0xf7dcae), fog: C(0xefd2a4), ground: C(0xffffff),
  hemiSky: C(0xfff0d6), hemiGround: C(0x8a6a4a), hemi: 1.25, sun: 2.3, sunColor: C(0xfff0d8),
  ridgeNear: C(0xc0907c), ridgeFar: C(0xd8b0a0), cloud: C(0xffffff),
};
const NIGHT = {
  skyTop: C(0x070b22), skyBottom: C(0x2b2550), fog: C(0x221e3c), ground: C(0x6a6286),
  hemiSky: C(0x6d7fc4), hemiGround: C(0x221a2a), hemi: 0.6, sun: 1.0, sunColor: C(0xa8b8ff),
  ridgeNear: C(0x2d2744), ridgeFar: C(0x3b3459), cloud: C(0x4a4768),
};
const METEOR_TINT = { skyBottom: C(0xff6a3a), fog: C(0xc0583c), hemiSky: C(0xffa070) };

function groundTexture() {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  g.fillStyle = '#d7a86e';
  g.fillRect(0, 0, s, s);
  let seed = 9;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 700; i++) {
    const x = rnd() * s, y = rnd() * s, r = 1 + rnd() * 3.5;
    g.fillStyle = rnd() < 0.5 ? 'rgba(120,80,45,0.3)' : 'rgba(245,215,160,0.35)';
    for (const [dx, dy] of [[0, 0], [-s, 0], [0, -s], [-s, -s]]) {
      g.beginPath(); g.arc(x + dx, y + dy, r, 0, TAU); g.fill();
    }
  }
  g.fillStyle = 'rgba(90,60,35,0.5)';
  for (let i = 0; i < 40; i++) g.fillRect(rnd() * s, rnd() * s, 2 + rnd() * 10, 1);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Moon phases like the original game: a new phase each night.
const PHASE_OFFSETS = [24, 44, 72, null, -72, -44, -24];
function moonTexture(phase) {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  const halo = g.createRadialGradient(s / 2, s / 2, 30, s / 2, s / 2, s / 2);
  halo.addColorStop(0, 'rgba(200,215,255,0.35)');
  halo.addColorStop(1, 'rgba(200,215,255,0)');
  g.fillStyle = halo;
  g.fillRect(0, 0, s, s);
  const m = document.createElement('canvas');
  m.width = m.height = s;
  const mg = m.getContext('2d');
  mg.fillStyle = '#f2eedc';
  mg.beginPath(); mg.arc(s / 2, s / 2, 52, 0, TAU); mg.fill();
  mg.fillStyle = 'rgba(180,175,160,0.5)';
  [[-14, -10, 9], [16, 12, 12], [6, -22, 6], [-20, 18, 7]].forEach(([x, y, r]) => { mg.beginPath(); mg.arc(s / 2 + x, s / 2 + y, r, 0, TAU); mg.fill(); });
  const off = PHASE_OFFSETS[phase % PHASE_OFFSETS.length];
  if (off !== null) {
    mg.globalCompositeOperation = 'destination-out';
    mg.beginPath(); mg.arc(s / 2 + off, s / 2, 52, 0, TAU); mg.fill();
  }
  g.drawImage(m, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function offlineSignTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#f7f7f7'; g.fillRect(0, 0, 256, 128);
  g.fillStyle = '#535353';
  // The game's own roaring-rex mark (same art as the app icon).
  g.save();
  g.translate(12, 18);
  g.scale(0.92, 0.92);
  g.fillStyle = '#ff7a2f';
  g.beginPath(); g.arc(20, 18, 6, 0, TAU); g.fill();
  g.fillStyle = '#535353';
  g.fill(new Path2D('M22 58 L30 62 L38 90 L10 90 L12 64Z M22 30 L60 20 L84 27 L90 40 L62 45 L40 49 L30 62 L22 58Z M40 53 L82 60 L77 69 L45 69 L30 65Z M47 47 L50 55 L53 46Z M57 46 L60 54 L63 45Z M67 44 L70 51 L73 43Z M77 42 L79 48 L82 41Z M50 56 L53 49 L56 57Z M61 58 L64 51 L67 59Z M71 59 L74 53 L77 60Z'));
  g.fillStyle = '#f7f7f7';
  g.fill(new Path2D('M50 29 L57 28 L57 35 L50 35Z M46 26 L60 22 L61 25 L47 29Z'));
  g.restore();
  g.fillStyle = '#535353';
  g.font = 'bold 26px monospace';
  g.fillText('No internet', 96, 58);
  g.font = '15px monospace';
  g.fillText('Try: running', 98, 86);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class World {
  constructor(scene) {
    this.scene = scene;
    this.night = 0; // 0 day .. 1 night, eased
    this.nightTarget = 0;
    this.meteor = 0;
    this.meteorTarget = 0;
    this.distance = 0;
    this.t = 0;
    this.shake = 0; // read by the game for camera shake
    this.onImpact = null;

    scene.fog = new THREE.Fog(DAY.fog.clone(), 70, 260);

    // Sky dome
    this.skyU = { top: { value: DAY.skyTop.clone() }, bottom: { value: DAY.skyBottom.clone() } };
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(500, 24, 16),
      new THREE.ShaderMaterial({
        uniforms: this.skyU,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float k = smoothstep(-0.05, 0.55, vP.y); gl_FragColor = vec4(mix(bottom, top, k), 1.0);\n#include <colorspace_fragment>\n}',
      }),
    );
    sky.renderOrder = -10;
    scene.add(sky);
    this.sky = sky;

    // Sun and moon
    this.sunDisc = new THREE.Mesh(new THREE.CircleGeometry(16, 32), new THREE.MeshBasicMaterial({ color: 0xfff1c4, fog: false, transparent: true }));
    this.sunDisc.position.set(-60, 70, -380);
    scene.add(this.sunDisc);
    this.moonPhase = -1;
    this.moon = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshBasicMaterial({ transparent: true, fog: false, depthWrite: false }));
    this.moon.position.set(70, 80, -380);
    scene.add(this.moon);
    this.setMoonPhase(0);

    // Stars
    const n = 500;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      const th = Math.random() * Math.PI - Math.PI;
      const ph = 0.1 + Math.random() * 1.2;
      pos.set([Math.cos(th) * Math.cos(ph) * 450, Math.sin(ph) * 450, Math.sin(th) * Math.cos(ph) * 450], i * 3);
      seed.set([Math.random(), 1 + Math.random() * 2], i * 2);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    sg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 2));
    this.starU = { uT: { value: 0 }, uA: { value: 0 }, uPR: { value: Math.min(window.devicePixelRatio || 1, 2) } };
    const stars = new THREE.Points(sg, new THREE.ShaderMaterial({
      uniforms: this.starU,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: 'uniform float uT; uniform float uPR; attribute vec2 aSeed; varying float vA; void main(){ vA = 0.55 + 0.45 * sin(uT * aSeed.y + aSeed.x * 40.0); gl_PointSize = (1.2 + aSeed.x * 1.8) * uPR; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform float uA; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(vec3(0.9,0.92,1.0) * vA * uA, 1.0); }',
    }));
    stars.frustumCulled = false;
    scene.add(stars);

    // Lights
    this.hemi = new THREE.HemisphereLight(DAY.hemiSky.clone(), DAY.hemiGround.clone(), DAY.hemi);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(DAY.sunColor.clone(), DAY.sun);
    this.sun.position.set(-12, 30, 18);
    this.sun.target.position.set(0, 0, 0);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -40, right: 40, top: 20, bottom: -14, near: 1, far: 100 });
    this.sun.shadow.bias = -0.0006;
    scene.add(this.sun, this.sun.target);
    this.flash = new THREE.PointLight(0xffa060, 0, 400, 1.2);
    this.flash.position.set(0, 40, -100);
    scene.add(this.flash);

    // Ground
    this.groundTex = groundTexture();
    this.groundTex.repeat.set(88, 62);
    this.groundMat = new THREE.MeshStandardMaterial({ map: this.groundTex, roughness: 1 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 500), this.groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.z = -50;
    ground.receiveShadow = true;
    scene.add(ground);
    // A worn running track so the lane reads clearly.
    const trackTex = this.groundTex.clone();
    trackTex.repeat.set(88, 0.5);
    this.trackTex = trackTex;
    this.trackMat = new THREE.MeshStandardMaterial({ map: trackTex, color: 0xb88a5c, roughness: 1 });
    const track = new THREE.Mesh(new THREE.PlaneGeometry(700, 3.2), this.trackMat);
    track.rotation.x = -Math.PI / 2;
    track.position.y = 0.01;
    track.receiveShadow = true;
    scene.add(track);
    // Pebble borders along both edges of the lane.
    const edgeGeo = new THREE.DodecahedronGeometry(0.12, 0);
    const edgeMat = mat(0x8a6a4a);
    this.edges = new THREE.InstancedMesh(edgeGeo, edgeMat, 240);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < 240; i++) {
      const side = i % 2 ? 1 : -1;
      const s = 0.7 + ((i * 37) % 10) / 12;
      m4.compose(new THREE.Vector3(-120 + (i >> 1) * 2 + ((i * 13) % 7) * 0.12, 0.04, side * (1.7 + ((i * 7) % 5) * 0.06)), new THREE.Quaternion().setFromEuler(new THREE.Euler(i, i * 2, 0)), new THREE.Vector3(s, s * 0.6, s));
      this.edges.setMatrixAt(i, m4);
    }
    this.edges.receiveShadow = true;
    scene.add(this.edges);

    // Ridges: repeating profiles scrolled slower than the ground.
    this.ridges = [
      this.makeRidge(-230, 34, 18, 1.3, 0.15, 'ridgeFar'),
      this.makeRidge(-150, 20, 11, 0.4, 0.3, 'ridgeNear'),
    ];

    // Clouds
    this.clouds = [];
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: 1, transparent: true, opacity: 0.92 });
    this.cloudMat = cloudMat;
    for (let i = 0; i < 9; i++) {
      const cl = new THREE.Group();
      const n2 = 3 + (i % 3);
      for (let k = 0; k < n2; k++) {
        const p = new THREE.Mesh(new THREE.IcosahedronGeometry(2 + Math.random() * 2.5, 0), cloudMat);
        p.position.set(k * 3 - n2 * 1.5, Math.random() * 1.5, Math.random() * 2);
        p.scale.y = 0.6;
        cl.add(p);
      }
      cl.position.set(-150 + i * 36 + Math.random() * 10, 30 + Math.random() * 18, -90 - Math.random() * 60);
      scene.add(cl);
      this.clouds.push(cl);
    }

    // Decor that scrolls at ground speed.
    this.decor = [];
    this.decorSpan = 160;
    this.buildDecor();

    // Meteors (visual only, they land far behind the track).
    this.meteors = [];
    const trailMat = new THREE.MeshBasicMaterial({ color: 0xff8a40, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    for (let i = 0; i < 8; i++) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.4, 1), new THREE.MeshBasicMaterial({ color: 0xfff0b0, fog: false })));
      const trail = new THREE.Mesh(new THREE.ConeGeometry(1.8, 22, 10, 1, true), trailMat);
      trail.rotation.x = Math.PI / 2;
      trail.position.z = -11;
      const holder = new THREE.Group();
      holder.add(trail);
      g.add(holder);
      g.visible = false;
      scene.add(g);
      this.meteors.push({ g, t: -1, from: new THREE.Vector3(), to: new THREE.Vector3(), dur: 1, big: false });
    }
    this.impacts = [];
    this.meteorTimer = 0;
  }

  makeRidge(z, base, amp, phase, factor, colorKey) {
    const P = 120;
    const shape = new THREE.Shape();
    const W = P * 6;
    shape.moveTo(-W / 2, -5);
    for (let x = -W / 2; x <= W / 2; x += 2) {
      const u = (TAU * x) / P;
      shape.lineTo(x, base + amp * (0.5 * Math.sin(u + phase) + 0.3 * Math.sin(2 * u + phase * 2) + 0.2 * Math.sin(5 * u + phase * 3) + 0.08 * Math.sin(11 * u)));
    }
    shape.lineTo(W / 2, -5);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: DAY[colorKey].clone() }));
    m.position.z = z;
    this.scene.add(m);
    return { m, P, factor, colorKey };
  }

  buildDecor() {
    const cactus = mat(0x8a9a72), cactusD = mat(0x77876a), rock = mat(0x8e7a68), rockD = mat(0x6d5c50), bush = mat(0x8a7a4a), bone = mat(0xeee4c8);
    let seed = 5;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const add = (obj, x, z) => { obj.position.set(x, obj.position.y, z); this.scene.add(obj); this.decor.push({ obj, x0: x }); };
    for (let i = 0; i < 26; i++) {
      const g = new THREE.Group();
      const h = 1.5 + rnd() * 3;
      g.add(mesh(new THREE.CylinderGeometry(0.3, 0.34, h, 7), cactus, 0, h / 2, 0));
      if (rnd() < 0.7) {
        const y = h * 0.5;
        g.add(mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.5, 6), cactusD, 0.4, y, 0).rotateZ(Math.PI / 2));
        g.add(mesh(new THREE.CylinderGeometry(0.17, 0.17, h * 0.35, 6), cactusD, 0.62, y + h * 0.17, 0));
      }
      add(g, rnd() * this.decorSpan - this.decorSpan / 2, -10 - rnd() * 40);
    }
    for (let i = 0; i < 40; i++) {
      // Rocks between the camera and the lane stay pebble-sized so they never hide an obstacle.
      const front = rnd() >= 0.7;
      const r = front ? 0.15 + rnd() * 0.25 : 0.2 + rnd() * 1.2;
      const m = mesh(new THREE.DodecahedronGeometry(r, 0), rnd() < 0.5 ? rock : rockD, 0, r * 0.4, 0);
      m.rotation.set(rnd() * 3, rnd() * 3, 0);
      add(m, rnd() * this.decorSpan - this.decorSpan / 2, front ? 4 + rnd() * 10 : -(7 + rnd() * 30));
    }
    for (let i = 0; i < 24; i++) {
      const b = new THREE.Group();
      for (let k = 0; k < 5; k++) {
        const s = mesh(new THREE.ConeGeometry(0.06, 0.8, 3), bush, 0, 0.35, 0);
        s.rotation.z = (k - 2) * 0.35;
        b.add(s);
      }
      add(b, rnd() * this.decorSpan - this.decorSpan / 2, (rnd() < 0.5 ? -1 : 1) * (3 + rnd() * 12));
    }
    // A fossil ribcage, half buried. It has seen a few extinction events.
    const fossil = new THREE.Group();
    for (let k = 0; k < 6; k++) {
      const rib = mesh(new THREE.TorusGeometry(0.9 - k * 0.08, 0.07, 4, 10, Math.PI), bone, k * 0.45, 0, 0);
      rib.rotation.y = Math.PI / 2;
      fossil.add(rib);
    }
    fossil.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.2, 5), bone, 1.1, 0.85, 0).rotateZ(Math.PI / 2));
    add(fossil, 30, -11);

    // The offline billboard appears only when the browser really is offline.
    const sign = new THREE.Group();
    sign.add(mesh(new THREE.BoxGeometry(0.2, 3, 0.2), mat(0x5a4632), -1.4, 1.5, 0));
    sign.add(mesh(new THREE.BoxGeometry(0.2, 3, 0.2), mat(0x5a4632), 1.4, 1.5, 0));
    const board = new THREE.Mesh(new THREE.PlaneGeometry(4, 2), new THREE.MeshStandardMaterial({ map: offlineSignTexture(), roughness: 0.9 }));
    board.position.set(0, 3.6, 0.12);
    board.castShadow = true;
    sign.add(board);
    sign.visible = false;
    add(sign, -40, -12);
    this.offlineSign = sign;
  }

  setMoonPhase(i) {
    const p = i % PHASE_OFFSETS.length;
    if (p === this.moonPhase) return;
    this.moonPhase = p;
    if (this.moon.material.map) this.moon.material.map.dispose();
    this.moon.material.map = moonTexture(p);
    this.moon.material.needsUpdate = true;
  }

  setOffline(on) { this.offlineSign.visible = on; }

  /** Start one visual meteor. big = the extinction meteor. */
  launchMeteor(big = false) {
    const m = this.meteors.find((o) => o.t < 0);
    if (!m) return;
    const x = big ? 10 : -40 + Math.random() * 120;
    m.from.set(x + 90, 150, big ? -160 : -250);
    m.to.set(x - 30 + Math.random() * 20, 0, big ? -70 : -110 - Math.random() * 60);
    m.dur = big ? 3.2 : 1.1 + Math.random() * 0.6;
    m.big = big;
    m.t = 0;
    m.g.visible = true;
    m.g.scale.setScalar(big ? 7 : 1 + Math.random() * 0.6);
  }

  impact(pos, big) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.6, 1, 32), new THREE.MeshBasicMaterial({ color: 0xffc070, transparent: true, side: THREE.DoubleSide, depthWrite: false, fog: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(pos).setY(0.5);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffb060, transparent: true, depthWrite: false, fog: false }));
    glow.position.copy(pos);
    this.scene.add(ring, glow);
    this.impacts.push({ ring, glow, t: 0, big });
    this.flash.position.copy(pos).setY(30);
    this.flash.intensity = big ? 60000 : 9000;
    this.shake = Math.max(this.shake, big ? 1.6 : 0.35);
    if (this.onImpact) this.onImpact(big);
  }

  update(dt, speed, ctx) {
    this.t += dt;
    this.distance += speed * dt;
    this.night += (this.nightTarget - this.night) * Math.min(1, dt / 1.2);
    this.meteor += (this.meteorTarget - this.meteor) * Math.min(1, dt / 1.5);
    const n = this.night, mt = this.meteor * 0.55;

    const lerpC = (key, out) => out.copy(DAY[key]).lerp(NIGHT[key], n);
    lerpC('skyTop', this.skyU.top.value);
    lerpC('skyBottom', this.skyU.bottom.value).lerp(METEOR_TINT.skyBottom, mt);
    lerpC('fog', this.scene.fog.color).lerp(METEOR_TINT.fog, mt * 0.8);
    lerpC('ground', this.groundMat.color);
    this.trackMat.color.copy(this.groundMat.color).multiplyScalar(0.82);
    lerpC('hemiSky', this.hemi.color).lerp(METEOR_TINT.hemiSky, mt * 0.6);
    lerpC('hemiGround', this.hemi.groundColor);
    lerpC('sunColor', this.sun.color);
    lerpC('cloud', this.cloudMat.color);
    this.hemi.intensity = DAY.hemi + (NIGHT.hemi - DAY.hemi) * n;
    this.sun.intensity = DAY.sun + (NIGHT.sun - DAY.sun) * n;
    this.sun.position.set(-12 + 30 * n, 30, 18);
    this.ridges.forEach((r) => {
      lerpC(r.colorKey, r.m.material.color);
      r.m.position.x = -((this.distance * r.factor) % r.P);
    });
    this.sunDisc.material.opacity = 1 - n;
    this.sunDisc.visible = n < 0.99;
    this.moon.material.opacity = n;
    this.moon.visible = n > 0.01;
    this.starU.uA.value = n;
    this.starU.uT.value = this.t;

    // Ground and decor
    this.groundTex.offset.x = (this.distance / 8) % 1;
    this.trackTex.offset.x = this.groundTex.offset.x;
    this.edges.position.x = -(this.distance % 2);
    const half = this.decorSpan / 2;
    for (const d of this.decor) {
      d.obj.position.x = ((((d.x0 - this.distance) % this.decorSpan) + this.decorSpan * 1.5) % this.decorSpan) - half;
    }
    for (const c of this.clouds) {
      c.position.x -= (speed * 0.08 + 1) * dt;
      if (c.position.x < -170) c.position.x += 330;
    }

    // Meteors
    if (this.meteorTarget > 0 && ctx.running) {
      this.meteorTimer -= dt;
      if (this.meteorTimer <= 0) { this.launchMeteor(false); this.meteorTimer = 0.35 + Math.random() * 0.9; }
    }
    for (const m of this.meteors) {
      if (m.t < 0) continue;
      m.t += dt / m.dur;
      if (m.t >= 1) {
        m.t = -1;
        m.g.visible = false;
        this.impact(m.to, m.big);
        continue;
      }
      m.g.position.lerpVectors(m.from, m.to, m.t);
      m.g.lookAt(m.g.position.clone().add(m.to).sub(m.from));
    }
    for (let i = this.impacts.length - 1; i >= 0; i--) {
      const o = this.impacts[i];
      o.t += dt / (o.big ? 2.5 : 1.2);
      const s = o.big ? 90 : 16;
      o.ring.scale.setScalar(1 + o.t * s);
      o.ring.material.opacity = 1 - o.t;
      o.glow.scale.setScalar((o.big ? 30 : 5) * Math.sin(Math.min(1, o.t * 2) * Math.PI * 0.5) * (1 - o.t * 0.5));
      o.glow.material.opacity = 1 - o.t;
      if (o.t >= 1) {
        this.scene.remove(o.ring, o.glow);
        o.ring.geometry.dispose(); o.glow.geometry.dispose();
        this.impacts.splice(i, 1);
      }
    }
    this.flash.intensity *= Math.exp(-dt * 5);
    this.shake *= Math.exp(-dt * 4);
  }
}
