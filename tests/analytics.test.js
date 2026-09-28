import { describe, it, expect } from 'vitest';
import { scoreBand } from '../src/analytics.js';

describe('analytics', () => {
  it('bands scores into readable ranges', () => {
    expect(scoreBand(0)).toBe('0-99');
    expect(scoreBand(99)).toBe('0-99');
    expect(scoreBand(100)).toBe('100-249');
    expect(scoreBand(6599)).toBe('5000-6599');
    expect(scoreBand(9000)).toBe('8000+');
  });
});
