// Tests for compass-motion.js: how the hero's compass turns on its own, how a drag turns it in
// any direction and lets it coast, and how its needle swings back to north.
import { describe, expect, it } from 'vite-plus/test';
import {
  restTurn,
  turnBy,
  applyTurn,
  idleSpin,
  dragSpin,
  coast,
  needleRest,
  stepNeedle,
  toneAt,
  threshold,
} from './compass-motion.js';
import { compass as settings } from './motion.js';

const length = (v) => Math.hypot(...v);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
// The direction the dial faces (the case's +z) once turned.
const facing = (turn) => applyTurn(turn, [0, 0, 1]);

describe('turnBy', () => {
  it('keeps a turn a true turn (no stretching) after many small steps', () => {
    let turn = restTurn();
    for (let step = 0; step < 5000; step++) turn = turnBy(turn, [0.3, 1, 0.2], 0.01);
    for (const axis of [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ])
      expect(length(applyTurn(turn, axis))).toBeCloseTo(1, 6);
    expect(dot(applyTurn(turn, [1, 0, 0]), applyTurn(turn, [0, 1, 0]))).toBeCloseTo(0, 6);
  });

  it('turns all the way round: half a turn about the upright shows the back', () => {
    const turned = turnBy([1, 0, 0, 0, 1, 0, 0, 0, 1], [0, 1, 0], Math.PI);
    expect(facing(turned)[2]).toBeCloseTo(-1, 6);
  });
});

describe('idleSpin', () => {
  it('holds still at first, so the compass shows the still picture for a moment', () => {
    expect(length(idleSpin(0))).toBe(0);
    expect(length(idleSpin(settings.idle.delay * 0.99))).toBe(0);
  });

  it('then turns on its own at a steady pace, mostly about the upright', () => {
    const later = idleSpin(settings.idle.delay + settings.idle.rampUp + 5);
    const speed = (settings.idle.speed * Math.PI) / 180;
    expect(length(later)).toBeCloseTo(speed, 6);
    expect(Math.abs(later[1])).toBeGreaterThan(Math.abs(later[0]));
    expect(Math.abs(later[1])).toBeGreaterThan(Math.abs(later[2]));
  });

  it('eases in, never jumping to full speed', () => {
    const start = settings.idle.delay;
    const speeds = [0.1, 0.3, 0.5, 0.7, 0.9].map((share) =>
      length(idleSpin(start + share * settings.idle.rampUp)),
    );
    for (let index = 1; index < speeds.length; index++)
      expect(speeds[index]).toBeGreaterThan(speeds[index - 1]);
  });

  it('wanders: its axis is not the same a few seconds apart, so it tumbles', () => {
    const a = idleSpin(10);
    const b = idleSpin(16);
    expect(dot(a, b) / (length(a) * length(b))).toBeLessThan(0.999);
  });
});

describe('dragSpin', () => {
  it('turns the way the pointer drags: right turns the front right, down turns the top forward', () => {
    const right = dragSpin(100, 0);
    expect(applyTurn(turnBy(restTurn(), right.axis, right.angle), [0, 0, 1])[0]).toBeGreaterThan(
      applyTurn(restTurn(), [0, 0, 1])[0],
    );
    const down = dragSpin(0, 100);
    const top = (turn) => applyTurn(turn, [0, 1, 0])[2];
    expect(top(turnBy(restTurn(), down.axis, down.angle))).toBeGreaterThan(top(restTurn()));
  });

  it('turns further the further the drag, with no limit: a long drag is more than a full turn', () => {
    expect(dragSpin(40, 0).angle).toBeGreaterThan(dragSpin(20, 0).angle);
    expect(dragSpin(2000, 0).angle).toBeGreaterThan(2 * Math.PI);
    expect(dragSpin(0, -2000).angle).toBeGreaterThan(2 * Math.PI);
  });

  it('does nothing for no movement', () => {
    expect(dragSpin(0, 0).angle).toBe(0);
  });
});

describe('coast', () => {
  it('after a throw, slows smoothly back to the pace it turns at on its own', () => {
    const idle = [0, 0.5, 0];
    let spin = [0, 12, 0];
    const speeds = [];
    for (let frame = 0; frame < 600; frame++) {
      spin = coast(spin, idle, 1 / 60);
      speeds.push(spin[1]);
    }
    for (let index = 1; index < speeds.length; index++)
      expect(speeds[index]).toBeLessThanOrEqual(speeds[index - 1]);
    expect(speeds[30]).toBeGreaterThan(1);
    expect(spin[1]).toBeCloseTo(0.5, 2);
  });

  it('never throws faster than its limit', () => {
    const spin = coast([0, 1000, 0], [0, 0, 0], 1 / 60);
    expect(length(spin)).toBeLessThanOrEqual((settings.drag.fastest * Math.PI) / 180);
  });

  it('cannot run away after a long pause between frames', () => {
    const spin = coast([0, 5, 0], [0, 0.5, 0], 30);
    expect(spin[1]).toBeCloseTo(0.5, 3);
  });
});

describe('needle', () => {
  it('at rest points north (up the window), whatever way the case is turned', () => {
    for (const turn of [restTurn(), turnBy(restTurn(), [0, 0, 1], 1.2)]) {
      const angle = needleRest(turn);
      // The needle's direction on the dial, turned with the case.
      const pointing = applyTurn(turn, [-Math.sin(angle), Math.cos(angle), 0]);
      expect(pointing[1]).toBeGreaterThan(0.9);
    }
  });

  it('stays still at north while nothing moves', () => {
    const turn = restTurn();
    let needle = { angle: needleRest(turn), speed: 0 };
    for (let frame = 0; frame < 120; frame++) needle = stepNeedle(needle, turn, [0, 0, 0], 1 / 60);
    expect(needle.angle).toBeCloseTo(needleRest(turn), 6);
  });

  it('swings past north and settles back after the case turns on its face', () => {
    const turned = turnBy(restTurn(), applyTurn(restTurn(), [0, 0, 1]), Math.PI / 3);
    const goal = needleRest(turned);
    let needle = { angle: needleRest(restTurn()), speed: 0 };
    const angles = [];
    for (let frame = 0; frame < 600; frame++) {
      needle = stepNeedle(needle, turned, [0, 0, 0], 1 / 60);
      angles.push(needle.angle - goal);
    }
    expect(needle.angle - goal).toBeCloseTo(0, 2);
    // It started on one side of north and crossed to the other at least once: it wobbles.
    expect(Math.min(...angles)).toBeLessThan(-0.01);
    expect(Math.max(...angles)).toBeGreaterThan(0.01);
  });

  it('cannot run away after a long pause between frames', () => {
    const needle = stepNeedle({ angle: 1, speed: 0 }, restTurn(), [0, 3, 0], 5);
    expect(Number.isFinite(needle.angle)).toBe(true);
    expect(Math.abs(needle.speed)).toBeLessThan(50);
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
