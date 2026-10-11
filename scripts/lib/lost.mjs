// Tests used by the check script, about the page for an address that leads nowhere ("Lost at
// sea", src/content/404.njk) and the server's answer for such an address (server/index.js).
//
// "lostAnswers" asks the server directly and confirms that
//   - a missing page is answered with the status 404 and the "Lost at sea" page, never with 200;
//   - so is that page asked for by its own file name;
//   - a missing picture or other file is answered 404 with two plain words, not with a page.
// "lostPage" opens a missing address in a browser and confirms that
//   - the page shows, with its three ways back, and its giant name slides in letter by letter:
//     hidden until the letters are ready, never shown in place first, ending exactly where a
//     still page has it, and put back as plain text at the visitor's first click;
//   - there is no entrance for visitors who asked for less motion, and the name is visible
//     without scripts;
//   - a link inside the site that leads to a missing page ends on the "Lost at sea" page, at the
//     missing address, and every answer the server gave for that address was a 404;
//   - the ways back work as ordinary page changes, without a reload, and the back button
//     returns to the missing address.
import { letterPlaces, furthest } from './entrance.mjs';

const missing = '/the-kraken-took-it/';
const name = '[data-part="title"]';
const words = 'Lost at sea';

export async function lostAnswers(address) {
  const problems = [];
  const ask = async (path, method = 'GET') => {
    const response = await fetch(address + path, { method, redirect: 'manual' });
    return { status: response.status, type: response.headers.get('content-type') || '', body: method === 'GET' ? await response.text() : '' };
  };
  for (const path of [missing, '/projects/no-such-project/', '/about/more/', '/404.html', '/.env']) {
    const answer = await ask(path);
    if (answer.status !== 404) problems.push(`${path} was answered with status ${answer.status} instead of 404`);
    if (!answer.type.startsWith('text/html') || !answer.body.includes('data-part="title"') || !answer.body.toLowerCase().includes(words.toLowerCase())) problems.push(`${path} was not answered with the "${words}" page`);
  }
  const head = await ask(missing, 'HEAD');
  if (head.status !== 404) problems.push(`a HEAD request for ${missing} was answered with status ${head.status} instead of 404`);
  for (const path of ['/assets/img/no-such-picture.png', '/assets/css/no-such-styles.css', '/no-such-file.pdf']) {
    const answer = await ask(path);
    if (answer.status !== 404) problems.push(`${path} was answered with status ${answer.status} instead of 404`);
    if (answer.type.startsWith('text/html')) problems.push(`${path} (a missing file, not a page) was answered with a page`);
  }
  // A page that exists must still be a 200.
  if ((await ask('/about/')).status !== 200) problems.push('/about/ is no longer answered with status 200');
  return problems;
}

// Watches the page's name from the very first frame: was it ever shown before its letters were ready?
const watchFromTheStart = (selector) => {
  window.entranceLog = { shownTooEarly: false, hiddenAtFirst: false, lettersSeen: false };
  const look = () => {
    const heading = document.querySelector(selector);
    if (heading) {
      const visible = getComputedStyle(heading).visibility === 'visible';
      const inLetters = Boolean(heading.querySelector('.split-letter'));
      if (!visible) window.entranceLog.hiddenAtFirst = true;
      if (inLetters) window.entranceLog.lettersSeen = true;
      if (visible && !inLetters && !window.entranceLog.lettersSeen) window.entranceLog.shownTooEarly = true;
    }
    if (performance.now() < 2500) requestAnimationFrame(look);
  };
  requestAnimationFrame(look);
};
const heading = (page) => page.evaluate((selector) => {
  const element = document.querySelector(selector);
  return element ? { words: element.textContent.replace(/\s+/g, ' ').trim(), visible: getComputedStyle(element).visibility === 'visible' && element.getBoundingClientRect().height > 0 } : null;
}, name);

