// Tests used by the check script, about the home page's list of blog posts, which the page brings
// up to date from the server (/api/posts, server/blog.js; on the page, assets/js/posts.js).
// Nothing here reads the real blog: the server and the build are pointed at a stand-in feed
// (lib/pretend.mjs), whose "same" list is the one the site was built with.
//
// "postAnswers" starts the site's server against the stand-in in different moods and checks what
// /api/posts answers: the posts, newest first and as many as the home page shows; one reading of
// the feed for many requests; nothing (204) when the feed is down, unreadable or unreachable. With
// short timings it also checks that the server keeps answering with the last good list while the
// feed is failing, and takes the new list once the feed answers again.
//
// "postsOnThePage" opens the home page in a browser and checks that a newer list is put in place,
// card for card like a built one (links that open in a new tab included), without moving anything
// in sight; that it waits while the list is in sight and is put in place once the visitor scrolls
// back above it; that arriving through a page change shows the newer list at once; that a list
// equal to the built one is left alone; that a page built without posts gets them; and that with
// the feed unreachable or without scripts the built list stays.
import { startServer } from './site.mjs';
import { startPretend, unreachable, pretendPosts, pretendNewPost } from './pretend.mjs';

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function answer(address) {
  const response = await fetch(address + '/api/posts');
  const text = await response.text();
  return { status: response.status, text, value: text ? JSON.parse(text) : null };
}
const titles = (value) => (value?.posts || []).map((post) => post.title).join(' | ');

export async function postAnswers(firstPort, shown) {
  const problems = [];
  let port = firstPort;
  const situation = async (name, mood, look, env) => {
    const pretend = mood ? await startPretend(port++, mood) : null;
    const server = await startServer(port++, env || pretend.env);
    try {
      await look({ ask: () => answer(server.address), counts: pretend?.counts, report: (problem) => problems.push(`${name}: ${problem}`) });
    } finally {
      server.stop();
      await pretend?.stop();
    }
  };

  await situation('the feed answers', { blog: 'same' }, async ({ ask, counts, report }) => {
    const got = await ask();
    const expected = pretendPosts.slice(0, shown);
    if (got.status !== 200) report(`answered ${got.status} instead of 200`);
    else {
      if (titles(got.value) !== expected.map((post) => post.title).join(' | ')) report(`the posts are ${titles(got.value)}`);
      got.value.posts.forEach((post, index) => {
        const wanted = expected[index];
        if (!wanted) return;
        if (post.url !== wanted.url || post.isoDate !== wanted.published || !/^\d{1,2} [A-Z][a-z]+ \d{4}$/.test(post.date)) report(`post ${index + 1} is ${JSON.stringify(post)}`);
        if (Object.keys(post).sort().join(',') !== 'date,isoDate,title,url') report(`post ${index + 1} carries more than its title, address and date`);
      });
    }
    for (let again = 0; again < 4; again++) await ask();
    if (counts.feed !== 1) report(`the feed was read ${counts.feed} times for 5 requests instead of once`);
  });

  await situation('the feed has a newer post', { blog: 'newer' }, async ({ ask, report }) => {
    const got = await ask();
    const expected = [pretendNewPost, ...pretendPosts].slice(0, shown);
    if (titles(got.value) !== expected.map((post) => post.title).join(' | ')) report(`the posts are ${titles(got.value) || `missing (${got.status})`}`);
    if ((got.value?.posts || []).length > shown) report(`${got.value.posts.length} posts were sent, more than the ${shown} the home page shows`);
  });

  for (const [name, mood] of [['the feed answers with an error', 'down'], ['the feed is not a feed', 'broken']]) {
    await situation(name, { blog: mood }, async ({ ask, report }) => {
      const got = await ask();
      if (got.status !== 204 || got.text) report(`answered ${got.status} ${got.text} instead of an empty 204`);
    });
  }
  const dead = port++;
  await situation('the feed is unreachable', null, async ({ ask, report }) => {
    const got = await ask();
    if (got.status !== 204 || got.text) report(`answered ${got.status} ${got.text} instead of an empty 204`);
  }, unreachable(dead));

  // The keeper itself, with short timings: a good list, then a failing feed, then a newer list.
  const pretend = await startPretend(port++, { blog: 'same' });
  const before = process.env.BLOG_FEED_URL;
  process.env.BLOG_FEED_URL = pretend.env.BLOG_FEED_URL;
  try {
    const { keepPosts } = await import('../../server/blog.js');
    const keeper = keepPosts({ goodFor: 300, retryAfter: 300 });
    const report = (problem) => problems.push(`keeping the last good list: ${problem}`);
    const first = await keeper();
    if (titles(first) !== pretendPosts.slice(0, shown).map((post) => post.title).join(' | ')) report(`the first list was ${titles(first) || 'empty'}`);
    pretend.setMood({ blog: 'down' });
    await wait(350);
    const during = await keeper();
    if (pretend.counts.feed !== 2) report('the feed was not read again once the list had been kept for its time');
    if (titles(during) !== titles(first)) report(`while the feed was failing, the answer was ${titles(during) || 'empty'} instead of the last good list`);
    await keeper();
    if (pretend.counts.feed !== 2) report('the failing feed was asked again at once instead of being left alone for a while');
    pretend.setMood({ blog: 'newer' });
    await wait(350);
    const after = await keeper();
    if (!titles(after).startsWith(pretendNewPost.title)) report(`once the feed answered again, the answer was ${titles(after) || 'empty'} instead of the newer list`);
  } finally {
    if (before === undefined) delete process.env.BLOG_FEED_URL;
    else process.env.BLOG_FEED_URL = before;
    await pretend.stop();
  }
  return problems;
}

