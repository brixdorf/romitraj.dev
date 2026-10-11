// Measures how quickly a page shows its main content, in Chromium: First Contentful Paint (when
// anything first appears) and Largest Contentful Paint (when the biggest piece of content
// appears, the figure search engines use for "loading speed"). It builds the site, serves it, and
// loads the page several times on a simulated phone connection and on a fast one.
// On the home page it measures twice, with and without the headline's entrance, and prints the
// difference, so the cost of the entrance is always known.
// Like the check, it serves the site with stand-ins for the weather and music services, so it
// never contacts the real ones or uses the keys in .env, and the numbers do not depend on them.
// Run it with: npm run speed     (add a page, for example: npm run speed -- /about/)
import { chromium } from 'playwright';
import { buildSite, startServer } from './lib/site.mjs';
import { startPretend } from './lib/pretend.mjs';

const pagePath = process.argv[2] || '/';
const runs = 9;
// "Phone" is the slow connection and processor that Lighthouse uses for its mobile score.
const settings = {
  'a phone on a slow connection': { viewport: { width: 390, height: 844 }, network: { latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 }, cpuSlowdown: 4 },
  'a laptop on a fast connection': { viewport: { width: 1440, height: 900 }, network: null, cpuSlowdown: 1 },
};
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

// Loads the page once in a fresh browser profile and returns its two paint times.
async function load(browser, address, setting, entrance) {
  const context = await browser.newContext({ viewport: setting.viewport });
  const page = await context.newPage();
  const session = await context.newCDPSession(page);
  await session.send('Network.enable');
  await session.send('Network.setCacheDisabled', { cacheDisabled: true });
  if (setting.network) await session.send('Network.emulateNetworkConditions', { offline: false, ...setting.network });
  await session.send('Emulation.setCPUThrottlingRate', { rate: setting.cpuSlowdown });
  // "steadyMotion" is the site's own switch for a still page: with it, the headline does not slide in.
  if (!entrance) await page.addInitScript(() => { window.steadyMotion = true; });
  await page.addInitScript(() => {
    window.paints = { largest: null, first: null };
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const element = entry.element;
        window.paints.largest = { time: entry.startTime, what: element ? `${element.tagName.toLowerCase()}${element.className ? '.' + String(element.className).split(' ')[0] : ''} "${(element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28)}"` : 'something removed since' };
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (entry.name === 'first-contentful-paint') window.paints.first = entry.startTime;
    }).observe({ type: 'paint', buffered: true });
  });
  await page.goto(address + pagePath, { waitUntil: 'load' });
  await page.waitForTimeout(3500);
  const paints = await page.evaluate(() => window.paints);
  await context.close();
  return paints;
}

await buildSite();
const pretend = await startPretend(4176);
const server = await startServer(4175, pretend.env);
const browser = await chromium.launch();
try {
  const compare = pagePath === '/';
  for (const [name, setting] of Object.entries(settings)) {
    // The two kinds of load take turns, so that both see the same conditions on this computer.
    const results = { with: [], without: [] };
    for (let run = 0; run < runs; run++) {
      results.with.push(await load(browser, server.address, setting, true));
      if (compare) results.without.push(await load(browser, server.address, setting, false));
    }
    console.log(`\n${pagePath} on ${name} (${runs} loads each):`);
    const summary = {};
    for (const [kind, list] of Object.entries(results)) {
      if (!list.length) continue;
      const first = list.map((result) => result.first ?? NaN);
      const largest = list.map((result) => result.largest?.time ?? NaN);
      summary[kind] = { first: median(first), largest: median(largest) };
      const what = list.map((result) => result.largest?.what).sort((a, b) => list.filter((r) => r.largest?.what === b).length - list.filter((r) => r.largest?.what === a).length)[0];
      const label = compare ? (kind === 'with' ? 'With the headline entrance:   ' : 'Without the headline entrance:') : 'Measured:';
      console.log(`  ${label} First Contentful Paint ${Math.round(median(first))}ms (${Math.round(Math.min(...first))} to ${Math.round(Math.max(...first))}), Largest Contentful Paint ${Math.round(median(largest))}ms (${Math.round(Math.min(...largest))} to ${Math.round(Math.max(...largest))}), largest piece: ${what}`);
    }
    if (compare) console.log(`  The entrance costs ${Math.round(summary.with.largest - summary.without.largest)}ms of Largest Contentful Paint and ${Math.round(summary.with.first - summary.without.first)}ms of First Contentful Paint.`);
  }
} finally {
  await browser.close();
  server.stop();
  await pretend.stop();
}
