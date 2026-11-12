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
// 4. It is saved, losslessly, as a PNG with a palette of two or three colours, as JPEG XL and as
//    AVIF (scripts/lib/formats.mjs). The page offers the newer formats that came out smaller than
//    the PNG, smallest first, and the PNG to every other browser.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { paintTexture } from './lib/paint.mjs';
import { makePhoto } from './lib/photo.mjs';
import { losslessFormats, offerOrder } from './lib/formats.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(root, 'src', 'assets', 'img', 'source');
const listFile = path.join(root, 'src', '_data', 'images.json');
const creditsFile = path.join(root, 'src', '_data', 'image-credits.json');
const tokensFile = path.join(root, 'src', 'assets', 'css', 'tokens.css');
// Photos already made, kept between builds: finding each format's quality takes a few seconds.
const photoCache = path.join(root, '.cache', 'photos');

// The two colours come from the styles, so the pictures always match the page.
function colourFromTokens(name) {
  const hex = new RegExp(`--color-${name}:\\s*#([0-9a-f]{6})`, 'i').exec(
    fs.readFileSync(tokensFile, 'utf8'),
  )?.[1];
  if (!hex) throw new Error(`tokens.css has no --color-${name}.`);
  return [0, 2, 4].map((at) => parseInt(hex.slice(at, at + 2), 16));
}

// The threshold patterns. A pixel becomes paper when its grey (0 to 1) is above its threshold.
const patterns = {
  // Two by two: solid ink, one pixel in four, a checkerboard, three in four, solid paper.
  checker: [
    [0, 2],
    [3, 1],
  ],
  // Four by four: sixteen steps, for drawings with long smooth gradients.
  fine: [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
  ],
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
  for (let x = 0; x < width; x++) {
    visit(x, 0);
    visit(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    visit(0, y);
    visit(width - 1, y);
  }
  while (queue.length) {
    const index = queue.pop();
    const x = index % width;
    const y = (index - x) / width;
    visit(x + 1, y);
    visit(x - 1, y);
    visit(x, y + 1);
    visit(x, y - 1);
  }
  return backdrop;
}

// Which blocks are backdrop, where the painted texture shows. A source with see-through parts (the
// hero's compass, drawn with its own outline) says so itself: exactly its see-through blocks
// ("clear", 1 for see-through). Otherwise, the light blocks found by findBackdrop.
export function backdropOf(light, width, height, clear = null) {
  return clear ? Uint8Array.from(clear) : findBackdrop(light, width, height);
}

// Which part of a photo is its plain backdrop: the pixels reached from the picture's edge by
// steps between neighbours whose greys differ by less than "step" (0 to 1). An even or slowly
// changing backdrop is followed all the way to the subject, and stops at the subject's edge, where
// the grey jumps. A light spot inside the subject cannot be reached from the edge, so it stays.
// Used by the "cutout" setting, so a photo of an object on a plain ground becomes the object alone
// on paper, the way the reference cuts out its subjects. Gives 1 for backdrop, 0 for the rest.
export function plainBackdrop(greys, width, height, step) {
  const limit = step * 255;
  const found = new Uint8Array(width * height);
  const queue = [];
  const seed = (index) => {
    if (found[index]) return;
    found[index] = 1;
    queue.push(index);
  };
  for (let x = 0; x < width; x++) {
    seed(x);
    seed((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    seed(y * width);
    seed(y * width + width - 1);
  }
  while (queue.length) {
    const index = queue.pop();
    const x = index % width;
    const y = (index - x) / width;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const next = ny * width + nx;
      if (!found[next] && Math.abs(greys[next] - greys[index]) < limit) {
        found[next] = 1;
        queue.push(next);
      }
    }
  }
  return found;
}

// Removes lone specks of ink: a block with no ink in the eight blocks around it and almost none
// (at most one other) in the seven by seven blocks around it. That is a stray dot on paper, such as
// the trace of the faint outline a cut-out photo leaves around its subject. The even dots of a
// light tone always have more ink near them, so tones, lines and edges are kept. Gives a new
// picture; the one passed in is not changed.
export function removeSpecks(dark, width, height, reach = 3, most = 2) {
  const inkAt = (x, y) => x >= 0 && y >= 0 && x < width && y < height && dark[y * width + x] === 1;
  const kept = Uint8Array.from(dark);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!inkAt(x, y)) continue;
      let touching = false;
      let near = 0;
      for (let dy = -reach; dy <= reach; dy++) {
        for (let dx = -reach; dx <= reach; dx++) {
          if (!inkAt(x + dx, y + dy)) continue;
          near++;
          if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && (dx || dy)) touching = true;
        }
      }
      if (!touching && near <= most) kept[y * width + x] = 0;
    }
  }
  return kept;
}

