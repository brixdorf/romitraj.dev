// A test used by the check script, about the visitor counter (Rybbit). The real counter is never
// loaded and nothing is ever sent to it: every request for it is caught inside the test browser.
//
// It checks two things.
// 1. On this computer (how npm run dev and npm run check see the site) the counter's tag is not
//    added to the page and nothing is asked of the counter's address, before or after a page change.
// 2. Seen as the live site, the tag is added once, exactly as Rybbit gives it, the counter's
//    script runs once however many page changes follow, and every page change counts once.
//    A jump to a section of the same page (a line under "Contents" on a project's page, which
//    adds "#section" to the address) is not a page change: it must count nothing, and neither
//    must going back and forward between such jumps, while the address still shows the section.
//    For this the test browser is told that the live address is answered by the site on this
//    computer, and the counter's script is replaced by a stand-in that counts the way Rybbit
//    does: one view when it starts, and one view half a second after the browser's history is
//    written to or stepped through (pushState, replaceState, back, forward).
const fs = await import('node:fs');
const path = await import('node:path');
const { root } = await import('./site.mjs');

const site = JSON.parse(fs.readFileSync(path.join(root, 'src', '_data', 'site.json'), 'utf8'));
const liveAddress = new URL(site.url).origin;
const counterOrigin = new URL(site.analytics.script).origin;

// The stand-in for the counter's script. It keeps its notes on "window.counterNotes".
const standIn = `(function () {
  var notes = window.counterNotes = window.counterNotes || { runs: 0, views: [], calls: [] };
  notes.runs += 1;
  var tag = document.currentScript;
  notes.tag = tag ? { src: tag.getAttribute('src'), siteId: tag.getAttribute('data-site-id'), defer: tag.defer, inHead: tag.parentNode === document.head } : null;
  var timer = null;
  var view = function () { notes.views.push(location.pathname); };
  var soon = function (what) { notes.calls.push(what + ' ' + location.pathname); clearTimeout(timer); timer = setTimeout(view, 500); };
  var push = history.pushState;
  var replace = history.replaceState;
  history.pushState = function () { push.apply(this, arguments); soon('pushState'); };
  history.replaceState = function () { replace.apply(this, arguments); soon('replaceState'); };
  window.addEventListener('popstate', function () { soon('back or forward'); });
  window.addEventListener('hashchange', function () { soon('hashchange'); });
  view();
})();`;

const notesNow = (page) => page.evaluate((origin) => ({
  notes: window.counterNotes || null,
  tags: [...document.querySelectorAll('script[src]')].filter((script) => script.src.startsWith(origin)).length,
  path: location.pathname,
}), counterOrigin);

