// Tests for the photo pipeline (scripts/lib/photo.mjs): the quality score (SSIM), the search for
// the lowest quality that reaches it, and the finished files for one photo.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test';
import { lowestQuality, makePhoto, ssim } from './photo.mjs';

// A smooth grey picture with some detail, made from a formula so the test needs no file.
const pattern = (width, height, shift = 0) =>
  Uint8Array.from({ length: width * height }, (_, index) => {
    const x = index % width;
    const y = Math.floor(index / width);
    return Math.round(128 + 60 * Math.sin((x + shift) / 5) * Math.cos(y / 7) + (x * y) / 100) & 255;
  });

describe('ssim', () => {
  const width = 64;
  const height = 48;
  const picture = pattern(width, height);

  it('gives 1 for two identical pictures', () => {
    expect(ssim(picture, picture, width, height)).toBeCloseTo(1, 10);
  });

  it('gives less for a more changed picture, and the same either way round', () => {
    const little = picture.map((value, index) => value + (index % 7 === 0 ? 4 : 0));
    const more = picture.map((value, index) => value + (index % 3 === 0 ? 30 : 0));
    const a = ssim(picture, little, width, height);
    const b = ssim(picture, more, width, height);
    expect(a).toBeLessThan(1);
    expect(b).toBeLessThan(a);
    expect(ssim(more, picture, width, height)).toBeCloseTo(b, 10);
  });

  it('refuses pictures of different sizes', () => {
    expect(() => ssim(picture, picture.slice(1), width, height)).toThrow(/size/);
  });
});

describe('lowestQuality', () => {
  it('finds the lowest quality whose score reaches the target', async () => {
    const asked = [];
    const score = async (quality) => {
      asked.push(quality);
      return quality / 100;
    };
    expect(await lowestQuality(score, 0.73)).toBe(73);
    expect(asked.length).toBeLessThan(10);
  });

  it('gives the highest quality when nothing reaches the target', async () => {
    expect(await lowestQuality(async () => 0.5, 0.9)).toBe(100);
  });
});

describe('makePhoto', () => {
  let out;
  let source;
  let made;
  beforeAll(async () => {
    out = fs.mkdtempSync(path.join(os.tmpdir(), 'photo-test-'));
    source = path.join(out, 'colour.jpg');
    // A colourful source: the result must still be grey.
    await sharp({
      create: { width: 600, height: 900, channels: 3, background: { r: 200, g: 40, b: 90 } },
    })
      .composite([
        {
          input: Buffer.from(
            '<svg width="600" height="900"><circle cx="300" cy="300" r="200" fill="#1a6"/><rect x="100" y="600" width="400" height="200" fill="#fe2"/></svg>',
          ),
        },
      ])
      .jpeg()
      .toFile(source);
    made = await makePhoto({
      name: 'test',
      file: source,
      settings: { shape: '1:2', widths: [100, 200], target: 0.98 },
      outDir: out,
    });
  }, 120000);
  afterAll(() => fs.rmSync(out, { recursive: true, force: true }));

  it('makes every width in JPEG XL, AVIF and JPEG, in the asked shape', async () => {
    for (const width of [100, 200]) {
      for (const extension of ['jxl', 'avif', 'jpg']) {
        const file = path.join(out, `test-${width}.${extension}`);
        expect(fs.existsSync(file)).toBe(true);
      }
      const jpeg = await sharp(path.join(out, `test-${width}.jpg`)).metadata();
      expect([jpeg.width, jpeg.height]).toEqual([width, width * 2]);
    }
    expect([made.width, made.height]).toEqual([200, 400]);
  });

  it('turns the photo into shades of grey, baked into the file', async () => {
    const { data, info } = await sharp(path.join(out, 'test-200.jpg'))
      .raw()
      .toBuffer({ resolveWithObject: true });
    if (info.channels >= 3) {
      for (let index = 0; index < data.length; index += info.channels) {
        expect(Math.abs(data[index] - data[index + 1])).toBeLessThanOrEqual(2);
        expect(Math.abs(data[index] - data[index + 2])).toBeLessThanOrEqual(2);
      }
    }
  });

  it('reaches the same quality score in every format', () => {
    for (const format of made.formats) expect(format.score).toBeGreaterThanOrEqual(0.98);
  });

  it('lists the two newer formats smallest first, and ends with JPEG for every browser', () => {
    expect(made.sources.map((source) => source.type).sort()).toEqual(['image/avif', 'image/jxl']);
    expect(made.sources[0].bytes).toBeLessThanOrEqual(made.sources[1].bytes);
    expect(made.fallback.src).toMatch(/^\/assets\/img\/test-200\.jpg\?v=[0-9a-f]{8}$/);
    expect(made.fallback.srcset).toMatch(
      /test-100\.jpg\?v=[0-9a-f]{8} 100w, .*test-200\.jpg\?v=[0-9a-f]{8} 200w$/,
    );
    for (const source of made.sources) expect(source.srcset).toMatch(/ 100w, .* 200w$/);
  });
});
