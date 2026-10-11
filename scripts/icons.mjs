// Makes the site's own icon (the "favicon": the small picture in a browser tab, in bookmarks and
// on a phone's home screen) during every build, from one drawing: a single water drop.
//
// The drop is the "Drop Simple" icon of Phosphor Icons (MIT license, the same set as the site's
// other icons), kept as "drop" in src/_data/icons.json. Its two colors are the site's ink and
// paper, read from src/assets/css/tokens.css, so the icon follows the site if they ever change.
//
// What it writes into the built site, and who uses each file:
//   favicon.svg            The drop as a drawing, sharp at any size. Ink on a light tab, paper on
//                          a dark one: the file itself switches. Chrome, Edge, Firefox and Safari
//                          from version 26 use this one.
//   favicon.ico            The ink drop as two small pictures (16 and 32 pixels) in the old icon
//                          format, for older Safari and for anything that looks for an icon at
//                          this fixed address without reading the page.
//   apple-touch-icon.png   180 pixels: a paper drop on an ink square, for a home screen on an
//                          iPhone or iPad. It has no transparent parts, as those would turn black.
//   icon-192.png, icon-512.png and site.webmanifest
//                          The same square at two sizes, and the small file that tells Android
//                          where they are and what the site is called.
// It returns each file's address with a fingerprint ("?v=..."), for the page's head.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

// The drop is 176 units wide and 224 tall, centered on x=128, y=120 in the icon set's own grid.
// This window fits it with a little room above and below, so it fills a tab icon almost fully.
const tightWindow = '8 0 240 240';
// On a square, the drop is drawn smaller and centered, so that a phone can round the square's
// corners, or cut it to a circle, without touching the drop.
const squareWindow = '-64 -72 384 384';

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
  const drop = JSON.parse(fs.readFileSync(path.join(root, 'src', '_data', 'icons.json'), 'utf8')).drop;
  const site = JSON.parse(fs.readFileSync(path.join(root, 'src', '_data', 'site.json'), 'utf8'));
  const tokens = fs.readFileSync(path.join(root, 'src', 'assets', 'css', 'tokens.css'), 'utf8');
  const color = (name) => {
    const found = new RegExp(`--${name}:\\s*(#[0-9a-f]{6})\\b`, 'i').exec(tokens);
    if (!found) throw new Error(`tokens.css has no six-digit color for --${name}, which the site's icon needs.`);
    return found[1];
  };
  const ink = color('color-ink');
  const paper = color('color-paper');
  if (!drop) throw new Error('src/_data/icons.json has no "drop", which the site\'s icon is drawn from.');

  // The drawing for browser tabs. The style inside it picks the color: ink, or paper when the
  // browser's tabs are dark.
  const tabIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${tightWindow}"><style>path{fill:${ink}}@media (prefers-color-scheme:dark){path{fill:${paper}}}</style><path d="${drop}"/></svg>\n`;
  // The same drop in one fixed color, and the drop on a square, for the files that cannot switch.
  const inkDrop = (size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${tightWindow}" width="${size}" height="${size}"><path fill="${ink}" d="${drop}"/></svg>`;
  const square = (size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${squareWindow}" width="${size}" height="${size}"><rect x="-64" y="-72" width="384" height="384" fill="${ink}"/><path fill="${paper}" d="${drop}"/></svg>`;
  const png = (drawing) => sharp(Buffer.from(drawing)).png({ compressionLevel: 9 }).toBuffer();

  const files = {
    'favicon.svg': Buffer.from(tabIcon),
    'favicon.ico': wrapAsIco([{ size: 16, data: await png(inkDrop(16)) }, { size: 32, data: await png(inkDrop(32)) }]),
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
