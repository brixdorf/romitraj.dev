// Tests used by the check script, about the pictures.
// "picturesHoldStill" opens every page with its picture files held back, notes where everything
// is, lets the pictures arrive, and reports anything that moved: a picture must never push the
// page around as it loads. It also confirms that every picture has its size written into the
// page, carries the description written for it in images.json (or an empty one, if it is marked
// as decoration there), is enlarged with hard pixel edges, and really loads.
// It also hands back where every picture ended up, and "picturesDiffer" compares that from one
// browser to the next: the same picture must show the same part of itself, in the same place, in
// all of them.
// "pictureFiles" lists how heavy the finished picture files are.
import fs from 'node:fs';
import path from 'node:path';
import { root } from './site.mjs';

// The heaviest a single picture file may be. The two-tone pictures are far below this; it is
// here to catch a setting that makes one balloon.
const heaviestAllowed = 24 * 1024;

export function pictureFiles(siteDir) {
  const dir = path.join(siteDir, 'assets', 'img');
  // The share image sits in the same folder but is not a picture on any page: visitors never
  // load it, only sharing apps do. It has its own weight limit (lib/head.mjs).
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((name) => name !== 'share.png').map((name) => ({ name, bytes: fs.statSync(path.join(dir, name)).size })) : [];
  const total = files.reduce((sum, file) => sum + file.bytes, 0);
  const heaviest = files.reduce((most, file) => (file.bytes > (most?.bytes ?? 0) ? file : most), null);
  const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
  return {
    summary: files.length ? `${files.length} files, ${kb(total)} in all, the heaviest ${heaviest.name} at ${kb(heaviest.bytes)}` : 'none',
    problems: files.filter((file) => file.bytes > heaviestAllowed).map((file) => `${file.name} is ${kb(file.bytes)}: more than the ${kb(heaviestAllowed)} a picture may weigh`),
  };
}

// Where everything on the page is. Tickers are left out: they move all the time by design.
const places = () => [...document.querySelectorAll('body *')]
  .filter((element) => !element.closest('[data-ticker]') && !element.matches('img.picture') && element.getClientRects().length)
  .map((element) => {
    const rect = element.getBoundingClientRect();
    return { who: `${element.tagName.toLowerCase()}${element.className && typeof element.className === 'string' ? '.' + element.className.split(' ')[0] : ''}`, left: rect.left, top: rect.top + window.scrollY, width: rect.width, height: rect.height };
  });

// Where each picture shows on the page: the part of it that is not cut off by the box around it.
const pictureWindows = () => [...document.querySelectorAll('img.picture')].filter((image) => image.getClientRects().length).map((image) => {
  const rect = image.getBoundingClientRect();
  let left = rect.left;
  let top = rect.top;
  let right = rect.right;
  let bottom = rect.bottom;
  for (let box = image.parentElement; box && box !== document.body; box = box.parentElement) {
    if (getComputedStyle(box).overflow === 'visible') continue;
    const edge = box.getBoundingClientRect();
    left = Math.max(left, edge.left);
    top = Math.max(top, edge.top);
    right = Math.min(right, edge.right);
    bottom = Math.min(bottom, edge.bottom);
  }
  return { name: (image.getAttribute('src') || '').split('/').pop().split('?')[0], left, top: top + window.scrollY, width: Math.max(0, right - left), height: Math.max(0, bottom - top), fullWidth: rect.width, fullHeight: rect.height };
});

// Compares what "picturesHoldStill" found in each browser. "found" is { browser name: where }.
export function picturesDiffer(found) {
  const problems = [];
  const [first, ...others] = Object.entries(found);
  if (!first) return problems;
  for (const [key, pictures] of Object.entries(first[1])) {
    for (const [name, where] of others) {
      const theirs = where[key];
      if (!theirs || theirs.length !== pictures.length) {
        problems.push(`${key}: ${first[0]} shows ${pictures.length} pictures, ${name} shows ${theirs ? theirs.length : 0}`);
        continue;
      }
      pictures.forEach((picture, index) => {
        const off = ['left', 'top', 'width', 'height', 'fullWidth', 'fullHeight'].filter((side) => Math.abs(picture[side] - theirs[index][side]) > 1);
        if (off.length) problems.push(`${key}: ${picture.name} differs between ${first[0]} and ${name} (${off.map((side) => `${side} ${Math.round(picture[side])} against ${Math.round(theirs[index][side])}`).join(', ')})`);
      });
    }
  }
  return problems;
}

