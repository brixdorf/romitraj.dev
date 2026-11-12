// Turns a photo into the files a <picture> needs: shades of grey (baked into the files), cut to a
// shape, at a few widths, in three formats: JPEG XL, AVIF and JPEG. Each format is saved at the
// lowest quality that reaches the same score (SSIM, structural similarity: 1 means identical to
// the grey original), so the three look the same and only their sizes differ. The newer two are
// listed smallest first; JPEG comes last, for any browser that knows neither.
// Used by scripts/images.mjs for pictures with "kind": "photo" in src/_data/images.json.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import encodeJxl, { init as initJxlEncoder } from '@jsquash/jxl/encode.js';
import decodeJxl, { init as initJxlDecoder } from '@jsquash/jxl/decode.js';

// ---- The score ----

// A Gaussian blur (11 taps, sigma 1.5, as in the SSIM paper), along rows then columns. Edges
// repeat their last pixel.
const kernel = (() => {
  const taps = Array.from({ length: 11 }, (_, index) =>
    Math.exp(-((index - 5) ** 2) / (2 * 1.5 ** 2)),
  );
  const total = taps.reduce((sum, tap) => sum + tap, 0);
  return taps.map((tap) => tap / total);
})();
function blur(values, width, height) {
  const across = new Float64Array(values.length);
  const result = new Float64Array(values.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let k = 0; k < 11; k++) {
        const at = Math.min(width - 1, Math.max(0, x + k - 5));
        sum += kernel[k] * values[y * width + at];
      }
      across[y * width + x] = sum;
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let k = 0; k < 11; k++) {
        const at = Math.min(height - 1, Math.max(0, y + k - 5));
        sum += kernel[k] * across[at * width + x];
      }
      result[y * width + x] = sum;
    }
  }
  return result;
}

// The mean structural similarity of two grey pictures of the same size (Wang et al., 2004).
export function ssim(a, b, width, height) {
  if (a.length !== width * height || b.length !== width * height)
    throw new Error('ssim: both pictures must be width x height in size.');
  const [c1, c2] = [(0.01 * 255) ** 2, (0.03 * 255) ** 2];
  const product = (x, y) => Float64Array.from(x, (value, index) => value * y[index]);
  const meanA = blur(a, width, height);
  const meanB = blur(b, width, height);
  const squaresA = blur(product(a, a), width, height);
  const squaresB = blur(product(b, b), width, height);
  const products = blur(product(a, b), width, height);
  let total = 0;
  for (let index = 0; index < a.length; index++) {
    const [ma, mb] = [meanA[index], meanB[index]];
    const varianceA = squaresA[index] - ma * ma;
    const varianceB = squaresB[index] - mb * mb;
    const covariance = products[index] - ma * mb;
    total +=
      ((2 * ma * mb + c1) * (2 * covariance + c2)) /
      ((ma * ma + mb * mb + c1) * (varianceA + varianceB + c2));
  }
  return total / a.length;
}

// The lowest quality (1 to 100) whose score reaches the target, found by halving the range each
// time. "score" is an async function of the quality. If none reaches it, 100.
export async function lowestQuality(score, target) {
  let [low, high] = [1, 100];
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if ((await score(middle)) >= target) high = middle;
    else low = middle + 1;
  }
  return low;
}

// ---- The three formats ----

// The JPEG XL encoder and decoder are WebAssembly files inside their package, loaded once.
let jxlReady;
function loadJxl() {
  jxlReady ||= (async () => {
    const codec = path.join(
      path.dirname(fileURLToPath(import.meta.resolve('@jsquash/jxl/encode.js'))),
      'codec',
    );
    const compile = (file) => WebAssembly.compile(fs.readFileSync(path.join(codec, file)));
    await initJxlEncoder(await compile('enc/jxl_enc.wasm'));
    await initJxlDecoder(await compile('dec/jxl_dec.wasm'));
  })();
  return jxlReady;
}

const greyImage = (grey, width, height) => sharp(grey, { raw: { width, height, channels: 1 } });
const greyFrom = async (buffer) => await sharp(buffer).greyscale().raw().toBuffer();

const formats = [
  {
    extension: 'jxl',
    type: 'image/jxl',
    async encode(grey, width, height, quality) {
      await loadJxl();
      const rgba = new Uint8ClampedArray(grey.length * 4);
      for (let index = 0; index < grey.length; index++)
        rgba.set([grey[index], grey[index], grey[index], 255], index * 4);
      return Buffer.from(await encodeJxl({ data: rgba, width, height }, { quality, effort: 7 }));
    },
    async decode(buffer) {
      await loadJxl();
      const { data } = await decodeJxl(buffer);
      return Uint8Array.from({ length: data.length / 4 }, (_, index) => data[index * 4]);
    },
  },
  {
    extension: 'avif',
    type: 'image/avif',
    encode: (grey, width, height, quality) =>
      greyImage(grey, width, height).avif({ quality, effort: 6 }).toBuffer(),
    decode: greyFrom,
  },
  {
    extension: 'jpg',
    type: 'image/jpeg',
    encode: (grey, width, height, quality) =>
      greyImage(grey, width, height).jpeg({ quality, mozjpeg: true }).toBuffer(),
    decode: greyFrom,
  },
];

