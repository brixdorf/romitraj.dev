// Checks the site before a commit: builds it, looks for broken links between its own pages and
// files, photographs every page in Chromium, Firefox and WebKit at laptop, tablet and phone widths,
// confirms the hero's big lines still fit their space, clicks from page to page in each browser
// to confirm the page changes work, that nothing moves once a page change has finished, and that
// back, forward and reload return to the same scroll position (lib/walk.mjs), confirms that
// cutting headings into letters for those changes moves nothing and that no letter is cut by the
// window it slides in (lib/letters.mjs), confirms that the headline's entrance on the home page
// is safe (lib/entrance.mjs), and confirms that every picture is described or marked as
// decoration, stays small, moves nothing as it loads and looks the same in every browser
// (lib/pictures.mjs), and confirms that the weather and now-playing widgets show the right
// facts and hide quietly when a service is down (lib/widgets.mjs), and that the blog's posts on
// the home page (the list) and the About page (the latest post) are brought up to date from the
// server without moving anything in sight (lib/posts.mjs). The whole check, the build included, runs against stand-ins for Open-Meteo,
// Spotify and the blog's feed (lib/pretend.mjs): it never asks the real services or reads the
// real blog, and never uses the keys in .env. It confirms that the visitor counter (Rybbit) is not loaded on
// this computer, and that on the live site it would be loaded once and count each page change
// once (lib/analytics.mjs); the real counter is never contacted. Last, it compares how thick each browser paints the drawn lines
// in the ticker (lib/dashes.mjs).
// Run it with: npm run check
import fs from 'node:fs';
import path from 'node:path';
import { chromium, firefox, webkit } from 'playwright';
import { root, siteDir, textWidthsFile, buildSite, startServer, measureTextWidths } from './lib/site.mjs';
import { lettersStayInPlace, lettersStayWhole, testWidths } from './lib/letters.mjs';
import { walkThePages } from './lib/walk.mjs';
import { headlineEntrance } from './lib/entrance.mjs';
import { lostAnswers, lostPage } from './lib/lost.mjs';
import { headOfEveryPage, siteIconInBrowser } from './lib/head.mjs';
import { picturesHoldStill, picturesDiffer, pictureFiles } from './lib/pictures.mjs';
import { startPretend, unreachable } from './lib/pretend.mjs';
import { widgetAnswers, widgetsOnThePage } from './lib/widgets.mjs';
import { postAnswers, postsOnThePage, latestOnTheAboutPage } from './lib/posts.mjs';
import { dashThickness, dashesDiffer } from './lib/dashes.mjs';
import { visitorCounting } from './lib/analytics.mjs';

const privateDir = path.join(root, '..', 'romitraj-private');
// Screenshots go next to the reference screenshots when that folder exists, otherwise into this repo (ignored by git).
const shotsDir = fs.existsSync(privateDir) ? path.join(privateDir, 'screenshots') : path.join(root, 'screenshots');

const engines = { chromium, firefox, webkit };
const viewports = {
  'laptop-1440': { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  'tablet-768': { viewport: { width: 768, height: 1024 }, deviceScaleFactor: 1 },
  'phone-390': { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, mobile: true },
};

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
});

