// Pure game rules: speed, scoring, spawning, event timing. No Three.js here.
import {
  SPEED, SCORE_PER_UNIT, DAY_NIGHT, METEOR, OBSTACLE, PTERO_FROM, PTERO_Y, PTERO_EXTRA_SPEED, BONE, CAVEMAN,
} from '../config.js';
import { airtime, timeAbove } from './physics.js';

export const HIT_FORGIVE = 0.15;

export function speedAt(distance) {
  return Math.min(SPEED.max, SPEED.start + distance * SPEED.perUnit);
}

export function scoreAt(distance) {
  return Math.floor(distance * SCORE_PER_UNIT);
}

export function isNight(score) {
  return Math.floor(score / DAY_NIGHT.cycle) % 2 === 1;
}

/** Which night this is (0-based), used for the moon phase. */
export function nightIndex(score) {
  return Math.floor(Math.floor(score / DAY_NIGHT.cycle) / 2);
}

export function meteorStartsAt(n) {
  return METEOR.first + n * METEOR.every;
}

/** Number of meteor showers that should have started by this score. */
export function meteorCount(score) {
  if (score < METEOR.first) return 0;
  return 1 + Math.floor((score - METEOR.first) / METEOR.every);
}

/**
 * Can the given species clear an obstacle of this size at this speed?
 * The rex must stay above the obstacle's top for the whole overlap.
 */
export function clearable(stats, obstacle, speed) {
  const eff = { w: obstacle.w - HIT_FORGIVE * 2, h: obstacle.h - HIT_FORGIVE * 1.5 };
  const need = (eff.w + stats.stand.w - HIT_FORGIVE * 2) / speed;
  return timeAbove(stats, obstacle.y + eff.h) > need * 1.08;
}

/** Duckable if the ducking box fits under the bottom of the obstacle. */
export function duckable(stats, obstacle) {
  return stats.duck.h - HIT_FORGIVE * 1.5 < obstacle.y + HIT_FORGIVE * 0.5;
}

/** Can the standing rex run under it? */
export function runUnder(stats, obstacle) {
  return stats.stand.h - HIT_FORGIVE * 1.5 < obstacle.y + HIT_FORGIVE * 0.5;
}

function cactusGroup(kind, n) {
  const d = OBSTACLE[kind];
  return { type: kind, count: n, w: d.w + (n - 1) * d.step, h: d.h, y: 0 };
}

/**
 * Pick the next obstacle. rng returns floats in [0, 1).
 * ctx: { score, speed, stats, meteor, force404, canThrow, mustThrow }
 * Always returns something the current species can get past.
 */
export function nextObstacle(ctx, rng) {
  const { score, speed, stats } = ctx;
  if (ctx.force404) return { ...cactusGroup('cactusL', 1), sign: '404' };

  // The caveman's throws are planned slots like any other obstacle, so the
  // usual gap rules keep them fair.
  if (ctx.canThrow && (ctx.mustThrow || rng() < CAVEMAN.throwChance)) {
    return { type: 'proj', count: 1, w: OBSTACLE.rock.w, h: OBSTACLE.rock.h, y: 0 };
  }

  if (ctx.meteor && rng() < 0.4) {
    return { type: 'crater', count: 1, w: OBSTACLE.crater.w, h: OBSTACLE.crater.h, y: 0 };
  }

  if (score >= PTERO_FROM && speed > 14 && rng() < 0.22) {
    const heights = ['low', 'mid', 'high'];
    const which = heights[Math.floor(rng() * 3)];
    const o = { type: 'ptero', count: 1, w: OBSTACLE.ptero.w, h: OBSTACLE.ptero.h, y: PTERO_Y[which], height: which };
    if (clearable(stats, o, speed + PTERO_EXTRA_SPEED) || duckable(stats, o) || runUnder(stats, o)) return o;
  }

  const kind = rng() < 0.55 ? 'cactusS' : 'cactusL';
  // Bigger groups only once the game is fast enough to make them fair.
  const maxN = speed < 15 ? 1 : speed < 19 ? 2 : 3;
  let n = 1 + Math.floor(rng() * maxN);
  let o = cactusGroup(kind, n);
  while (n > 1 && !clearable(stats, o, speed)) o = cactusGroup(kind, --n);
  if (!clearable(stats, o, speed)) o = cactusGroup('cactusS', 1);
  return o;
}

/** Distance from the end of one obstacle to the start of the next. */
export function gapAfter(stats, speed, rng) {
  const air = airtime(stats);
  return speed * air * 1.05 + stats.stand.w + speed * rng() * 0.9;
}

/** Maybe place a bone inside a gap. Returns null or { offset, y }. */
export function maybeBone(gap, rng) {
  if (gap < 9 || rng() > BONE.chance) return null;
  return { offset: gap * (0.35 + rng() * 0.3), y: rng() < 0.5 ? BONE.lowY : BONE.highY };
}

/** Small deterministic PRNG so tests and replays are repeatable. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
