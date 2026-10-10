// What moves when the visitor goes from one page to another. Each function here animates one page
// leaving or one page arriving and returns a promise that settles when it is done.
// The timings are in motion.js ("pageChange"); the pieces are marked in the templates with
// data-part="...". transitions.js decides which of these functions runs for which change of page.
import { gsap } from 'gsap';
import { pageChange as rules } from './motion.js';
import { splitLetters, splitLines } from './split.js';
import { shape } from './shapes.js';

const parts = (root, name) => [...root.querySelectorAll(`[data-part="${name}"]`)];

// Where a letter is when it is out of its line. Moving while the visible window shrinks toward
// the opposite edge makes the letter look as if it slides through a slot in the page.
const away = {
  // One type size below the line.
  below: (size) => ({ y: size, yPercent: 0, clipPath: shape.topEdge, opacity: 0 }),
  // Its own height below the line.
  justBelow: () => ({ y: 0, yPercent: 100, clipPath: shape.topEdge, opacity: 0 }),
  // Its own height above the line.
  justAbove: () => ({ y: 0, yPercent: -100, clipPath: shape.bottomEdge, opacity: 0 }),
  // One type size above the line.
  above: (size) => ({ y: -size, yPercent: 0, clipPath: shape.bottomEdge, opacity: 0 }),
};
const inPlace = { x: 0, y: 0, yPercent: 0, clipPath: shape.all, opacity: 1 };

// The styles these animations set. An arriving page has them removed again once it has settled.
const animated = 'transform,opacity,clipPath,filter';

// Runs a timeline to its end. For an arriving page ("tidy") it then puts back any text that was
// cut into letters or lines and removes the styles the animation set, so the page is exactly as
// it was built. A leaving page is thrown away afterwards, so it is left as the animation ended.
function play(build, { tidy = false } = {}) {
  const restores = [];
  const touched = new Set();
  const timeline = gsap.timeline({ paused: true });
  const tools = {
    timeline,
    touch: (targets) => { for (const target of [].concat(targets)) touched.add(target); return targets; },
    letters(element) {
      const split = splitLetters(element);
      restores.push(split.restore);
      return split.letters;
    },
    lines(element) {
      const split = splitLines(element);
      restores.push(split.restore);
      return split.lines;
    },
  };
  build(tools);
  // A timeline with nothing in it would never report that it finished.
  timeline.to({}, { duration: 0.001 }, 0);
  const done = new Promise((resolve) => {
    timeline.eventCallback('onComplete', () => {
      if (tidy) {
        for (const restore of restores) restore();
        gsap.set([...touched], { clearProps: animated });
        for (const target of touched) target.style.removeProperty('--ticker-words');
      }
      resolve();
    });
  });
  // Preparing a page (cutting text into letters, measuring) makes one slow frame. Starting two
  // frames later keeps that frame out of the animation, so its first moments are not skipped.
  requestAnimationFrame(() => requestAnimationFrame(() => timeline.play()));
  return { done, finish: () => timeline.progress(1) };
}

// Letters of one heading leaving or arriving, one after another.
function lettersOut({ timeline, letters }, element, where, pace, at = 0) {
  const size = parseFloat(getComputedStyle(element).fontSize);
  timeline.fromTo(letters(element), inPlace, { ...away[where](size), duration: pace.time, ease: pace.ease, stagger: pace.apart }, at);
}
function lettersIn({ timeline, letters }, element, where, pace, at = 0) {
  const size = parseFloat(getComputedStyle(element).fontSize);
  timeline.fromTo(letters(element), away[where](size), { ...inPlace, duration: pace.time, ease: pace.ease, stagger: pace.apart }, at);
}

// ---- The plain change ----

export function fadeOut(page) {
  return play(({ timeline }) => {
    timeline.to(page, { opacity: 0, duration: rules.plain.time, ease: rules.plain.ease }, 0);
  });
}

