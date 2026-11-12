// A test used by the check script: the entrance of the quote at the top of the About page
// (assets/js/intro.js on opening the page, assets/js/page-changes.js on arriving from another page).
// It confirms that
//   - the quote is hidden until its lines are ready, never shown in place first (no flash);
//   - its lines then slide in, and end exactly where a still page has them;
//   - the page's name does not move or hide when the page opens: only the quote has an entrance;
//   - arriving from the home page, the lines slide in too and end in place;
//   - visitors who asked for less motion get no entrance, and without scripts the quote is there.
import { furthest, letterPlaces } from './entrance.mjs';

const quote = '.saying__line';

// Watches the quote and the page's name from the page's very first frame.
const watchFromTheStart = () => {
  window.sayingLog = {
    shownTooEarly: false,
    hiddenAtFirst: false,
    linesSeen: false,
    nameMoved: false,
  };
  const look = () => {
    const line = document.querySelector('.saying__line');
    const name = document.querySelector('[data-part="title"]');
    if (line) {
      const visible = getComputedStyle(line).visibility === 'visible';
      const inLines = Boolean(document.querySelector('.saying .split-line'));
      if (!visible) window.sayingLog.hiddenAtFirst = true;
      if (inLines) window.sayingLog.linesSeen = true;
      if (visible && !inLines && !window.sayingLog.linesSeen) window.sayingLog.shownTooEarly = true;
    }
    if (
      name &&
      (getComputedStyle(name).visibility !== 'visible' || name.querySelector('.split-letter'))
    )
      window.sayingLog.nameMoved = true;
    if (performance.now() < 2500) requestAnimationFrame(look);
  };
  requestAnimationFrame(look);
};

export async function sayingEntrance(browser, address) {
  const problems = [];
  const size = { width: 1440, height: 900 };

  // A still page, to compare with.
  let context = await browser.newContext({ viewport: size });
  await context.addInitScript(() => {
    window.steadyMotion = true;
  });
  let page = await context.newPage();
  await page.goto(address + '/about/', { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const still = await letterPlaces(page, quote);
  if (!still.length) problems.push('the About page has no quote to test');
  await context.close();

  // Opening the page.
  context = await browser.newContext({ viewport: size });
  await context.addInitScript(watchFromTheStart);
  page = await context.newPage();
  page.on('pageerror', (error) =>
    problems.push(`script error during the quote's entrance: ${error.message}`),
  );
  await page.route(/\/fonts\/.*\.woff2/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.continue();
  });
  await page.goto(address + '/about/', { waitUntil: 'load' });
  await page.waitForTimeout(2900);
  const log = await page.evaluate(() => window.sayingLog);
  if (!log.hiddenAtFirst) problems.push('the quote was not hidden while it waited for its lines');
  if (log.shownTooEarly) problems.push('the quote flashed in place before its lines slid in');
  if (!log.linesSeen) problems.push('the quote did not slide in: no lines were made');
  if (log.nameMoved)
    problems.push('the page’s name was hidden or cut into letters when the page opened');
  if (await page.evaluate(() => document.documentElement.classList.contains('intro')))
    problems.push('the About page is still marked "intro" after the quote’s entrance');
  let off = furthest(await letterPlaces(page, quote), still);
  if (off > 0.6)
    problems.push(
      `after its entrance, a letter of the quote is ${off.toFixed(1)}px from where a still page has it`,
    );
  await page.mouse.click(700, 860);
  await page.waitForTimeout(200);
  off = furthest(await letterPlaces(page, quote), still);
  if (
    off > 0.6 ||
    (await page.evaluate(() => document.querySelectorAll('.saying .split-line').length))
  )
    problems.push('the plain quote was not put back in place after the first click');
  await context.close();

  // Arriving from the home page.
  context = await browser.newContext({ viewport: size });
  page = await context.newPage();
  await page.goto(address + '/', { waitUntil: 'load' });
  await page.waitForTimeout(3200);
  await page.mouse.click(5, 5);
  await page.locator('.hero__nav a[href="/about/"]').click();
  const seen = await page
    .waitForFunction(() => document.querySelector('.saying .split-line'), null, { timeout: 4000 })
    .then(
      () => true,
      () => false,
    );
  if (!seen) problems.push('arriving from the home page, the quote did not slide in');
  await page.waitForTimeout(4000);
  off = furthest(await letterPlaces(page, quote), still);
  if (off > 0.6)
    problems.push(
      `after arriving from the home page, a letter of the quote is ${off.toFixed(1)}px from where a still page has it`,
    );
  await context.close();

  // Less motion: no entrance.
  context = await browser.newContext({ viewport: size, reducedMotion: 'reduce' });
  await context.addInitScript(watchFromTheStart);
  page = await context.newPage();
  await page.goto(address + '/about/', { waitUntil: 'load' });
  await page.waitForTimeout(600);
  const calm = await page.evaluate(() => ({
    ...window.sayingLog,
    marked: document.documentElement.classList.contains('intro'),
  }));
  if (calm.marked || calm.linesSeen || calm.hiddenAtFirst)
    problems.push('with the reduced-motion setting the quote was hidden or animated');
  await context.close();

  // No scripts: the quote is simply there.
  context = await browser.newContext({ viewport: size, javaScriptEnabled: false });
  page = await context.newPage();
  await page.goto(address + '/about/', { waitUntil: 'load' });
  if (!(await page.locator(quote).first().isVisible()))
    problems.push('without scripts the quote is not visible');
  await context.close();

  return [...new Set(problems)];
}
