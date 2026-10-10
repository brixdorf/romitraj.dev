// A test used by the check script: clicks from page to page the way a visitor would and reports
// anything that goes wrong with a page change. For every change it checks that
//   - the page changed in place (no reload), ended at the right address and at the top;
//   - no pieces of the animation were left behind, and the small row and the "you are here" line
//     match the page;
//   - nothing jumped when the arrival animation ended: every letter of every heading is sideways
//     exactly where it was while the animation was still playing, and so are the heading's own box
//     and the picture frame beside it;
//   - the finished page is laid out exactly like a fresh load of the same page.
// It then checks that back, forward and reload return to the same scroll position.

// The pieces whose place is compared with a fresh load of the page.
const pieces = '[data-part], .frame, .hero > *, .page-header__inner > *, .project-cards > *, .page-grid > *, .study__top > *, .study__body > *';

// Where things are right now. "letters" is the sideways position of every letter of each heading
// that page changes cut into letters (cut or not), which no animation ever changes.
const snapshot = (page) => page.evaluate((selector) => {
  const main = document.querySelector('main');
  const range = document.createRange();
  const headings = {};
  for (const element of main.querySelectorAll('[data-part="title"], [data-part="giant"], [data-part="opening"], [data-part="serif"]')) {
    const lefts = [];
    const inks = element.querySelectorAll('.split-letter__ink');
    if (inks.length) {
      for (const ink of inks) { range.selectNodeContents(ink); lefts.push(range.getBoundingClientRect().left); }
    } else {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        [...walker.currentNode.textContent].forEach((character, index) => {
          if (!character.trim()) return;
          range.setStart(walker.currentNode, index);
          range.setEnd(walker.currentNode, index + 1);
          lefts.push(range.getBoundingClientRect().left);
        });
      }
    }
    const box = element.getBoundingClientRect();
    headings[element.dataset.part] = { lefts, left: box.left, width: box.width };
  }
  const frame = main.querySelector('[data-part="header-frame"]')?.getBoundingClientRect();
  return {
    cut: Boolean(main.querySelector('.split-letter')),
    headings,
    frame: frame ? { left: frame.left, width: frame.width } : null,
    places: [...main.querySelectorAll(selector)].map((element) => {
      const rect = element.getBoundingClientRect();
      return { who: `${element.tagName.toLowerCase()}${element.dataset.part ? ` (${element.dataset.part})` : ''} "${(element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24)}"`, left: rect.left, top: rect.top + window.scrollY, width: rect.width, height: rect.height };
    }),
  };
}, pieces);

// What jumped between the last moment of the animation and the finished page.
function jumps(during, after) {
  const out = [];
  for (const [part, heading] of Object.entries(during.headings)) {
    const end = after.headings[part];
    if (!end || heading.lefts.length !== end.lefts.length) continue;
    const worst = heading.lefts.reduce((most, left, index) => (Math.abs(end.lefts[index] - left) > Math.abs(most) ? end.lefts[index] - left : most), 0);
    if (Math.abs(worst) > 0.5) out.push(`the letters of the "${part}" heading jumped up to ${Math.abs(worst).toFixed(1)}px ${worst < 0 ? 'left' : 'right'} when the animation ended`);
    if (Math.abs(end.width - heading.width) > 0.5 || Math.abs(end.left - heading.left) > 0.5) out.push(`the "${part}" heading's box changed from ${heading.width.toFixed(1)}px to ${end.width.toFixed(1)}px wide when the animation ended`);
  }
  if (during.frame && after.frame && (Math.abs(during.frame.left - after.frame.left) > 0.5 || Math.abs(during.frame.width - after.frame.width) > 0.5)) {
    out.push(`the picture frame beside the page name jumped ${Math.abs(after.frame.left - during.frame.left).toFixed(1)}px ${after.frame.left < during.frame.left ? 'left' : 'right'} when the animation ended`);
  }
  return out;
}

// What sits somewhere else than on a fresh load of the same page.
function differences(fresh, now) {
  if (fresh.places.length !== now.places.length) return [`it has ${now.places.length} pieces, a fresh load has ${fresh.places.length}`];
  const out = [];
  now.places.forEach((place, index) => {
    const was = fresh.places[index];
    const moved = ['left', 'top', 'width', 'height'].filter((side) => Math.abs(place[side] - was[side]) > 0.5).map((side) => `${side} ${was[side].toFixed(1)} on a fresh load, ${place[side].toFixed(1)} now`);
    if (moved.length) out.push(`${place.who}: ${moved.join('; ')}`);
  });
  return out.length > 4 ? [...out.slice(0, 4), `and ${out.length - 4} more pieces`] : out;
}

