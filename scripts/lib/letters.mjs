// A test used by the check script: confirms that cutting a heading into letters (which the page
// changes do for the length of an animation) does not move any letter, at any window width.
// It runs the site's own split.js inside a real browser page and compares where every letter sat
// before with where its box sits after, and where everything else on the page sat before and
// after (a cut heading must not push its neighbours). It also confirms the original text is put
// back exactly.
import path from 'node:path';
import * as esbuild from 'esbuild';
import { root } from './site.mjs';

// The headings that page changes cut into letters, and the paragraphs they cut into lines.
const letterTargets = '[data-part="title"], [data-part="giant"], [data-part="opening"], [data-part="serif"]';
const lineTargets = '[data-part="lead"]';
export const testWidths = [320, 360, 390, 430, 600, 768, 899, 900, 1000, 1100, 1280, 1440, 1920];

// split.js as one plain script that puts its two functions on "window.textSplit".
let bundled = null;
async function splitScript() {
  if (!bundled) {
    const result = await esbuild.build({ entryPoints: [path.join(root, 'src/assets/js/split.js')], bundle: true, format: 'iife', globalName: 'textSplit', write: false, logLevel: 'silent' });
    bundled = result.outputFiles[0].text;
  }
  return bundled;
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
