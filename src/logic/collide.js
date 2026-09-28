// Axis-aligned boxes: { x, y, w, h } with x,y at the bottom-left corner.

export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Shrink a box on every side, which makes near misses feel fair. */
export function shrink(box, by) {
  return { x: box.x + by, y: box.y + by * 0.5, w: Math.max(0, box.w - by * 2), h: Math.max(0, box.h - by * 1.5) };
}

/** The rex hitbox for the current pose. */
export function dinoBox(stats, rexX, y, ducking) {
  const b = ducking ? stats.duck : stats.stand;
  return { x: rexX + b.x, y, w: b.w, h: b.h };
}