export async function walkThePages(browser, address) {
  const steps = [
    ['home to projects', '.hero__nav a[href="/projects/"]', '/projects/'],
    ['projects to a project', '.project-card__more', null],
    ['a project back to projects', '[data-row-back]', '/projects/'],
    ['projects back to home', '[data-row-back]', '/'],
    ['home to about', '.hero__nav a[href="/about/"]', '/about/'],
    ['about to home with the back button', null, '/'],
    ['home to projects again', '.hero__nav a[href="/projects/"]', '/projects/'],
    ['projects to home by the version tag', '.page-row__version', '/'],
  ];
  const problems = [];
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  // Fixed starting places for anything the site normally places at random, so pages can be compared.
  await context.addInitScript(() => { window.steadyMotion = true; });
  const page = await context.newPage();
  page.on('pageerror', (error) => problems.push(`script error: ${error.message}`));
  const open = async (target, pagePath) => {
    await target.goto(address + pagePath, { waitUntil: 'load' });
    await target.evaluate(() => document.fonts.ready);
    await target.waitForTimeout(500);
  };

  // A fresh load of each page, opened in a second tab the first time it is needed.
  const freshLoads = {};
  const freshLoad = async (pagePath) => {
    if (!freshLoads[pagePath]) {
      const tab = await context.newPage();
      await open(tab, pagePath);
      freshLoads[pagePath] = await snapshot(tab);
      await tab.close();
    }
    return freshLoads[pagePath];
  };

  await open(page, '/');
  await page.evaluate(() => { window.cameWithoutReload = true; });
  for (const [name, selector, expectedPath] of steps) {
    await page.evaluate(() => { window.contentBefore = document.querySelector('main'); });
    if (selector) {
      const link = page.locator(selector).first();
      await link.scrollIntoViewIfNeeded();
      await link.click();
      await page.mouse.move(3, 450);
    } else {
      await page.goBack();
    }
    // Wait for the new content, then watch it until its animation is over, keeping the last look
    // at it while its headings were still cut into letters.
    await page.waitForFunction(() => document.querySelector('main') !== window.contentBefore, null, { timeout: 10000 }).catch(() => {});
    let during = null;
    const started = Date.now();
    while (Date.now() - started < 7000) {
      const look = await snapshot(page);
      if (look.cut) during = look;
      else if (during || Date.now() - started > 1200) break;
      await page.waitForTimeout(60);
    }
    // Long enough for the longest arrival (a page of cards) to finish.
    await page.waitForTimeout(3000);
    const after = await snapshot(page);
    const state = await page.evaluate(() => {
      const main = document.querySelector('main');
      const isHome = location.pathname === '/';
      return {
        inPlace: window.cameWithoutReload === true,
        path: location.pathname,
        heading: Boolean(main.querySelector('h1')),
        leftBehind: main.querySelectorAll('.split-letter, .split-line').length,
        mainShown: getComputedStyle(main).opacity === '1',
        rowRight: document.querySelector('[data-row]').hasAttribute('data-row-hidden') === isHome,
        crumbRight: document.querySelector('[data-crumb]').hidden === isHome,
        atTop: scrollY === 0,
      };
    });
    const wrong = [];
    if (!state.inPlace) wrong.push('the page reloaded');
    if (expectedPath && state.path !== expectedPath) wrong.push(`ended at ${state.path} instead of ${expectedPath}`);
    if (!expectedPath && !/^\/projects\/[^/]+\/$/.test(state.path)) wrong.push(`ended at ${state.path} instead of a project's page`);
    if (!state.heading) wrong.push('the new page has no heading');
    if (state.leftBehind) wrong.push(`${state.leftBehind} animation pieces were left in the page`);
    if (!state.mainShown) wrong.push('the content is not fully visible');
    if (!state.rowRight) wrong.push('the small row under the banner is shown or hidden wrongly');
    if (!state.crumbRight) wrong.push('the "you are here" line is shown or hidden wrongly');
    if (selector && !state.atTop) wrong.push('the new page did not start at the top');
    if (during) wrong.push(...jumps(during, after));
    if (state.atTop) wrong.push(...differences(await freshLoad(state.path), after).map((line) => `after the change, ${line}`));
    if (wrong.length) problems.push(`${name}: ${wrong.join('; ')}`);
    if (!state.inPlace) await page.evaluate(() => { window.cameWithoutReload = true; });
  }

  // Back and forward return to where the visitor was on each page, and a reload stays put.
  const scrolledTo = () => page.evaluate(() => Math.round(scrollY));
  await page.evaluate(() => window.scrollTo(0, 700));
  await page.waitForTimeout(300);
  // Clicked from the script, because a real click would first scroll the link into view.
  await page.evaluate(() => document.querySelector('.footer a[href="/about/"]').click());
  await page.waitForTimeout(3600);
  await page.evaluate(() => window.scrollTo(0, 500));
  await page.waitForTimeout(300);
  await page.goBack();
  await page.waitForTimeout(3600);
  if (Math.abs(await scrolledTo() - 700) > 2) problems.push(`back button: the home page came back scrolled to ${await scrolledTo()}px instead of 700px`);
  await page.goForward();
  await page.waitForTimeout(3600);
  if (Math.abs(await scrolledTo() - 500) > 2) problems.push(`forward button: the about page came back scrolled to ${await scrolledTo()}px instead of 500px`);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1200);
  if (Math.abs(await scrolledTo() - 500) > 2) problems.push(`reload: the about page came back scrolled to ${await scrolledTo()}px instead of 500px`);
  await page.goBack();
  await page.waitForTimeout(2500);
  if (Math.abs(await scrolledTo() - 700) > 2) problems.push(`back button after a reload: the home page came back scrolled to ${await scrolledTo()}px instead of 700px`);

  await context.close();
  return [...new Set(problems)];
}