export function fadeIn(page) {
  return play(({ timeline, touch }) => {
    timeline.fromTo(touch(page), { opacity: 0 }, { opacity: 1, duration: rules.plain.time, ease: rules.plain.ease }, 0);
  }, { tidy: true });
}

// ---- The home page ----

// Leaving for Projects, About or Resume: the headline's letters slide out of their lines, then the
// rest of the top of the page goes piece by piece while the sections below fade in turn.
export function homeOut(page) {
  const rule = rules.homeOut;
  return play((tools) => {
    const { timeline, lines } = tools;
    for (const line of parts(page, 'giant')) lettersOut(tools, line, 'below', rules.letters.slow);
    for (const line of [...parts(page, 'opening'), ...parts(page, 'serif')]) lettersOut(tools, line, 'justAbove', rules.letters.slow);
    timeline.to(parts(page, 'flourish'), { x: rule.flourish.x, opacity: 0, duration: rule.flourish.time, ease: rule.flourish.ease }, rule.flourish.at);
    timeline.to(parts(page, 'section'), { opacity: 0, duration: rule.sections.time, ease: rule.sections.ease, stagger: rule.sections.apart }, rule.sections.at);
    timeline.to(parts(page, 'note'), { y: rule.note.y, opacity: 0, duration: rule.note.time, ease: rule.note.ease }, rule.note.at);
    timeline.fromTo(parts(page, 'ticker'), { clipPath: shape.box }, { clipPath: shape.bottomRightCorner, opacity: 0, duration: rule.ticker.time, ease: rule.ticker.ease }, rule.ticker.at);
    timeline.to(parts(page, 'nav-piece'), { y: rule.nav.y, opacity: 0, duration: rule.nav.time, ease: rule.nav.ease, stagger: rule.nav.apart }, rule.nav.at);
    timeline.to(parts(page, 'frame'), { y: rule.frame.y, opacity: 0, duration: rule.frame.time, ease: rule.frame.ease }, rule.frame.at);
    for (const lead of parts(page, 'lead')) {
      const rise = rule.lead.yInEms * parseFloat(getComputedStyle(lead).fontSize);
      timeline.fromTo(lines(lead), { clipPath: shape.all }, { y: rise, opacity: 0, clipPath: shape.topEdge, duration: rule.lead.time, ease: rule.lead.ease, stagger: rule.lead.apart }, rule.lead.at);
    }
  });
}

// Arriving: the headline's letters slide into their lines, then the rest follows in order.
// "quick" is the arrival from anywhere but the Projects page: all letters at once, and the rest sooner.
export function homeIn(page, { quick = false } = {}) {
  const rule = rules.homeIn;
  const pace = quick ? rules.letters.together : rules.letters.slow;
  const sooner = quick ? rule.earlier : 0;
  return play((tools) => {
    const { timeline, touch, lines } = tools;
    for (const line of parts(page, 'giant')) lettersIn(tools, line, 'below', pace);
    for (const line of parts(page, 'serif')) lettersIn(tools, line, 'above', pace);
    // The opening line sits right under the banner, so its letters come from exactly their own
    // height above: that keeps them from showing over the gradient bar on the way in.
    for (const line of parts(page, 'opening')) lettersIn(tools, line, 'justAbove', pace);
    timeline.fromTo(touch(parts(page, 'flourish')), { x: rule.flourish.x, opacity: 0 }, { x: 0, opacity: 1, duration: rule.flourish.time, ease: rule.flourish.ease }, rule.flourish.at - sooner);
    timeline.fromTo(touch(parts(page, 'nav-piece')), { y: rule.nav.y, opacity: 0 }, { y: 0, opacity: 1, duration: rule.nav.time, ease: rule.nav.ease, stagger: rule.nav.apart }, rule.nav.at - sooner);
    // The ticker's two rules open out from the corner first; its words fade in later.
    const tickers = touch(parts(page, 'ticker'));
    timeline.fromTo(tickers, { clipPath: shape.topLeftCorner, opacity: 0 }, { clipPath: shape.box, opacity: 1, duration: rule.ticker.time, ease: rule.ticker.ease }, rule.ticker.at - sooner);
    // The words fade through "--ticker-words", which the styles read, so that the copies of the
    // words the ticker makes for itself a moment later fade in with the original.
    timeline.fromTo(tickers, { '--ticker-words': 0 }, { '--ticker-words': 1, duration: rule.tickerText.time, ease: rule.tickerText.ease }, rule.tickerText.at - sooner);
    timeline.fromTo(touch(parts(page, 'note')), { opacity: 0, filter: `blur(${rule.note.blur}px)` }, { opacity: 1, filter: 'blur(0px)', duration: rule.note.time, ease: rule.note.ease }, rule.note.at - sooner);
    timeline.fromTo(touch(parts(page, 'frame')), { opacity: 0 }, { opacity: 1, duration: rule.frame.time, ease: rule.frame.ease }, rule.frame.at - sooner);
    for (const lead of parts(page, 'lead')) {
      const pieces = lines(lead);
      const drop = rule.lead.yInLines * pieces[0].getBoundingClientRect().height;
      timeline.fromTo(pieces, { y: drop, opacity: 0, clipPath: shape.topEdge }, { y: 0, opacity: 1, clipPath: shape.all, duration: rule.lead.time, ease: rule.lead.ease, stagger: rule.lead.apart }, rule.lead.at - sooner);
    }
  }, { tidy: true });
}

