// Movement that scripts start. For now: the endless tickers.
import { speed, rate } from './motion.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// Makes one ticker drift: repeats its content until the line is full, then slides every copy
// left by its own width, over and over, at a constant number of pixels per second.
function startTicker(ticker) {
  const original = ticker.querySelector('.ticker__group');
  if (!original) return;
  const pixelsPerSecond = speed[ticker.dataset.ticker] || speed.statusTicker;
  let animations = [];

  const build = () => {
    // Keep the place in the loop, so rebuilding (after a resize, say) does not make the line jump.
    const elapsed = animations[0]?.currentTime ?? 0;
    for (const animation of animations) animation.cancel();
    animations = [];
    for (const copy of ticker.querySelectorAll('[data-ticker-copy]')) copy.remove();

    const width = original.getBoundingClientRect().width;
    if (reduceMotion.matches || !width) return;

    const copiesNeeded = Math.ceil(ticker.clientWidth / width);
    for (let count = 0; count < copiesNeeded; count++) {
      const copy = original.cloneNode(true);
      copy.dataset.tickerCopy = '';
      // Copies are for the eye only: hidden from screen readers and skipped by the Tab key.
      copy.setAttribute('aria-hidden', 'true');
      copy.inert = true;
      ticker.append(copy);
    }
    animations = [...ticker.children].map((group) => {
      const animation = group.animate(
        [{ transform: 'translateX(0)' }, { transform: 'translateX(-100%)' }],
        { duration: (width / pixelsPerSecond) * 1000, iterations: Infinity, easing: 'linear' },
      );
      animation.currentTime = elapsed;
      return animation;
    });
  };

  const setRate = (value) => {
    for (const animation of animations) animation.updatePlaybackRate(value);
  };
  ticker.addEventListener('pointerenter', () => setRate(rate.tickerHover));
  ticker.addEventListener('pointerleave', () => setRate(1));
  ticker.addEventListener('focusin', () => setRate(rate.tickerHover));
  ticker.addEventListener('focusout', () => setRate(1));

  // Rebuild when the line or its content changes size (window resized, fonts arrived, a widget filled in).
  let lastSize = '';
  const observer = new ResizeObserver(() => {
    const size = `${ticker.clientWidth} ${Math.round(original.getBoundingClientRect().width)}`;
    if (size === lastSize) return;
    lastSize = size;
    build();
  });
  observer.observe(ticker);
  observer.observe(original);
  reduceMotion.addEventListener('change', build);
}

export function startAnimations(root = document) {
  for (const ticker of root.querySelectorAll('[data-ticker]')) startTicker(ticker);
}
