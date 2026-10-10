// Turns the photos and drawings in src/assets/img/source/ into the pictures the site shows:
// two tones only (ink and paper, or ink and nothing), made of chunky square pixels, with a fine
// checkerboard where a tone changes. The list of pictures and their settings is
// src/_data/images.json. The build runs this before every build (see eleventy.config.js) and the
// finished files go into the built site, never into this repo.
//
// How one picture is made:
// 1. The source is cut to its shape and shrunk until it is only as many pixels wide as the
//    picture has blocks ("across"). One pixel of the saved file is one block on the page; the
//    browser enlarges it without smoothing, which is what keeps the edges hard.
// 2. It is turned into greys, and the greys are stretched: everything darker than "black"
//    becomes solid ink, everything lighter than "white" solid paper.
// 3. What lies between is "dithered": each pixel is compared with a small repeating pattern of
//    thresholds, so a mid grey comes out as a checkerboard of ink and paper.
// 4. It is saved as a PNG with a palette of two or three colours, which keeps it tiny and lossless.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { paintTexture } from './lib/paint.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(root, 'src', 'assets', 'img', 'source');
const listFile = path.join(root, 'src', '_data', 'images.json');
const creditsFile = path.join(root, 'src', '_data', 'image-credits.json');
const tokensFile = path.join(root, 'src', 'assets', 'css', 'tokens.css');

// The two colours come from the styles, so the pictures always match the page.
function colourFromTokens(name) {
  const hex = new RegExp(`--color-${name}:\\s*#([0-9a-f]{6})`, 'i').exec(fs.readFileSync(tokensFile, 'utf8'))?.[1];
  if (!hex) throw new Error(`tokens.css has no --color-${name}.`);
  return [0, 2, 4].map((at) => parseInt(hex.slice(at, at + 2), 16));
}

// The threshold patterns. A pixel becomes paper when its grey (0 to 1) is above its threshold.
const patterns = {
  // Two by two: solid ink, one pixel in four, a checkerboard, three in four, solid paper.
  checker: [[0, 2], [3, 1]],
  // Four by four: sixteen steps, for drawings with long smooth gradients.
  fine: [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]],
};
// "grain" has no repeating pattern: thresholds are scattered evenly, like stippling. It mixes an
// even scatter with a little plain randomness (both worked out from the pixel's place, so the
// result is the same on every build).
const fraction = (value) => value - Math.floor(value);
const grainThreshold = (x, y) => {
  const even = fraction(52.9829189 * fraction(0.06711056 * x + 0.00583715 * y));
  const loose = fraction(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453);
  return fraction(even + loose * 0.3);
};
function thresholdAt(pattern, x, y) {
  if (pattern === 'grain') return grainThreshold(x, y);
  const table = patterns[pattern];
  if (!table) throw new Error(`Unknown pattern "${pattern}". Use checker, fine or grain.`);
  const size = table.length;
  return (table[y % size][x % size] + 0.5) / (size * size);
}

// Which light pixels are backdrop: those that can be reached from the picture's edge without
// crossing anything dark. Light spots enclosed by the subject are not backdrop.
function findBackdrop(light, width, height) {
  const backdrop = new Uint8Array(width * height);
  const queue = [];
  const visit = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const index = y * width + x;
    if (backdrop[index] || !light[index]) return;
    backdrop[index] = 1;
    queue.push(index);
  };
  for (let x = 0; x < width; x++) { visit(x, 0); visit(x, height - 1); }
  for (let y = 0; y < height; y++) { visit(0, y); visit(width - 1, y); }
  while (queue.length) {
    const index = queue.pop();
    const x = index % width;
    const y = (index - x) / width;
    visit(x + 1, y); visit(x - 1, y); visit(x, y + 1); visit(x, y - 1);
  }
  return backdrop;
}

