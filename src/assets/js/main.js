// Entry point for the site's JavaScript. The build bundles this file and everything it imports into one small file.
import { startAnimations } from './animations.js';
import { startWidgets, showWidgets } from './widgets.js';
import { startPageChanges } from './transitions.js';

// Marks the page as script-enabled, so styles can tell when scripts are running.
document.documentElement.classList.add('js');

// Page changes are set up first, while the page is still exactly as it was built: Taxi keeps a
// copy of it for when the visitor comes back.
let stopAnimations = () => {};
startPageChanges({
  // The old content is about to be thrown away: stop its tickers and scroll movement.
  beforeSwap() {
    stopAnimations();
  },
  // New content is in the page: fill in its widgets and start its tickers and scroll movement.
  // It is not on the screen yet (the browser has not drawn since it came in), so the blog's
  // posts may be brought up to date wherever they are.
  afterSwap(content) {
    showWidgets({ arriving: true });
    stopAnimations = startAnimations(content);
  },
});

// Widgets first, so the ticker measures its content with the time already in it.
startWidgets();
stopAnimations = startAnimations();
