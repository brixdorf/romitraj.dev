// Tests for compass-model.js: the shapes the hero's 3D compass is drawn from.
import { describe, expect, it } from 'vite-plus/test';
import { buildCompass } from './compass-model.js';

const parts = buildCompass();

describe('buildCompass', () => {
  it('gives the case and the needle as separate lists of triangles, so the needle can turn alone', () => {
    for (const part of [parts.body, parts.needle]) {
      expect(part.count).toBeGreaterThan(0);
      expect(part.count % 3).toBe(0);
      expect(part.positions).toHaveLength(part.count * 3);
      expect(part.normals).toHaveLength(part.count * 3);
      expect(part.tones).toHaveLength(part.count);
    }
  });

  it('has a normal of length one at every corner', () => {
    for (const part of [parts.body, parts.needle]) {
      for (let index = 0; index < part.count; index++) {
        const [x, y, z] = part.normals.slice(index * 3, index * 3 + 3);
        expect(Math.hypot(x, y, z)).toBeCloseTo(1, 4);
      }
    }
  });

  it('keeps every tone between ink (0) and paper (1)', () => {
    for (const part of [parts.body, parts.needle])
      expect(part.tones.every((tone) => tone >= 0 && tone <= 1)).toBe(true);
  });

  it('is a case of radius one, its ring on top, its face toward the viewer', () => {
    let [left, right, bottom, top, back, front] = [0, 0, 0, 0, 0, 0];
    for (let index = 0; index < parts.body.count; index++) {
      const [x, y, z] = parts.body.positions.slice(index * 3, index * 3 + 3);
      [left, right] = [Math.min(left, x), Math.max(right, x)];
      [bottom, top] = [Math.min(bottom, y), Math.max(top, y)];
      [back, front] = [Math.min(back, z), Math.max(front, z)];
    }
    expect(left).toBeCloseTo(-1, 1);
    expect(right).toBeCloseTo(1, 1);
    expect(bottom).toBeCloseTo(-1, 1);
    expect(top).toBeGreaterThan(1.2);
    expect(front).toBeGreaterThan(0);
    expect(back).toBeLessThan(0);
  });

  it('points the needle’s dark half to north, along the ring', () => {
    let [darkY, lightY, dark, light] = [0, 0, 0, 0];
    for (let index = 0; index < parts.needle.count; index++) {
      const y = parts.needle.positions[index * 3 + 1];
      if (parts.needle.tones[index] < 0.5) [darkY, dark] = [darkY + y, dark + 1];
      else [lightY, light] = [lightY + y, light + 1];
    }
    expect(darkY / dark).toBeGreaterThan(0);
    expect(lightY / light).toBeLessThan(0);
  });
});
