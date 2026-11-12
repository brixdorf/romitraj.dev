// Draws the hero's compass at rest in a real browser, with the site's own WebGL code
// (src/assets/js/compass.js), and saves it as src/assets/img/source/hero-compass.png: the still pixel
// picture the hero shows before the 3D compass starts, and wherever it cannot run. The build turns
// it into the hero's picture like any other source (scripts/images.mjs), and the share image
// uses it. Run by `pnpm run share`; see "The hero's compass" in docs/guide.md.
import fs from 'node:fs';
import path from 'node:path';
import { root } from './site.mjs';
import { bundleForPage } from './bundle.mjs';

export const stillFile = path.join(root, 'src', 'assets', 'img', 'source', 'hero-compass.png');

// The size of the hero's picture in blocks, from images.json ("across" and "shape").
function blocks() {
  const hero = JSON.parse(fs.readFileSync(path.join(root, 'src', '_data', 'images.json'), 'utf8'))
    .pictures.hero;
  const [across, down] = hero.shape.split(':').map(Number);
  return { width: hero.across, height: Math.round((hero.across * down) / across) };
}

// The ink and paper colours, as the styles have them.
function colours() {
  const tokens = fs.readFileSync(path.join(root, 'src', 'assets', 'css', 'tokens.css'), 'utf8');
  return ['ink', 'paper']
    .map(
      (name) =>
        `--color-${name}: ${new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(tokens)[1]};`,
    )
    .join(' ');
}

// Draws the still in "browser" (a Playwright browser with WebGL) and saves it. Returns its size.
export async function makeCompassStill(browser) {
  const { width, height } = blocks();
  const script = await bundleForPage(
    "export { drawStill } from './compass.js';",
    'src/assets/js',
    'compass',
  );
  const page = await browser.newPage();
  try {
    await page.setContent(
      `<!doctype html><html style="${colours()}"><body><canvas width="${width}" height="${height}"></canvas></body></html>`,
    );
    await page.addScriptTag({ content: script });
    const dataUrl = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      window.compass.drawStill(canvas);
      return canvas.toDataURL('image/png');
    });
    fs.writeFileSync(stillFile, Buffer.from(dataUrl.split(',')[1], 'base64'));
    return { width, height };
  } finally {
    await page.close();
  }
}
