// Checks the site before a commit: builds it, looks for broken links between its own pages and
// files, then photographs every page in Chromium, Firefox and WebKit at laptop and phone widths.
// Run it with: npm run check
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import Eleventy from '@11ty/eleventy';
import { chromium, firefox, webkit } from 'playwright';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
process.chdir(root);

const siteDir = path.join(root, '_site');
const privateDir = path.join(root, '..', 'romitraj-private');
// Screenshots go next to the reference screenshots when that folder exists, otherwise into this repo (ignored by git).
const shotsDir = fs.existsSync(privateDir) ? path.join(privateDir, 'screenshots') : path.join(root, 'screenshots');
const port = 4173;

const engines = { chromium, firefox, webkit };
const viewports = {
  'laptop-1440': { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  'phone-390': { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, mobile: true },
};

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
});

// ---- 1. Build ----
console.log('Building the site...');
fs.rmSync(siteDir, { recursive: true, force: true });
await new Eleventy().write();

const htmlFiles = walk(siteDir).filter((file) => file.endsWith('.html'));
// "/", "/about/" and so on, from the built files.
const pageOf = (file) => '/' + path.relative(siteDir, file).split(path.sep).join('/').replace(/index\.html$/, '');
const pages = htmlFiles.map(pageOf).sort();

// ---- 2. Broken links ----
const exists = (urlPath) => {
  const target = path.join(siteDir, urlPath);
  const stats = fs.statSync(target, { throwIfNoEntry: false });
  if (!stats) return false;
  return stats.isFile() || fs.existsSync(path.join(target, 'index.html'));
};
const broken = [];
let linkCount = 0;
for (const file of htmlFiles) {
  const page = pageOf(file);
  const html = fs.readFileSync(file, 'utf8');
  for (const [, link] of html.matchAll(/\s(?:href|src)="([^"]*)"/g)) {
    if (link === '' || /^(https?:|mailto:|tel:|data:|#)/.test(link)) continue;
    linkCount++;
    const clean = decodeURIComponent(link.split('#')[0].split('?')[0]);
    const target = clean.startsWith('/') ? clean : path.posix.join(page, clean);
    if (!exists(target)) broken.push(`${page} links to ${link}`);
  }
}
if (broken.length) {
  console.log(`\nBROKEN LINKS (${broken.length}):\n  ` + broken.join('\n  '));
  process.exitCode = 1;
} else {
  console.log(`Links: ${linkCount} internal links on ${pages.length} page(s), none broken.`);
}

// ---- 3. Screenshots ----
const server = spawn(process.execPath, ['server/index.js'], { cwd: root, env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
const waitForServer = async () => {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      if ((await fetch(`http://localhost:${port}/`)).ok) return;
    } catch {
      // Not up yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`The site server did not start on port ${port}.`);
};

try {
  await waitForServer();
  fs.rmSync(shotsDir, { recursive: true, force: true });
  for (const [engineName, engine] of Object.entries(engines)) {
    let browser;
    try {
      browser = await engine.launch();
    } catch (error) {
      console.log(`\nCould not start ${engineName}. Install the browsers once with: npx playwright install chromium firefox webkit`);
      throw error;
    }
    for (const [viewportName, settings] of Object.entries(viewports)) {
      const dir = path.join(shotsDir, viewportName, engineName);
      fs.mkdirSync(dir, { recursive: true });
      const options = { viewport: settings.viewport, deviceScaleFactor: settings.deviceScaleFactor };
      // Firefox has no phone mode; it still gets the phone-sized window.
      if (settings.mobile && engineName !== 'firefox') Object.assign(options, { isMobile: true, hasTouch: true });
      const context = await browser.newContext(options);
      const page = await context.newPage();
      const problems = [];
      page.on('requestfailed', (request) => problems.push(`${request.url()} failed to load`));
      // The free fallback fonts should never be needed. If one is fetched, a licensed font failed or lacks a character.
      page.on('request', (request) => {
        const url = new URL(request.url());
        if (url.pathname.startsWith('/assets/fonts/') && url.pathname.endsWith('.woff2')) {
          problems.push(`fallback font ${path.posix.basename(url.pathname)} was used on ${new URL(page.url()).pathname} (npm run fonts lists the characters each licensed font lacks)`);
        }
      });
      page.on('response', (response) => { if (response.status() >= 400) problems.push(`${response.url()} answered ${response.status()}`); });
      for (const pagePath of pages) {
        await page.goto(`http://localhost:${port}${pagePath}`, { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready);
        const name = pagePath === '/' ? 'home' : pagePath.replace(/^\/|\/$/g, '').replace(/\//g, '-').replace(/\.html$/, '');
        await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true });
      }
      if (problems.length) {
        console.log(`\nPROBLEMS in ${engineName} at ${viewportName}:\n  ` + [...new Set(problems)].join('\n  '));
        process.exitCode = 1;
      }
      await context.close();
    }
    await browser.close();
    console.log(`Screenshots: ${engineName} done.`);
  }
  console.log(`\nSaved to ${shotsDir}`);
} finally {
  server.kill();
}
console.log(process.exitCode ? '\nCheck finished with problems.' : '\nCheck passed.');
