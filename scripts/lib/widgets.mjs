// Tests used by the check script, about the weather and now-playing widgets. Nothing here talks
// to the real services: the site's server is pointed at a stand-in (lib/pretend.mjs).
//
// "widgetAnswers" starts the site's server several times, each against a stand-in in a different
// mood, and checks what /api/weather and /api/now-playing answer: the right facts when all is
// well, the last track when nothing is playing, nothing at all (quietly) when a service is down,
// its keys are missing or its token has expired, that answers are kept instead of asked again,
// and that no key or token ever appears in an answer.
//
// "widgetsOnThePage" opens the home page in a browser and checks that the ticker shows the
// answers, that the track's title links to the track on Spotify in a new tab and is written the
// way Spotify gives it (not in capitals), that the weather is plain text with no link, that
// nothing outside the ticker moves when the answers arrive, and that with both services down the
// pieces stay hidden and nothing complains.
import { startServer } from './site.mjs';
import { startPretend, unreachable, pretendKeys, pretendWeather, pretendTracks } from './pretend.mjs';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

async function answer(address, question) {
  const response = await fetch(address + question);
  const text = await response.text();
  return { status: response.status, text, value: text ? JSON.parse(text) : null };
}

export async function widgetAnswers(firstPort) {
  const problems = [];
  let port = firstPort;
  // Runs one situation: a stand-in in the given mood, the site's server against it, then "look".
  const situation = async (name, mood, look, env) => {
    const pretend = mood ? await startPretend(port++, mood) : null;
    const server = await startServer(port++, env || pretend.env);
    try {
      const report = (problem) => problems.push(`${name}: ${problem}`);
      await look({ ask: (question) => answer(server.address, question), counts: pretend?.counts, report });
    } finally {
      server.stop();
      await pretend?.stop();
    }
  };

  await situation('all is well', { spotify: 'playing', weather: 'up' }, async ({ ask, counts, report }) => {
    const weather = await ask('/api/weather');
    if (weather.status !== 200 || !same(weather.value, pretendWeather)) report(`the weather answered ${weather.status} ${weather.text}`);
    const playing = await ask('/api/now-playing');
    if (playing.status !== 200 || !same(playing.value, { playing: true, ...pretendTracks.playing })) report(`now playing answered ${playing.status} ${playing.text}`);
    // Asked again several times: the kept answers are used, the services are not asked again.
    for (let again = 0; again < 4; again++) { await ask('/api/weather'); await ask('/api/now-playing'); }
    if (counts.weather !== 1) report(`the weather service was asked ${counts.weather} times for 5 requests instead of once`);
    if (counts.token !== 1 || counts.playing !== 1) report(`Spotify was asked for a token ${counts.token} times and for the track ${counts.playing} times for 5 requests, instead of once each`);
    for (const secret of [pretendKeys.secret, pretendKeys.refresh, pretendKeys.access, pretendKeys.id]) {
      if ((weather.text + playing.text).includes(secret)) report('an answer contains a key or a token');
    }
  });

  await situation('nothing is playing', { spotify: 'idle' }, async ({ ask, report }) => {
    const playing = await ask('/api/now-playing');
    if (playing.status !== 200 || !same(playing.value, { playing: false, ...pretendTracks.lately })) report(`expected the last track played, got ${playing.status} ${playing.text}`);
  });

  await situation('the track is paused', { spotify: 'paused' }, async ({ ask, report }) => {
    const playing = await ask('/api/now-playing');
    if (!same(playing.value, { playing: false, ...pretendTracks.lately })) report(`expected the last track played, got ${playing.status} ${playing.text}`);
  });

  await situation('the Spotify token has expired', { spotify: 'expired' }, async ({ ask, counts, report }) => {
    const playing = await ask('/api/now-playing');
    if (playing.status !== 204 || playing.text) report(`expected an empty answer (204), got ${playing.status} ${playing.text}`);
    await ask('/api/now-playing');
    await ask('/api/now-playing');
    if (counts.token !== 1) report(`Spotify was asked ${counts.token} times after refusing the token, instead of being left alone`);
    const weather = await ask('/api/weather');
    if (weather.status !== 200) report('the weather stopped answering as well');
  });

  await situation('both services answer with errors', { spotify: 'down', weather: 'down' }, async ({ ask, report }) => {
    for (const question of ['/api/weather', '/api/now-playing']) {
      const got = await ask(question);
      if (got.status !== 204 || got.text) report(`${question} answered ${got.status} ${got.text} instead of an empty 204`);
    }
  });

  const dead = port++;
  await situation('both services are unreachable', null, async ({ ask, report }) => {
    for (const question of ['/api/weather', '/api/now-playing']) {
      const got = await ask(question);
      if (got.status !== 204 || got.text) report(`${question} answered ${got.status} ${got.text} instead of an empty 204`);
    }
  }, unreachable(dead));

  // No Spotify keys at all, as on a computer without a .env file.
  const keyless = await startPretend(port++, { spotify: 'playing' });
  await situation('the Spotify keys are missing', null, async ({ ask, report }) => {
    const playing = await ask('/api/now-playing');
    if (playing.status !== 204) report(`expected an empty answer (204), got ${playing.status} ${playing.text}`);
    if (keyless.counts.token !== 0) report('Spotify was asked although no keys were set (the real keys from .env may have been used)');
  }, { ...keyless.env, SPOTIFY_CLIENT_ID: '', SPOTIFY_CLIENT_SECRET: '', SPOTIFY_REFRESH_TOKEN: '' });
  await keyless.stop();

  return problems;
}

