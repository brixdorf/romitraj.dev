// Makes the site's own icon (the "favicon": the small picture in a browser tab, in bookmarks and
// on a phone's home screen) during every build, from one drawing: a compass.
//
// The drawing is src/assets/icons/site-icon.svg: this site's compass (the one in the footer),
// reduced to a ring, four long points, four short points and a hub, made for this site. Its two
// colors are the site's ink and paper, read from src/assets/css/tokens.css, so the icon follows
// the site if they ever change.
//
// What it writes into the built site, and who uses each file:
//   favicon.svg            The compass as a drawing, sharp at any size. Ink on a light tab, paper
//                          on a dark one: the file itself switches. Chrome, Edge, Firefox and
//                          Safari from version 26 use this one.
//   favicon.ico            The ink compass as two small pictures (16 and 32 pixels) in the old
//                          icon format, for older Safari and for anything that looks for an icon
//                          at this fixed address without reading the page.
//   apple-touch-icon.png   180 pixels: a paper compass on an ink square, for a home screen on an
//                          iPhone or iPad. It has no transparent parts, as those would turn black.
//   icon-192.png, icon-512.png and site.webmanifest
//                          The same square at two sizes, and the small file that tells Android
//                          where they are and what the site is called.
// It returns each file's address with a fingerprint ("?v=..."), for the page's head.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

// The drawing's own grid: 64 by 64, with the compass filling it.
const grid = 64;
// On a square, the compass is drawn smaller and centered (about two thirds of the square), so
// that a phone can round the square's corners, or cut it to a circle, without touching it.
const shareOfSquare = 0.68;

const fingerprint = (data) => createHash('sha256').update(data).digest('hex').slice(0, 8);

// Several small PNG pictures wrapped as one .ico file: a 6-byte header, one 16-byte entry per
// picture (its size and where its data starts), then the pictures themselves.
function wrapAsIco(pictures) {
  const header = Buffer.alloc(6 + 16 * pictures.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pictures.length, 4);
  let offset = header.length;
  pictures.forEach(({ size, data }, index) => {
    const at = 6 + 16 * index;
    header.writeUInt8(size, at);
    header.writeUInt8(size, at + 1);
    header.writeUInt16LE(1, at + 4);
    header.writeUInt16LE(32, at + 6);
    header.writeUInt32LE(data.length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...pictures.map((picture) => picture.data)]);
}

export async function makeSiteIcons(outputDir, { root = process.cwd() } = {}) {
  const site = JSON.parse(fs.readFileSync(path.join(root, 'src', '_data', 'site.json'), 'utf8'));
  const tokens = fs.readFileSync(path.join(root, 'src', 'assets', 'css', 'tokens.css'), 'utf8');
  const color = (name) => {
    const found = new RegExp(`--${name}:\\s*(#[0-9a-f]{6})\\b`, 'i').exec(tokens);
    if (!found) throw new Error(`tokens.css has no six-digit color for --${name}, which the site's icon needs.`);
    return found[1];
  };
  const ink = color('color-ink');
  const paper = color('color-paper');

  // The drawing's shapes, without its own colors: each shape says what it is with a class
  // ("ring", "mark" or "hub"), and the colors are given here, differently for each file.
  const source = fs.readFileSync(path.join(root, 'src', 'assets', 'icons', 'site-icon.svg'), 'utf8');
  const shapes = source.replace(/<!--[\s\S]*?-->/g, '').replace(/<style>[\s\S]*?<\/style>/, '').replace(/<\/?svg[^>]*>/g, '').replace(/\s*\n\s*/g, '').trim();
  if (!shapes.includes('class="ring"') || !shapes.includes('class="mark"')) throw new Error('src/assets/icons/site-icon.svg has no shapes marked "ring" and "mark" to color.');
  // The ring and the points in one color, the hub in the other.
  const colors = (main, other) => `.ring{fill:none;stroke:${main};stroke-width:4}.mark{fill:${main}}.hub{fill:${other}}`;

  // The drawing for browser tabs. The style inside it picks the colors: ink, or paper when the
  // browser's tabs are dark.
  const tabIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${grid} ${grid}"><style>${colors(ink, paper)}@media (prefers-color-scheme:dark){${colors(paper, ink)}}</style>${shapes}</svg>\n`;
  // The same compass in ink only, and the paper compass on an ink square, for the files that cannot switch.
  const inkOnly = (size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${grid} ${grid}" width="${size}" height="${size}"><style>${colors(ink, paper)}</style>${shapes}</svg>`;
  const square = (size) => {
    const scale = shareOfSquare;
    const edge = (grid * (1 - scale)) / 2;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${grid} ${grid}" width="${size}" height="${size}"><style>${colors(paper, ink)}</style><rect width="${grid}" height="${grid}" fill="${ink}"/><g transform="translate(${edge} ${edge}) scale(${scale})">${shapes}</g></svg>`;
  };
  const png = (drawing) => sharp(Buffer.from(drawing)).png({ compressionLevel: 9 }).toBuffer();

  const files = {
    'favicon.svg': Buffer.from(tabIcon),
    'favicon.ico': wrapAsIco([{ size: 16, data: await png(inkOnly(16)) }, { size: 32, data: await png(inkOnly(32)) }]),
    'apple-touch-icon.png': await png(square(180)),
    'icon-192.png': await png(square(192)),
    'icon-512.png': await png(square(512)),
  };
  const address = (name) => `/${name}?v=${fingerprint(files[name])}`;
  // What Android reads when the site is added to a home screen.
  files['site.webmanifest'] = Buffer.from(JSON.stringify({
    name: site.name,
    short_name: site.name,
    start_url: '/',
    display: 'browser',
    background_color: paper,
    theme_color: site.themeColor,
    icons: [192, 512].map((size) => ({ src: address(`icon-${size}.png`), sizes: `${size}x${size}`, type: 'image/png', purpose: 'any maskable' })),
  }, null, 2) + '\n');

  fs.mkdirSync(outputDir, { recursive: true });
  for (const [name, data] of Object.entries(files)) fs.writeFileSync(path.join(outputDir, name), data);
  return { svg: address('favicon.svg'), ico: address('favicon.ico'), touch: address('apple-touch-icon.png'), manifest: address('site.webmanifest') };
}