export async function visitorCounting(browser, address) {
  const problems = [];
  const size = { width: 1440, height: 900 };

  // 1. On this computer: no tag, and nothing asked of the counter.
  let context = await browser.newContext({ viewport: size });
  await context.addInitScript(() => { window.steadyMotion = true; });
  const asked = [];
  await context.route(`${counterOrigin}/**`, (route) => { asked.push(route.request().url()); return route.abort(); });
  let page = await context.newPage();
  await page.goto(address + '/', { waitUntil: 'load' });
  await page.locator('.hero__nav a[href="/about/"]').click();
  await page.waitForFunction(() => location.pathname === '/about/', null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const local = await notesNow(page);
  if (local.tags) problems.push('on this computer the visitor counter\'s tag was added to the page');
  if (asked.length) problems.push(`on this computer the page asked the visitor counter for ${asked[0]}`);
  await context.close();

  // 2. Seen as the live site.
  context = await browser.newContext({ viewport: size });
  await context.addInitScript(() => { window.steadyMotion = true; });
  const sent = [];
  // The live address is answered by the site on this computer...
  await context.route(`${liveAddress}/**`, async (route) => {
    const url = new URL(route.request().url());
    const response = await route.fetch({ url: address + url.pathname + url.search });
    await route.fulfill({ response });
  });
  // ...and the counter's address by the stand-in. Anything else it is asked is noted and dropped.
  await context.route(`${counterOrigin}/**`, (route) => {
    const url = route.request().url();
    if (url === site.analytics.script) return route.fulfill({ status: 200, contentType: 'application/javascript', body: standIn });
    sent.push(url);
    return route.abort();
  });
  page = await context.newPage();
  page.on('pageerror', (error) => problems.push(`script error with the visitor counter: ${error.message}`));
  await page.goto(liveAddress + '/', { waitUntil: 'load' });
  await page.waitForFunction(() => window.counterNotes, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(900);

  let seen = await notesNow(page);
  if (!seen.notes) {
    problems.push('seen as the live site, the visitor counter\'s script did not run');
    await context.close();
    return problems;
  }
  const tag = seen.notes.tag;
  if (!tag || tag.src !== site.analytics.script || tag.siteId !== site.analytics.siteId || !tag.defer || !tag.inHead) problems.push(`the visitor counter's tag is not as Rybbit gives it (in the head, src ${site.analytics.script}, data-site-id ${site.analytics.siteId}, defer): ${JSON.stringify(tag)}`);
  if (seen.notes.views.length !== 1) problems.push(`opening the home page counted ${seen.notes.views.length} views instead of 1 (${seen.notes.calls.join('; ') || 'no history calls'})`);

  // Page changes (two by a link, one with the back button, one more by a link) each count once.
  // In between, on a project's page: a jump to a section, back out of it and forward into it
  // again count nothing. "views" is how many views the step should add; "section" says whether
  // the address should end in "#something" afterwards.
  const steps = [
    { name: 'home to Projects', act: () => page.locator('.hero__nav a[href="/projects/"]').click(), path: '/projects/', views: 1 },
    { name: 'Projects to a project', act: () => page.locator('.project-card__more').first().click(), views: 1 },
    { name: 'a jump to a section of the project\'s page', act: () => page.locator('.study__contents-list a').first().click(), views: 0, section: true },
    { name: 'back out of the section', act: () => page.goBack(), views: 0, section: false },
    { name: 'forward into the section again', act: () => page.goForward(), views: 0, section: true },
    { name: 'a jump to another section', act: () => page.locator('.study__contents-list a').nth(1).click(), views: 0, section: true },
    { name: 'back to Projects with the back button (past the section jumps)', act: async () => { await page.goBack(); await page.goBack(); await page.goBack(); }, path: '/projects/', views: 1 },
    { name: 'Projects to home', act: () => page.locator('[data-row-back]').click(), path: '/', views: 1 },
  ];
  for (const { name, act, path: expectedPath, views: expectedViews, section } of steps) {
    const hashBefore = await page.evaluate(() => location.hash);
    const before = (await notesNow(page)).notes;
    const viewsBefore = before.views.length;
    const callsBefore = before.calls.length;
    await act();
    // Long enough for the page change to finish and for the counter's half second to pass.
    await page.waitForTimeout(3600);
    seen = await notesNow(page);
    const views = seen.notes.views.slice(viewsBefore);
    const calls = seen.notes.calls.slice(callsBefore);
    if (expectedPath && seen.path !== expectedPath) problems.push(`${name}: ended at ${seen.path}`);
    if (section !== undefined) {
      const hashNow = await page.evaluate(() => location.hash);
      if (section && hashNow.length < 2) problems.push(`${name}: the address does not show the section (it ends in "${hashNow}")`);
      if (section && hashNow === hashBefore) problems.push(`${name}: the address did not change`);
      if (!section && hashNow) problems.push(`${name}: the address still ends in ${hashNow}`);
      if (section && !(await page.evaluate(() => window.scrollY > 0))) problems.push(`${name}: the page did not move to the section`);
    }
    if (expectedViews === 0) {
      // Not a page change: the counter must hear nothing at all.
      if (views.length || calls.length) problems.push(`${name}: counted ${views.length} view${views.length === 1 ? '' : 's'}, where a jump within a page should count none (the counter heard: ${calls.join('; ') || 'nothing'})`);
      continue;
    }
    if (views.length !== 1) problems.push(`${name}: counted ${views.length} views instead of 1 (${calls.join('; ') || 'no history calls'})`);
    else if (views[0] !== seen.path) problems.push(`${name}: the view was counted for ${views[0]} instead of ${seen.path}`);
    // One write to the history per change, whatever the counter's waiting time: nothing else may touch it.
    if (calls.length !== 1) problems.push(`${name}: the browser's history was written to or stepped through ${calls.length} times instead of once (${calls.join('; ')}), which a counter without a waiting time would count ${calls.length} times`);
    if (seen.notes.runs !== 1) problems.push(`${name}: the visitor counter's script has run ${seen.notes.runs} times`);
    if (seen.tags !== 1) problems.push(`${name}: the page now has ${seen.tags} visitor counter tags instead of 1`);
  }
  if (sent.length) problems.push(`the stand-in counter should send nothing, but the page asked for ${sent[0]}`);
  await context.close();
  return [...new Set(problems)];
}