// The part of the source to use: its middle, or the part around "focus", cut to the wanted shape.
function regionToUse(sourceWidth, sourceHeight, shape, crop = {}) {
  const { x = 0.5, y = 0.5, zoom = 1 } = crop;
  let width = sourceWidth / zoom;
  let height = width / shape;
  if (height > sourceHeight / zoom) {
    height = sourceHeight / zoom;
    width = height * shape;
  }
  width = Math.min(sourceWidth, Math.round(width));
  height = Math.min(sourceHeight, Math.round(height));
  const left = Math.round(Math.min(sourceWidth - width, Math.max(0, x * sourceWidth - width / 2)));
  const top = Math.round(Math.min(sourceHeight - height, Math.max(0, y * sourceHeight - height / 2)));
  return { left, top, width, height };
}

const shapeOf = (text) => {
  const [across, down] = String(text).split(':').map(Number);
  if (!(across > 0 && down > 0)) throw new Error(`"${text}" is not a shape. Write it like 4:5.`);
  return across / down;
};

async function convertOne(name, settings, colours) {
  const file = path.join(sourceDir, settings.source);
  if (!fs.existsSync(file)) throw new Error(`images.json: "${name}" points to ${settings.source}, which is not in src/assets/img/source/.`);
  const { pattern = 'checker', black = 0.3, white = 0.7, gamma = 1, sharpen = 0, tones = 'ink', ground = 'paper' } = settings;

  // Drawings (SVG) are drawn large first, so that shrinking them averages their edges.
  const isDrawing = settings.source.endsWith('.svg');
  const opened = () => sharp(file, isDrawing ? { density: 300 } : {}).rotate();
  const meta = await opened().metadata();
  const shape = settings.shape ? shapeOf(settings.shape) : meta.width / meta.height;
  const across = settings.across;
  const down = Math.round(across / shape);
  let image = opened().flatten({ background: '#ffffff' }).extract(regionToUse(meta.width, meta.height, shape, settings.crop)).resize(across, down, { fit: 'fill', kernel: 'lanczos3' }).greyscale();
  if (settings.stretch) image = image.normalise({ lower: 1, upper: 99 });
  if (sharpen) image = image.sharpen({ sigma: sharpen });
  const greys = await image.raw().toBuffer();

  // Stretch the greys, then dither.
  const dark = new Uint8Array(across * down);
  const light = new Uint8Array(across * down);
  for (let y = 0; y < down; y++) {
    for (let x = 0; x < across; x++) {
      const index = y * across + x;
      let value = Math.min(1, Math.max(0, (greys[index] / 255 - black) / (white - black)));
      if (gamma !== 1) value **= gamma;
      dark[index] = value <= thresholdAt(pattern, x, y) ? 1 : 0;
      light[index] = value > 0.5 ? 1 : 0;
    }
  }

  // Colour the pixels. "tones: ink" draws the dark parts in ink on the ground; "tones: paper"
  // draws the light parts in paper on a clear ground (for pictures that sit on the ink colour).
  const backdrop = ground === 'texture' ? findBackdrop(light, across, down) : null;
  const pixels = Buffer.alloc(across * down * 4);
  let used = 0;
  for (let index = 0; index < dark.length; index++) {
    let colour = null;
    if (tones === 'paper') colour = dark[index] ? null : colours.paper;
    else if (dark[index]) colour = colours.ink;
    else if (ground === 'paper' || (ground === 'texture' && !backdrop[index])) colour = colours.paper;
    if (colour) {
      pixels.set([...colour, 255], index * 4);
      if (colour === (tones === 'paper' ? colours.paper : colours.ink)) used++;
    }
  }
  const png = await sharp(pixels, { raw: { width: across, height: down, channels: 4 } }).png({ palette: true, colours: 4, compressionLevel: 9, effort: 10, dither: 0 }).toBuffer();
  return { buffer: png, width: across, height: down, share: used / dark.length };
}

