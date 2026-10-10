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
  // A page change fades the old page out, then the new page in. Each fade takes this long.
  pageFade: 0.2,
  // Movement tied to scroll trails the scroll position and takes about this long to catch up.
  scrollCatchUp: 1,
};

export const ease = {
  pageFade: 'power1.out',
  // Things that arrive as you scroll start quickly and settle gently.
  scrollIn: 'power1.out',
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
  // The fixed starting points used instead while npm run check photographs the pages, so that
  // screenshots can be compared from one run to the next. The list repeats if there are more rows.
  rowOffsetsForChecks: [0.3, -0.24, 0.4, -0.32, 0.26, -0.38],
  // A row fades away as it leaves through the top of the window.
  rowFadeStart: 'top 11%',
  rowFadeEnd: 'bottom top',
};
