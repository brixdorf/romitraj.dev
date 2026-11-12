// Tests for compass-motion.js: how the hero's compass leans toward the pointer, turns as the page
// scrolls, and how its needle swings back to north and comes to rest.
import { describe, expect, it } from 'vite-plus/test';
import { poseFor, rest, settle, stepNeedle, isStill, toneAt, threshold } from './compass-motion.js';

const degrees = (radians) => (radians * 180) / Math.PI;

describe('poseFor', () => {
  it('is the resting pose with the pointer at the middle and the page at the top', () => {
    expect(poseFor({ x: 0, y: 0 }, 0)).toEqual(rest);
  });

  it('leans toward the pointer, a little and never past its limit', () => {
    const right = poseFor({ x: 1, y: 0 }, 0);
    const far = poseFor({ x: 50, y: -50 }, 0);
    expect(right.lean).toBeGreaterThan(rest.lean);
    expect(degrees(Math.abs(far.lean - rest.lean))).toBeLessThanOrEqual(25);
    expect(degrees(Math.abs(far.tilt - rest.tilt))).toBeLessThanOrEqual(25);
  });

  it('turns the case as the page scrolls, up to a limit', () => {
    expect(poseFor({ x: 0, y: 0 }, 0.5).spin).toBeGreaterThan(0);
    expect(poseFor({ x: 0, y: 0 }, 10).spin).toBe(poseFor({ x: 0, y: 0 }, 1).spin);
  });
});

describe('settle', () => {
  const flat = { tilt: 0, lean: 0, spin: 0 };
  // Runs the pose toward "target" for "seconds" in frames of a sixtieth of a second, and returns
  // every lean it passed through.
  const run = (target, seconds) => {
    let pose = flat;
    const leans = [];
    for (let frame = 0; frame < seconds * 60; frame++) {
      pose = settle(pose, target, 1 / 60);
      leans.push(pose.lean);
    }
    return { pose, leans };
  };

  it('moves part of the way toward the target each frame, more in a longer frame', () => {
    const short = settle(flat, { ...flat, lean: 1 }, 1 / 60);
    const long = settle(flat, { ...flat, lean: 1 }, 1 / 20);
    expect(short.lean).toBeGreaterThan(0);
    expect(long.lean).toBeGreaterThan(short.lean);
    expect(long.lean).toBeLessThan(1);
  });

  it('swings a touch past the target, as a thing with weight does, and settles on it', () => {
    const { pose, leans } = run({ ...flat, lean: 1 }, 4);
    expect(Math.max(...leans)).toBeGreaterThan(1.005);
    expect(Math.max(...leans)).toBeLessThan(1.1);
    expect(pose.lean).toBeCloseTo(1, 3);
    expect(isStill({ angle: 0, speed: 0 }, pose, { ...flat, lean: 1 })).toBe(true);
  });

  it('cannot run away after a long pause between frames', () => {
    const pose = settle(flat, { ...flat, lean: 1 }, 5);
    expect(Math.abs(pose.lean)).toBeLessThanOrEqual(1.1);
  });
});

describe('stepNeedle', () => {
  // Runs the needle for "seconds" in frames of a sixtieth of a second, with the case turned to
  // "spin", and returns every angle it passed through (its angle on the face of the case). The
  // needle remembers the case's last turn ("spin"), so it feels the case move.
  const run = (needle, spin, seconds) => {
    const angles = [];
    for (let frame = 0; frame < seconds * 60; frame++) {
      needle = stepNeedle(needle, spin, 1 / 60);
      angles.push(needle.angle - spin);
    }
    return { needle, angles };
  };

  it('stays still at north while nothing moves', () => {
    const { needle } = run({ angle: 0, speed: 0, spin: 0 }, 0, 2);
    expect(needle).toEqual({ angle: 0, speed: 0, spin: 0 });
  });

  it('keeps pointing north when the case turns: it swings past and settles back', () => {
    const spin = Math.PI / 3;
    const { needle, angles } = run({ angle: 0, speed: 0, spin: 0 }, spin, 6);
    // On the face it ends opposite the turn, pointing north again.
    expect(needle.angle).toBeCloseTo(0, 2);
    // It overshoots north at least once on the way: a real needle wobbles.
    const absolute = angles.map((angle) => angle + spin);
    expect(Math.min(...absolute)).toBeLessThan(-0.01);
  });

  it('cannot run away after a long pause between frames', () => {
    const needle = stepNeedle({ angle: 1, speed: 0, spin: 0 }, 0, 5);
    expect(Math.abs(needle.angle)).toBeLessThanOrEqual(1);
    expect(Number.isFinite(needle.speed)).toBe(true);
  });
});

describe('isStill', () => {
  it('is still when the needle and the pose are at their targets', () => {
    expect(isStill({ angle: 0, speed: 0 }, rest, rest)).toBe(true);
    expect(isStill({ angle: 0.2, speed: 0 }, rest, rest)).toBe(false);
    expect(isStill({ angle: 0, speed: 0 }, rest, { ...rest, lean: 0.3 })).toBe(false);
  });

  it('is not still while the pose is still moving, even at its target', () => {
    const moving = { ...rest, speed: { tilt: 0, lean: 0.5, spin: 0 } };
    expect(isStill({ angle: 0, speed: 0 }, moving, rest)).toBe(false);
  });
});

describe('toneAt', () => {
  it('uses the same four by four pattern as the pixel pictures’ "fine" pattern (scripts/images.mjs)', () => {
    const table = [
      [0, 8, 2, 10],
      [12, 4, 14, 6],
      [3, 11, 1, 9],
      [15, 7, 13, 5],
    ];
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) expect(threshold(x, y)).toBe((table[y][x] + 0.5) / 16);
    expect(threshold(4, 5)).toBe(threshold(0, 1));
  });

  it('gives solid ink below "black", solid paper above "white", an even mix between', () => {
    const tones = (value) =>
      [0, 1, 2, 3].flatMap((y) => [0, 1, 2, 3].map((x) => toneAt(value, x, y, 0.25, 0.75)));
    expect(tones(0.1).every((tone) => tone === 'ink')).toBe(true);
    expect(tones(0.9).every((tone) => tone === 'paper')).toBe(true);
    expect(tones(0.5).filter((tone) => tone === 'ink')).toHaveLength(8);
  });
});
