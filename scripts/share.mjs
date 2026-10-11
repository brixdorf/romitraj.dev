// Makes two pictures of the site that live in the repository, not in the build:
//   src/assets/img/share.png   The share image: the 1200 by 630 pixel card that WhatsApp, LinkedIn,
//                              X and similar apps show when a link to the site is shared.
//   docs/screenshot.png        The picture of the home page at the top of the README.
// Run it with: npm run share
// Run it again after changing the headline, the fonts, the colors or the diver drawing, then
// commit the two pictures.
//
// Why this is a command and not part of the build: the card is set in the site's licensed fonts.
// Those are on this computer (in the private folder next door) and not on the live server, which
// builds the site without them. So the card is drawn here, in a real browser, and saved as a
// picture.
//
// The card is made from the site's own parts: its stylesheet (so the colors, fonts and the raised
// apostrophe are the site's), the headline's words from _data/headline.json, the sizes that make
// each big line fill its space from _data/textWidths.json, the gradient bar's colors, and the
// close-up of the diver drawing ("searcher" in _data/images.json).
// The screenshot is taken from the site as "npm start" serves it on this computer, so it shows
// the real weather and track if the keys in .env are there, and simply no track if they are not.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { root, siteDir, buildSite, startServer } from './lib/site.mjs';

