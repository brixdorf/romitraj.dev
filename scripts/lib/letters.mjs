// A test used by the check script: confirms that cutting a heading into letters (which the page
// changes do for the length of an animation) does not move any letter, at any window width.
// It runs the site's own split.js inside a real browser page and compares where every letter sat
// before with where its box sits after, and where everything else on the page sat before and
// after (a cut heading must not push its neighbours). It also confirms the original text is put
// back exactly.
//
// A second test, "lettersStayWhole", confirms that no letter is cut by its own "visible window".
// While a heading slides in or out, each letter is shown through a window (a clip-path, from
// shapes.js) that opens and closes around the letter's box. Ink that reaches outside that box by
// more than the window allows, such as a raised apostrophe or the tail of a comma, would be cut
// off for as long as the animation runs. The test photographs each heading cut into letters,
// once as it is and once with every letter's window fully open, and reports any ink the window
// took away.
import path from 'node:path';
import * as esbuild from 'esbuild';
import sharp from 'sharp';
import { root } from './site.mjs';

// The headings that page changes cut into letters, and the paragraphs they cut into lines.
const letterTargets = '[data-part="title"], [data-part="giant"], [data-part="opening"], [data-part="serif"]';
const lineTargets = '[data-part="lead"]';
export const testWidths = [320, 360, 390, 430, 600, 768, 899, 900, 1000, 1100, 1280, 1440, 1920];

// The headings whose letters are shown through a window while they move (the ones page-changes.js
// and intro.js slide; a project's name only fades, so it has no window).
const windowTargets = '[data-page="home"] [data-part="giant"], [data-page="home"] [data-part="opening"], [data-page="home"] [data-part="serif"], [data-page="list"] [data-part="title"], [data-page="page"] [data-part="title"]';
export const windowWidths = [360, 390, 600, 768, 900, 1440, 1920];

// split.js and shapes.js as one plain script that puts their functions and shapes on "window.textSplit".
let bundled = null;
async function splitScript() {
  if (!bundled) {
    const result = await esbuild.build({ stdin: { contents: "export { splitLetters, splitLines } from './split.js'; export { shape } from './shapes.js';", resolveDir: path.join(root, 'src/assets/js') }, bundle: true, format: 'iife', globalName: 'textSplit', write: false, logLevel: 'silent' });
    bundled = result.outputFiles[0].text;
  }
  return bundled;
}

// Tests the page that is open in "page": is any letter of a sliding heading cut by its window?
// Returns a list of problems (empty if none).
export async function lettersStayWhole(page, pagePath) {
  await page.addScriptTag({ content: await splitScript() });
  // Nothing else may change between the two photographs: stop the gradient bar, and take the
  // tickers out of the picture altogether (they keep their place, so nothing moves). Pausing a
  // ticker is not enough: it builds itself again, and starts moving again, a moment after the
  // window changes size, and whenever the page asks for the weather or the track again. When
  // that fell between the two photographs, its movement under "OCEAN." was counted as ink cut
  // from the letters (seen once, in one browser, at the widest window).
  await page.addStyleTag({ content: '*, *::before, *::after { animation-play-state: paused !important; transition: none !important; } [data-ticker] { visibility: hidden !important; }' });
  const problems = [];
  for (const width of windowWidths) {
    await page.setViewportSize({ width, height: width < 700 ? 844 : 900 });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.evaluate(() => { for (const animation of document.getAnimations()) animation.pause(); });
    const count = await page.evaluate((selector) => [...document.querySelectorAll(selector)].filter((element) => element.getClientRects().length).length, windowTargets);
    for (let which = 0; which < count; which++) {
      // Cut the heading into letters and note where it and each letter are.
      const cut = await page.evaluate(([selector, index]) => {
        const element = [...document.querySelectorAll(selector)].filter((candidate) => candidate.getClientRects().length)[index];
        const size = parseFloat(getComputedStyle(element).fontSize);
        window.cutHeading = window.textSplit.splitLetters(element);
        // The part of the page to photograph: the heading and some room around it, kept inside the page.
        const around = (left, top, right, bottom) => {
          const x = Math.max(0, Math.floor(left));
          const y = Math.max(0, Math.floor(top));
          return { x, y, width: Math.min(document.documentElement.scrollWidth, Math.ceil(right)) - x, height: Math.min(document.documentElement.scrollHeight, Math.ceil(bottom)) - y };
        };
        const box = element.getBoundingClientRect();
        return {
          name: element.textContent.replace(/\s+/g, ' ').trim().slice(0, 30),
          region: around(box.left - size * 0.75, box.top + window.scrollY - size * 0.75, box.right + size * 0.75, box.bottom + window.scrollY + size * 0.75),
          letters: window.cutHeading.letters.map((letter) => { const rect = letter.getBoundingClientRect(); return { text: letter.textContent || "'", left: rect.left, right: rect.right, top: rect.top + window.scrollY, bottom: rect.bottom + window.scrollY }; }),
        };
      }, [windowTargets, which]);
      const pixels = async () => sharp(await page.screenshot({ clip: cut.region, fullPage: true })).greyscale().raw().toBuffer({ resolveWithObject: true });
      const free = await pixels();
      await page.evaluate(() => { for (const letter of window.cutHeading.letters) letter.style.clipPath = window.textSplit.shape.all; });
      const held = await pixels();
      await page.evaluate(() => { window.cutHeading.restore(); window.cutHeading = null; });

      // Every pixel that changed is ink the window took away. Each is counted for the letter nearest to it.
      const scale = free.info.width / cut.region.width;
      const lost = new Map();
      for (let y = 0; y < free.info.height; y++) {
        for (let x = 0; x < free.info.width; x++) {
          const at = y * free.info.width + x;
          if (Math.abs(free.data[at] - held.data[at]) < 64) continue;
          const pageX = cut.region.x + x / scale;
          const pageY = cut.region.y + y / scale;
          let nearest = 0;
          let least = Infinity;
          cut.letters.forEach((letter, index) => {
            // How far the pixel is from the letter's box (nothing, if it is inside it).
            const far = Math.max(letter.left - pageX, 0, pageX - letter.right) ** 2 + Math.max(letter.top - pageY, 0, pageY - letter.bottom) ** 2;
            if (far < least) { least = far; nearest = index; }
          });
          const tally = lost.get(nearest) || { amount: 0, x: 0, y: 0 };
          lost.set(nearest, { amount: tally.amount + 1, x: tally.x + pageX, y: tally.y + pageY });
        }
      }
      for (const [index, { amount, x, y }] of lost) {
        // A few stray pixels can come from the browser drawing an edge slightly differently.
        if (amount / (scale * scale) < 4) continue;
        problems.push(`${pagePath} at ${width}px wide: in "${cut.name}", the ${cut.letters[index].text === "'" ? 'apostrophe' : `letter ${cut.letters[index].text}`} (number ${index + 1}) is cut by its visible window while the heading moves: about ${Math.round(amount / (scale * scale))} pixels of it are hidden, around ${Math.round(x / amount)}px across and ${Math.round(y / amount)}px down the page`);
      }
    }
  }
  return problems;
}

