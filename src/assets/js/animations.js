// Movement that scripts start: the endless tickers, and the movement tied to scroll (the sliding
// heading, the growing bars beside the giant headings, and the project rows).
// Everything started here can be stopped again, because a page change throws the old content away.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { speed, rate, duration, ease, scroll } from './motion.js';

gsap.registerPlugin(ScrollTrigger);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// Makes one ticker drift: repeats its content until the line is full, then slides every copy
// left by its own width, over and over, at a constant number of pixels per second.
// Returns a function that stops it.
function startTicker(ticker) {
  const original = ticker.querySelector('.ticker__group');
  if (!original) return () => {};
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

  return () => {
    observer.disconnect();
    reduceMotion.removeEventListener('change', build);
    for (const animation of animations) animation.cancel();
  };
}

// Movement tied to scroll. It runs on tablets and laptops only, and not for visitors who asked
// their system for less motion. Everywhere else, things simply sit in their resting place.
// Returns a function that stops it.
function startScrollMovement(root) {
  // Where each project row starts from. Picked once per page load, so resizing the window does not reshuffle the rows.
  // The check script sets window.steadyMotion, which swaps the random picks for a fixed list.
  const [least, most] = scroll.rowOffsetRange;
  const rowOffsets = [...root.querySelectorAll('[data-row]')].map((row, index) => (
    window.steadyMotion === true
      ? scroll.rowOffsetsForChecks[index % scroll.rowOffsetsForChecks.length]
      : least + Math.random() * (most - least)
  ));

  const media = gsap.matchMedia();
  media.add('(min-width: 600px) and (prefers-reduced-motion: no-preference)', () => {
    // "scrub" ties an animation's progress to the scroll position, trailing it by the catch-up time.
    const scrub = duration.scrollCatchUp;

    // A heading that slides in from the right.
    for (const heading of root.querySelectorAll('[data-drift]')) {
      gsap.fromTo(heading, { x: () => window.innerWidth * scroll.headingDistance }, {
        x: 0,
        ease: ease.scrollIn,
        scrollTrigger: { trigger: heading.parentElement, start: scroll.headingStart, end: scroll.headingEnd, scrub, invalidateOnRefresh: true },
      });
    }

    // The bar beside a giant heading, growing from nothing. The styles read its length from "--bar".
    for (const heading of root.querySelectorAll('[data-bar]')) {
      gsap.fromTo(heading, { '--bar': 0 }, {
        '--bar': 1,
        ease: ease.scrollIn,
        scrollTrigger: { trigger: heading, start: scroll.headingStart, end: scroll.headingEnd, scrub },
      });
    }

    // Project rows: each strip slides to rest from one side, then the row fades as it leaves the top.
    root.querySelectorAll('[data-row]').forEach((row, index) => {
      const strip = row.firstElementChild;
      const offset = rowOffsets[index];
      gsap.fromTo(strip, { x: () => row.clientWidth * offset }, {
        x: 0,
        ease: 'none',
        scrollTrigger: { trigger: row, start: scroll.rowStart, end: scroll.rowEnd, scrub, invalidateOnRefresh: true },
      });
      gsap.fromTo(row, { opacity: 1 }, {
        opacity: 0,
        ease: ease.scrollIn,
        scrollTrigger: { trigger: row, start: scroll.rowFadeStart, end: scroll.rowFadeEnd, scrub: true },
      });
    });

    // The compass in the footer rises a little as the footer scrolls into view. The footer is not
    // part of "root" (it stays in place through page changes), so it is looked up in the whole page.
    const ornament = document.querySelector('[data-ornament] .picture');
    if (ornament) {
      gsap.fromTo(ornament, { y: scroll.ornamentDistance }, {
        y: 0,
        ease: 'none',
        scrollTrigger: { trigger: ornament.closest('footer'), start: scroll.ornamentStart, end: scroll.ornamentEnd, scrub },
      });
    }
  });

  // Positions are measured from the page's layout, which shifts once the fonts arrive.
  document.fonts.ready.then(() => ScrollTrigger.refresh());

  // Undoes everything set up above and puts the moved things back in their resting places.
  return () => media.revert();
}

// Starts the tickers and the scroll movement inside "root". Returns a function that stops them all.
export function startAnimations(root = document) {
  const stops = [...root.querySelectorAll('[data-ticker]')].map(startTicker);
  stops.push(startScrollMovement(root));
  return () => stops.forEach((stop) => stop());
}