// ---- In the browser ----

// The titles in the list on the page now.
const listTitles = () => [...document.querySelectorAll('[data-posts] [data-posts-list] [data-post-title]')].map((title) => title.textContent);

// Notes every piece of the page outside the tickers that the visitor can see now, and where it is
// on the screen: only the part of it inside the window counts, so a box that holds the list (the
// page's content as a whole) may grow below the window. With "aboveTheList", it notes every piece
// that comes before the list instead, and where it is on the page.
function watchPlaces(aboveTheList) {
  const list = document.querySelector('[data-posts-list]');
  const watch = (window.watching ??= {})[aboveTheList ? 'above' : 'insight'] = {};
  watch.place = aboveTheList
    ? (element) => { const rect = element.getBoundingClientRect(); return { left: rect.left, top: rect.top + window.scrollY, width: rect.width, height: rect.height }; }
    : (element) => { const rect = element.getBoundingClientRect(); const top = Math.max(rect.top, 0); return { left: rect.left, top, width: rect.width, height: Math.min(rect.bottom, window.innerHeight) - top }; };
  watch.elements = [...document.querySelectorAll('body *')].filter((element) => {
    if (element.closest('[data-ticker]') || !element.getClientRects().length) return false;
    if (aboveTheList) return Boolean(list.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_PRECEDING) && !element.contains(list);
    const rect = element.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
  });
  watch.at = watch.elements.map(watch.place);
  return watch.elements.length;
}
// What moved since "watchPlaces".
function movedPlaces(aboveTheList) {
  const watch = window.watching[aboveTheList ? 'above' : 'insight'];
  return watch.elements.filter((element, index) => {
    if (!element.isConnected) return true;
    const now = watch.place(element);
    const was = watch.at[index];
    return ['left', 'top', 'width', 'height'].some((side) => Math.abs(now[side] - was[side]) > 0.5);
  }).map((element) => `${element.tagName.toLowerCase()}${typeof element.className === 'string' && element.className ? '.' + element.className.split(' ')[0] : ''}`);
}