// What each picture file should say to screen readers: its description from images.json, or
// nothing if it is marked as decoration. A painted backdrop ("...-texture") is always decoration.
function expectedAlt(fileName) {
  const name = fileName.replace(/\.\w+$/, '');
  if (name.endsWith('-texture')) return '';
  const settings = JSON.parse(fs.readFileSync(path.join(root, 'src', '_data', 'images.json'), 'utf8')).pictures[name];
  if (!settings) return null;
  return settings.decorative === true ? '' : settings.alt;
}

export async function picturesHoldStill(browser, address, pagePaths) {
  const problems = [];
  const where = {};
  for (const size of [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport: size });
    // A still page: no headline entrance, fixed starting places.
    await context.addInitScript(() => { window.steadyMotion = true; });
    const page = await context.newPage();
    // Picture files wait here until they are let through.
    let letThrough = () => {};
    let held = new Promise((resolve) => { letThrough = resolve; });
    await page.route(/\/assets\/img\//, async (route) => {
      await held;
      await route.continue().catch(() => {});
    });
    for (const pagePath of pagePaths) {
      const at = `${pagePath} at ${size.width}px wide`;
      held = new Promise((resolve) => { letThrough = resolve; });
      await page.goto(address + pagePath, { waitUntil: 'domcontentloaded' });
      // Wait for the fonts, so that only the pictures are still missing. ("document.fonts.ready"
      // cannot be used here: Safari's engine holds it back until the pictures have loaded too.)
      await page.waitForFunction(() => document.fonts.status === 'loaded' && performance.now() > 700, null, { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(250);

      // What is written into the page for each picture.
      const written = await page.evaluate(() => [...document.querySelectorAll('img')].map((image) => ({
        name: (image.getAttribute('src') || '').split('/').pop().split('?')[0],
        sized: Number(image.getAttribute('width')) > 0 && Number(image.getAttribute('height')) > 0,
        alt: image.getAttribute('alt'),
        pixels: image.classList.contains('picture--pixels'),
        rendering: getComputedStyle(image).imageRendering,
        shown: image.getClientRects().length > 0,
      })));
      for (const image of written) {
        if (!image.sized) problems.push(`${at}: ${image.name} has no width and height written into the page`);
        const expected = expectedAlt(image.name);
        if (image.alt === null) problems.push(`${at}: ${image.name} has no alt attribute, so screen readers would read out its address`);
        else if (expected === null) problems.push(`${at}: ${image.name} is not in src/_data/images.json`);
        else if (image.alt !== expected) problems.push(expected === '' ? `${at}: ${image.name} is marked as decoration but is described as "${image.alt}"` : `${at}: ${image.name} should be described as "${expected}" but says "${image.alt}"`);
        if (image.pixels && image.rendering !== 'pixelated') problems.push(`${at}: ${image.name} would be enlarged with smoothing (image-rendering is ${image.rendering})`);
      }

      // Before any picture has arrived, then after all of them have.
      const before = await page.evaluate(places);
      await page.evaluate(() => { for (const image of document.images) image.loading = 'eager'; });
      letThrough();
      const loaded = await page.waitForFunction(() => [...document.images].every((image) => image.complete), null, { timeout: 8000 }).then(() => true).catch(() => false);
      if (!loaded) problems.push(`${at}: some pictures did not finish loading`);
      await page.waitForTimeout(150);
      const broken = await page.evaluate(() => [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => (image.getAttribute('src') || '').split('/').pop()));
      for (const name of broken) problems.push(`${at}: ${name} could not be shown`);
      const after = await page.evaluate(places);
      where[at] = await page.evaluate(pictureWindows);
      if (before.length !== after.length) {
        problems.push(`${at}: the page had ${before.length} pieces before its pictures loaded and ${after.length} after`);
        continue;
      }
      const moved = after.filter((place, index) => ['left', 'top', 'width', 'height'].some((side) => Math.abs(place[side] - before[index][side]) > 0.5));
      if (moved.length) problems.push(`${at}: ${moved.length} pieces moved when the pictures loaded, the first being ${moved[0].who}`);
    }
    await context.close();
  }
  return { problems: [...new Set(problems)], where };
}