// Opens every page and confirms that cutting its headings into letters, and its introduction into
// lines, moves nothing, at every width in the list in lib/letters.mjs.
async function lettersOnEveryPage(browser, address, pagePaths) {
  const problems = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  // The headline must be at rest, not sliding in.
  await page.addInitScript(() => { window.steadyMotion = true; });
  for (const pagePath of pagePaths) {
    await page.goto(address + pagePath, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    problems.push(...await lettersStayInPlace(page, pagePath));
  }
  await page.close();
  return problems;
}

// Opens every page and confirms that no letter of a sliding heading is cut by the visible window
// it moves in (a raised apostrophe, the tail of a comma), at every width in "windowWidths".
async function wholeLettersOnEveryPage(browser, address, pagePaths) {
  const problems = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => { window.steadyMotion = true; });
  for (const pagePath of pagePaths) {
    await page.goto(address + pagePath, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    problems.push(...await lettersStayWhole(page, pagePath));
  }
  await page.close();
  return problems;
}

// ---- 1. Build ----
// Every page below is served with stand-in weather, a stand-in track and stand-in blog posts, the
// same on every run. The site is built with the same stand-in posts, so the list the server
// gives the page is the list the page was built with.
const pretend = await startPretend(4174);
process.env.BLOG_FEED_URL = pretend.env.BLOG_FEED_URL;
console.log('Building the site...');
await buildSite();
// How many posts the home page shows.
const postsShown = JSON.parse(fs.readFileSync(path.join(root, 'src', '_data', 'home.json'), 'utf8')).writing.count;

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

// ---- 3. Picture files: how heavy are they? ----
const weights = pictureFiles(siteDir);
if (weights.problems.length) {
  console.log('\nPICTURES THAT ARE TOO HEAVY:\n  ' + weights.problems.join('\n  '));
  process.exitCode = 1;
}
console.log(`Pictures: ${weights.summary}.`);

// ---- Every page's head: the site's icon, and the tags for the preview card of a shared link ----
{
  const head = await headOfEveryPage(siteDir, root);
  if (head.problems.length) {
    console.log('\nICON AND PREVIEW CARD PROBLEMS:\n  ' + [...new Set(head.problems)].slice(0, 30).join('\n  '));
    process.exitCode = 1;
  } else {
    console.log(`Icon and preview card: ${head.summary}.`);
  }
}

// ---- The focus ring: does it stand out enough from the paper and from the ink? ----
// Accessibility guidelines ask that a focus ring differ from what is behind it by at least 3 to 1.
{
  const tokens = fs.readFileSync(path.join(root, 'src', 'assets', 'css', 'tokens.css'), 'utf8');
  const color = (name) => new RegExp(`--${name}:\\s*(#[0-9a-f]{6})\\b`, 'i').exec(tokens)?.[1];
  // How light a color is, from 0 (black) to 1 (white), the way the guidelines work it out.
  const lightness = (hex) => {
    const [red, green, blue] = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255).map((part) => (part <= 0.04045 ? part / 12.92 : ((part + 0.055) / 1.055) ** 2.4));
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  const contrast = (one, other) => { const [lighter, darker] = [lightness(one), lightness(other)].sort((a, b) => b - a); return (lighter + 0.05) / (darker + 0.05); };
  const pairs = [['color-focus', 'color-paper', 'paper'], ['color-focus-on-ink', 'color-ink', 'ink']];
  const ringProblems = [];
  const found = [];
  for (const [ring, behind, word] of pairs) {
    if (!color(ring) || !color(behind)) { ringProblems.push(`tokens.css has no six-digit color for --${ring} or --${behind}`); continue; }
    const ratio = contrast(color(ring), color(behind));
    found.push(`${ratio.toFixed(1)} to 1 on ${word}`);
    if (ratio < 3) ringProblems.push(`the focus ring on ${word} (--${ring}: ${color(ring)}) has a contrast of ${ratio.toFixed(2)} to 1 against ${color(behind)}; it needs at least 3 to 1`);
  }
  if (ringProblems.length) {
    console.log('\nFOCUS RING PROBLEMS:\n  ' + ringProblems.join('\n  '));
    process.exitCode = 1;
  } else {
    console.log(`Focus ring: ${found.join(', ')} (at least 3 to 1 is needed).`);
  }
}

// ---- 4. Screenshots ----
// ---- Widgets: what the server answers, in every situation ----
const answerProblems = await widgetAnswers(4260);
if (answerProblems.length) {
  console.log('\nWIDGET ANSWER PROBLEMS:\n  ' + answerProblems.join('\n  '));
  process.exitCode = 1;
} else {
  console.log('Widgets: the server answers correctly, and with nothing when a service is down, expired or missing its keys.');
}

// ---- The blog's posts: what the server answers, in every situation ----
const postAnswerProblems = await postAnswers(4300, postsShown);
if (postAnswerProblems.length) {
  console.log('\nBLOG POST ANSWER PROBLEMS:\n  ' + postAnswerProblems.join('\n  '));
  process.exitCode = 1;
} else {
  console.log('Blog posts: the server answers with the latest posts, reads the feed once for many requests, keeps the last good list while the feed fails, and answers nothing before it has one.');
}

// The address of the visitor counter, which nothing in this check may contact.
const counterHost = new URL(JSON.parse(fs.readFileSync(path.join(root, 'src', '_data', 'site.json'), 'utf8')).analytics.script).hostname;

// Where every picture ended up in each browser, and how thick each browser paints the drawn
// lines, to compare them at the end.
const pictureWhere = {};
const dashRows = {};
// A second copy of the site is served with every service unreachable, and a third with one more
// post on the blog than the site was built with.
const server = await startServer(4173, pretend.env);
const quietServer = await startServer(4176, unreachable(4177));
const newerPretend = await startPretend(4178, { blog: 'newer' });
const newerServer = await startServer(4179, newerPretend.env);
try {
  // ---- A missing address: is it answered with a real 404 and the "Lost at sea" page? ----
  const lostAnswerProblems = await lostAnswers(server.address);
  if (lostAnswerProblems.length) {
    console.log('\nMISSING ADDRESS PROBLEMS:\n  ' + lostAnswerProblems.join('\n  '));
    process.exitCode = 1;
  } else {
    console.log('Missing addresses: answered with status 404 and the "Lost at sea" page; missing files with a plain 404.');
  }

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
      // Tells the site's scripts to use fixed starting points for anything they would otherwise place
      // at random, so the same page gives the same picture on every run.
      await context.addInitScript(() => { window.steadyMotion = true; });
      // Hover fades are switched off for the photographs. Chromium briefly squeezes the page while it
      // photographs it, which would otherwise catch labels that only show on phones in the middle of fading out.
      const noFades = '*, *::before, *::after { transition: none !important; }';
      const page = await context.newPage();
      const problems = [];
      page.on('requestfailed', (request) => problems.push(`${request.url()} failed to load`));
      // Nothing here may ever reach the visitor counter: that is for the live site only.
      page.on('request', (request) => { if (new URL(request.url()).hostname === counterHost) problems.push(`${new URL(page.url()).pathname} asked the visitor counter for ${request.url()}`); });
      // The free fallback fonts should never be needed. If one is fetched, a licensed font failed or lacks a character.
      page.on('request', (request) => {
        const url = new URL(request.url());
        if (url.pathname.startsWith('/assets/fonts/') && url.pathname.endsWith('.woff2')) {
          problems.push(`fallback font ${path.posix.basename(url.pathname)} was used on ${new URL(page.url()).pathname} (npm run fonts lists the characters each licensed font lacks)`);
        }
      });
      // (The page for a missing address is photographed at its own file name, which is answered with a 404 on purpose.)
      page.on('response', (response) => { if (response.status() >= 400 && new URL(response.url()).pathname !== '/404.html') problems.push(`${response.url()} answered ${response.status()}`); });
      page.on('pageerror', (error) => problems.push(`script error on ${new URL(page.url()).pathname}: ${error.message}`));
      for (const pagePath of pages) {
        await page.goto(`${server.address}${pagePath}`, { waitUntil: 'load' });
        await page.addStyleTag({ content: noFades });
        await page.evaluate(() => document.fonts.ready);
        // Pictures further down the page are normally fetched only when they come near the window.
        // For the photograph they are all fetched now.
        await page.evaluate(() => { for (const image of document.images) image.loading = 'eager'; });
        await page.waitForFunction(() => [...document.images].every((image) => image.complete), null, { timeout: 8000 }).catch(() => problems.push(`${pagePath}: some pictures did not finish loading`));
        // A page should never be wider than its window.
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (overflow > 0) problems.push(`${pagePath} is ${overflow}px wider than the window`);
        const name = pagePath === '/' ? 'home' : pagePath.replace(/^\/|\/$/g, '').replace(/\//g, '-').replace(/\.html$/, '');
        await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true });
      }
      if (problems.length) {
        console.log(`\nPROBLEMS in ${engineName} at ${viewportName}:\n  ` + [...new Set(problems)].join('\n  '));
        process.exitCode = 1;
      }
      await context.close();
    }

    // ---- 5. Do the hero's big lines still fit? (measured once, in Chromium) ----
    if (engineName === 'chromium') {
      const saved = JSON.parse(fs.readFileSync(textWidthsFile, 'utf8'));
      const measured = await measureTextWidths(await browser.newPage(), server.address);
      const off = Object.keys(measured).filter((name) => Math.abs(measured[name] - saved[name]) / measured[name] > 0.005);
      if (off.length) {
        console.log(`\nHERO LINES NO LONGER FIT: ${off.join(', ')}. The headline's words or fonts changed. Run: npm run fit`);
        process.exitCode = 1;
      } else {
        console.log('Hero lines: all fit their space.');
      }
    }
    // ---- 6. Page changes: click from page to page the way a visitor would ----
    const walkProblems = await walkThePages(browser, server.address);
    if (walkProblems.length) {
      console.log(`\nPAGE CHANGE PROBLEMS in ${engineName}:\n  ` + walkProblems.join('\n  '));
      process.exitCode = 1;
    }
    // ---- 7. Headings cut into letters: does any letter move? ----
    const letterProblems = await lettersOnEveryPage(browser, server.address, pages);
    if (letterProblems.length) {
      console.log(`\nLETTERS THAT MOVE in ${engineName} (they would jump during a page change):\n  ` + letterProblems.slice(0, 20).join('\n  ') + (letterProblems.length > 20 ? `\n  ... and ${letterProblems.length - 20} more` : ''));
      process.exitCode = 1;
    }
    const cutProblems = await wholeLettersOnEveryPage(browser, server.address, pages);
    if (cutProblems.length) {
      console.log(`\nLETTERS CUT BY THEIR VISIBLE WINDOW in ${engineName}:\n  ` + cutProblems.slice(0, 20).join('\n  ') + (cutProblems.length > 20 ? `\n  ... and ${cutProblems.length - 20} more` : ''));
      process.exitCode = 1;
    }
    // ---- The site's icon: is it served, and is it the ink compass on a light tab and the paper compass on a dark one? ----
    const iconProblems = await siteIconInBrowser(browser, server.address);
    if (iconProblems.length) {
      console.log(`\nSITE ICON PROBLEMS in ${engineName}:\n  ` + iconProblems.join('\n  '));
      process.exitCode = 1;
    }
    // ---- The page for a missing address: its entrance, its ways back, and links that lead to it ----
    const lostProblems = await lostPage(browser, server.address);
    if (lostProblems.length) {
      console.log(`\nMISSING PAGE PROBLEMS in ${engineName}:\n  ` + lostProblems.join('\n  '));
      process.exitCode = 1;
    }
    // ---- 8. The headline's entrance on the home page ----
    const entranceProblems = await headlineEntrance(browser, server.address);
    if (entranceProblems.length) {
      console.log(`\nHEADLINE ENTRANCE PROBLEMS in ${engineName}:\n  ` + entranceProblems.join('\n  '));
      process.exitCode = 1;
    }
    // ---- Widgets on the page: shown when all is well, hidden quietly when not ----
    const widgetProblems = await widgetsOnThePage(browser, server.address, quietServer.address);
    if (widgetProblems.length) {
      console.log(`\nWIDGET PROBLEMS in ${engineName}:\n  ` + widgetProblems.join('\n  '));
      process.exitCode = 1;
    }
    // ---- The blog's posts on the home page and the About page: brought up to date, moving nothing in sight ----
    const postAddresses = { sameAddress: server.address, newerAddress: newerServer.address, quietAddress: quietServer.address, shown: postsShown };
    const postProblems = [...await postsOnThePage(browser, postAddresses), ...await latestOnTheAboutPage(browser, postAddresses)];
    if (postProblems.length) {
      console.log(`\nBLOG POST PROBLEMS in ${engineName}:\n  ` + postProblems.join('\n  '));
      process.exitCode = 1;
    }
    // ---- The visitor counter: absent here, loaded once and counting once on the live site ----
    const countingProblems = await visitorCounting(browser, server.address);
    if (countingProblems.length) {
      console.log(`\nVISITOR COUNTER PROBLEMS in ${engineName}:\n  ` + countingProblems.join('\n  '));
      process.exitCode = 1;
    }
    // ---- 9. Pictures: sized, described, sharp, and moving nothing as they load ----
    const { problems: pictureProblems, where } = await picturesHoldStill(browser, server.address, pages);
    pictureWhere[engineName] = where;
    dashRows[engineName] = await dashThickness(browser, server.address);
    if (pictureProblems.length) {
      console.log(`\nPICTURE PROBLEMS in ${engineName}:\n  ` + pictureProblems.slice(0, 20).join('\n  ') + (pictureProblems.length > 20 ? `\n  ... and ${pictureProblems.length - 20} more` : ''));
      process.exitCode = 1;
    }
    await browser.close();
    console.log(`Screenshots, page changes, letters (${pages.length} pages at ${testWidths.length} widths), headline entrance, missing page, site icon, widgets, blog posts, visitor counter and pictures: ${engineName} done.`);
  }
  // ---- 10. Does every browser show the same part of each picture in the same place? ----
  const differences = picturesDiffer(pictureWhere);
  if (differences.length) {
    console.log('\nPICTURES THAT DIFFER BETWEEN BROWSERS:\n  ' + differences.slice(0, 20).join('\n  ') + (differences.length > 20 ? `\n  ... and ${differences.length - 20} more` : ''));
    process.exitCode = 1;
  } else {
    console.log('Pictures: the same place and size in every browser.');
  }
  // ---- 11. Are the drawn lines equally thick in every browser? ----
  const lineProblems = dashesDiffer(dashRows);
  if (lineProblems.length) {
    console.log('\nDRAWN LINES THAT DIFFER BETWEEN BROWSERS:\n  ' + lineProblems.join('\n  '));
    process.exitCode = 1;
  } else {
    console.log('Drawn lines: the same thickness in every browser.');
  }
  console.log(`\nSaved to ${shotsDir}`);
} finally {
  server.stop();
  quietServer.stop();
  newerServer.stop();
  await pretend.stop();
  await newerPretend.stop();
}
console.log(process.exitCode ? '\nCheck finished with problems.' : '\nCheck passed.');