// ---- A page with a giant name on top: Projects, About, Resume ----

// Leaving for a project's page: the page name's letters slide up and out quickly, the picture
// frame lifts away and the cards drift aside as they fade.
export function pageOutToProject(page) {
  const rule = rules.pageOut.toProject;
  return play((tools) => {
    const { timeline } = tools;
    for (const title of parts(page, 'title')) lettersOut(tools, title, 'justAbove', rules.letters.quick);
    timeline.to(parts(page, 'header-frame'), { y: rule.frame.y, opacity: 0, duration: rule.frame.time, ease: rule.frame.ease }, rule.frame.at);
    timeline.to(parts(page, 'card'), { x: rule.cards.x, opacity: 0, duration: rule.cards.time, ease: rule.cards.ease, stagger: rule.cards.apart }, rule.cards.at);
  });
}

// Leaving for any other page: the letters slide up and out slowly while the cards fade as one.
export function pageOut(page) {
  const rule = rules.pageOut.toOther;
  return play((tools) => {
    const { timeline } = tools;
    for (const title of parts(page, 'title')) lettersOut(tools, title, 'justAbove', rules.letters.slow);
    timeline.to(parts(page, 'cards'), { opacity: 0, duration: rule.cards.time, ease: rule.cards.ease }, rule.cards.at);
    timeline.to(parts(page, 'header-frame'), { y: rule.frame.y, opacity: 0, duration: rule.frame.time, ease: rule.frame.ease }, rule.frame.at);
  });
}

// Arriving: the page name's letters rise into place, then the picture frame, then the cards one by one.
export function pageIn(page) {
  const rule = rules.pageIn;
  return play((tools) => {
    const { timeline, touch } = tools;
    for (const title of parts(page, 'title')) lettersIn(tools, title, 'justBelow', rules.letters.slow);
    timeline.fromTo(touch(parts(page, 'header-frame')), { opacity: 0 }, { opacity: 1, duration: rule.frame.time, ease: rule.frame.ease }, rule.frame.at);
    timeline.fromTo(touch(parts(page, 'card')), { x: rule.cards.x, opacity: 0 }, { x: 0, opacity: 1, duration: rule.cards.time, ease: rule.cards.ease, stagger: rule.cards.apart }, rule.cards.at);
  }, { tidy: true });
}

// ---- A project's page ----

// Leaving: the name, the description, the facts, the list of sections and the write-up drop away in turn.
export function projectOut(page) {
  const rule = rules.projectOut;
  return play(({ timeline }) => {
    const blocks = ['title', 'lead', 'facts', 'contents', 'body'].flatMap((name) => parts(page, name));
    timeline.to(blocks, { yPercent: rule.yInHeights * 100, opacity: 0, duration: rule.time, ease: rule.ease, stagger: rule.apart }, 0);
  });
}

