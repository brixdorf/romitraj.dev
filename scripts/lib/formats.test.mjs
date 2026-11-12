// Tests for scripts/lib/formats.mjs: each pixel picture is saved as lossless PNG, JPEG XL and
// AVIF, every file must give back exactly the same pixels, and the page offers the smaller ones
// first with PNG last.
import { describe, expect, it } from 'vite-plus/test';
import { losslessFormats, offerOrder } from './formats.mjs';

// A small pixel picture like the ones the build makes: ink, paper and see-through blocks.
function sample(width = 24, height = 16) {
  const ink = [42, 39, 34, 255];
  const paper = [250, 250, 250, 255];
  const clear = [0, 0, 0, 0];
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const colour = x < 4 ? clear : (x + y) % 3 === 0 ? ink : paper;
      rgba.set(colour, (y * width + x) * 4);
    }
  return { rgba, width, height };
}

describe('losslessFormats', () => {
  it('makes a PNG, a JPEG XL and an AVIF file that each give back exactly the same pixels', async () => {
    const { rgba, width, height } = sample();
    const files = await losslessFormats(rgba, width, height);
    expect(files.map((file) => file.extension).sort()).toEqual(['avif', 'jxl', 'png']);
    for (const file of files) {
      expect(file.buffer.length).toBe(file.bytes);
      expect(file.exact).toBe(true);
    }
  });

  it('names each file’s type for the page', async () => {
    const { rgba, width, height } = sample();
    const types = Object.fromEntries(
      (await losslessFormats(rgba, width, height)).map((file) => [file.extension, file.type]),
    );
    expect(types).toEqual({ png: 'image/png', jxl: 'image/jxl', avif: 'image/avif' });
  });
});

describe('offerOrder', () => {
  const file = (extension, bytes, exact = true) => ({ extension, bytes, exact });

  it('offers the newer formats smallest first and keeps PNG last, for every browser', () => {
    const order = offerOrder([file('png', 900), file('avif', 700), file('jxl', 300)]);
    expect(order.sources.map((source) => source.extension)).toEqual(['jxl', 'avif']);
    expect(order.fallback.extension).toBe('png');
  });

  it('leaves out a format that is not smaller than the PNG', () => {
    const order = offerOrder([file('png', 400), file('avif', 650), file('jxl', 380)]);
    expect(order.sources.map((source) => source.extension)).toEqual(['jxl']);
  });

  it('leaves out a format that did not give back the same pixels', () => {
    const order = offerOrder([file('png', 400), file('avif', 100, false), file('jxl', 380)]);
    expect(order.sources.map((source) => source.extension)).toEqual(['jxl']);
  });

  it('offers the PNG alone when it is the smallest', () => {
    const order = offerOrder([file('png', 200), file('avif', 650), file('jxl', 300)]);
    expect(order.sources).toEqual([]);
    expect(order.fallback.extension).toBe('png');
  });
});