// Tests the page that is open in "page" at every width. Returns a list of problems (empty if none).
export async function lettersStayInPlace(page, pagePath) {
  await page.addScriptTag({ content: await splitScript() });
  const problems = [];
  for (const width of testWidths) {
    await page.setViewportSize({ width, height: width < 700 ? 844 : 900 });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const found = await page.evaluate(([letterSelector, lineSelector]) => {
      const issues = [];
      const range = document.createRange();
      const rectOfText = (node, start, end) => { range.setStart(node, start); range.setEnd(node, end); return range.getBoundingClientRect(); };
      // Where every other piece of the page sits: everything in the content that is not inside "except".
      const others = (except) => [...document.querySelectorAll('main *')].filter((other) => !except.contains(other)).map((other) => other.getBoundingClientRect());
      const moved = (before, after) => before.filter((rect, index) => ['left', 'top', 'width', 'height'].some((side) => Math.abs(rect[side] - after[index][side]) > 0.6)).length;

      for (const element of document.querySelectorAll(letterSelector)) {
        if (!element.getClientRects().length) continue;
        const name = `"${element.textContent.replace(/\s+/g, ' ').trim().slice(0, 30)}"`;
        const originalHtml = element.innerHTML;
        // No style attribute and an empty one mean the same thing.
        const originalStyle = element.getAttribute('style') || '';

        // Where every letter sits now.
        const before = [];
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
        while (walker.nextNode()) {
          const node = walker.currentNode;
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.classList.contains('apostrophe')) before.push({ letter: "'", rect: node.getBoundingClientRect() });
            continue;
          }
          [...node.textContent].forEach((character, index) => {
            if (character.trim()) before.push({ letter: character, rect: rectOfText(node, index, index + 1) });
          });
        }

        const around = others(element);
        const split = window.textSplit.splitLetters(element);
        const pushed = moved(around, others(element));
        if (pushed) issues.push(`${name}: cutting it into letters moved ${pushed} other pieces of the page`);
        if (split.letters.length !== before.length) issues.push(`${name}: ${before.length} letters became ${split.letters.length} boxes`);
        let worst = 0;
        let worstLetter = '';
        split.letters.forEach((box, index) => {
          const was = before[index]?.rect;
          if (!was) return;
          const now = box.firstChild?.nodeType === Node.TEXT_NODE ? rectOfText(box.firstChild, 0, box.firstChild.length) : box.getBoundingClientRect();
          const moved = Math.max(Math.abs(now.left - was.left), Math.abs(now.top - was.top));
          if (moved > worst) { worst = moved; worstLetter = `${before[index].letter} (letter ${index + 1}) moved ${(now.left - was.left).toFixed(1)}px across and ${(now.top - was.top).toFixed(1)}px down`; }
        });
        if (worst > 0.6) issues.push(`${name}: ${worstLetter}`);
        split.restore();
        if (element.innerHTML !== originalHtml || (element.getAttribute('style') || '') !== originalStyle) issues.push(`${name}: the heading was not put back exactly as it was`);
      }

      for (const element of document.querySelectorAll(lineSelector)) {
        if (!element.getClientRects().length) continue;
        const name = `"${element.textContent.replace(/\s+/g, ' ').trim().slice(0, 30)}"`;
        const originalHtml = element.innerHTML;
        const before = element.getBoundingClientRect();
        const around = others(element);
        const split = window.textSplit.splitLines(element);
        const after = element.getBoundingClientRect();
        const pushed = moved(around, others(element));
        if (pushed) issues.push(`${name}: cutting it into lines moved ${pushed} other pieces of the page`);
        if (Math.abs(after.height - before.height) > 0.6 || Math.abs(after.width - before.width) > 0.6) issues.push(`${name}: cut into lines, the paragraph changed size by ${(after.width - before.width).toFixed(1)}px by ${(after.height - before.height).toFixed(1)}px`);
        split.restore();
        if (element.innerHTML !== originalHtml) issues.push(`${name}: the paragraph was not put back exactly as it was`);
      }
      return issues;
    }, [letterTargets, lineTargets]);
    for (const issue of found) problems.push(`${pagePath} at ${width}px wide: ${issue}`);
  }
  return problems;
}
