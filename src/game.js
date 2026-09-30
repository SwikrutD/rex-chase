// The game: state machine, spawning, collisions, roar, rival, events, camera.
import * as THREE from 'three';
import {
  REX_X, CAMERA, BABY, STARGAZE, SPECIES, SPECIES_ORDER, CAVEMAN, CAVEMAN_SKINS, CAVEMAN_ORDER, PTERO_EXTRA_SPEED, METEOR,
  EXTINCTION_SCORE, BONE,
} from './config.js';
import { stepBody } from './logic/physics.js';
import { overlaps, shrink, dinoBox } from './logic/collide.js';
import {
  speedAt, scoreAt, isNight, nightIndex, meteorCount, nextObstacle, gapAfter, maybeBone, HIT_FORGIVE, mulberry32,
} from './logic/rules.js';
import { Dino } from './entities/dinos.js';
import { Caveman } from './entities/caveman.js';
import { makeCactus, makePtero, makeCrater, makeBone, makeProjectile } from './entities/obstacles.js';
import { smooth } from './entities/kit.js';
import { World } from './world/world.js';
import { Particles } from './fx/particles.js';
import { sfx, unlockAudio, setMuted } from './audio.js';
import { load, save } from './storage.js';
import { EggDetector, ACHIEVEMENTS } from './eastereggs.js';
import { track, scoreBand } from './analytics.js';

const RIVAL_Z = -1.6;
const SLEEP_AFTER = 20;

export class Game {
  constructor(canvas, hud, input) {
    this.canvas = canvas;
    this.hud = hud;
    this.input = input;
    this.data = load();
    setMuted(this.data.muted);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, 0.1, 1200);

    this.world = new World(this.scene);
    this.world.onImpact = (big) => this.onImpact(big);
    this.particles = new Particles(this.scene);

    this.obstacles = [];
    this.bones = [];
    this.rival = null;
    this.preview = null;
    this.rng = mulberry32((Date.now() ^ 0x5eed) >>> 0);

    this.state = 'title';
    this.stateT = 0;
    this.t = 0;
    this.titleIdle = 0;
    this.armCount = 0;
    this.flailT = 0;
    this.camBlend = 0;
    this.deadBlend = 0;
    this.shake = 0;
    this.fovKick = 0;
    this.gaze = 0; // stargazer easter egg: 0 = normal view, 1 = looking at the sky
    this.pausedFor = 0;
    this.baby = null;
    this.babyHist = [];
    this.babyPop = 1;
    this.r = null;

    this.buildDino();
    this.buildPreview();

    this.eggs = new EggDetector((name) => this.onEgg(name));
    input.onKey((key) => {
      this.titleIdle = 0;
      this.eggs.feed(key);
    });
    input.onFirstGesture(() => unlockAudio());

    hud.on('left', () => input.push('left'));
    hud.on('right', () => input.push('right'));
    hud.on('up', () => input.push('up'));
    hud.on('down', () => input.push('down'));
    hud.on('start', () => { unlockAudio(); input.push('start'); });
    hud.on('trophies', () => input.push('trophies'));
    hud.on('mute', () => { unlockAudio(); input.push('mute'); });
    hud.on('roar', () => input.push('roar'));
    hud.on('duckDown', () => { input.held.duck = true; });
    hud.on('duckUp', () => { input.held.duck = false; });

