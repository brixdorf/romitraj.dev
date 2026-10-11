// The headline's entrance when the home page is first opened or reloaded: its letters slide into
// their lines, as they do when arriving from the Projects page.
// The page for a missing address ("Lost at sea") has the same entrance for its giant name: that
// page is reached by a typed or outside address, never by a page change, so this is the only
// time its letters can slide in. A page asks for it with "entrance: true" at the top of its file.
//
// This file is not part of the main script. The build turns it into a very small script of its
// own and writes it straight into those pages (see eleventy.config.js and layouts/base.njk), so
// it can start the moment the headline's fonts arrive instead of waiting for the main script.
//
// How it stays safe:
// - A few lines of script in the page's head add the class "intro" to the page before anything is
//   drawn, and the styles hide the headline while that class is there. So the headline never
//   flashes in place before it animates.
// - That head script does not add the class for visitors who asked their system for less motion,
//   and takes it away again after three seconds whatever happens. Anything going wrong here takes
//   it away too. So the headline always ends up visible. Without scripts it is never hidden.
//
// How it stays quick. Browsers and search engines judge loading speed by "Largest Contentful
// Paint": the moment the biggest piece of content was first drawn. Three things keep the entrance
// from counting against that:
// - It starts as soon as the fonts are in, which is when the headline would have appeared anyway.
// - The letters are solid from their first frame and slide in from behind an edge. Letters that
//   fade in from invisible would not be counted until later.
// - Swapping the letters for the plain headline when the entrance ends would count as a new, very
//   large piece drawn late. So the letters stay. They sit exactly where the plain text sits, so
//   nothing looks different. The plain text is put back once the visitor first clicks, taps, types
//   or turns the wheel (the browser stops measuring then), or when the window is resized or the
//   visitor follows a link (the letters' places would no longer be right).
import { splitLetters } from './split.js';
import { intro as rule } from './motion.js';
import { shape } from './shapes.js';

const page = document.documentElement;
const firstInputs = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
// The lines that are in letters, with their running animations, and the animations of pieces that are not cut.
let lines = [];
let others = [];
let over = false;
let inputSeen = false;

// Where a line's letters start from: "size" is the line's type size.
const startingPlaces = {
  // The giant line: one type size below, behind its top edge.
  giant: (size) => ({ transform: `translateY(${size}px)`, clipPath: shape.topEdge }),
  // The large serif word: one type size above, behind its bottom edge.
  serif: (size) => ({ transform: `translateY(${-size}px)`, clipPath: shape.bottomEdge }),
  // The opening line sits right under the banner: its own height above, so it never shows over the gradient bar.
  opening: () => ({ transform: 'translateY(-100%)', clipPath: shape.bottomEdge }),
  // An inner page's giant name: its own height below, behind its top edge, as when arriving by a page change.
  title: () => ({ transform: 'translateY(100%)', clipPath: shape.topEdge }),
};

// Puts the plain headline back and stops listening.
function putBack() {
  for (const line of lines) {
    for (const animation of line.animations) animation.cancel();
    line.restore();
  }
  for (const animation of others) animation.cancel();
  lines = [];
  others = [];
  for (const type of firstInputs) removeEventListener(type, onFirstInput);
  removeEventListener('resize', settle);
  document.removeEventListener('headline:settle', settle);
}

// The visitor's first input: put the plain text back, but not in the middle of the entrance.
function onFirstInput() {
  inputSeen = true;
  if (over) putBack();
}

// Ends the entrance at once and puts the plain headline back. The page-change script asks for
// this (with a "headline:settle" event) before it animates the headline itself.
function settle() {
  page.classList.remove('intro');
  putBack();
}

function enter() {
  const content = document.querySelector('[data-taxi-view]');
  for (const [part, startingPlace] of Object.entries(startingPlaces)) {
    for (const element of content.querySelectorAll(`[data-part="${part}"]`)) {
      const split = splitLetters(element);
      const from = startingPlace(parseFloat(getComputedStyle(element).fontSize));
      const animations = split.letters.map((letter, index) => letter.animate(
        [from, { transform: 'translateY(0)', clipPath: shape.all }],
        // "backwards" holds each letter in its starting place until its turn comes.
        { duration: rule.time * 1000, delay: index * rule.apart * 1000, easing: rule.ease, fill: 'backwards' },
      ));
      lines.push({ animations, restore: split.restore });
    }
  }
  // The outlined italic words are not cut: they slide in from the left as one piece.
  for (const element of content.querySelectorAll('[data-part="flourish"]')) {
    others.push(element.animate(
      [{ transform: `translateX(${rule.flourish.x}px)`, opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }],
      { duration: rule.flourish.time * 1000, delay: rule.flourish.at * 1000, easing: rule.flourish.ease, fill: 'backwards' },
    ));
  }
  // Everything is in its starting place, so the headline can be un-hidden.
  page.classList.remove('intro');
  for (const type of firstInputs) addEventListener(type, onFirstInput, { passive: true });
  addEventListener('resize', settle);
  document.addEventListener('headline:settle', settle);
  Promise.all([...others, ...lines.flatMap((line) => line.animations)].map((animation) => animation.finished)).then(() => {
    over = true;
    if (inputSeen) putBack();
  }).catch(() => {});
}

if (page.classList.contains('intro')) {
  // The letters can only be measured once the headline's fonts are here. If they take too long,
  // or anything fails, the headline is simply shown.
  const fonts = Promise.all(rule.fonts.map((font) => document.fonts.load(font)));
  const tooLong = new Promise((resolve, reject) => { setTimeout(reject, rule.patience * 1000); });
  Promise.race([fonts, tooLong]).then(() => {
    // One frame later, so that the rest of the page is drawn first and is not held up by this.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!page.classList.contains('intro')) return;
      try {
        enter();
      } catch {
        page.classList.remove('intro');
        putBack();
      }
    }));
  }).catch(() => {
    page.classList.remove('intro');
    putBack();
  });
}
