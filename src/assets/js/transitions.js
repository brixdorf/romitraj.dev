// Page changes without a reload. When the visitor follows a link to another page of this site,
// Taxi.js fetches that page, the old content animates out, the new content is put in its place
// and animates in. The banner, the small row under it and the footer stay where they are.
// Which animation runs depends on the kinds of the two pages (see "howToLeave" and "howToArrive"
// below); the animations themselves are in page-changes.js.
import { Core, Transition } from '@unseenco/taxi';
import * as change from './page-changes.js';
import { startScrollMemory, markEntry, savePosition, positionOfEntry, takeOverScrolling } from './scroll-memory.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// Called just before the old content is thrown away, and just after the new content is in the page.
let hooks = { beforeSwap() {}, afterSwap() {} };
// The arrival that is still playing, if any, so that a new change of page can finish it at once.
let playing = null;
// The kind of the page being left, remembered until the next page arrives.
let leftKind = 'plain';
let taxi;

// Every page says what kind it is with data-page on its content (set by "pageKind" in the
// templates): "home", "project" (one project's page), "list" (the Projects page) or "page"
// (About, Resume: any other page with a giant name). Anything else is "plain".
const kindOf = (content) => content.dataset.page || 'plain';
const hasGiantName = (kind) => kind === 'list' || kind === 'page';
// While the old page is leaving, the next page may not have been fetched yet, so the two kinds
// that change how a page leaves are recognised by their address. Taxi gives addresses without
// their last slash, so the home page is the empty address.
const goingHome = () => taxi.targetLocation.pathname === '';
const goingToProject = () => /^\/projects\/[^/]+$/.test(taxi.targetLocation.pathname);

// How a page of each kind leaves.
function howToLeave(kind) {
  if (reduceMotion.matches) return change.fadeOut;
  // The home page straight to a project is a plain fade, as on the site this design follows.
  if (kind === 'home') return goingToProject() ? change.fadeOut : change.homeOut;
  if (kind === 'project') return change.projectOut;
  if (hasGiantName(kind)) return goingToProject() ? change.pageOutToProject : change.pageOut;
  return change.fadeOut;
}

// How a page of each kind arrives, given the kind of page the visitor came from.
function howToArrive(kind, from) {
  if (reduceMotion.matches || from === 'plain') return change.fadeIn;
  // The home page arrives letter after letter from the Projects page, and all at once from anywhere else.
  if (kind === 'home') return (page) => change.homeIn(page, { quick: from !== 'list' });
  if (kind === 'project') return from === 'home' ? change.fadeIn : change.projectIn;
  if (hasGiantName(kind)) return change.pageIn;
  return change.fadeIn;
}

class PageChange extends Transition {
  onLeave({ from, done }) {
    // If the headline is still in letters from its entrance (intro.js), have the plain text put back first.
    document.dispatchEvent(new Event('headline:settle'));
    playing?.finish();
    takeOverScrolling();
    savePosition();
    leftKind = kindOf(from);
    howToLeave(leftKind)(from).done.then(() => {
      hooks.beforeSwap();
      done();
    });
  }

  onEnter({ to, done }) {
    const arrival = howToArrive(kindOf(to), leftKind)(to);
    playing = arrival;
    arrival.done.then(() => { if (playing === arrival) playing = null; });
    // The page is usable straight away: links work while the last pieces are still arriving.
    done();
  }
}

// Brings the parts of the page that stay in place up to date with the page just fetched:
// the small row, the "you are here" line and the description for search engines.
function refreshFrame(nextDocument) {
  const row = document.querySelector('[data-row]');
  const nextRow = nextDocument.querySelector('[data-row]');
  if (row && nextRow) change.changeRow(row, nextRow);

  const crumb = document.querySelector('[data-crumb]');
  const nextCrumb = nextDocument.querySelector('[data-crumb]');
  if (crumb && nextCrumb) {
    crumb.innerHTML = nextCrumb.innerHTML;
    crumb.hidden = nextCrumb.hidden;
  }

  const description = document.querySelector('meta[name="description"]');
  const nextDescription = nextDocument.querySelector('meta[name="description"]');
  if (description && nextDescription) description.content = nextDescription.content;
}

// A link that leads to a page that does not exist. The server answers such an address with the
// status 404 and the "Lost at sea" page. Taxi takes any answer that is not a success as a
// failure: it reloads the whole page at that address, or, if the visitor clicked while Taxi was
// still fetching the page ahead of the click, it is left with no content to show at all.
// So Taxi's own requests are watched here: a 404 that carries a page is handed to Taxi as an
// answer it accepts, and the "Lost at sea" page then arrives like any other page, with its
// letters and cards. Nothing changes between the browser and the server: the answer is still a
// 404. Every other request, and every other kind of failure, is passed on untouched.
function letTaxiShowMissingPages() {
  const browserFetch = window.fetch;
  window.fetch = async function fetchForPageChanges(input, options) {
    const response = await browserFetch.call(this, input, options);
    const fromTaxi = options?.headers?.['X-Requested-With'] === 'Taxi';
    const isPage = (response.headers.get('content-type') || '').startsWith('text/html');
    if (!fromTaxi || response.status !== 404 || !isPage) return response;
    // The same answer, except that it says "ok" when asked.
    return new Proxy(response, {
      get(target, key) {
        if (key === 'ok') return true;
        const value = Reflect.get(target, key);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
  };
}

export function startPageChanges(pageHooks) {
  hooks = pageHooks;
  startScrollMemory();
  letTaxiShowMissingPages();

  taxi = new Core({
    transitions: { default: PageChange },
    // After a change, tell screen readers the new page's name and move keyboard focus to its heading.
    enableAccessibility: true,
  });

  // Taxi keeps a copy of the page it started on, for when the visitor comes back to it. That copy
  // may have been taken while the headline was in letters for its entrance, so it is dropped: the
  // page is simply fetched again, as every other page is.
  taxi.clearCache();

  // The new content is in the page. A link starts the new page at the top; the back and forward
  // buttons return to where the visitor was on that page. Then the frame around the content is
  // brought up to date and the new content's tickers and scroll movement are started.
  // The arrival animation begins right after this.
  taxi.on('NAVIGATE_IN', ({ to, trigger }) => {
    window.scrollTo(0, trigger === 'popstate' ? positionOfEntry() : 0);
    refreshFrame(to.page);
    hooks.afterSwap(to.renderer.content);
  });

  // The change is complete and the address bar shows the new page: note which history entry this is.
  taxi.on('NAVIGATE_END', markEntry);
}