// ---- One photo ----

const shapeOf = (text) => {
  const [across, down] = String(text).split(':').map(Number);
  if (!(across > 0 && down > 0)) throw new Error(`"${text}" is not a shape. Write it like 4:5.`);
  return across / down;
};

// The part of the photo to keep: its middle, or the part around "crop", cut to the shape.
function region(sourceWidth, sourceHeight, shape, { x = 0.5, y = 0.5, zoom = 1 } = {}) {
  let width = sourceWidth / zoom;
  let height = width / shape;
  if (height > sourceHeight / zoom)
    [height, width] = [sourceHeight / zoom, (sourceHeight / zoom) * shape];
  width = Math.min(sourceWidth, Math.round(width));
  height = Math.min(sourceHeight, Math.round(height));
  const left = Math.round(Math.min(sourceWidth - width, Math.max(0, x * sourceWidth - width / 2)));
  const top = Math.round(
    Math.min(sourceHeight - height, Math.max(0, y * sourceHeight - height / 2)),
  );
  return { left, top, width, height };
}

const fingerprint = (buffer) => createHash('sha256').update(buffer).digest('hex').slice(0, 8);

// Makes every file for one photo in outDir and says how to show it. Settings: "shape" (such as
// "11:21"), "crop", "widths" (the widths to make, in pixels) and "target" (the score every format
// must reach; 0.98 is hard to tell from the original at the size shown). With "cacheDir", files
// made before from the same photo and settings are reused, since the search takes a few seconds.
export async function makePhoto({ name, file, settings, outDir, cacheDir }) {
  const { shape: shapeText, crop, widths = [240, 480, 720, 960], target = 0.98 } = settings;
  const source = fs.readFileSync(file);
  const key = createHash('sha256')
    .update(source)
    .update(JSON.stringify({ name, settings, sharp: sharp.versions, version: 1 }))
    .digest('hex')
    .slice(0, 16);
  const cached = cacheDir && path.join(cacheDir, key);
  fs.mkdirSync(outDir, { recursive: true });
  if (cached && fs.existsSync(path.join(cached, 'photo.json'))) {
    const made = JSON.parse(fs.readFileSync(path.join(cached, 'photo.json'), 'utf8'));
    for (const saved of made.files)
      fs.copyFileSync(path.join(cached, saved), path.join(outDir, saved));
    return made;
  }

  const image = sharp(source).rotate();
  const meta = await image.metadata();
  const shape = shapeText ? shapeOf(shapeText) : meta.width / meta.height;
  const cut = region(meta.width, meta.height, shape, crop);
  const sizes = [...widths]
    .sort((a, b) => a - b)
    .map((width) => ({ width, height: Math.round(width / shape) }));
  const greys = [];
  for (const size of sizes) {
    greys.push(
      await sharp(source)
        .rotate()
        .extract(cut)
        .resize(size.width, size.height, { fit: 'fill', kernel: 'lanczos3' })
        .greyscale()
        .raw()
        .toBuffer(),
    );
  }
  // The quality is searched at one width (the largest up to 480 pixels) and used for them all.
  const probe = Math.max(0, sizes.filter((size) => size.width <= 480).length - 1);
  const { width: probeWidth, height: probeHeight } = sizes[probe];

  const results = [];
  const files = [];
  for (const format of formats) {
    const scoreAt = async (quality) => {
      const encoded = await format.encode(greys[probe], probeWidth, probeHeight, quality);
      return ssim(greys[probe], await format.decode(encoded), probeWidth, probeHeight);
    };
    const quality = await lowestQuality(scoreAt, target);
    const entries = [];
    for (const [index, size] of sizes.entries()) {
      const buffer = await format.encode(greys[index], size.width, size.height, quality);
      const fileName = `${name}-${size.width}.${format.extension}`;
      fs.writeFileSync(path.join(outDir, fileName), buffer);
      files.push(fileName);
      entries.push({
        url: `/assets/img/${fileName}?v=${fingerprint(buffer)}`,
        width: size.width,
        bytes: buffer.length,
      });
    }
    results.push({
      type: format.type,
      extension: format.extension,
      quality,
      score: await scoreAt(quality),
      bytes: entries.reduce((sum, entry) => sum + entry.bytes, 0),
      entries,
    });
  }

  const srcset = (entries) => entries.map((entry) => `${entry.url} ${entry.width}w`).join(', ');
  const jpeg = results.find((result) => result.extension === 'jpg');
  const made = {
    width: sizes.at(-1).width,
    height: sizes.at(-1).height,
    formats: results.map(({ entries, ...rest }) => ({ ...rest, files: entries })),
    sources: results
      .filter((result) => result !== jpeg)
      .sort((a, b) => a.bytes - b.bytes)
      .map((result) => ({
        type: result.type,
        srcset: srcset(result.entries),
        bytes: result.bytes,
      })),
    fallback: { src: jpeg.entries[probe].url, srcset: srcset(jpeg.entries) },
    files,
  };
  if (cached) {
    fs.mkdirSync(cached, { recursive: true });
    for (const saved of files) fs.copyFileSync(path.join(outDir, saved), path.join(cached, saved));
    fs.writeFileSync(path.join(cached, 'photo.json'), JSON.stringify(made));
  }
  return made;
}
