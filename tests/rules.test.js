import { describe, it, expect } from 'vitest';
import { SPECIES, REX_X, PTERO_EXTRA_SPEED } from '../src/config.js';
import { stepBody, apex, timeAbove, airtime } from '../src/logic/physics.js';
import { overlaps, shrink, dinoBox } from '../src/logic/collide.js';
import {
  nextObstacle, gapAfter, clearable, duckable, runUnder, speedAt, scoreAt, isNight, nightIndex,
  meteorCount, mulberry32, HIT_FORGIVE,
} from '../src/logic/rules.js';

const species = Object.values(SPECIES);

describe('physics', () => {
  it('numeric integration matches the analytic apex', () => {
    for (const s of species) {
      const body = { y: 0, vy: 0, onGround: true };
      let top = 0;
      stepBody(body, { jumpPressed: true, jumpHeld: true }, s, 0);
      for (let i = 0; i < 2000 && !body.onGround; i++) {
        stepBody(body, { jumpHeld: true }, s, 1 / 1000);
        top = Math.max(top, body.y);
      }
      expect(top).toBeCloseTo(apex(s), 1);
    }
  });

  it('releasing early gives a lower jump', () => {
    const s = SPECIES.rex;
    const body = { y: 0, vy: 0, onGround: true };
    stepBody(body, { jumpPressed: true }, s, 0);
    let top = 0;
    for (let i = 0; i < 2000 && !body.onGround; i++) {
      stepBody(body, { jumpHeld: false }, s, 1 / 1000);
      top = Math.max(top, body.y);
    }
    expect(top).toBeLessThan(apex(s) * 0.6);
  });

  it('every species clears a single large cactus at the start speed', () => {
    for (const s of species) expect(apex(s)).toBeGreaterThan(3);
  });
});

describe('collision', () => {
  it('detects overlap and misses', () => {
    expect(overlaps({ x: 0, y: 0, w: 1, h: 1 }, { x: 0.5, y: 0.5, w: 1, h: 1 })).toBe(true);
    expect(overlaps({ x: 0, y: 0, w: 1, h: 1 }, { x: 1, y: 0, w: 1, h: 1 })).toBe(false);
  });
  it('shrink never produces negative sizes', () => {
    const b = shrink({ x: 0, y: 0, w: 0.1, h: 0.1 }, 1);
    expect(b.w).toBe(0);
    expect(b.h).toBe(0);
  });
});

describe('rules', () => {
  it('speed ramps and caps', () => {
    expect(speedAt(0)).toBe(12);
    expect(speedAt(1e9)).toBe(30);
  });
  it('day and night alternate every 700 points', () => {
    expect(isNight(0)).toBe(false);
    expect(isNight(700)).toBe(true);
    expect(isNight(1400)).toBe(false);
    expect(nightIndex(700)).toBe(0);
    expect(nightIndex(2100)).toBe(1);
  });
  it('meteor showers start at 1500 then every 2000', () => {
    expect(meteorCount(1499)).toBe(0);
    expect(meteorCount(1500)).toBe(1);
    expect(meteorCount(3499)).toBe(1);
    expect(meteorCount(3500)).toBe(2);
  });

  it('never spawns an obstacle the chosen species cannot pass', () => {
    const rng = mulberry32(7);
    for (const s of species) {
      for (let score = 0; score < 9000; score += 37) {
        const speed = speedAt(score / 0.75);
        const o = nextObstacle({ score, speed, stats: s, meteor: score % 2 === 0, canThrow: score % 3 === 0 }, rng);
        const v = o.type === 'ptero' ? speed + PTERO_EXTRA_SPEED : speed;
        expect(clearable(s, o, v) || duckable(s, o) || runUnder(s, o)).toBe(true);
      }
    }
  });

  it('gaps leave room to land before the next jump', () => {
    const rng = mulberry32(3);
    for (const s of species) {
      for (let v = 12; v <= 30; v += 2) expect(gapAfter(s, v, rng)).toBeGreaterThan(v * airtime(s));
    }
  });
});