// Opens the home page with the answer to /api/posts held back until "release" is called.
async function openHeld(browser, address, { viewport = { width: 1440, height: 900 }, change } = {}) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript(() => { window.steadyMotion = true; });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(`script error: ${error.message}`));
  let release = () => {};
  const held = new Promise((resolve) => { release = resolve; });
  await page.route(/\/api\/posts/, async (route) => { await held; await route.continue().catch(() => {}); });
  if (change) await page.route(address + '/', async (route) => { const response = await route.fetch(); await route.fulfill({ response, body: change(await response.text()) }); });
  await page.goto(address + '/', { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  return { context, page, release, errors };
}

const newTitles = (shown) => [pretendNewPost, ...pretendPosts].slice(0, shown).map((post) => post.title);
const builtTitles = (shown) => pretendPosts.slice(0, shown).map((post) => post.title);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export async function postsOnThePage(browser, { sameAddress, newerAddress, quietAddress, shown }) {
  const problems = [];
  const newer = newTitles(shown);
  const built = builtTitles(shown);

  // 1. A newer list, with the visitor at the top: put in place at once, and nothing in sight moves.
  {
    const { context, page, release, errors } = await openHeld(browser, newerAddress);
    if (!same(await page.evaluate(listTitles), built)) problems.push(`before the answer, the page's list was not the one it was built with: ${(await page.evaluate(listTitles)).join(' | ')}`);
    const builtCard = await page.evaluate(() => document.querySelector('[data-post-link]').outerHTML);
    await page.evaluate(watchPlaces, false);
    const aboveCount = await page.evaluate(watchPlaces, true);
    release();
    const arrived = await page.waitForFunction((wanted) => document.querySelector('[data-posts] [data-post-title]')?.textContent === wanted, newer[0], { timeout: 8000 }).then(() => true).catch(() => false);
    if (!arrived) problems.push('with a newer post on the blog, the home page did not show it');
    await page.waitForTimeout(500);
    const now = await page.evaluate(listTitles);
    if (arrived && !same(now, newer)) problems.push(`the newer list on the page is ${now.join(' | ')}`);
    const moved = await page.evaluate(movedPlaces, false);
    if (moved.length) problems.push(`${moved.length} pieces in sight moved when the newer list arrived, the first being ${moved[0]}`);
    const movedAbove = await page.evaluate(movedPlaces, true);
    if (movedAbove.length) problems.push(`${movedAbove.length} pieces above the list moved when the newer list arrived, the first being ${movedAbove[0]}`);
    // The new cards are made like the built ones: the same marks, the same new-tab link and note.
    const cards = await page.evaluate(() => [...document.querySelectorAll('[data-post-link]')].map((link) => ({ html: link.outerHTML, href: link.getAttribute('href'), date: link.querySelector('time').getAttribute('datetime') })));
    const shape = (html) => html.replace(/href="[^"]*"/, '').replace(/datetime="[^"]*"/, '').replace(/>[^<]*<\/time>/, '></time>').replace(/(data-post-title="?"?>)[^<]*</, '$1<');
    if (cards[0] && shape(cards[0].html) !== shape(builtCard)) problems.push(`a card made on the page differs from a built card:\n      made:  ${cards[0].html}\n      built: ${builtCard}`);
    if (cards[0] && (cards[0].href !== pretendNewPost.url || cards[0].date !== pretendNewPost.published)) problems.push(`the new card links to ${cards[0].href} and is dated ${cards[0].date}`);
    if (aboveCount < 50) problems.push(`found only ${aboveCount} pieces above the list to watch`);
    problems.push(...errors);
    await context.close();
  }

  // 2. A newer list while the list is in sight: it waits, and nothing moves; once the visitor
  // scrolls back up above it, it is put in place.
  {
    const { context, page, release, errors } = await openHeld(browser, newerAddress);
    await page.evaluate(() => document.querySelector('[data-posts-list]').scrollIntoView({ block: 'center' }));
    // Let the movement tied to scrolling settle.
    await page.waitForTimeout(3000);
    await page.evaluate(watchPlaces, false);
    release();
    await page.waitForTimeout(1500);
    if (!same(await page.evaluate(listTitles), built)) problems.push('the newer list replaced the list while the visitor was looking at it');
    const moved = await page.evaluate(movedPlaces, false);
    if (moved.length) problems.push(`with the list in sight, ${moved.length} pieces moved when the newer list arrived, the first being ${moved[0]}`);
    await page.evaluate(() => window.scrollTo(0, 0));
    const later = await page.waitForFunction((wanted) => document.querySelector('[data-posts] [data-post-title]')?.textContent === wanted, newer[0], { timeout: 5000 }).then(() => true).catch(() => false);
    if (!later) problems.push('after the visitor scrolled back up, the newer list was still not shown');
    problems.push(...errors);
    await context.close();
  }

  // 3. A page change back to the home page shows the newer list as it arrives.
  {
    const { context, page, release, errors } = await openHeld(browser, newerAddress);
    release();
    await page.waitForFunction((wanted) => document.querySelector('[data-posts] [data-post-title]')?.textContent === wanted, newer[0], { timeout: 8000 }).catch(() => {});
    await page.locator('.hero__nav a[href="/about/"]').click();
    await page.waitForFunction(() => location.pathname === '/about/' && !document.querySelector('.hero'), null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(2500);
    await page.locator('[data-row-back]').click();
    await page.waitForFunction(() => document.querySelector('.hero [data-ticker]'), null, { timeout: 8000 }).catch(() => {});
    if (!same(await page.evaluate(listTitles), newer)) problems.push(`arriving at the home page through a page change, the list was ${(await page.evaluate(listTitles)).join(' | ')} instead of the newer one`);
    problems.push(...errors);
    await context.close();
  }

  // 4. A list equal to the built one: the page's list is not touched at all.
  {
    const { context, page, release, errors } = await openHeld(browser, sameAddress);
    await page.evaluate(() => { document.querySelector('[data-posts-list]').marked = true; });
    release();
    await page.waitForResponse(/\/api\/posts/, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(500);
    if (!(await page.evaluate(() => document.querySelector('[data-posts-list]').marked))) problems.push('the list was replaced although the server\'s list is the same as the built one');
    problems.push(...errors);
    await context.close();
  }

  // 5. A page built while the feed was down (a sentence instead of cards) gets the cards.
  {
    const fallback = (html) => html.replace(/<ul class="card-grid" data-posts-list>[\s\S]*?<\/ul>/, '<p class="writing__fallback" data-posts-list>The latest posts could not be loaded just now.</p>');
    const { context, page, release, errors } = await openHeld(browser, sameAddress, { change: fallback });
    if (await page.evaluate(() => document.querySelector('[data-posts-list]').tagName) !== 'P') problems.push('could not set up a page built without posts');
    release();
    const filled = await page.waitForFunction(() => document.querySelectorAll('[data-posts] [data-post-title]').length > 0, null, { timeout: 8000 }).then(() => true).catch(() => false);
    if (!filled || !same(await page.evaluate(listTitles), built)) problems.push('a page built without posts did not get them from the server');
    if (await page.evaluate(() => document.querySelector('.writing__fallback'))) problems.push('the sentence for a missing list stayed beside the cards');
    problems.push(...errors);
    await context.close();
  }

  // 6. The feed unreachable: the built list stays, and nothing complains.
  {
    const { context, page, release, errors } = await openHeld(browser, quietAddress);
    page.on('console', (message) => { if (message.type() === 'error') errors.push(`console error: ${message.text()}`); });
    release();
    await page.waitForTimeout(1500);
    if (!same(await page.evaluate(listTitles), built)) problems.push('with the feed unreachable, the built list did not stay');
    for (const error of errors) problems.push(`with the feed unreachable: ${error}`);
    await context.close();
  }

  // 7. Without scripts: the built list.
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(sameAddress + '/', { waitUntil: 'load' });
    if (!same(await page.evaluate(listTitles), built)) problems.push('without scripts, the built list is missing');
    await context.close();
  }
  return [...new Set(problems)];
}
