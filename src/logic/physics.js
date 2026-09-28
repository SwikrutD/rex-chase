// Pure jump physics, kept free of Three.js so it can be unit tested.

/**
 * Advance the rex's vertical motion by dt.
 * body: { y, vy, onGround }
 * input: { jumpHeld, duckHeld }
 * Returns flags for the frame: jumped, landed.
 */
export function stepBody(body, input, stats, dt) {
  const out = { jumped: false, landed: false };
  if (body.onGround) {
    if (input.jumpPressed && !input.duckHeld) {
      body.vy = stats.jumpV;
      body.onGround = false;
      out.jumped = true;
    } else {
      body.vy = 0;
      body.y = 0;
      return out;
    }
  }
  let g = stats.gRelease;
  if (input.duckHeld) g = stats.gFast;
  else if (input.jumpHeld && body.vy > 0) g = stats.gHold;
  body.vy -= g * dt;
  body.y += body.vy * dt;
  if (body.y <= 0 && body.vy <= 0) {
    body.y = 0;
    body.vy = 0;
    body.onGround = true;
    out.landed = true;
  }
  return out;
}

/** Peak height of a held jump. */
export function apex(stats) {
  return (stats.jumpV * stats.jumpV) / (2 * stats.gHold);
}

/** Time spent in the air on a fully held jump. */
export function airtime(stats) {
  // Rises under gHold, falls under gRelease from the apex.
  const up = stats.jumpV / stats.gHold;
  const down = Math.sqrt((2 * apex(stats)) / stats.gRelease);
  return up + down;
}

/** Seconds a held jump spends above height h (0 if it never gets there). */
export function timeAbove(stats, h) {
  const top = apex(stats);
  if (h >= top) return 0;
  const tUp = (stats.jumpV - Math.sqrt(stats.jumpV ** 2 - 2 * stats.gHold * h)) / stats.gHold;
  const upPart = stats.jumpV / stats.gHold - tUp;
  const downPart = Math.sqrt((2 * (top - h)) / stats.gRelease);
  return upPart + downPart;
}