// Whether a picture needs its photographer on record in image-credits.json: every photo does,
// unless it is marked "credit": false. The site's own drawings (SVG files) never do.
export function needsCredit(settings) {
  return !settings.source.endsWith('.svg') && settings.credit !== false;
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
  const top = Math.round(
    Math.min(sourceHeight - height, Math.max(0, y * sourceHeight - height / 2)),
  );
  return { left, top, width, height };
}

const shapeOf = (text) => {
  const [across, down] = String(text).split(':').map(Number);
  if (!(across > 0 && down > 0)) throw new Error(`"${text}" is not a shape. Write it like 4:5.`);
  return across / down;
};

async function convertOne(name, settings, colours) {
  const file = path.join(sourceDir, settings.source);
  if (!fs.existsSync(file))
    throw new Error(
      `images.json: "${name}" points to ${settings.source}, which is not in src/assets/img/source/.`,
    );
  const {
    pattern = 'checker',
    black = 0.3,
    white = 0.7,
    gamma = 1,
    sharpen = 0,
    tones = 'ink',
    ground = 'paper',
  } = settings;

  // Drawings (SVG) are drawn large first, so that shrinking them averages their edges.
  const isDrawing = settings.source.endsWith('.svg');
  const opened = () => sharp(file, isDrawing ? { density: 300 } : {}).rotate();
  const meta = await opened().metadata();
  const shape = settings.shape ? shapeOf(settings.shape) : meta.width / meta.height;
  const across = settings.across;
  const down = Math.round(across / shape);
  let image = opened()
    .flatten({ background: '#ffffff' })
    .extract(regionToUse(meta.width, meta.height, shape, settings.crop))
    .resize(across, down, { fit: 'fill', kernel: 'lanczos3' })
    .greyscale();
  if (settings.stretch) image = image.normalise({ lower: 1, upper: 99 });
  if (sharpen) image = image.sharpen({ sigma: sharpen });
  const greys = await image.raw().toBuffer();
  // A source with see-through parts keeps them as its outline (see backdropOf).
  const clear = meta.hasAlpha
    ? Uint8Array.from(
        await opened()
          .extract(regionToUse(meta.width, meta.height, shape, settings.crop))
          .resize(across, down, { fit: 'fill', kernel: 'nearest' })
          .ensureAlpha()
          .extractChannel(3)
          .raw()
          .toBuffer(),
        (alpha) => (alpha < 128 ? 1 : 0),
      )
    : null;

  // A photo of an object on a plain ground ("cutout": how far apart two neighbouring greys of the
  // ground may be) loses its ground: it becomes paper. Found on a slightly softened copy, so the
  // grain of the photo does not stop the search.
  const cutAway = settings.cutout
    ? plainBackdrop(
        await opened()
          .flatten({ background: '#ffffff' })
          .extract(regionToUse(meta.width, meta.height, shape, settings.crop))
          .resize(across, down, { fit: 'fill', kernel: 'lanczos3' })
          .greyscale()
          .blur(0.8)
          .raw()
          .toBuffer(),
        across,
        down,
        settings.cutout,
      )
    : null;

  // Stretch the greys, then dither.
  let dark = new Uint8Array(across * down);
  const light = new Uint8Array(across * down);
  for (let y = 0; y < down; y++) {
    for (let x = 0; x < across; x++) {
      const index = y * across + x;
      let value = Math.min(1, Math.max(0, (greys[index] / 255 - black) / (white - black)));
      if (gamma !== 1) value **= gamma;
      dark[index] = value <= thresholdAt(pattern, x, y) && !cutAway?.[index] ? 1 : 0;
      light[index] = value > 0.5 || cutAway?.[index] ? 1 : 0;
    }
  }

  // Lone specks of ink on paper go, if the picture asks for it ("despeckle": true).
  if (settings.despeckle) dark = removeSpecks(dark, across, down);

  // Colour the pixels. "tones: ink" draws the dark parts in ink on the ground; "tones: paper"
  // draws the light parts in paper on a clear ground (for pictures that sit on the ink colour).
  const backdrop = ground === 'texture' ? backdropOf(light, across, down, clear) : null;
  const pixels = Buffer.alloc(across * down * 4);
  let used = 0;
  for (let index = 0; index < dark.length; index++) {
    let colour = null;
    if (tones === 'paper') colour = dark[index] ? null : colours.paper;
    else if (dark[index]) colour = colours.ink;
    else if (ground === 'paper' || (ground === 'texture' && !backdrop[index]))
      colour = colours.paper;
    if (colour) {
      pixels.set([...colour, 255], index * 4);
      if (colour === (tones === 'paper' ? colours.paper : colours.ink)) used++;
    }
  }
  const files = await losslessFormats(pixels, across, down);
  return { files, width: across, height: down, share: used / dark.length };
}

