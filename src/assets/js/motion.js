// Animation timings used by scripts: the one place to change how fast things move.
// Durations are in seconds and speeds in pixels per second. Timings used only by CSS are in assets/css/tokens.css.

export const speed = {
  // The endless tickers move at a constant speed.
  statusTicker: 41,
  quoteTicker: 60,
};

export const duration = {
  // A page change fades the old page out, then the new page in. Each fade takes this long.
  pageFade: 0.2,
  // Movement tied to scroll trails the scroll position and takes about this long to catch up.
  scrollCatchUp: 1,
};

export const ease = {
  pageFade: 'power1.out',
  scrollCatchUp: 'expo.out',
};
