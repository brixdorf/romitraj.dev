// Animation timings used by scripts: the one place to change how fast things move.
// Durations are in seconds and speeds in pixels per second. Timings used only by CSS are in assets/css/tokens.css.

export const speed = {
  // The endless tickers move at a constant speed.
  statusTicker: 41,
  quoteTicker: 60,
};

export const rate = {
  // While the pointer is over a ticker (or keyboard focus is inside it), it slows to this share of its speed.
  tickerHover: 0.2,
};

export const duration = {
  // Movement tied to scroll trails the scroll position. This is the catch-up time handed to GSAP,
  // which eases toward the new place: with 2, a piece is halfway there after about 0.15s, nine
  // tenths of the way after 0.5s and settled after about 1s, as measured on the reference.
  scrollCatchUp: 2,
};

// A copy button shows "Copied" for this long after it is pressed (copy.js).
export const copied = { time: 1.5 };

export const ease = {
  // Things that arrive as you scroll start quickly and settle gently.
  scrollIn: 'power1.out',
};

// How long one giant letter takes to slide in or out, and the gap before the next one starts.
// Shared by the page changes and the headline's entrance below.
// (Two plain numbers, so that the small entrance script only has to carry what it uses.)
const letterTime = 0.95;
const letterGap = 0.02;
// The outlined italic words slide in from the left a little after the letters start.
const flourishAt = 0.46;
const flourishTime = 0.4;
const flourishFrom = -16;
// The lines of the About page's quote slide up into place one after another, each as slowly as a
// giant letter, this far apart.
const sayingGap = 0.12;

// The headline's entrance when the home page is first opened or reloaded (intro.js). It waits for
// these fonts, but no longer than "patience" seconds, then the letters slide in one after another.
export const intro = {
  fonts: ['1em "Manuka"', '1em "Louize Display"', 'italic 1em "Louize Display"'],
  patience: 2.5,
  time: letterTime,
  apart: letterGap,
  // The same curve as "power2.inOut" in the page changes, written the way CSS writes it.
  ease: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
  // The lines of the About page's quote.
  saying: { time: letterTime, apart: sayingGap },
  // The outlined italic words, as when arriving from another page. The curve is "power1.out".
  flourish: {
    at: flourishAt,
    time: flourishTime,
    x: flourishFrom,
    ease: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  },
};

// Page changes. Moving between pages is choreographed: pieces leave and arrive one after another.
// Three kinds of page each have their own sequence: the home page, a project's page, and a page
// with a giant name on top (Projects, About, Resume). The home page straight to a project, and
// any page without marked pieces, gets a plain fade.
// In every entry: "time" is how long one piece takes, "ease" its curve, "at" when it starts
// (seconds after the old page starts leaving, or after the new page is in place), and "apart" the
// gap between one piece and the next of the same kind. Distances are in pixels unless noted.
export const pageChange = {
  // The plain change: the old page fades out, then the new page fades in.
  plain: { time: 0.2, ease: 'power1.out' },

  // The small row under the banner fades in on leaving the home page and out on returning to it.
  // When its back link changes words, the old words slide out to the left and the new ones slide in.
  row: {
    show: { time: 0.2, ease: 'none' },
    hide: { time: 0.12, ease: 'power1.out' },
    wordsOut: { time: 0.3, ease: 'power3.in' },
    wordsIn: { time: 0.4, ease: 'power3.out' },
  },

  // Giant headings move letter by letter, each letter sliding through an unseen edge:
  // "sink" slides down out of the line, "rise" comes up into it, "lift" slides up out of it and
  // "drop" comes down into it.
  letters: {
    slow: { time: letterTime, apart: letterGap, ease: 'power2.inOut' },
    // Leaving a page with a giant name for a project: quicker, and further apart.
    quick: { time: 0.5, ease: 'power3.in', apart: 0.033 },
    // Arriving home from a project, About or Resume: every letter at once.
    together: { time: 0.62, ease: 'power3.out', apart: 0 },
  },

  // Leaving the home page for Projects, About or Resume.
  homeOut: {
    flourish: { at: 0, time: 0.4, ease: 'power4.in', x: 16 },
    sections: { at: 0, time: 0.3, ease: 'power1.out', apart: 0.1 },
    note: { at: 0.19, time: 0.2, ease: 'power3.in', y: -24 },
    ticker: { at: 0.2, time: 0.48, ease: 'power2.inOut' },
    nav: { at: 0.2, time: 0.2, ease: 'power3.in', apart: 0.033, y: -32 },
    frame: { at: 0.37, time: 0.3, ease: 'power1.out', y: -16 },
    // Each line of the introduction moves up by its own type size.
    lead: { at: 0.39, time: 0.3, ease: 'power1.out', apart: 0.033, yInEms: -1 },
  },

  // Arriving at the home page. "at" is counted from when the letters start. Coming from anywhere
  // but the Projects page, everything except the letters starts "earlier" seconds sooner.
  homeIn: {
    earlier: 0.39,
    flourish: { at: flourishAt, time: flourishTime, ease: 'power1.out', x: flourishFrom },
    nav: { at: 0.46, time: 0.5, ease: 'power1.out', apart: 0.017, y: -8 },
    ticker: { at: 0.48, time: 0.48, ease: 'power2.inOut' },
    note: { at: 0.96, time: 0.5, ease: 'power1.out', blur: 5 },
    frame: { at: 0.99, time: 0.43, ease: 'power2.inOut' },
    // Each line of the introduction comes up by half its own height.
    lead: { at: 1.09, time: 0.5, ease: 'power1.out', apart: 0.033, yInLines: 0.5 },
    tickerText: { at: 1.09, time: 0.5, ease: 'none' },
  },

  // Leaving a page with a giant name: for a project's page, or for any other page.
  pageOut: {
    toProject: {
      frame: { at: 0, time: 0.28, ease: 'power3.in', y: -48 },
      cards: { at: 0, time: 0.5, ease: 'none', apart: 0.003, x: 10 },
    },
    toOther: {
      cards: { at: 0, time: 0.48, ease: 'power1.out' },
      frame: { at: 0.17, time: 0.4, ease: 'power3.in', y: -48 },
    },
  },

  // Arriving at a page with a giant name.
  pageIn: {
    // The About page's quote: its lines rise into place while the page's name is still arriving.
    saying: { at: 0.3, time: letterTime, ease: 'power2.inOut', apart: sayingGap },
    frame: { at: 0.67, time: 0.3, ease: 'power1.out' },
    cards: { at: 0.98, time: 0.5, ease: 'power1.out', apart: 0.1, x: -10 },
  },

  // Leaving a project's page: each block drops by half its own height as it fades.
  projectOut: { time: 0.3, ease: 'power4.in', apart: 0.05, yInHeights: 0.5 },

  // Arriving at a project's page from Projects, About or Resume.
  projectIn: {
    title: { at: 0, time: 0.47, ease: 'power2.inOut', apart: 0.02, blur: 2 },
    lead: { at: 0.27, time: 0.5, ease: 'power1.out', apart: 0.05, y: -15 },
    facts: { at: 0.45, time: 0.5, ease: 'power1.out' },
    // The list of sections comes up line by line, each by half its own height.
    contents: { at: 0.67, time: 0.5, ease: 'power1.out', apart: 0.05, yInLines: 0.5 },
    body: { at: 0.85, time: 0.32, ease: 'power1.out' },
  },
};

