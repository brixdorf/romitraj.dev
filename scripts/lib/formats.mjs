// Saves one pixel picture in three lossless formats (PNG, JPEG XL and AVIF), checks that each file
// gives back exactly the same pixels, and decides which ones the page offers: the newer formats
// that came out smaller than the PNG, smallest first, then the PNG itself, which every browser
// shows. Used by scripts/images.mjs for every pixel picture.
import sharp from 'sharp';
import encodeJxl from '@jsquash/jxl/encode.js';
import decodeJxl from '@jsquash/jxl/decode.js';
import { loadJxl } from './photo.mjs';

// Whether two RGBA pictures show the same thing: every pixel's see-through amount is the same, and
// where a pixel can be seen at all, its colour is the same. (A fully see-through pixel has no
// colour worth keeping, and an encoder may store any there.)
function samePixels(a, b) {
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 4) {
    if (a[index + 3] !== b[index + 3]) return false;
    if (a[index + 3] === 0) continue;
    if (a[index] !== b[index] || a[index + 1] !== b[index + 1] || a[index + 2] !== b[index + 2])
      return false;
  }
  return true;
}

const raw = (rgba, width, height) => sharp(rgba, { raw: { width, height, channels: 4 } });
const pixelsOf = async (buffer) => await sharp(buffer).ensureAlpha().raw().toBuffer();

const encoders = [
  {
    extension: 'png',
    type: 'image/png',
    // A palette of at most four colours (ink, paper, see-through), with no dithering of its own.
    encode: (rgba, width, height) =>
      raw(rgba, width, height)
        .png({ palette: true, colours: 4, compressionLevel: 9, effort: 10, dither: 0 })
        .toBuffer(),
    decode: pixelsOf,
  },
  {
    extension: 'jxl',
    type: 'image/jxl',
    async encode(rgba, width, height) {
      await loadJxl();
      const data = new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, rgba.length);
      return Buffer.from(await encodeJxl({ data, width, height }, { lossless: true, effort: 9 }));
    },
    async decode(buffer) {
      await loadJxl();
      return (await decodeJxl(buffer)).data;
    },
  },
  {
    extension: 'avif',
    type: 'image/avif',
    encode: (rgba, width, height) =>
      raw(rgba, width, height).avif({ lossless: true, effort: 4 }).toBuffer(),
    decode: pixelsOf,
  },
];

// The picture in each format: its bytes, its size and whether it gave back the same pixels.
export async function losslessFormats(rgba, width, height) {
  const files = [];
  for (const { extension, type, encode, decode } of encoders) {
    const buffer = await encode(rgba, width, height);
    const exact = samePixels(rgba, await decode(buffer));
    files.push({ extension, type, buffer, bytes: buffer.length, exact });
  }
  return files;
}

// What the page offers: "sources" (the newer formats smaller than the PNG, smallest first, each
// only if it gave back the same pixels) and "fallback", the PNG.
export function offerOrder(files) {
  const fallback = files.find((file) => file.extension === 'png');
  if (!fallback) throw new Error('offerOrder: there is no PNG to fall back on.');
  const sources = files
    .filter((file) => file !== fallback && file.exact && file.bytes < fallback.bytes)
    .sort((a, b) => a.bytes - b.bytes);
  return { sources, fallback };
}
