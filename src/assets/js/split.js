// Cuts a piece of text into parts that can move on their own during a page change: a heading into
// single letters, or a paragraph into its lines as they wrap on screen. Each function returns the
// parts and a "restore" function that puts the original text back.
// Cutting must not move anything: every letter and every line stays exactly where it was.
// (npm run check tests this on every page at many window widths.)

// Text normally runs across and lines stack downward. The phone's headline is set on its side:
// there the text runs down and the lines stack sideways. These read a box's place along its
// line, its place among the lines, and how thick its line is, either way.
const along = (rect, sideways) => (sideways ? rect.top : rect.left);
const across = (rect, sideways) => (sideways ? rect.left : rect.top);
const thickness = (rect, sideways) => (sideways ? rect.width : rect.height);
// Two boxes are on different lines if they sit more than half a line apart across the lines.
const onNewLine = (rect, previous, sideways) => Math.abs(across(rect, sideways) - across(previous, sideways)) > thickness(rect, sideways) / 2;

// Remembers an element's own style setting, to put it back to the letter afterwards.
const keepStyle = (element) => {
  const style = element.getAttribute('style');
  return () => (style ? element.setAttribute('style', style) : element.removeAttribute('style'));
};

// Splits a heading into letters, without moving a single one of them.
// Two things would otherwise shift the text. A row of separate boxes may wrap in different places
// than the words did, even in the middle of a word: so the heading is told not to wrap at all, and
// a line break is put exactly where each line ended before. And letters in boxes of their own lose
// the fine spacing a font applies between certain pairs (kerning), and browsers place a row of
// boxes a fraction of a pixel differently from a run of text: so each letter's place is measured
// first, and afterwards each box is shifted back onto exactly that place.
//
// Every letter gets two boxes, one inside the other. The outer box ("split-letter") carries that
// shift and is never animated. The inner box ("split-letter__ink") holds the letter and is the
// one the animations move. They must be separate: GSAP, which runs the animations, takes over
// any shift it finds on a box it animates and would animate it away, and the letters would drift.
//
// The heading must also stay exactly as big as it was: a row of letter boxes is a little longer
// than the same word as text, and a longer heading would push whatever sits beside it. So the
// spacing between the boxes is put back first (with margins, which the heading's size follows),
// and only the last fraction of a pixel is done with the shift.
export function splitLetters(element) {
  const original = element.innerHTML;
  const restoreStyle = keepStyle(element);
  const sideways = getComputedStyle(element).writingMode.startsWith('vertical');
  const width = element.getBoundingClientRect().width;

  // Pass 1: measure where every letter sits now. Ready-made letter boxes (the drawn apostrophe) count too.
  const range = document.createRange();
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  const textNodes = [];
  const plan = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.classList.contains('apostrophe')) plan.push({ ink: node, rect: node.getBoundingClientRect() });
      continue;
    }
    textNodes.push(node);
    [...node.textContent].forEach((character, index) => {
      if (!character.trim()) return;
      range.setStart(node, index);
      range.setEnd(node, index + 1);
      plan.push({ node, index, rect: range.getBoundingClientRect() });
    });
  }
  // Which letters start a new line. Only real letters are compared with each other: a drawn
  // apostrophe is lifted out of line on purpose and would look like a line of its own.
  const previousLetter = [];
  let lastLetter = -1;
  plan.forEach((entry, index) => {
    previousLetter.push(lastLetter);
    if (entry.node) lastLetter = index;
  });
  const startsLine = plan.map((entry, index) => Boolean(entry.node) && previousLetter[index] >= 0 && onNewLine(entry.rect, plan[previousLetter[index]].rect, sideways));

  // Pass 2: put each letter in its two boxes. Spaces stay as plain text between the boxes.
  const newBox = () => Object.assign(document.createElement('span'), { className: 'split-letter' });
  for (const entry of plan) {
    if (!entry.ink) continue;
    // A ready-made letter box becomes the inner box of a new outer one.
    entry.box = newBox();
    entry.ink.replaceWith(entry.box);
    entry.box.append(entry.ink);
  }
  for (const node of textNodes) {
    const pieces = document.createDocumentFragment();
    [...node.textContent].forEach((character, index) => {
      if (!character.trim()) {
        pieces.append(character);
        return;
      }
      const entry = plan.find((planned) => planned.node === node && planned.index === index);
      entry.box = newBox();
      entry.ink = Object.assign(document.createElement('span'), { className: 'split-letter__ink', textContent: character });
      entry.box.append(entry.ink);
      pieces.append(entry.box);
    });
    node.replaceWith(pieces);
  }

  // Pass 3: keep the lines as they were. Nothing may wrap by itself, and a line break goes before
  // the first letter of each later line, unless that letter already starts a line (as it does
  // when the lines are separate blocks).
  element.style.whiteSpace = 'nowrap';
  plan.forEach((entry, index) => {
    if (!startsLine[index]) return;
    if (!onNewLine(entry.box.getBoundingClientRect(), plan[previousLetter[index]].box.getBoundingClientRect(), sideways)) entry.box.before(document.createElement('br'));
  });

  // Where each letter is now, measured the same way as before the cut.
  const measure = () => plan.map((entry) => {
    const text = entry.ink.firstChild;
    if (!text || text.nodeType !== Node.TEXT_NODE) return entry.ink.getBoundingClientRect();
    range.setStart(text, 0);
    range.setEnd(text, text.length);
    return range.getBoundingClientRect();
  });

  // Pass 4: put back the spacing between the letters with small margins, so that every line is
  // as long as it was and the heading keeps its size (a longer line would push whatever sits
  // beside the heading). Within a line, each box gets the difference between where it should be
  // and where it is, less what the boxes before it were already given. The first box of a line
  // gets none: the line as a whole is placed by the text's own alignment.
  let now = measure();
  let carried = 0;
  plan.forEach((entry, index) => {
    const off = along(entry.rect, sideways) - along(now[index], sideways);
    if (index > 0 && !startsLine[index]) {
      const nudge = off - carried;
      if (Math.abs(nudge) > 0.01) entry.box.style.marginInlineStart = `${nudge}px`;
    }
    carried = off;
  });

  // Safari can still leave the heading a pixel wider or narrower, so a heading whose text runs
  // across is also held at the width it had. (A sideways heading is left to itself: its length
  // is tied up with the rows of the hero's grid, and fixing it there changes the hero's height.)
  if (!sideways) {
    element.style.boxSizing = 'border-box';
    element.style.width = `${width}px`;
  }

  // Pass 5: browsers place a row of boxes a fraction of a pixel differently from a run of text.
  // Measure once more and shift each outer box by what is left. This shift ("translate") moves
  // only that one box and nothing around it.
  now = measure();
  plan.forEach((entry, index) => {
    const acrossBy = entry.rect.left - now[index].left;
    const downBy = entry.rect.top - now[index].top;
    if (Math.abs(acrossBy) > 0.01 || Math.abs(downBy) > 0.01) entry.box.style.translate = `${acrossBy}px ${downBy}px`;
  });

  // The heading keeps its words for screen readers while the letter boxes are in place.
  const hadLabel = element.hasAttribute('aria-label');
  if (!hadLabel && element.getAttribute('aria-hidden') !== 'true') element.setAttribute('aria-label', element.textContent.replace(/\s+/g, ' ').trim());

  return {
    letters: plan.map((entry) => entry.ink),
    restore() {
      element.innerHTML = original;
      restoreStyle();
      if (!hadLabel) element.removeAttribute('aria-label');
    },
  };
}