// Where everything outside the tickers is.
const places = () => [...document.querySelectorAll('body *')]
  .filter((element) => !element.closest('[data-ticker]') && element.getClientRects().length)
  .map((element) => {
    const rect = element.getBoundingClientRect();
    return { who: `${element.tagName.toLowerCase()}${typeof element.className === 'string' && element.className ? '.' + element.className.split(' ')[0] : ''}`, left: rect.left, top: rect.top + window.scrollY, width: rect.width, height: rect.height };
  });

// What the ticker shows: one entry per copy of the line (the original first).
const tickerNow = () => [...document.querySelectorAll('.hero [data-ticker] .ticker__group')].map((group) => {
  const weather = group.querySelector('[data-weather]');
  const playing = group.querySelector('[data-now-playing]');
  const time = group.querySelector('[data-local-time]')?.closest('[data-widget]');
  const link = playing.querySelector('[data-now-playing-link]');
  const title = playing.querySelector('[data-now-playing-title]');
  const artists = playing.querySelector('[data-now-playing-artists]');
  return {
    weatherShown: !weather.hidden,
    weatherText: weather.querySelector('[data-weather-text]').textContent,
    weatherLinks: weather.querySelectorAll('a').length,
    playingShown: !playing.hidden,
    label: playing.querySelector('[data-now-playing-label]').textContent,
    title: title.textContent,
    artists: artists.textContent,
    // How the browser styles the letters: "none" means exactly as written.
    lettering: `${getComputedStyle(title).textTransform} ${getComputedStyle(artists).textTransform}`,
    weatherLettering: getComputedStyle(weather.querySelector('[data-weather-text]')).textTransform,
    titleInsideLink: link.contains(title),
    link: `${link.getAttribute('href')} ${link.target} ${link.rel}`,
    icon: playing.querySelector('svg')?.getBoundingClientRect().width ?? 0,
    timeShown: time ? !time.hidden : false,
    tall: group.getBoundingClientRect().height,
  };
});

