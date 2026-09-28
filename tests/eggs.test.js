import { describe, it, expect } from 'vitest';
import { EggDetector, ACHIEVEMENTS } from '../src/eastereggs.js';

describe('easter eggs', () => {
  it('detects the Konami code', () => {
    const hits = [];
    const d = new EggDetector((n) => hits.push(n));
    ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'].forEach((k) => d.feed(k));
    expect(hits).toEqual(['konami']);
  });
  it('detects "offline" even after noise', () => {
    const hits = [];
    const d = new EggDetector((n) => hits.push(n));
    [...'xxOFFline'].forEach((k) => d.feed(k));
    expect(hits).toEqual(['offline']);
  });
  it('achievement ids are unique', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('new eggs and trophies', () => {
  it('detects "egg"', () => {
    const hits = [];
    const d = new EggDetector((n) => hits.push(n));
    [...'eGg'].forEach((k) => d.feed(k));
    expect(hits).toEqual(['egg']);
  });
  it('has 19 trophies, 10 secret', () => {
    expect(ACHIEVEMENTS.length).toBe(19);
    expect(ACHIEVEMENTS.filter((a) => a.secret).length).toBe(10);
  });
  it('typed eggs avoid letters bound to actions', () => {
    const bound = new Set([...'wasdrpmht']);
    for (const word of ['offline', 'egg']) for (const ch of word) expect(bound.has(ch)).toBe(false);
  });
});
