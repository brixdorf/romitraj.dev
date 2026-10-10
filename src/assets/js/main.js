// Entry point for the site's JavaScript. The build bundles this file and everything it imports into one small file.
import { startAnimations } from './animations.js';
import { startWidgets } from './widgets.js';

// Marks the page as script-enabled, so styles can tell when scripts are running.
document.documentElement.classList.add('js');

// Widgets first, so the ticker measures its content with the time already in it.
startWidgets();
startAnimations();
