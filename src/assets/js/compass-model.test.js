// Tests for compass-model.js: the shapes the hero's 3D compass is drawn from.
import { describe, expect, it } from 'vite-plus/test';
import { buildCompass } from './compass-model.js';

const parts = buildCompass();

describe('buildCompass', () => {
  const all = () => [parts.body, parts.needle, parts.glass];

  it('gives the case, the needle and the glass as separate lists of triangles, so the needle can turn alone', () => {
    for (const part of all()) {
      expect(part.count).toBeGreaterThan(0);
      expect(part.count % 3).toBe(0);
      expect(part.positions).toHaveLength(part.count * 3);
      expect(part.normals).toHaveLength(part.count * 3);
      expect(part.tones).toHaveLength(part.count);
      expect(part.kinds).toHaveLength(part.count);
      expect(part.grooves).toHaveLength(part.count);
    }
  });

  it('says what every corner is made of: painted (0) or polished metal (1)', () => {
    for (const part of all())
      expect(part.kinds.every((kind) => kind === 0 || kind === 1)).toBe(true);
    expect(parts.body.kinds.some((kind) => kind === 0)).toBe(true);
    expect(parts.body.kinds.some((kind) => kind === 1)).toBe(true);
  });

  it('knurls the bezel and the crown: some metal carries fine grooves around it', () => {
    const grooved = [...parts.body.grooves].filter((count) => count > 0);
    expect(grooved.length).toBeGreaterThan(0);
    expect(Math.min(...grooved)).toBeGreaterThanOrEqual(60);
  });

  it('covers the face with a glass a little above everything on it, needle included', () => {
    let lowest = Infinity;
    for (let index = 0; index < parts.glass.count; index++)
      lowest = Math.min(lowest, parts.glass.positions[index * 3 + 2]);
    let highest = -Infinity;
    for (let index = 0; index < parts.needle.count; index++)
      highest = Math.max(highest, parts.needle.positions[index * 3 + 2]);
    expect(lowest).toBeGreaterThan(highest);
  });

  it('has a normal of length one at every corner', () => {
    for (const part of all()) {
      for (let index = 0; index < part.count; index++) {
        const [x, y, z] = part.normals.slice(index * 3, index * 3 + 3);
        expect(Math.hypot(x, y, z)).toBeCloseTo(1, 4);
      }
    }
  });

  it('keeps every tone between ink (0) and paper (1)', () => {
    for (const part of all()) expect(part.tones.every((tone) => tone >= 0 && tone <= 1)).toBe(true);
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
