// A quick check, much faster than the full one: builds the site (with the stand-in weather, music
// and blog feed, like the full check), opens every page in Chromium at a laptop's, a tablet's and
// a phone's width, and reports a page that does not load, a file that fails or answers with an
// error, and any error a script prints. No screenshots and no other browsers: run "pnpm run check"
// before a release for those.
// Run it with: pnpm run smoke
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { siteDir, buildSite, startServer, launchOptions } from './lib/site.mjs';
import { startPretend } from './lib/pretend.mjs';

const pretend = await startPretend(4274);
process.env.BLOG_FEED_URL = pretend.env.BLOG_FEED_URL;
console.log('Building the site...');
await buildSite();

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]));
const pages = walk(siteDir).filter((file) => file.endsWith('.html')).map((file) => '/' + path.relative(siteDir, file).split(path.sep).join('/').replace(/index\.html$/, '')).sort();

const server = await startServer(4273, pretend.env);
const browser = await chromium.launch(launchOptions('chromium'));
const problems = [];
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    const at = () => `${new URL(page.url()).pathname} at ${viewport.width}px`;
    page.on('console', (message) => { if (message.type() === 'error' && !/Failed to load resource/.test(message.text())) problems.push(`${at()}: console error: ${message.text()}`); });
    page.on('pageerror', (error) => problems.push(`${at()}: script error: ${error.message}`));
    page.on('requestfailed', (request) => problems.push(`${at()}: ${request.url()} failed to load`));
    // The page for a missing address is answered 404 on purpose.
    page.on('response', (response) => { if (response.status() >= 400 && new URL(response.url()).pathname !== '/404.html') problems.push(`${at()}: ${response.url()} answered ${response.status()}`); });
    for (const pagePath of pages) {
      const response = await page.goto(server.address + pagePath, { waitUntil: 'load' });
      if (!response) problems.push(`${pagePath} did not load`);
      await page.evaluate(() => document.fonts.ready);
      // Long enough for the widgets to ask the server and for the page's scripts to settle.
      await page.waitForTimeout(300);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 0) problems.push(`${pagePath} is ${overflow}px wider than the window at ${viewport.width}px`);
    }
    await page.close();
  }
} finally {
  await browser.close();
  server.stop();
  await pretend.stop();
}
if (problems.length) {
  console.log(`\nPROBLEMS:\n  ${[...new Set(problems)].join('\n  ')}`);
  process.exitCode = 1;
} else {
  console.log(`Smoke check passed: ${pages.length} pages at three widths in Chromium, no failed files and no errors.`);
}