// Arriving from Projects, About or Resume: the name sharpens letter by letter, then the description comes down
// line by line, the facts fade in, the list of sections comes up line by line, and the write-up fades in.
export function projectIn(page) {
  const rule = rules.projectIn;
  return play((tools) => {
    const { timeline, touch, letters, lines } = tools;
    for (const title of parts(page, 'title')) {
      timeline.fromTo(letters(title), { opacity: 0, filter: `blur(${rule.title.blur}px)` }, { opacity: 1, filter: 'blur(0px)', duration: rule.title.time, ease: rule.title.ease, stagger: rule.title.apart }, rule.title.at);
    }
    for (const lead of parts(page, 'lead')) {
      timeline.fromTo(lines(lead), { y: rule.lead.y, opacity: 0, clipPath: shape.topEdge }, { y: 0, opacity: 1, clipPath: shape.all, duration: rule.lead.time, ease: rule.lead.ease, stagger: rule.lead.apart }, rule.lead.at);
    }
    const facts = touch(parts(page, 'facts').flatMap((list) => [...list.querySelectorAll('dt, dd')]));
    timeline.fromTo(facts, { opacity: 0 }, { opacity: 1, duration: rule.facts.time, ease: rule.facts.ease }, rule.facts.at);
    const contents = touch([...parts(page, 'contents-label'), ...parts(page, 'contents-item')]);
    timeline.fromTo(contents, { y: (index, line) => rule.contents.yInLines * line.getBoundingClientRect().height, opacity: 0, clipPath: shape.topEdge }, { y: 0, opacity: 1, clipPath: shape.all, duration: rule.contents.time, ease: rule.contents.ease, stagger: rule.contents.apart }, rule.contents.at);
    timeline.fromTo(touch(parts(page, 'body')), { opacity: 0 }, { opacity: 1, duration: rule.body.time, ease: rule.body.ease }, rule.body.at);
  }, { tidy: true });
}

// ---- The small row under the banner ----

// Shows or hides the row, and swaps the back link's words and address for the new page's.
// "next" is the row as the new page has it; it is read, never inserted.
export function changeRow(row, next) {
  const rule = rules.row;
  const wasHidden = row.hasAttribute('data-row-hidden');
  const hide = next.hasAttribute('data-row-hidden');
  const link = row.querySelector('[data-row-back]');
  const words = row.querySelector('[data-row-back-text]');
  const nextLink = next.querySelector('[data-row-back]');
  const nextWords = next.querySelector('[data-row-back-text]').textContent;

  gsap.killTweensOf([row, words]);
  if (hide) {
    if (wasHidden) return;
    gsap.to(row, { opacity: 0, duration: rule.hide.time, ease: rule.hide.ease, onComplete() { row.setAttribute('data-row-hidden', ''); gsap.set(row, { clearProps: 'opacity' }); } });
    return;
  }
  link.setAttribute('href', nextLink.getAttribute('href'));
  if (wasHidden) {
    row.removeAttribute('data-row-hidden');
    gsap.fromTo(row, { opacity: 0 }, { opacity: 1, duration: rule.show.time, ease: rule.show.ease, clearProps: 'opacity' });
  }
  if (words.textContent === nextWords) return;
  // The old words slide out to the left through their own left edge; the new ones slide back in.
  const hiddenLeft = 'polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)';
  gsap.timeline()
    .fromTo(words, { xPercent: 0, opacity: 1, clipPath: shape.box }, { xPercent: -100, opacity: 0, clipPath: hiddenLeft, duration: rule.wordsOut.time, ease: rule.wordsOut.ease })
    .call(() => { words.textContent = nextWords; })
    .to(words, { xPercent: 0, opacity: 1, clipPath: shape.box, duration: rule.wordsIn.time, ease: rule.wordsIn.ease, clearProps: 'all' });
}