    window.addEventListener('offline', () => this.goneOffline());
    window.addEventListener('online', () => {
      this.world.setOffline(false);
      if (this.state === 'run') hud.toast('BACK ONLINE', 'Keep running anyway.');
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.state === 'run') this.setState('paused'); });
    window.addEventListener('resize', () => this.resize());
    this.resize();

    hud.setSpecies(this.data.species);
    hud.setGoldenName(this.data.species, this.data.golden);
    hud.setCaveman(this.data.caveman);
    hud.setMuted(this.data.muted);
    hud.setRetro(this.data.retro);
    hud.renderTrophies(this.data.achievements);
    hud.setScore(0, this.data.hi);
    hud.setMeter(0, 3, false);

    this.reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.perf = { acc: 0, n: 0, level: 0, warmup: 2 };
    this.prewarm();

    this.last = performance.now();
    requestAnimationFrame((n) => this.frame(n));
  }

  /**
   * Compile every shader the game can need before play starts, so the first
   * pterodactyl, crater or meteor never causes a stutter mid-jump.
   */
  prewarm() {
    const g = new THREE.Group();
    const parts = [
      makeCactus({ type: 'cactusL', count: 2, sign: '404' }, 3), makePtero(true), makeCrater(), makeBone(),
      makeProjectile('rock'), makeProjectile('snowball'), makeProjectile('mug'),
    ];
    parts.forEach((b, i) => { b.group.position.set(REX_X + i * 3, 0, -4); g.add(b.group); });
    const cavemen = CAVEMAN_ORDER.map((id) => new Caveman(id));
    cavemen.forEach((c, i) => { c.group.position.set(REX_X + i * 3, 0, -8); g.add(c.group); });
    const meteors = this.world.meteors.map((m) => m.g);
    meteors.forEach((m) => { m.visible = true; });
    this.particles.pool.slice(0, 3).forEach((p, i) => { p.m.visible = true; p.m.position.set(REX_X, 1 + i, -4); });
    this.scene.add(g);
    this.camera.position.set(REX_X, 4, 30);
    this.camera.lookAt(REX_X, 2, 0);
    try { this.renderer.compile(this.scene, this.camera); } catch { /* best effort */ }
    this.scene.remove(g);
    meteors.forEach((m) => { m.visible = false; });
    this.particles.clear();
    g.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    cavemen.forEach((c) => c.dispose());
  }

  /**
   * Lower the render resolution if frames are slow, so older laptops and
   * phones stay playable. Steps down once per slow 3-second window.
   */
  watchPerformance(rawDt) {
    const p = this.perf;
    if (document.hidden || rawDt > 0.25) return;
    if (p.warmup > 0) { p.warmup -= rawDt; return; }
    p.acc += rawDt;
    p.n++;
    if (p.acc < 3) return;
    const avg = p.acc / p.n;
    p.acc = 0;
    p.n = 0;
    if (avg > 1 / 45 && p.level < 2) {
      p.level++;
      if (p.level === 2) {
        this.world.sun.shadow.mapSize.set(1024, 1024);
        if (this.world.sun.shadow.map) { this.world.sun.shadow.map.dispose(); this.world.sun.shadow.map = null; }
      }
      this.resize();
    }
  }

  // ------------------------------------------------------------ setup
  get stats() { return SPECIES[this.data.species]; }

  buildDino() {
    if (this.dino) { this.scene.remove(this.dino.group); this.dino.dispose(); }
    this.dino = new Dino(this.data.species);
    this.dino.group.position.set(REX_X, 0, 0);
    this.dino.setGolden(this.data.golden);
    this.scene.add(this.dino.group);
    this.buildBaby();
  }

  /**
   * Easter egg: a hatchling of the current species that trots alongside,
   * copying the dino's moves a beat late. Purely cosmetic, with no hitbox.
   */
  buildBaby(pop = false) {
    if (this.baby) { this.scene.remove(this.baby.group); this.baby.dispose(); this.baby = null; }
    if (!this.data.baby) return;
    this.baby = new Dino(this.data.species);
    this.baby.group.position.set(REX_X + BABY.dx, 0, BABY.z);
    this.baby.group.scale.setScalar(pop ? 0.01 : BABY.scale);
    this.baby.setGolden(this.data.golden);
    this.scene.add(this.baby.group);
    this.babyHist = [];
    this.babyPop = pop ? 0 : 1;
  }

  buildPreview() {
    if (this.preview) { this.scene.remove(this.preview.c.group); this.preview.c.dispose(); }
    const c = new Caveman(this.data.caveman);
    c.group.position.set(REX_X + 7.5, 0, RIVAL_Z + 0.4);
    c.group.rotation.y = -2.4; // turned to face the rex and the camera
    this.scene.add(c.group);
    this.preview = { c, exiting: false, x: REX_X + 7.5 };
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, [2, 1.25, 1][this.perf ? this.perf.level : 0]);
    this.renderer.setPixelRatio(this.data.retro ? 0.3 : dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const tanH = Math.tan(THREE.MathUtils.degToRad(CAMERA.fov / 2));
    const aspect = this.camera.aspect;
    const want = aspect >= 1 ? CAMERA.viewHalfWide : CAMERA.viewHalfTall;
    this.gameDist = Math.min(90, Math.max(26, want / (tanH * aspect)));
    this.viewHalf = this.gameDist * tanH * aspect;
    this.lookY = 3.0 + (aspect < 1 ? 2 : 0);
    // Put the dino at CAMERA.dinoScreenX across the screen.
    this.lookX = this.calibrate(CAMERA.dinoScreenX, this.viewHalf, (lx) => this.gamePose(lx));
    this.spawnX = this.lookX + this.viewHalf + 4;
    this.despawnX = this.lookX - this.viewHalf - 12;

    // Title shot: frame the dino and the caveman in the part of the screen
    // the title card leaves free (all of it on narrow screens, where the card sits below).
    const wide = w > 720;
    const card = document.querySelector('.title-card');
    const cardW = card && card.offsetWidth ? card.offsetWidth + Math.min(72, Math.max(16, w * 0.05)) * 2 : 460;
    const free = wide ? Math.max(0.35, (w - cardW) / w) : 1;
    const titleHalf = wide ? Math.max(9, 14 / (1.7 * free)) : 8;
    this.titleDist = Math.min(60, Math.max(14, titleHalf / (tanH * aspect)));
    this.titleLookY = wide ? 2.3 : 0.2 - (titleHalf / aspect) * 0.3;
    this.titleLookX = this.calibrate(free * CAMERA.titleDinoScreenX, titleHalf, (lx) => this.titlePose(lx, 0));
  }

  /** Camera pose during a run for a given look-at x. */
  gamePose(lookX) {
    const look = new THREE.Vector3(lookX, this.lookY, 0);
    return { look, pos: new THREE.Vector3(lookX - 3, this.lookY + 3.2, this.gameDist) };
  }

  /** Camera pose on the title screen; orbit swings it gently side to side. */
  titlePose(lookX, orbit) {
    const look = new THREE.Vector3(lookX, this.titleLookY, 0);
    return { look, pos: new THREE.Vector3(lookX + Math.sin(orbit) * this.titleDist - 2, 3.4, Math.cos(orbit) * this.titleDist) };
  }

  /**
   * Find the look-at x that puts the dino's body at screen fraction `frac`
   * (0 = left edge, 1 = right edge). The camera views the lane at a slight
   * angle, so this projects and corrects a few times instead of guessing.
   */
  calibrate(frac, half, poseFor) {
    const cam = this.camera.clone();
    const target = frac * 2 - 1;
    let lx = REX_X - target * half;
    const p = new THREE.Vector3();
    for (let i = 0; i < 4; i++) {
      const { look, pos } = poseFor(lx);
      cam.position.copy(pos);
      cam.lookAt(look);
      cam.updateMatrixWorld();
      p.set(REX_X, 1.6, 0).project(cam);
      lx += (p.x - target) * half;
    }
    return lx;
  }

  save() { save(this.data); }

  unlock(id) {
    if (this.data.achievements[id]) return;
    this.data.achievements[id] = Date.now();
    this.save();
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    sfx.achievement();
    this.hud.toast(a.name, a.desc, 'trophy', 3.2);
    this.hud.renderTrophies(this.data.achievements);
    track('trophy', { id, name: a.name, secret: !!a.secret, total: Object.keys(this.data.achievements).length });
  }

  // ------------------------------------------------------------ states
  setState(s) {
    this.state = s;
    this.stateT = 0;
    this.hud.showPause(s === 'paused');
    this.hud.showOver(false); // the game over card appears a beat after the knockout
    this.hud.showTitle(s === 'title');
    this.hud.setRunning(s === 'run');
  }

  startRun() {
    this.clearField();
    this.dino.revive();
    this.dino.setHat(false);
    this.world.nightTarget = 0;
    this.world.meteorTarget = 0;
    const stats = this.stats;
    this.r = {
      distance: 0, score: 0, bonus: 0, speed: speedAt(0), time: 0,
      body: { y: 0, vy: 0, onGround: true },
      nextSpawnAt: 18, milestone: 0, meter: 0, roarT: -1, chompT: -1,
      meteorIdx: 0, meteorUntil: -1, caveNext: CAVEMAN.first, kpg: false,
      shown404: false, newBest: false, lastNight: false, catches: 0, bonesTaken: 0,
    };
    this.hud.setMeter(0, stats.bonesForRoar, true);
    if (this.preview) this.preview.exiting = true;
    this.data.stats.runs++;
    track('run-start', { species: this.data.species, rival: this.data.caveman, golden: !!this.data.golden, hatchling: !!this.data.baby, retro: !!this.data.retro, run: this.data.stats.runs });
    this.unlock('first');
    if (!navigator.onLine) this.goneOffline();
    sfx.jump();
    this.setState('run');
  }

  clearField() {
    for (const o of [...this.obstacles, ...this.bones]) this.removeEntity(o);
    this.obstacles = [];
    this.bones = [];
    if (this.rival) { this.scene.remove(this.rival.c.group); this.rival.c.dispose(); this.rival = null; }
    this.particles.clear();
  }

  removeEntity(o) {
    this.scene.remove(o.group);
    o.group.traverse((m) => { if (m.geometry) m.geometry.dispose(); });
  }

  toTitle() {
    this.clearField();
    this.dino.revive();
    this.world.nightTarget = 0;
    this.world.meteorTarget = 0;
    this.buildPreview();
    this.hud.setMeter(0, 3, false);
    this.titleIdle = 0;
    this.setState('title');
  }

  die(cause = 'unknown') {
    const r = this.r;
    this.dino.knockOut();
    sfx.die();
    this.shake = 0.6;
    this.particles.dustBurst(new THREE.Vector3(REX_X, 0, 0), 14, 1.6);
    if (r.score > this.data.hi) { this.data.hi = r.score; r.newBest = true; }
    const best = (this.data.stats.best ||= {});
    best[this.data.species] = Math.max(best[this.data.species] || 0, r.score);
    if (SPECIES_ORDER.every((s) => (best[s] || 0) >= 500)) this.unlock('allthree');
    this.save();
    track('run-end', {
      species: this.data.species, rival: this.data.caveman, score: r.score, band: scoreBand(r.score), cause,
      seconds: Math.round(r.time), catches: r.catches, bones: r.bonesTaken, newBest: r.newBest,
    });
    this.setState('dead');
  }

  goneOffline() {
    this.world.setOffline(true);
    if (this.state === 'run' || this.state === 'title') {
      if (!this.data.achievements.truly) this.hud.toast('YOU ARE ACTUALLY OFFLINE', 'Respect. Keep an eye out for the sign.');
      if (this.state === 'run') this.unlock('truly');
    }
  }

  onEgg(name) {
    if (name === 'egg' && this.state === 'title') {
      this.data.baby = !this.data.baby;
      this.buildBaby(true);
      if (this.data.baby) {
        this.particles.sparkle(new THREE.Vector3(REX_X + BABY.titleDx, 0.6, BABY.z), 0xfff0c0, 16);
        sfx.pickup();
        this.hud.toast("IT'S HATCHING", 'A little one will run with you now. Type it again to send them to bed.');
        this.unlock('parent');
      } else {
        this.hud.toast('BEDTIME', 'The hatchling is taking a nap.');
      }
      this.save();
    }
    if (name === 'konami' && this.state === 'title') {
      this.input.cancelLast('left'); // the final A of the code should not change the dinosaur
      this.data.golden = !this.data.golden;
      this.dino.setGolden(this.data.golden);
      if (this.baby) this.baby.setGolden(this.data.golden);
      this.hud.setGoldenName(this.data.species, this.data.golden);
      this.hud.toast(this.data.golden ? 'SOLID GOLD' : 'BACK TO NORMAL', this.data.golden ? 'Every species is golden now. Enter the code again to undo.' : '');
      sfx.achievement();
      this.unlock('konami');
      this.save();
    }
    if (name === 'offline' && (this.state === 'title' || this.state === 'paused')) {
      this.data.retro = !this.data.retro;
      this.hud.setRetro(this.data.retro);
      this.resize();
      sfx.modem();
      this.hud.toast(this.data.retro ? 'RETRO MODE' : 'FULL COLOR', this.data.retro ? 'Just like the original. Type it again to go back.' : '');
      this.unlock('retro');
      this.save();
    }
  }

  // ------------------------------------------------------------ input
  handleActions() {
    const acts = this.input.drain();
    for (const a of acts) {
      if (a === 'mute') {
        this.data.muted = !this.data.muted;
        setMuted(this.data.muted);
        this.hud.setMuted(this.data.muted);
        this.save();
        continue;
      }
      if (a === 'arms') {
        this.flailT = 0.7;
        this.armCount++;
        if (this.armCount === 10) this.unlock('arms');
        continue;
      }
      if (this.hud.trophiesOpen()) {
        if (a === 'trophies' || a === 'pause') this.hud.toggleTrophies(false);
        continue;
      }
      if (a === 'trophies' && this.state !== 'run') { this.hud.renderTrophies(this.data.achievements); this.hud.toggleTrophies(true); continue; }

      if (this.state === 'title') {
        if (this.titleIdle > SLEEP_AFTER) sfx.yawn();
        this.titleIdle = 0;
        if (a === 'left' || a === 'right') {
          const i = SPECIES_ORDER.indexOf(this.data.species);
          this.data.species = SPECIES_ORDER[(i + (a === 'right' ? 1 : -1) + 3) % 3];
          this.buildDino();
          this.hud.setSpecies(this.data.species);
          this.hud.setGoldenName(this.data.species, this.data.golden);
          sfx.menu();
          this.save();
        } else if (a === 'up' || a === 'down') {
          const i = CAVEMAN_ORDER.indexOf(this.data.caveman);
          this.data.caveman = CAVEMAN_ORDER[(i + (a === 'up' ? 1 : -1) + 3) % 3];
          this.buildPreview();
          this.hud.setCaveman(this.data.caveman);
          sfx.menu();
          this.save();
        } else if (a === 'jump' || a === 'start' || a === 'tap') {
          this.startRun();
        }
      } else if (this.state === 'run') {
        if (a === 'pause' || a === 'blur') this.setState('paused');
        else if (a === 'roar' || a === 'right') this.tryRoar();
        else if (a === 'jump' || a === 'up' || a === 'tap') this.r.jumpQueued = true;
      } else if (this.state === 'paused') {
        if (a === 'pause' || a === 'jump' || a === 'start' || a === 'tap' || a === 'up') this.setState('run');
      } else if (this.state === 'dead') {
        if (this.stateT < 0.6) continue;
        if (a === 'jump' || a === 'start' || a === 'tap' || a === 'up') this.startRun();
        else if (a === 'pause') this.toTitle();
      }
    }
  }

  // ------------------------------------------------------------ spawning
  /** Seconds a thrown rock is in the air, so it lands about throwReach behind him. */
  throwFlight() {
    return Math.max(CAVEMAN.throwMinFlight, CAVEMAN.throwReach / this.r.speed);
  }

  /**
   * Can the caveman fill the next obstacle slot with a throw? The slot is
   * planned like any obstacle and starts, invisible, at the spawn line. When it
   * passes him he throws back over his shoulder and the rock lands on the slot.
   * Only allow it if that landing spot will still be well ahead of the dino.
   */
  rivalCanThrow() {
    const R = this.rival;
    if (!R || R.mode !== 'run' || this.state !== 'run') return false;
    if (this.obstacles.some((o) => o.pending)) return false;
    const r = this.r;
    const pace = CAVEMAN.approach * (1 + R.panic * 0.8);
    const tMeet = Math.max(0, (this.spawnX - R.x) / Math.max(1, r.speed - pace));
    const landX = R.x - pace * tMeet - 0.5 - r.speed * this.throwFlight();
    const nose = REX_X + this.stats.stand.x + this.stats.stand.w;
    return landX > nose + 5;
  }

  spawnObstacle() {
    const r = this.r;
    const stats = this.stats;
    const force404 = !r.shown404 && r.score >= 395 && r.score < 460;
    const canThrow = this.rivalCanThrow();
    const spec = nextObstacle({
      score: r.score, speed: r.speed, stats, meteor: r.meteorUntil > r.time, force404,
      canThrow, mustThrow: canThrow && this.rival.planned === 0,
    }, this.rng);
    const extra = spec.type === 'ptero' ? PTERO_EXTRA_SPEED : 0;
    if (force404) r.shown404 = true;
    let built;
    let router = false;
    const pending = spec.type === 'proj';
    if (spec.type === 'ptero') { router = this.rng() < 1 / 6; built = makePtero(router); }
    else if (spec.type === 'crater') built = makeCrater();
    else if (pending) { built = makeProjectile(this.rival.skin.projectile); built.group.visible = false; this.rival.planned++; }
    else built = makeCactus(spec, Math.floor(this.rng() * 1000));
    built.group.position.set(this.spawnX, spec.y, 0);
    this.scene.add(built.group);
    this.obstacles.push({
      kind: spec.type, x: this.spawnX, y: spec.y, w: spec.w, h: spec.h, extra, group: built.group, anim: built.animate,
      debris: built.debris, solid: !pending, pending, flight: null, passed: false, sign: spec.sign, router, flee: null,
    });
    const gap = gapAfter(stats, r.speed, this.rng);
    const bone = maybeBone(gap, this.rng);
    if (bone) this.spawnBone(this.spawnX + spec.w + bone.offset, bone.y);
    r.nextSpawnAt = r.distance + spec.w + gap;
  }

  spawnBone(x, y) {
    const b = makeBone();
    b.group.position.set(x, y, 0);
    this.scene.add(b.group);
    this.bones.push({ kind: 'bone', x, y, w: BONE.size, h: BONE.size, group: b.group, anim: b.animate });
  }

  // ------------------------------------------------------------ roar
  tryRoar() {
    const r = this.r;
    const stats = this.stats;
    if (r.meter < stats.bonesForRoar || r.roarT >= 0) return;
    r.meter = 0;
    r.roarT = 0;
    this.hud.setMeter(0, stats.bonesForRoar, true);
    sfx.roar(stats.roarPitch);
    this.shake = Math.max(this.shake, 0.5);
    this.fovKick = 1;
    this.data.stats.roars++;
    this.unlock('roar');
    const front = REX_X + stats.stand.x;
    const targets = this.obstacles
      .filter((o) => o.solid && o.kind !== 'crater' && o.x + o.w > front && o.x < REX_X + 26)
      .sort((a, b) => a.x - b.x)
      .slice(0, stats.roarShatter);
    const hit = new Set(targets);
    if (stats.roarScaresBirds) this.obstacles.filter((o) => o.kind === 'ptero' && o.solid).forEach((o) => hit.add(o));
    setTimeout(() => {
      for (const o of hit) {
        if (!o.solid) continue;
        o.solid = false;
        if (o.router) {
          this.unlock('router');
          this.hud.toast('RECONNECTED', 'The pterodactyl dropped the router. Signal restored, briefly.');
        }
        if (o.kind === 'ptero') {
          o.flee = { vy: 6 + Math.random() * 4, vx: 10 };
        } else {
          this.particles.shatter(new THREE.Vector3(o.x + o.w / 2, o.y + 0.4, 0), o.debris, o.kind === 'proj' ? 10 : 22);
          sfx.shatter();
          o.dead = true;
        }
      }
    }, 180);
    if (this.rival && this.rival.mode === 'run' && this.rival.x < REX_X + 16) {
      this.rival.panic = 2.5;
      this.rival.yellT = 0.8;
      sfx.yell();
    }
    if (this.data.species === 'trike') this.particles.dustBurst(new THREE.Vector3(REX_X - 1, 0, 0), 16, 1.8);
  }

  roarEnvelope() {
    if (!this.r) return 0;
    const env = (t) => (t < 0 ? 0 : t < 0.15 ? t / 0.15 : t < 0.8 ? 1 : Math.max(0, 1 - (t - 0.8) / 0.3));
    return Math.max(env(this.r.roarT), this.r.chompT >= 0 ? 0.7 * env(this.r.chompT + 0.5) : 0);
  }

  // ------------------------------------------------------------ rival
  spawnRival() {
    if (this.preview) { this.scene.remove(this.preview.c.group); this.preview.c.dispose(); this.preview = null; }
    const skin = CAVEMAN_SKINS[this.data.caveman];
    const c = new Caveman(this.data.caveman);
    const x = this.spawnX - 3;
    c.group.position.set(x, 0, RIVAL_Z);
    this.scene.add(c.group);
    this.rival = { c, skin, x, y: 0, vy: 0, mode: 'run', planned: 0, thrown: 0, throwAnim: 0, cyc: 0, panic: 0, yellT: 0, tumbleT: 0 };
    sfx.yell();
    const thing = { rock: 'rocks', snowball: 'snowballs', mug: 'coffee mugs' }[skin.projectile];
    this.hud.toast(`${skin.name.toUpperCase()} APPEARS`, `Catch him for +${CAVEMAN.bonus}. He throws ${thing}.`);
  }

  updateRival(dt) {
    const R = this.rival;
    if (!R) return;
    const r = this.r;
    const stats = this.stats;
    let glance = 0;
    let yell = 0;
    if (R.mode === 'run') {
      R.x -= CAVEMAN.approach * (1 + R.panic * 0.8) * dt;
      R.panic = Math.max(0, R.panic - dt);
      if (R.y === 0) {
        for (const o of this.obstacles) {
          if (o.solid && o.y < 2 && o.x < R.x + 1.8 && o.x + o.w > R.x - 0.4) { R.vy = 13; break; }
        }
      }
      R.vy -= 42 * dt;
      R.y = Math.max(0, R.y + R.vy * dt);
      if (R.y === 0) R.vy = 0;

      // Throw when a reserved slot is one flight time behind him.
      for (const o of this.obstacles) {
        if (o.pending && o.x <= R.x - 0.5) {
          o.pending = false;
          o.flight = { t: 0, dur: this.throwFlight(), from: new THREE.Vector3(R.x - 0.2, R.y + 2.4, RIVAL_Z + 0.5) };
          o.group.visible = true;
          R.throwAnim = 0.35;
          R.thrown++;
          sfx.throwIt();
        }
      }
      R.throwAnim = Math.max(0, R.throwAnim - dt);

      R.cyc += dt;
      const c = R.cyc % 3;
      glance = smooth((c - 1.2) / 0.3) * (1 - smooth((c - 2.4) / 0.3));
      if (c - dt < 1.5 && c >= 1.5) sfx.yell();
      yell = glance;
      if (R.yellT > 0) { R.yellT -= dt; glance = 1; yell = 1; }
      if (R.throwAnim > 0) glance = Math.max(glance, 0.8); // look back to aim

      const nose = REX_X + stats.stand.x + stats.stand.w + 0.5;
      if (R.x <= nose && this.state === 'run') {
        R.mode = 'tumble';
        r.bonus += CAVEMAN.bonus;
        r.chompT = 0; // a quick chomp that does not use up the roar
        sfx.caught();
        this.shake = Math.max(this.shake, 0.35);
        this.particles.dustBurst(new THREE.Vector3(R.x, 0.2, RIVAL_Z), 16, 1.6);
        this.hud.toast('CHOMP!', `+${CAVEMAN.bonus} points. He'll be back.`);
        this.data.stats.catches++;
        r.catches++;
        if (r.catches >= 3) this.unlock('chomper');
        this.unlock('lunch');
        track('caveman-caught', { species: this.data.species, rival: this.data.caveman, score: r.score, catchInRun: r.catches });
        r.caveNext = r.score + CAVEMAN.gapMin + this.rng() * CAVEMAN.gapRand;
      }
    } else {
      R.tumbleT += dt / 1.3;
      R.x -= r.speed * 0.6 * dt;
      if (R.tumbleT >= 1) {
        this.scene.remove(R.c.group);
        R.c.dispose();
        this.rival = null;
        return;
      }
    }
    R.c.group.position.set(R.x, R.y, RIVAL_Z);
    R.c.update(dt, {
      mode: R.mode === 'run' ? 'run' : 'tumble', air: R.y > 0.05 ? 1 : 0, glance, yell,
      throw: R.throwAnim > 0 ? 1 - R.throwAnim / 0.35 : 0, tumbleT: R.tumbleT,
    });
  }


  // ------------------------------------------------------------ events
  onImpact(big) {
    sfx.boom(big);
    if (big && this.state === 'run' && this.r) {
      this.hud.whiteout(900);
      this.shake = 1.2;
      this.dino.setHat(true);
      this.r.bonus += 660;
      this.unlock('kpg');
      setTimeout(() => this.hud.toast('YOU SURVIVED THE K-PG BOUNDARY', '+660 points and a party hat. Paleontologists are confused.', '', 4), 700);
    }
  }

  // ------------------------------------------------------------ step
  step(dt) {
    const r = this.r;
    const stats = this.stats;
    r.time += dt;
    r.speed = speedAt(r.distance);

    const duckHeld = this.input.held.duck;
    const res = stepBody(r.body, { jumpPressed: !!r.jumpQueued, jumpHeld: this.input.held.jump, duckHeld }, stats, dt);
    r.jumpQueued = false;
    if (res.jumped) sfx.jump();
    if (res.landed) {
      sfx.land();
      this.particles.dustBurst(new THREE.Vector3(REX_X + 0.5, 0, 0), 6, 0.8);
      if (stats.id === 'trike') this.shake = Math.max(this.shake, 0.12);
    }

    r.distance += r.speed * dt;
    r.score = scoreAt(r.distance) + r.bonus;
    const ms = Math.floor(r.score / 100);
    if (ms > r.milestone) { r.milestone = ms; sfx.point(); this.hud.flashScore(); }
    if (r.score >= 1000) this.unlock('k1');
    if (r.score >= 2000 && r.bonesTaken === 0) this.unlock('bonedry');

    // Day and night
    const night = isNight(r.score);
    if (night !== r.lastNight) {
      r.lastNight = night;
      if (night) this.world.setMoonPhase(nightIndex(r.score));
    }
    this.world.nightTarget = night ? 1 : 0;

    // Meteor showers
    if (meteorCount(r.score) > r.meteorIdx) {
      r.meteorIdx = meteorCount(r.score);
      r.meteorUntil = r.time + METEOR.duration;
      this.world.meteorTarget = 1;
      this.hud.toast('METEOR SHOWER', 'Craters ahead. Jump them.', 'warn', 3);
    }
    if (r.meteorUntil > 0 && r.time > r.meteorUntil) {
      r.meteorUntil = -1;
      this.world.meteorTarget = 0;
      this.unlock('meteor');
    }
    if (!r.kpg && r.score >= EXTINCTION_SCORE) {
      r.kpg = true;
      this.world.launchMeteor(true);
      this.hud.toast('EXTINCTION EVENT', 'Do not look up. Keep running.', 'warn', 3);
    }

    // Caveman
    if (!this.rival && r.score >= r.caveNext && r.meteorUntil < 0) this.spawnRival();
    this.updateRival(dt);

    // Spawning
    if (r.distance >= r.nextSpawnAt) this.spawnObstacle();

    // Roar timer
    if (r.roarT >= 0) { r.roarT += dt; if (r.roarT > 1.1) r.roarT = -1; }
    if (r.chompT >= 0) { r.chompT += dt; if (r.chompT > 0.6) r.chompT = -1; }

    // Move and collide
    const ducking = duckHeld && r.body.onGround;
    const raw = dinoBox(stats, REX_X, r.body.y, ducking);
    const me = shrink(raw, HIT_FORGIVE);
    for (const o of this.obstacles) {
      let sweep = 0;
      if (o.flee) {
        o.flee.vy += 6 * dt;
        o.x += o.flee.vx * dt - r.speed * dt * 0.3;
        o.y += o.flee.vy * dt;
      } else {
        sweep = (r.speed + o.extra) * dt;
        o.x -= sweep;
      }
      if (o.pending && (!this.rival || this.rival.mode !== 'run')) o.dead = true; // he was caught first
      if (o.flight) {
        const f = o.flight;
        f.t += dt / f.dur;
        const k = Math.min(1, f.t);
        o.group.position.set(f.from.x + (o.x - f.from.x) * k, f.from.y * (1 - k) + 2.2 * Math.sin(Math.PI * k), f.from.z * (1 - k));
        if (Math.random() < dt * 30) {
          this.particles.spawn('dust', o.group.position.clone().add(new THREE.Vector3(0.35, 0.35, 0)), { vy: 0.3, size: 0.25, life: 0.35, color: o.debris });
        }
        if (k >= 1) {
          o.flight = null;
          o.solid = true;
          o.anim = null; // stop spinning once it lands
          this.particles.dustBurst(new THREE.Vector3(o.x + o.w / 2, 0, 0), 5, 0.7);
          sfx.land();
        }
      } else {
        o.group.position.set(o.x, o.y, 0);
      }
      // The box is stretched back over this frame's travel so a slow frame cannot tunnel through it.
      const sweptBox = { x: o.x, y: o.y, w: o.w + sweep, h: o.h };
      if (o.solid && overlaps(me, shrink(sweptBox, HIT_FORGIVE))) { this.die(o.kind === 'proj' ? `thrown-${this.data.caveman}` : o.kind); return; }
      // Touched the unforgiving box but not the real one: a near miss.
      if (o.solid && !o.grazed && overlaps(raw, o)) o.grazed = true;
      if (!o.passed && o.x + o.w < me.x) {
        o.passed = true;
        if (o.sign === '404') this.unlock('notfound');
        if (o.grazed) this.unlock('shave');
      }
    }
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      if (o.dead || o.x < this.despawnX || o.y > 40) { this.removeEntity(o); this.obstacles.splice(i, 1); }
    }

    // Bones
    const grab = dinoBox(stats, REX_X, r.body.y, ducking);
    for (let i = this.bones.length - 1; i >= 0; i--) {
      const b = this.bones[i];
      b.x -= r.speed * dt;
      b.group.position.x = b.x;
      if (overlaps(grab, b)) {
        this.particles.sparkle(new THREE.Vector3(b.x + 0.45, b.y + 0.45, 0));
        this.removeEntity(b);
        this.bones.splice(i, 1);
        if (r.meter < stats.bonesForRoar) {
          r.meter++;
          r.bonesTaken++;
          if (r.meter === stats.bonesForRoar) { sfx.roarReady(); this.hud.toast('ROAR READY', 'Press D or the right arrow to clear the way.'); }
          else sfx.pickup();
        } else sfx.pickup();
        this.hud.setMeter(r.meter, stats.bonesForRoar, true);
      } else if (b.x < this.despawnX) {
        this.removeEntity(b);
        this.bones.splice(i, 1);
      }
    }

    // Running dust
    if (r.body.onGround && Math.random() < dt * (stats.id === 'trike' ? 14 : 8)) {
      this.particles.spawn('dust', new THREE.Vector3(REX_X - 0.5 + Math.random(), 0.1, (Math.random() - 0.5) * 1.2), {
        vx: -2, vy: 0.6 + Math.random(), size: 0.3 + Math.random() * 0.25, life: 0.5,
      });
    }
  }

  // ------------------------------------------------------------ frame
  frame(now) {
    const rawDt = (now - this.last) / 1000;
    const dt = Math.min(0.05, rawDt);
    this.last = now;
    this.watchPerformance(rawDt);
    this.t += dt;
    this.stateT += dt;
    this.handleActions();

    let speed = 0;
    if (this.state === 'run') {
      this.step(dt);
      speed = this.state === 'run' ? this.r.speed : 0;
    }
    if (this.state === 'title') this.titleIdle += dt;
    if (this.state === 'title' && this.titleIdle > SLEEP_AFTER + 5) this.unlock('nap');
    if (this.state === 'dead' && this.stateT > 0.35 && this.hud.el.over.hidden) this.hud.showOver(true, this.r.score, this.r.newBest);

    const paused = this.state === 'paused';
    const worldDt = paused ? 0 : dt;
    this.world.update(worldDt, speed, { running: this.state === 'run' });
    this.particles.update(worldDt, speed);
    for (const o of this.obstacles) if (o.anim) o.anim(worldDt);
    for (const b of this.bones) b.anim(worldDt);
    this.updateStargaze(dt);
    if (paused) {
      this.updateCamera(dt);
      this.renderer.render(this.scene, this.camera);
      return requestAnimationFrame((n) => this.frame(n));
    }

    // Dino pose
    this.flailT = Math.max(0, this.flailT - dt);
    let mode = 'idle';
    let y = 0;
    if (this.state === 'run') {
      const r = this.r;
      y = r.body.y;
      mode = !r.body.onGround ? 'air' : this.input.held.duck ? 'duck' : 'run';
    } else if (this.state === 'dead') {
      mode = 'dead';
      y = this.r.body.y * Math.max(0, 1 - this.stateT * 4);
    } else if (this.state === 'title' && this.titleIdle > SLEEP_AFTER) {
      mode = 'sleep';
    }
    this.dino.group.position.y = y;
    this.dino.update(dt, { mode, speed, roar: this.roarEnvelope(), flail: this.flailT > 0 ? 1 : 0 });
    this.updateBaby(dt, mode, y, speed);

    // Title rival preview
    if (this.preview) {
      const p = this.preview;
      if (p.exiting) {
        p.x += (speed * 0.5 + 12) * dt;
        p.c.group.rotation.y *= Math.exp(-dt * 10);
        if (p.x > this.spawnX + 4) { this.scene.remove(p.c.group); p.c.dispose(); this.preview = null; }
      }
      if (this.preview) {
        p.c.group.position.x = p.x;
        p.c.update(dt, { mode: p.exiting ? 'run' : 'idle', glance: 0, yell: p.exiting ? 0 : Math.max(0, Math.sin(this.t * 1.3)) * 0.5 });
      }
    }

    this.hud.setNight(this.world.night > 0.5);
    if (this.r) this.hud.setScore(this.state === 'title' ? 0 : this.r.score, this.data.hi);
    this.updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame((n) => this.frame(n));
  }

  /** The hatchling copies the dino's pose from a few frames ago. */
  updateBaby(dt, mode, y, speed) {
    if (!this.baby) return;
    this.babyHist.push({ mode, y });
    while (this.babyHist.length > BABY.lag) this.babyHist.shift();
    const h = this.babyHist[0];
    const bmode = h.mode === 'dead' ? 'idle' : h.mode;
    this.babyPop = Math.min(1, this.babyPop + dt * 2.5);
    const pop = this.babyPop < 1 ? 1 + Math.sin(this.babyPop * Math.PI) * 0.35 : 1;
    this.baby.group.scale.setScalar(BABY.scale * Math.min(1, this.babyPop * 1.5) * pop);
    this.baby.group.position.x = REX_X + BABY.titleDx + (BABY.dx - BABY.titleDx) * smooth(this.camBlend);
    this.baby.group.position.y = h.y * 0.85;
    // Shorter legs take faster steps.
    this.baby.update(dt, { mode: bmode, speed: speed / BABY.scale, roar: this.roarEnvelope() * 0.8, flail: this.flailT > 0 ? 1 : 0 });
  }

  /**
   * Easter egg: stay paused at night and the camera tilts up to a
   * constellation shaped like the game's own roaring rex.
   */
  updateStargaze(dt) {
    const night = this.world.night > 0.8;
    this.pausedFor = this.state === 'paused' && night ? this.pausedFor + dt : 0;
    const target = this.pausedFor > STARGAZE.after ? 1 : 0;
    this.gaze += (target - this.gaze) * Math.min(1, dt * (target ? 0.5 : 4));
    if (this.gaze < 0.001) this.gaze = 0;
    this.world.setConstellation(smooth((this.gaze - 0.45) / 0.55));
    this.hud.setStargazing(this.gaze > 0.15);
    if (this.gaze > 0.93) this.unlock('stargazer');
  }

  updateCamera(dt) {
    const toGame = this.state === 'title' ? 0 : 1;
    this.camBlend += (toGame - this.camBlend) * Math.min(1, dt * 2.2);
    const deadT = this.state === 'dead' ? 1 : 0;
    this.deadBlend += (deadT - this.deadBlend) * Math.min(1, dt * 1.5);
    const k = smooth(this.camBlend);

    const orbit = Math.sin(this.t * 0.25) * 0.22;
    const { look: tLook, pos: tPos } = this.titlePose(this.titleLookX, orbit);
    const { look: gLook, pos: gPos } = this.gamePose(this.lookX);
    // On death, drift toward the rex.
    gLook.lerp(new THREE.Vector3(REX_X + 2, 2, 0), this.deadBlend * 0.5);
    gPos.lerp(new THREE.Vector3(REX_X + 1, 4, this.gameDist * 0.55), this.deadBlend * 0.5);

    const look = tLook.lerp(gLook, k);
    look.y += smooth(this.gaze) * STARGAZE.lookUp;
    const pos = tPos.lerp(gPos, k);
    this.shake *= Math.exp(-dt * 5);
    const s = (this.shake + this.world.shake) * (this.reduceMotion ? 0.2 : 1);
    pos.x += (Math.random() - 0.5) * s;
    pos.y += (Math.random() - 0.5) * s;
    this.camera.position.copy(pos);
    this.camera.lookAt(look);
    this.fovKick *= Math.exp(-dt * 3);
    const fov = CAMERA.fov - (this.reduceMotion ? 0 : this.fovKick * 3);
    if (Math.abs(this.camera.fov - fov) > 0.01) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
  }
}
