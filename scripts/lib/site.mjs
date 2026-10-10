// Helpers shared by the check and fit scripts: build the site, serve it for a moment, and
// measure how wide the hero's big lines run.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import Eleventy from '@11ty/eleventy';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const siteDir = path.join(root, '_site');
export const textWidthsFile = path.join(root, 'src', '_data', 'textWidths.json');

// Builds the site from scratch into _site/.
export async function buildSite() {
  process.chdir(root);
  fs.rmSync(siteDir, { recursive: true, force: true });
  await new Eleventy().write();
}

// Starts the site's own server on the given port. Returns its address and a function that stops it.
export async function startServer(port) {
  const server = spawn(process.execPath, ['server/index.js'], { cwd: root, env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
  const address = `http://localhost:${port}`;
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      if ((await fetch(address + '/')).ok) return { address, stop: () => server.kill() };
    } catch {
      // Not up yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  server.kill();
  throw new Error(`The site server did not start on port ${port}.`);
}

// Measures each big hero line on the home page: its width divided by its font size.
// The styles use these numbers to size each line so it fills its space exactly.
export async function measureTextWidths(page, address) {
  const widthInEms = (selector) => page.evaluate((target) => [...document.querySelectorAll(target)].map((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    return range.getBoundingClientRect().width / parseFloat(getComputedStyle(element).fontSize);
  }), selector);
  const round = (value) => Math.round(value * 10000) / 10000;

  // The headline must be at rest to be measured, not sliding in.
  await page.addInitScript(() => { window.steadyMotion = true; });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(address + '/', { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const usingRealFonts = await page.evaluate(() => document.fonts.check('100px "Manuka"') && document.fonts.check('100px "Louize Display"'));
  if (!usingRealFonts) throw new Error('The licensed fonts did not load, so the lines cannot be measured.');
  const [giant] = await widthInEms('[data-fit="giant"]');
  const [serif] = await widthInEms('[data-fit="serif"]');
  const [opening] = await widthInEms('[data-fit="opening"]');

  // On a tablet-sized window the giant headline is split into lines.
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const lines = await widthInEms('[data-fit="giant"] .hero__giant-line');

  return { opening: round(opening), giant: round(giant), giantFirstLine: round(lines[0]), giantLongestLine: round(Math.max(...lines)), serif: round(serif) };
}