// The texture behind a picture whose ground is "texture": painted, then saved as a small WebP.
async function makeTexture(settings, shape) {
  const { seed = 1, width = 720, strokes, quality = 72 } = settings.texture || {};
  const height = Math.round(width / shape);
  const greys = paintTexture({ width, height, seed, ...(strokes ? { strokes } : {}) });
  const buffer = await sharp(Buffer.from(greys), { raw: { width, height, channels: 1 } }).webp({ quality, effort: 6, smartSubsample: true }).toBuffer();
  return { buffer, width, height };
}

const fingerprint = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 8);

// Pictures already converted in this run of the build, so that "npm run dev" only redoes a
// picture when its source file or its settings change.
const remembered = new Map();

// Converts every picture in images.json into "outDir" and returns what the templates need to
// show each one: its address, its size in blocks and its alt text (empty for decoration).
export async function convertImages(outDir) {
  const list = JSON.parse(fs.readFileSync(listFile, 'utf8'));
  const credits = JSON.parse(fs.readFileSync(creditsFile, 'utf8'));
  const colours = { ink: colourFromTokens('ink'), paper: colourFromTokens('paper') };
  fs.mkdirSync(outDir, { recursive: true });
  const pictures = {};
  for (const [name, settings] of Object.entries(list.pictures)) {
    // A picture is either described or marked as decoration. Never both, never neither: a
    // missing description should be a decision, not something forgotten.
    const described = typeof settings.alt === 'string' && settings.alt.trim() !== '';
    const decorative = settings.decorative === true;
    if (described === decorative) throw new Error(`images.json: "${name}" needs exactly one of these: "alt" (a short description for screen readers) or "decorative": true (for a picture that is only decoration).`);
    if (!(settings.across > 0)) throw new Error(`images.json: "${name}" needs "across": how many blocks wide the picture is.`);
    // Every photo must have its photographer on record. Drawings are the site's own.
    if (!settings.source.endsWith('.svg') && !credits.photos?.[settings.source]) throw new Error(`image-credits.json has no entry for ${settings.source} (used by "${name}").`);

    const sourceFile = path.join(sourceDir, settings.source);
    const key = JSON.stringify([settings, fs.statSync(sourceFile, { throwIfNoEntry: false })?.mtimeMs, colours]);
    let made = remembered.get(name);
    if (!made || made.key !== key) {
      const picture = await convertOne(name, settings, colours);
      const texture = settings.ground === 'texture' ? await makeTexture(settings, picture.width / picture.height) : null;
      made = { key, picture, texture };
      remembered.set(name, made);
    }
    fs.writeFileSync(path.join(outDir, `${name}.png`), made.picture.buffer);
    pictures[name] = {
      src: `/assets/img/${name}.png?v=${fingerprint(made.picture.buffer)}`,
      width: made.picture.width,
      height: made.picture.height,
      // Decoration gets an empty description, which tells screen readers to pass over it.
      alt: decorative ? '' : settings.alt,
      decorative,
      bytes: made.picture.buffer.length,
      share: made.picture.share,
    };
    if (made.texture) {
      fs.writeFileSync(path.join(outDir, `${name}-texture.webp`), made.texture.buffer);
      pictures[name].texture = { src: `/assets/img/${name}-texture.webp?v=${fingerprint(made.texture.buffer)}`, width: made.texture.width, height: made.texture.height, bytes: made.texture.buffer.length };
    }
  }
  return pictures;
}

// Run directly (node scripts/images.mjs): convert into _site and print a line per picture.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const pictures = await convertImages(path.join(root, '_site', 'assets', 'img'));
  for (const [name, picture] of Object.entries(pictures)) {
    console.log(`${name}: ${picture.width} x ${picture.height} blocks, ${picture.bytes} bytes, ${Math.round(picture.share * 100)}% drawn${picture.texture ? `, texture ${picture.texture.bytes} bytes` : ''}`);
  }
}