// A bot that plays with perfect timing using the same rules as the game.
// If it survives, every spawn pattern is beatable.
function simulate(stats, seed, targetScore) {
  const rng = mulberry32(seed);
  const dt = 1 / 120;
  const body = { y: 0, vy: 0, onGround: true };
  let distance = 0;
  const obstacles = [];
  let nextAt = 40;
  while (scoreAt(distance) < targetScore) {
    const speed = speedAt(distance);
    const score = scoreAt(distance);
    if (distance >= nextAt) {
      // Mix in meteor craters and caveman throws so every obstacle type is exercised.
      const o = nextObstacle({ score, speed, stats, meteor: score % 1000 > 700, canThrow: score % 900 < 150 }, rng);
      o.x = REX_X + 45;
      o.v = o.type === 'ptero' ? speed + PTERO_EXTRA_SPEED : speed;
      obstacles.push(o);
      nextAt = distance + o.w + gapAfter(stats, speed, rng);
    }
    // Decide
    const ahead = obstacles.find((o) => o.x + o.w > REX_X + stats.stand.x);
    let jumpPressed = false;
    let duckHeld = false;
    if (ahead) {
      if (runUnder(stats, ahead)) {
        /* keep running */
      } else if (duckable(stats, ahead) && !clearable(stats, ahead, ahead.v)) {
        duckHeld = ahead.x - (REX_X + stats.duck.x + stats.duck.w) < ahead.v * 0.4;
      } else if (body.onGround) {
        const h = ahead.y + ahead.h - HIT_FORGIVE * 1.5;
        const tA = timeAbove(stats, h);
        const tUp = (stats.jumpV - Math.sqrt(Math.max(0, stats.jumpV ** 2 - 2 * stats.gHold * h))) / stats.gHold;
        const box = shrink(dinoBox(stats, REX_X, 0, false), HIT_FORGIVE);
        const ob = shrink(ahead, HIT_FORGIVE);
        const tS = (ob.x - (box.x + box.w)) / ahead.v;
        const tE = (ob.x + ob.w - box.x) / ahead.v;
        const slack = tA - (tE - tS);
        if (tS - tUp <= slack / 2) jumpPressed = true;
      }
    }
    stepBody(body, { jumpPressed, jumpHeld: true, duckHeld: duckHeld && body.onGround }, stats, dt);
    for (const o of obstacles) o.x -= o.v * dt;
    while (obstacles.length && obstacles[0].x + obstacles[0].w < REX_X - 10) obstacles.shift();
    const me = shrink(dinoBox(stats, REX_X, body.y, duckHeld && body.onGround), HIT_FORGIVE);
    for (const o of obstacles) if (overlaps(me, shrink(o, HIT_FORGIVE))) return { died: true, score };
    distance += speed * dt;
  }
  return { died: false, score: scoreAt(distance) };
}

describe('fairness', () => {
  for (const s of species) {
    it(`a perfect ${s.name} survives to 8000 points`, () => {
      for (const seed of [1, 2, 3]) expect(simulate(s, seed, 8000)).toEqual({ died: false, score: expect.any(Number) });
    });
  }
});

describe('caveman throws', () => {
  it('fill slots when he can throw and never otherwise', () => {
    const rng = mulberry32(11);
    let thrown = 0;
    for (let i = 0; i < 400; i++) {
      const o = nextObstacle({ score: 800, speed: 18, stats: SPECIES.rex, canThrow: true }, rng);
      if (o.type === 'proj') thrown++;
    }
    expect(thrown).toBeGreaterThan(150);
    for (let i = 0; i < 400; i++) {
      expect(nextObstacle({ score: 800, speed: 18, stats: SPECIES.rex, canThrow: false }, rng).type).not.toBe('proj');
    }
  });
  it('mustThrow always throws', () => {
    const rng = mulberry32(5);
    for (let i = 0; i < 50; i++) {
      expect(nextObstacle({ score: 800, speed: 18, stats: SPECIES.raptor, canThrow: true, mustThrow: true }, rng).type).toBe('proj');
    }
  });
});