export async function widgetsOnThePage(browser, address, downAddress) {
  const problems = [];
  const size = { width: 1440, height: 900 };
  const newTab = '_blank noopener noreferrer';

  // All is well: the pieces appear, with the right words and links, in every copy of the line.
  let context = await browser.newContext({ viewport: size });
  await context.addInitScript(() => { window.steadyMotion = true; });
  let page = await context.newPage();
  page.on('pageerror', (error) => problems.push(`script error with the widgets: ${error.message}`));
  // The answers are held back for a moment, to compare the page before and after they arrive.
  let letThrough = () => {};
  const held = new Promise((resolve) => { letThrough = resolve; });
  await page.route(/\/api\//, async (route) => { await held; await route.continue().catch(() => {}); });
  await page.goto(address + '/', { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const before = await page.evaluate(places);
  const heightBefore = (await page.evaluate(tickerNow))[0].tall;
  letThrough();
  const arrived = await page.waitForFunction(() => document.querySelectorAll('.hero [data-weather]:not([hidden])').length > 1 && document.querySelectorAll('.hero [data-now-playing]:not([hidden])').length > 1, null, { timeout: 8000 }).then(() => true).catch(() => false);
  if (!arrived) problems.push('the weather and the now-playing line did not both appear in the ticker (and in its copies)');
  await page.waitForTimeout(300);
  const lines = await page.evaluate(tickerNow);
  const expected = { weatherText: `${pretendWeather.temperature}°C, ${pretendWeather.condition}`, weatherLinks: 0, weatherLettering: 'uppercase', label: 'Now playing on Spotify:', title: pretendTracks.playing.title, artists: `, ${pretendTracks.playing.artists.join(', ')}`, lettering: 'none none', titleInsideLink: true, link: `${pretendTracks.playing.url} ${newTab}` };
  lines.forEach((line, index) => {
    const which = index ? `copy ${index} of the ticker line` : 'the ticker line';
    for (const [name, value] of Object.entries(expected)) if (line[name] !== value) problems.push(`${which}: ${name} is "${line[name]}" instead of "${value}"`);
    if (!line.timeShown) problems.push(`${which}: the local time is hidden`);
  });
  if (lines[0] && Math.abs(lines[0].tall - heightBefore) > 0.1) problems.push(`the ticker line grew from ${heightBefore}px to ${lines[0].tall}px tall when the widgets arrived`);
  if (lines[0] && lines[0].icon < 21) problems.push(`Spotify's icon is ${lines[0].icon}px wide; Spotify asks for at least 21px`);
  // The credit for the weather's source is kept off the home page (it goes on a page of its own).
  if (await page.evaluate(() => /open-?meteo/i.test(document.documentElement.outerHTML))) problems.push('the home page mentions Open-Meteo');
  const after = await page.evaluate(places);
  const moved = before.length === after.length ? after.filter((place, index) => ['left', 'top', 'width', 'height'].some((side) => Math.abs(place[side] - before[index][side]) > 0.5)) : [{ who: 'the number of pieces' }];
  if (moved.length) problems.push(`${moved.length} pieces outside the ticker moved when the widgets arrived, the first being ${moved[0].who}`);

  // A page change and back: the new content is filled in at once from the answers already in hand.
  await page.locator('.hero__nav a[href="/about/"]').click();
  await page.waitForFunction(() => location.pathname === '/about/' && !document.querySelector('.hero'), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await page.locator('[data-row-back]').click();
  await page.waitForFunction(() => document.querySelector('.hero [data-weather]'), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(400);
  const back = (await page.evaluate(tickerNow))[0];
  if (!back?.weatherShown || !back?.playingShown || back.title !== expected.title) problems.push('after a page change and back, the ticker\'s weather or now-playing line was missing');
  await context.close();

  // Both services down: the two pieces stay hidden, the time still shows, and nothing complains.
  context = await browser.newContext({ viewport: size });
  await context.addInitScript(() => { window.steadyMotion = true; });
  page = await context.newPage();
  const complaints = [];
  page.on('pageerror', (error) => complaints.push(`script error: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') complaints.push(`console error: ${message.text()}`); });
  page.on('response', (response) => { if (response.status() >= 400) complaints.push(`${new URL(response.url()).pathname} answered ${response.status()}`); });
  await page.goto(downAddress + '/', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const quiet = await page.evaluate(tickerNow);
  quiet.forEach((line, index) => {
    if (line.weatherShown || line.playingShown) problems.push(`with both services down, ${index ? `copy ${index} of the ticker line` : 'the ticker line'} still shows ${line.weatherShown ? 'the weather' : 'the now-playing line'}`);
    if (!line.timeShown) problems.push('with both services down, the local time is hidden too');
  });
  if (!quiet.length) problems.push('with both services down, the ticker is missing');
  for (const complaint of complaints) problems.push(`with both services down: ${complaint}`);
  await context.close();

  return [...new Set(problems)];
}
