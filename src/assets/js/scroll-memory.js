// Remembers how far down each page was scrolled, so that the browser's back and forward buttons
// return to the same place, and a reload stays where it was.
// Each step in the browser's history gets a small key (kept in the history entry itself) and the
// scroll position for that key is kept in the tab's session storage, which survives a reload.
const storageName = 'scroll-positions';
const mostRemembered = 60;

const read = () => {
  try {
    return JSON.parse(sessionStorage.getItem(storageName)) || {};
  } catch {
    return {};
  }
};

// The key of the history entry the visitor is on now.
let currentKey = null;

// Gives the current history entry a key if it has none, and notes it as the current one.
export function markEntry() {
  if (!history.state?.scrollKey) {
    history.replaceState({ ...history.state, scrollKey: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}` }, '');
  }
  currentKey = history.state.scrollKey;
}

// Saves the scroll position of the page the visitor is on (and about to leave).
export function savePosition() {
  if (!currentKey) return;
  try {
    const positions = read();
    delete positions[currentKey];
    positions[currentKey] = Math.round(window.scrollY);
    // Keep only the most recent ones.
    const keys = Object.keys(positions);
    for (const key of keys.slice(0, Math.max(0, keys.length - mostRemembered))) delete positions[key];
    sessionStorage.setItem(storageName, JSON.stringify(positions));
  } catch {
    // Storage is full or switched off: pages simply open at the top.
  }
}

// The saved position of the history entry the browser has just moved to, or 0.
export function positionOfEntry() {
  return read()[history.state?.scrollKey] ?? 0;
}

export function startScrollMemory() {
  markEntry();

  // Leaving the document (a reload, another site, closing the tab): save, and hand scroll
  // restoring back to the browser, so that a reload or a return to this page is put back at the
  // same place before anything is painted.
  window.addEventListener('pagehide', () => {
    savePosition();
    history.scrollRestoration = 'auto';
  });

  // A back, forward or reload that the browser did not restore by itself (it only does so for
  // history entries left in its care): put the page back from our own record.
  const arrival = performance.getEntriesByType('navigation')[0]?.type;
  if (arrival === 'back_forward' || arrival === 'reload') {
    const saved = positionOfEntry();
    const restore = () => { if (saved > 0 && Math.abs(window.scrollY - saved) > 2 && window.scrollY < 2) window.scrollTo(0, saved); };
    restore();
    window.addEventListener('load', restore, { once: true });
  }
}

// From the first page change on, the site places the scroll position itself: the browser must not
// jump to an old position while the old page is still animating out.
export function takeOverScrolling() {
  history.scrollRestoration = 'manual';
}
