// A test used by the check script: the headline's entrance on the home page (assets/js/intro.js).
// It confirms that
//   - the headline is hidden until its letters are ready, never shown in place first (no flash);
//   - the letters then slide in, and end exactly where a still page has them;
//   - the plain headline is put back after the visitor's first click, and nothing moves when it is;
//   - a link followed in the middle of the entrance still works and leaves nothing behind;
//   - visitors who asked for less motion get no entrance at all;
//   - the headline is visible without scripts, and when its fonts cannot be fetched.
const lines = '[data-part="opening"], [data-part="giant"], [data-part="serif"]';

// Where every letter of the headline is, whether it is in letter boxes or plain text.
// (Also used, with another heading, by the test of the page for a missing address: lib/lost.mjs.)
export const letterPlaces = (page, headings = lines) => page.evaluate((selector) => {
  const range = document.createRange();
  const out = [];
  for (const element of document.querySelectorAll(selector)) {
    const inks = element.querySelectorAll('.split-letter__ink');
    if (inks.length) {
      for (const ink of inks) {
        if (!ink.firstChild || ink.firstChild.nodeType !== Node.TEXT_NODE) continue;
        range.selectNodeContents(ink);
        const rect = range.getBoundingClientRect();
        out.push([rect.left, rect.top + window.scrollY]);
      }
      continue;
    }
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      [...walker.currentNode.textContent].forEach((character, index) => {
        if (!character.trim()) return;
        range.setStart(walker.currentNode, index);
        range.setEnd(walker.currentNode, index + 1);
        const rect = range.getBoundingClientRect();
        out.push([rect.left, rect.top + window.scrollY]);
      });
    }
  }
  return out;
}, headings);
export const furthest = (a, b) => (a.length !== b.length ? Infinity : Math.max(0, ...a.map((place, index) => Math.max(Math.abs(place[0] - b[index][0]), Math.abs(place[1] - b[index][1])))));

// Watches the headline from the page's very first frame: was it ever shown before its letters were ready?
const watchFromTheStart = () => {
  window.entranceLog = { shownTooEarly: false, hiddenAtFirst: false, lettersSeen: false };
  const look = () => {
    const giant = document.querySelector('[data-part="giant"]');
    if (giant) {
      const visible = getComputedStyle(giant).visibility === 'visible';
      const inLetters = Boolean(giant.querySelector('.split-letter'));
      if (!visible) window.entranceLog.hiddenAtFirst = true;
      if (inLetters) window.entranceLog.lettersSeen = true;
      // Visible as plain text before any letters were made: that would be the flash.
      if (visible && !inLetters && !window.entranceLog.lettersSeen) window.entranceLog.shownTooEarly = true;
    }
    if (performance.now() < 2500) requestAnimationFrame(look);
  };
  requestAnimationFrame(look);
};

export async function headlineEntrance(browser, address) {
  const problems = [];
  const size = { width: 1440, height: 900 };

  // A still page, to compare with.
  let context = await browser.newContext({ viewport: size });
  await context.addInitScript(() => { window.steadyMotion = true; });
  let page = await context.newPage();
  await page.goto(address + '/', { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const still = await letterPlaces(page);
  await context.close();

  // The entrance itself.
  context = await browser.newContext({ viewport: size });
  await context.addInitScript(watchFromTheStart);
  page = await context.newPage();
  page.on('pageerror', (error) => problems.push(`script error during the entrance: ${error.message}`));
  // The fonts are held back for a moment, as on a slow connection, so that the wait before the
  // entrance is long enough to be watched.
  await page.route(/\/fonts\/.*\.woff2/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.continue();
  });
  await page.goto(address + '/', { waitUntil: 'load' });
  await page.waitForTimeout(2700);
  const log = await page.evaluate(() => window.entranceLog);
  if (!log.hiddenAtFirst) problems.push('the headline was not hidden while it waited for its letters');
  if (log.shownTooEarly) problems.push('the headline flashed in place before its letters slid in');
  if (!log.lettersSeen) problems.push('the headline did not slide in: no letters were made');
  if (await page.evaluate(() => document.documentElement.classList.contains('intro'))) problems.push('the page is still marked "intro" after the entrance');
  let off = furthest(await letterPlaces(page), still);
  if (off > 0.6) problems.push(`after the entrance, a letter of the headline is ${off.toFixed(1)}px from where a still page has it`);
  // The first click puts the plain headline back.
  await page.mouse.click(700, 760);
  await page.waitForTimeout(200);
  if (await page.evaluate(() => document.querySelectorAll('.hero .split-letter').length)) problems.push('the plain headline was not put back after the first click');
  off = furthest(await letterPlaces(page), still);
  if (off > 0.6) problems.push(`when the plain headline was put back, a letter ended ${off.toFixed(1)}px from where a still page has it`);
  await context.close();

  // A link followed in the middle of the entrance.
  context = await browser.newContext({ viewport: size });
  page = await context.newPage();
  page.on('pageerror', (error) => problems.push(`script error when leaving during the entrance: ${error.message}`));
  await page.goto(address + '/', { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('.hero .split-letter'), null, { timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(250);
  await page.locator('.hero__nav a[href="/about/"]').click();
  await page.waitForTimeout(4200);
  const left = await page.evaluate(() => ({ path: location.pathname, pieces: document.querySelectorAll('.split-letter, .split-line').length }));
  if (left.path !== '/about/' || left.pieces) problems.push(`leaving during the entrance ended at ${left.path} with ${left.pieces} animation pieces left`);
  // And coming back: the home page arrives as after any page change, exactly in place.
  await page.locator('[data-row-back]').click();
  await page.waitForTimeout(4200);
  off = furthest(await letterPlaces(page), still);
  if (off > 0.6) problems.push(`back on the home page after leaving during the entrance, a letter is ${off.toFixed(1)}px from where a still page has it`);
  await context.close();

  // Less motion: no entrance.
  context = await browser.newContext({ viewport: size, reducedMotion: 'reduce' });
  await context.addInitScript(watchFromTheStart);
  page = await context.newPage();
  await page.goto(address + '/', { waitUntil: 'load' });
  await page.waitForTimeout(600);
  const calm = await page.evaluate(() => ({ ...window.entranceLog, marked: document.documentElement.classList.contains('intro'), visible: getComputedStyle(document.querySelector('[data-part="giant"]')).visibility }));
  if (calm.marked || calm.lettersSeen || calm.hiddenAtFirst || calm.visible !== 'visible') problems.push('with the reduced-motion setting the headline was hidden or animated');
  await context.close();

  // No scripts at all: the headline is simply there.
  context = await browser.newContext({ viewport: size, javaScriptEnabled: false });
  page = await context.newPage();
  await page.goto(address + '/', { waitUntil: 'load' });
  if (!(await page.locator('[data-part="giant"]').isVisible())) problems.push('without scripts the headline is not visible');
  await context.close();

  // The headline's fonts cannot be fetched: it must still appear (in the fallback font), within three seconds.
  context = await browser.newContext({ viewport: size });
  page = await context.newPage();
  await page.route(/\/fonts\/.*\.woff2/, (route) => route.abort());
  await page.goto(address + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3400);
  const stranded = await page.evaluate(() => ({ marked: document.documentElement.classList.contains('intro'), visible: getComputedStyle(document.querySelector('[data-part="giant"]')).visibility }));
  if (stranded.marked || stranded.visible !== 'visible') problems.push('when its fonts could not be fetched, the headline stayed hidden');
  await context.close();

  return [...new Set(problems)];
}
