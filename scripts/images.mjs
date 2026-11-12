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

// Which part of a photo is its plain backdrop: the pixels reached from the picture's edge by
// steps between neighbours whose greys differ by less than "step" (0 to 1). An even or slowly
// changing backdrop is followed all the way to the subject, and stops at the subject's edge, where
// the grey jumps. A light spot inside the subject cannot be reached from the edge, so it stays.
// The search starts only from edge pixels close to the ground's grey (within four steps), so a
// subject that runs off the edge of the picture is not taken for backdrop. The ground's grey is
// "ground" (0 to 1) when given, or else the usual grey along the edge.
// Used by the "cutout" setting, so a photo of an object on a plain ground becomes the object alone
// on paper, the way the reference cuts out its subjects. Gives 1 for backdrop, 0 for the rest.
export function plainBackdrop(greys, width, height, step, ground = null) {
  const limit = step * 255;
  const found = new Uint8Array(width * height);
  const queue = [];
  const edge = [];
  for (let x = 0; x < width; x++) edge.push(greys[x], greys[(height - 1) * width + x]);
  for (let y = 0; y < height; y++) edge.push(greys[y * width], greys[y * width + width - 1]);
  const usual =
    ground === null ? edge.sort((a, b) => a - b)[Math.floor(edge.length / 2)] : ground * 255;
  const seed = (index) => {
    if (found[index] || Math.abs(greys[index] - usual) >= 4 * limit) return;
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

// How much room to add around a photo shown at a zoom below 1: enough on each side that the photo
// takes up "zoom" of the result's width and height. None at a zoom of 1 or more.
export function paddingFor(width, height, zoom) {
  if (!(zoom < 1)) return null;
  const across = Math.round(width / zoom) - width;
  const down = Math.round(height / zoom) - height;
  const left = Math.floor(across / 2);
  const top = Math.floor(down / 2);
  return { left, right: across - left, top, bottom: down - top };
}

// How much of a picture is kept at a block (1 all of it, 0 none: paper), for a picture that fades
// into the paper toward its edges like a vignette in an old book ("fade": the share of the way
// from the middle to the edge over which it fades). The fade follows an oval the shape of the
// picture, so the corners go first. "from" moves the oval's middle (x and y from 0 to 1): from a
// corner, the picture is whole there and fades out along the two far edges only. "size" below 1
// makes the oval smaller than that, with paper all round it.
export function fadeKeeps(x, y, width, height, fade, from = { x: 0.5, y: 0.5 }, size = 1) {
  if (!fade) return 1;
  const reach = (share) => Math.max(share, 1 - share) * size;
  const across = Math.abs(x / width - from.x) / reach(from.x);
  const down = Math.abs(y / height - from.y) / reach(from.y);
  const share = Math.min(1, Math.max(0, (1 - Math.hypot(across, down)) / fade));
  return share * share * (3 - 2 * share);
}

// The part of a picture to repeat ("part": x, y, width and height as shares of the picture), in
// whole pixels and within the picture. Without a part, the whole picture.
export function partRegion(width, height, part = {}) {
  const { x = 0, y = 0, width: across = 1, height: down = 1 } = part;
  const left = Math.round(Math.min(1, Math.max(0, x)) * width);
  const top = Math.round(Math.min(1, Math.max(0, y)) * height);
  return {
    left,
    top,
    width: Math.min(width - left, Math.round(across * width)),
    height: Math.min(height - top, Math.round(down * height)),
  };
}

// Where copies of a picture go when it is repeated side by side ("repeat": how many, and the gap
// between them as a share of one copy's width), with half a gap at each end so the row can
// continue past the frame: the width and height of the row, and each copy's left edge.
export function repeatLayout(width, height, count, gap) {
  const space = Math.round(width * gap);
  const lefts = Array.from({ length: count }, (_, index) =>
    Math.round(space / 2 + index * (width + space)),
  );
  return { width: count * (width + space), height, lefts };
}

// The usual grey (0 to 1) along the edge of a whole photo, measured on a small copy.
async function usualEdgeGrey(image) {
  const size = 64;
  const greys = await image
    .flatten({ background: '#ffffff' })
    .resize(size, size, { fit: 'fill' })
    .greyscale()
    .raw()
    .toBuffer();
  const edge = [];
  for (let at = 0; at < size; at++)
    edge.push(
      greys[at],
      greys[(size - 1) * size + at],
      greys[at * size],
      greys[at * size + size - 1],
    );
  return edge.sort((a, b) => a - b)[Math.floor(edge.length / 2)] / 255;
}

// Whether a picture needs its source on record in image-credits.json: every photo or print does,
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
  let opened = () => sharp(file, isDrawing ? { density: 300 } : {}).rotate();
  let meta = await opened().metadata();
  let crop = settings.crop;
  // A picture repeated side by side, in the grey of its own ground (which a cutout then removes),
  // for a band that fills a wide frame, as one motif repeated.
  if (settings.repeat) {
    const { count = 3, gap = 0, part } = settings.repeat;
    const grey = Math.round((await usualEdgeGrey(opened())) * 255);
    const piece = partRegion(meta.width, meta.height, part);
    const one = await opened().flatten({ background: '#ffffff' }).extract(piece).png().toBuffer();
    const row = repeatLayout(piece.width, piece.height, count, gap);
    const repeated = await sharp({
      create: {
        width: row.width,
        height: row.height,
        channels: 3,
        background: { r: grey, g: grey, b: grey },
      },
    })
      .composite(row.lefts.map((left) => ({ input: one, left, top: 0 })))
      .png()
      .toBuffer();
    opened = () => sharp(repeated);
    meta = await opened().metadata();
  }
  // A zoom below 1 shows the whole photo smaller, with room around it in the grey of the photo's
  // own ground (so it blends in and turns to paper with it), for a subject that would otherwise be
  // cut by a wide frame.
  const padding = paddingFor(meta.width, meta.height, crop?.zoom);
  if (padding) {
    const grey = Math.round((await usualEdgeGrey(opened())) * 255);
    const padded = await opened()
      .flatten({ background: '#ffffff' })
      .extend({ ...padding, background: { r: grey, g: grey, b: grey } })
      .png()
      .toBuffer();
    opened = () => sharp(padded);
    meta = await opened().metadata();
    crop = { ...crop, zoom: 1 };
  }
  const shape = settings.shape ? shapeOf(settings.shape) : meta.width / meta.height;
  const across = settings.across;
  const down = Math.round(across / shape);
  let image = opened()
    .flatten({ background: '#ffffff' })
    .extract(regionToUse(meta.width, meta.height, shape, crop))
    .resize(across, down, { fit: 'fill', kernel: 'lanczos3' })
    .greyscale();
  if (settings.stretch) image = image.normalise({ lower: 1, upper: 99 });
  if (sharpen) image = image.sharpen({ sigma: sharpen });
  const greys = await image.raw().toBuffer();

  // A photo of an object on a plain ground ("cutout": how far apart two neighbouring greys of the
  // ground may be) loses its ground: it becomes paper. Found on a slightly softened copy, so the
  // grain of the photo does not stop the search. The ground's grey is the usual grey along the
  // whole photo's edge, which a tight crop through the subject would not show.
  const groundGrey = settings.cutout ? await usualEdgeGrey(opened()) : null;
  const cutAway = settings.cutout
    ? plainBackdrop(
        await opened()
          .flatten({ background: '#ffffff' })
          .extract(regionToUse(meta.width, meta.height, shape, crop))
          .resize(across, down, { fit: 'fill', kernel: 'lanczos3' })
          .greyscale()
          .blur(0.8)
          .raw()
          .toBuffer(),
        across,
        down,
        settings.cutout,
        groundGrey,
      )
    : null;

  // A picture that fades into the paper toward its edges: "fade" is a number (the share of the way
  // over which it fades, from the middle), or { amount, x, y, size } to fade from another point,
  // or within a smaller oval.
  const fade = typeof settings.fade === 'object' ? settings.fade.amount : settings.fade;
  const fadeSize = typeof settings.fade === 'object' ? (settings.fade.size ?? 1) : 1;
  const fadeFrom =
    typeof settings.fade === 'object'
      ? { x: settings.fade.x ?? 0.5, y: settings.fade.y ?? 0.5 }
      : { x: 0.5, y: 0.5 };

  // Stretch the greys, then dither.
  let dark = new Uint8Array(across * down);
  for (let y = 0; y < down; y++) {
    for (let x = 0; x < across; x++) {
      const index = y * across + x;
      let value = Math.min(1, Math.max(0, (greys[index] / 255 - black) / (white - black)));
      if (gamma !== 1) value **= gamma;
      if (fade)
        value =
          1 - (1 - value) * fadeKeeps(x + 0.5, y + 0.5, across, down, fade, fadeFrom, fadeSize);
      dark[index] = value <= thresholdAt(pattern, x, y) && !cutAway?.[index] ? 1 : 0;
    }
  }

  // Lone specks of ink on paper go, if the picture asks for it ("despeckle": true).
  if (settings.despeckle) dark = removeSpecks(dark, across, down);

  // Colour the pixels. "tones: ink" draws the dark parts in ink on the ground; "tones: paper"
  // draws the light parts in paper on a clear ground (for pictures that sit on the ink colour).
  const pixels = Buffer.alloc(across * down * 4);
  let used = 0;
  for (let index = 0; index < dark.length; index++) {
    let colour = null;
    if (tones === 'paper') colour = dark[index] ? null : colours.paper;
    else if (dark[index]) colour = colours.ink;
    else if (ground === 'paper') colour = colours.paper;
    if (colour) {
      pixels.set([...colour, 255], index * 4);
      if (colour === (tones === 'paper' ? colours.paper : colours.ink)) used++;
    }
  }
  const files = await losslessFormats(pixels, across, down);
  return { files, width: across, height: down, share: used / dark.length };
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
    // Every photo or print must have its source on record, unless it is marked "credit": false.
    if (needsCredit(settings) && !credits.pictures?.[settings.source])
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
      made = { key, picture };
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
      `${name}: ${picture.width} x ${picture.height} blocks, ${Math.round(picture.share * 100)}% drawn, ${picture.formats.map((format) => `${format.extension} ${format.bytes}${format.exact ? '' : ' (not exact)'}`).join(', ')}; offered: ${[...picture.sources.map((source) => source.type.split('/')[1]), 'png'].join(', ')}`,
    );
  }
}