export async function lostPage(browser, address) {
  const problems = [];
  const size = { width: 1440, height: 900 };

  // ---- A still page, at laptop and phone size ----
  let still = [];
  for (const viewport of [size, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    await context.addInitScript(() => { window.steadyMotion = true; });
    const page = await context.newPage();
    page.on('pageerror', (error) => problems.push(`script error on the missing page: ${error.message}`));
    const response = await page.goto(address + missing, { waitUntil: 'load' });
    await page.waitForFunction(() => document.fonts.status === 'loaded', null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(300);
    const at = `at ${viewport.width}px`;
    if (response.status() !== 404) problems.push(`${at}, the missing address was answered with status ${response.status()} instead of 404`);
    const shown = await heading(page);
    if (!shown || shown.words.toLowerCase() !== words.toLowerCase() || !shown.visible) problems.push(`${at}, the missing page's name is not showing (${JSON.stringify(shown)})`);
    const ways = await page.evaluate(() => [...document.querySelectorAll('.lost__ways a')].map((link) => link.getAttribute('href')));
    for (const way of ['/', '/projects/', '/about/']) if (!ways.includes(way)) problems.push(`${at}, the missing page has no link to ${way}`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 0) problems.push(`${at}, the missing page is ${overflow}px wider than the window`);
    if (viewport === size) still = await letterPlaces(page, name);
    await context.close();
  }

  // ---- The entrance ----
  let context = await browser.newContext({ viewport: size });
  await context.addInitScript(watchFromTheStart, name);
  let page = await context.newPage();
  page.on('pageerror', (error) => problems.push(`script error during the missing page's entrance: ${error.message}`));
  // The fonts are held back for a moment, as on a slow connection, so that the wait can be watched.
  await page.route(/\/fonts\/.*\.woff2/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.continue();
  });
  await page.goto(address + missing, { waitUntil: 'load' });
  await page.waitForTimeout(2700);
  const log = await page.evaluate(() => window.entranceLog);
  if (!log.hiddenAtFirst) problems.push('the missing page\'s name was not hidden while it waited for its letters');
  if (log.shownTooEarly) problems.push('the missing page\'s name flashed in place before its letters slid in');
  if (!log.lettersSeen) problems.push('the missing page\'s name did not slide in: no letters were made');
  if (await page.evaluate(() => document.documentElement.classList.contains('intro'))) problems.push('the missing page is still marked "intro" after its entrance');
  let off = furthest(await letterPlaces(page, name), still);
  if (off > 0.6) problems.push(`after the entrance, a letter of the missing page's name is ${off.toFixed(1)}px from where a still page has it`);
  await page.mouse.click(700, 860);
  await page.waitForTimeout(200);
  if (await page.evaluate(() => document.querySelectorAll('.page-header .split-letter').length)) problems.push('the missing page\'s plain name was not put back after the first click');
  off = furthest(await letterPlaces(page, name), still);
  if (off > 0.6) problems.push(`when the missing page's plain name was put back, a letter ended ${off.toFixed(1)}px from where a still page has it`);
  await context.close();

  // ---- Less motion: no entrance. No scripts: the name is simply there. ----
  context = await browser.newContext({ viewport: size, reducedMotion: 'reduce' });
  await context.addInitScript(watchFromTheStart, name);
  page = await context.newPage();
  await page.goto(address + missing, { waitUntil: 'load' });
  await page.waitForTimeout(600);
  const calm = await page.evaluate(() => ({ ...window.entranceLog, marked: document.documentElement.classList.contains('intro') }));
  if (calm.marked || calm.lettersSeen || calm.hiddenAtFirst || !(await heading(page))?.visible) problems.push('with the reduced-motion setting the missing page\'s name was hidden or animated');
  await context.close();

  context = await browser.newContext({ viewport: size, javaScriptEnabled: false });
  page = await context.newPage();
  const plain = await page.goto(address + missing, { waitUntil: 'load' });
  if (plain.status() !== 404) problems.push(`without scripts the missing address was answered with status ${plain.status()}`);
  if (!(await page.locator(name).isVisible())) problems.push('without scripts the missing page\'s name is not visible');
  await context.close();

  // ---- A link inside the site that leads to a missing page ----
  context = await browser.newContext({ viewport: size });
  await context.addInitScript(() => { window.steadyMotion = true; });
  page = await context.newPage();
  page.on('pageerror', (error) => problems.push(`script error when a link led to a missing page: ${error.message}`));
  const answers = [];
  page.on('response', (response) => { if (new URL(response.url()).pathname === '/gone-fishing/') answers.push(response.status()); });
  await page.goto(address + '/', { waitUntil: 'load' });
  await page.waitForTimeout(800);
  // One of the home page's own links is pointed at an address that does not exist, then clicked.
  await page.evaluate(() => { document.querySelector('.hero__nav a[href="/about/"]').setAttribute('href', '/gone-fishing/'); });
  await page.locator('.hero__nav a[href="/gone-fishing/"]').click();
  await page.waitForFunction((selector) => location.pathname === '/gone-fishing/' && /lost at sea/i.test(document.querySelector(selector)?.textContent || ''), name, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(2600);
  const landed = await page.evaluate(() => ({ path: location.pathname, slots: document.querySelectorAll('[data-taxi-view]').length, marked: document.documentElement.classList.contains('intro') }));
  const shown = await heading(page);
  if (landed.path !== '/gone-fishing/') problems.push(`a link to a missing page ended at ${landed.path} instead of staying at the missing address`);
  if (!shown || shown.words.toLowerCase() !== words.toLowerCase() || !shown.visible) problems.push(`a link to a missing page did not end on the "${words}" page (${JSON.stringify(shown)})`);
  if (landed.slots !== 1 || landed.marked) problems.push(`after a link to a missing page, the page has ${landed.slots} content slots and is ${landed.marked ? 'still' : 'not'} marked "intro"`);
  if (!answers.length) problems.push('a link to a missing page: the server was never asked for the missing address');
  if (answers.some((status) => status !== 404)) problems.push(`a link to a missing page: the server's answers for the missing address were ${answers.join(', ')}, where every one should be 404`);

  // ---- The ways back are ordinary page changes, and the back button returns ----
  await page.evaluate(() => { window.stayedInPlace = true; });
  await page.locator('.lost__ways a[href="/projects/"]').click();
  await page.waitForFunction(() => location.pathname === '/projects/', null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(3600);
  const onward = await page.evaluate(() => ({ path: location.pathname, stayed: window.stayedInPlace === true, pieces: document.querySelectorAll('.split-letter, .split-line').length, name: document.querySelector('[data-part="title"]')?.textContent.trim() }));
  if (onward.path !== '/projects/' || !/projects/i.test(onward.name || '')) problems.push(`"Projects" on the missing page led to ${onward.path} showing "${onward.name}"`);
  if (!onward.stayed) problems.push('"Projects" on the missing page reloaded the whole page instead of changing it in place');
  if (onward.pieces) problems.push(`leaving the missing page left ${onward.pieces} animation pieces behind`);
  await page.goBack();
  await page.waitForFunction((selector) => location.pathname === '/gone-fishing/' && /lost at sea/i.test(document.querySelector(selector)?.textContent || ''), name, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const back = await heading(page);
  if (new URL(page.url()).pathname !== '/gone-fishing/' || !back?.visible || back.words.toLowerCase() !== words.toLowerCase()) problems.push(`the back button did not return to the "${words}" page at the missing address (${new URL(page.url()).pathname}, ${JSON.stringify(back)})`);
  await context.close();

  return [...new Set(problems)];
}