const read = (file) => JSON.parse(fs.readFileSync(path.join(root, 'src', '_data', file), 'utf8'));
const site = read('site.json');
const headline = read('headline.json');
const widths = read('textWidths.json');
const escape = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// The giant letters have no apostrophe: the site draws one from their comma, raised (base.css).
const giantLine = (text) => escape(text).replace(/['’]/g, '<span class="apostrophe"></span>');

// The card's own measurements, in pixels.
const card = { width: 1200, height: 630, bar: 12, edge: 48, gap: 40, block: 4 };

await buildSite();
if (!fs.existsSync(path.join(siteDir, 'fonts'))) {
  throw new Error('The licensed fonts are not on this computer (the private folder next door is missing), so the share image cannot be drawn. The one in src/assets/img/share.png stays as it is.');
}
const server = await startServer(4178);
const browser = await chromium.launch();
try {
  // ---- The share image ----
  // The page borrows the head of the built home page: the fonts and the site's stylesheet.
  const home = fs.readFileSync(path.join(siteDir, 'index.html'), 'utf8');
  const fonts = [...home.matchAll(/<style>[\s\S]*?<\/style>/g)].map((match) => match[0]).filter((style) => style.includes('@font-face')).join('\n');
  const stylesheet = /<link rel="stylesheet" href="[^"]+">/.exec(home)[0];
  const picture = /<img class="picture[^"]*" src="([^"]+)" width="(\d+)" height="(\d+)"/.exec(fs.readFileSync(path.join(siteDir, '404.html'), 'utf8').split('lost__frame')[1]);
  const [, pictureSrc, blocksAcross, blocksDown] = picture;
  const frameWidth = Number(blocksAcross) * card.block;
  const frameHeight = Number(blocksDown) * card.block;
  const textWidth = card.width - 2 * card.edge - card.gap - frameWidth - 4;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">${fonts}${stylesheet}<style>
    html, body { margin: 0; inline-size: ${card.width}px; block-size: ${card.height}px; overflow: hidden; background: var(--color-paper); color: var(--color-ink); }
    .bar { position: absolute; inset: 0 0 auto 0; block-size: ${card.bar}px; background: linear-gradient(90deg, var(--color-bar-1), var(--color-bar-2), var(--color-bar-3), var(--color-bar-4)); }
    .words { position: absolute; inset: ${card.bar + 40}px auto ${card.edge - 8}px ${card.edge}px; inline-size: ${textWidth}px; display: flex; flex-direction: column; }
    .opening { margin: 0; font-family: var(--font-serif-display); font-size: ${(textWidth * 0.996 / widths.opening).toFixed(2)}px; line-height: 0.8; text-transform: uppercase; white-space: nowrap; }
    .giant { margin: 14px 0 0; font-family: var(--font-display); font-size: ${(textWidth * 0.996 / widths.giantLongestLine).toFixed(2)}px; line-height: 0.75; text-transform: uppercase; white-space: nowrap; }
    .giant span.line { display: block; }
    .last { display: flex; align-items: baseline; gap: 20px; margin: 10px 0 0; }
    .flourish { font-family: var(--font-serif-display); font-style: italic; font-size: 64px; line-height: 1; color: var(--color-paper); -webkit-text-stroke: 1.5px var(--color-ink); }
    .serif { font-family: var(--font-serif-display); font-size: 118px; line-height: 0.8; text-transform: uppercase; }
    .foot { margin: auto 0 0; display: flex; justify-content: space-between; align-items: baseline; font-family: var(--font-text); font-size: 20px; line-height: 1.2; letter-spacing: -0.01em; text-transform: uppercase; }
    .foot .muted { color: var(--color-muted-on-paper); }
    .art { position: absolute; inset-block-start: ${card.bar + 40}px; inset-inline-end: ${card.edge}px; inline-size: ${frameWidth}px; block-size: ${frameHeight}px; border: var(--rule) solid var(--color-ink); border-radius: var(--radius); overflow: hidden; }
    .art img { display: block; inline-size: 100%; block-size: 100%; image-rendering: pixelated; }
  </style></head><body>
    <div class="bar"></div>
    <div class="words">
      <p class="opening">${escape(headline.opening.plain)} <em>${escape(headline.opening.italic)}</em></p>
      <p class="giant">${headline.giant.map((line) => `<span class="line">${giantLine(line)}</span>`).join('')}</p>
      <p class="last"><span class="flourish">${escape(headline.flourish)}</span><span class="serif">${escape(headline.serif)}</span></p>
      <p class="foot"><span>${escape(site.name)}</span><span class="muted">${escape(new URL(site.url).hostname)}</span></p>
    </div>
    <div class="art"><img src="${pictureSrc}" alt=""></div>
  </body></html>`;
  const page = await browser.newPage({ viewport: { width: card.width, height: card.height }, deviceScaleFactor: 1 });
  // The card is handed to the browser as if it were a page of the local site, so that the fonts,
  // the stylesheet and the picture are found at the site's own addresses.
  await page.route(server.address + '/share-card', (route) => route.fulfill({ contentType: 'text/html; charset=utf-8', body: html }));
  await page.goto(server.address + '/share-card', { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const missing = await page.evaluate(() => ['100px "Manuka"', '100px "Louize Display"', 'italic 100px "Louize Display"', '20px "Neue Montreal"'].filter((font) => !document.fonts.check(font)));
  if (missing.length) throw new Error(`These fonts did not load for the share image: ${missing.join(', ')}.`);
  await page.waitForTimeout(300);
  const shareFile = path.join(root, 'src', 'assets', 'img', 'share.png');
  // Saved with a small set of colors: the card is flat ink and paper, so the file stays light.
  await sharp(await page.screenshot({ type: 'png' })).png({ palette: true, colors: 128, compressionLevel: 9 }).toFile(shareFile);
  await page.close();
  console.log(`Share image: ${path.relative(root, shareFile)}, ${card.width} by ${card.height} pixels, ${(fs.statSync(shareFile).size / 1024).toFixed(0)} KB.`);

  // ---- The README's screenshot: the top of the home page on a laptop-sized window ----
  const shot = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  // A still page: the headline in place, and the same starting places for the rows on every run.
  await shot.addInitScript(() => { window.steadyMotion = true; });
  await shot.goto(server.address + '/', { waitUntil: 'load' });
  await shot.evaluate(() => document.fonts.ready);
  // Long enough for the weather and the track to arrive, if they are going to.
  await shot.waitForTimeout(3500);
  const shotFile = path.join(root, 'docs', 'screenshot.png');
  await sharp(await shot.screenshot({ type: 'png' })).png({ compressionLevel: 9 }).toFile(shotFile);
  console.log(`README screenshot: ${path.relative(root, shotFile)}, ${(fs.statSync(shotFile).size / 1024).toFixed(0)} KB.`);
} finally {
  await browser.close();
  server.stop();
}