// Movement tied to scroll. Positions are written the way GSAP's ScrollTrigger reads them:
// "top bottom" means "when the top of the thing reaches the bottom of the window".
export const scroll = {
  // Headings slide in, and their bars grow, between these two moments.
  headingStart: 'top bottom',
  headingEnd: 'bottom center',
  // How far a sliding heading starts from its resting place, as a share of the window's width.
  headingDistance: 0.5,
  // Project rows slide to rest between these two moments...
  rowStart: 'top bottom',
  rowEnd: 'bottom center',
  // ...each starting somewhere between these two points, as a share of the row's width (minus is left).
  // Every page load picks new starting points.
  rowOffsetRange: [-0.5, 0.25],
  // The fixed starting points used instead while pnpm run check photographs the pages, so that
  // screenshots can be compared from one run to the next. The list repeats if there are more rows.
  rowOffsetsForChecks: [0.3, -0.24, 0.4, -0.32, 0.26, -0.38],
  // A row fades away as it leaves through the top of the window.
  rowFadeStart: 'top 11%',
  rowFadeEnd: 'bottom top',
  // The compass in the footer rises by this many pixels while the footer scrolls into view.
  ornamentDistance: 14,
  ornamentStart: 'top bottom',
  ornamentEnd: 'bottom bottom',
};

// The hero's 3D compass (compass.js, compass-motion.js). Angles are in degrees, times in seconds.
export const compass = {
  // The pose at rest, the one the still picture shows: the top turned away from the viewer by
  // "tilt", the right side by "lean".
  rest: { tilt: 22, lean: -18 },
  // How it turns on its own: still for "delay" seconds after it takes the still picture's place,
  // then easing in over "rampUp" seconds to "speed" degrees a second, about an axis close to
  // upright that "wanders" (0 never, 1 a lot) so it tumbles.
  idle: { speed: 30, delay: 1.2, rampUp: 1.5, wander: 0.4 },
  // A drag with the mouse or a finger: degrees turned per CSS pixel dragged, the fastest it can
  // be thrown (degrees a second), and how many seconds a throw takes to slow back to its own
  // pace (about two thirds of the way).
  drag: { perPixel: 0.6, fastest: 900, coast: 1.1 },
  // How far from its middle the view reaches across, in the compass's own units (its case has a
  // radius of 1): room for it to turn every way without leaving the frame.
  view: 1.4,
  // The needle: the spring pulling it to north, the damping that calms it, and the share of the
  // case's turn the pivot drags it along by.
  needle: { spring: 38, damping: 2.6, drag: 0.85 },
  // How a tone becomes ink or paper: darker than "black" solid ink, lighter than "white" solid
  // paper, a checkerboard between (as "black" and "white" in images.json).
  black: 0.3,
  white: 0.72,
  // The most drawings a second. Its movement is worked out from the time, so a faster screen
  // would only draw the same movement more often.
  fps: 60,
};