// The texture behind a picture whose ground is "texture": painted, then saved as a small WebP.
async function makeTexture(settings, shape) {
  const { seed = 1, width = 720, strokes, quality = 72 } = settings.texture || {};
  const height = Math.round(width / shape);
  const greys = paintTexture({ width, height, seed, ...(strokes ? { strokes } : {}) });
  const buffer = await sharp(Buffer.from(greys), { raw: { width, height, channels: 1 } })
    .webp({ quality, effort: 6, smartSubsample: true })
    .toBuffer();
  return { buffer, width, height };
}

const fingerprint = (buffer) =>
  crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 8);

// Pictures already converted in this run of the build, so that "pnpm run dev" only redoes a
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
    if (described === decorative)
      throw new Error(
        `images.json: "${name}" needs exactly one of these: "alt" (a short description for screen readers) or "decorative": true (for a picture that is only decoration).`,
      );
    // Every photo must have its photographer on record, unless it is marked "credit": false.
    if (needsCredit(settings) && !credits.photos?.[settings.source])
      throw new Error(
        `image-credits.json has no entry for ${settings.source} (used by "${name}").`,
      );
    // A photo ("kind": "photo") stays a photo: shades of grey in JPEG XL, AVIF and JPEG at a few
    // widths (scripts/lib/photo.mjs), shown with a <picture> tag.
    if (settings.kind === 'photo') {
      const made = await makePhoto({
        name,
        file: path.join(sourceDir, settings.source),
        settings,
        outDir,
        cacheDir: photoCache,
      });
      pictures[name] = { kind: 'photo', ...made, alt: decorative ? '' : settings.alt, decorative };
      continue;
    }
    if (!(settings.across > 0))
      throw new Error(
        `images.json: "${name}" needs "across": how many blocks wide the picture is.`,
      );

    const sourceFile = path.join(sourceDir, settings.source);
    const key = JSON.stringify([
      settings,
      fs.statSync(sourceFile, { throwIfNoEntry: false })?.mtimeMs,
      colours,
    ]);
    let made = remembered.get(name);
    if (!made || made.key !== key) {
      const picture = await convertOne(name, settings, colours);
      const texture =
        settings.ground === 'texture'
          ? await makeTexture(settings, picture.width / picture.height)
          : null;
      made = { key, picture, texture };
      remembered.set(name, made);
    }
    // Every format is written, so each can be compared; the page names only the ones it offers.
    const address = (file) => {
      fs.writeFileSync(path.join(outDir, `${name}.${file.extension}`), file.buffer);
      return `/assets/img/${name}.${file.extension}?v=${fingerprint(file.buffer)}`;
    };
    const { sources, fallback } = offerOrder(made.picture.files);
    for (const file of made.picture.files.filter(
      (file) => file !== fallback && !sources.includes(file),
    ))
      address(file);
    pictures[name] = {
      kind: 'pixels',
      src: address(fallback),
      sources: sources.map((file) => ({ type: file.type, src: address(file), bytes: file.bytes })),
      formats: made.picture.files.map(({ extension, bytes, exact }) => ({
        extension,
        bytes,
        exact,
      })),
      width: made.picture.width,
      height: made.picture.height,
      // Decoration gets an empty description, which tells screen readers to pass over it.
      alt: decorative ? '' : settings.alt,
      decorative,
      bytes: fallback.bytes,
      share: made.picture.share,
    };
    if (made.texture) {
      fs.writeFileSync(path.join(outDir, `${name}-texture.webp`), made.texture.buffer);
      pictures[name].texture = {
        src: `/assets/img/${name}-texture.webp?v=${fingerprint(made.texture.buffer)}`,
        width: made.texture.width,
        height: made.texture.height,
        bytes: made.texture.buffer.length,
      };
    }
  }
  return pictures;
}

// Run directly (node scripts/images.mjs): convert into _site and print a line per picture.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const pictures = await convertImages(path.join(root, '_site', 'assets', 'img'));
  for (const [name, picture] of Object.entries(pictures)) {
    if (picture.kind === 'photo') {
      for (const format of picture.formats)
        console.log(
          `${name}: ${format.extension} at quality ${format.quality} (score ${format.score.toFixed(4)}), ${format.files.map((file) => `${file.width}px ${file.bytes} bytes`).join(', ')}`,
        );
      continue;
    }
    console.log(
      `${name}: ${picture.width} x ${picture.height} blocks, ${Math.round(picture.share * 100)}% drawn, ${picture.formats.map((format) => `${format.extension} ${format.bytes}${format.exact ? '' : ' (not exact)'}`).join(', ')}; offered: ${[...picture.sources.map((source) => source.type.split('/')[1]), 'png'].join(', ')}${picture.texture ? `; texture ${picture.texture.bytes} bytes` : ''}`,
    );
  }
}