// Splits a paragraph into its lines, as they wrap at the current window width.
export function splitLines(element) {
  const original = element.innerHTML;
  const restoreStyle = keepStyle(element);
  const width = element.getBoundingClientRect().width;

  // Wrap every word, find which words share a line, then wrap each line.
  const words = [];
  for (const node of [...element.childNodes]) {
    if (node.nodeType !== Node.TEXT_NODE) {
      if (node.nodeType === Node.ELEMENT_NODE) words.push(node);
      continue;
    }
    const pieces = document.createDocumentFragment();
    node.textContent.split(/([ \n\t]+)/).forEach((text) => {
      if (!text) return;
      if (!text.trim()) {
        pieces.append(' ');
        return;
      }
      const word = document.createElement('span');
      word.textContent = text;
      words.push(word);
      pieces.append(word);
    });
    node.replaceWith(pieces);
  }
  const groups = [];
  let lastTop = null;
  for (const word of words) {
    const top = word.getBoundingClientRect().top;
    if (lastTop === null || Math.abs(top - lastTop) > 2) groups.push([]);
    groups[groups.length - 1].push(word);
    lastTop = top;
  }
  const lines = groups.map((group) => {
    const line = document.createElement('span');
    line.className = 'split-line';
    group.forEach((word, index) => {
      if (index) line.append(' ');
      line.append(word.tagName === 'SPAN' && !word.attributes.length ? word.textContent : word);
    });
    return line;
  });
  // A paragraph that is only as wide as its text would shrink once its lines are separate blocks,
  // so it keeps the width it had. (The lines themselves never wrap again: see .split-line.)
  element.style.boxSizing = 'border-box';
  element.style.inlineSize = `${width}px`;
  element.replaceChildren(...lines);

  return {
    lines,
    restore() {
      element.innerHTML = original;
      restoreStyle();
    },
  };
}
