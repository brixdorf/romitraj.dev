// Live widgets: small pieces of the page filled in by a script. For now: the local time.
// Every widget fails quietly. Its piece of the page stays hidden unless the script fills it in.

// Shows the current time in a given time zone, such as "6:42 PM".
function showLocalTime() {
  // Looked up every time, so copies made by the ticker and pages that arrive later are kept current too.
  for (const element of document.querySelectorAll('[data-local-time]')) {
    try {
      const now = new Date();
      const text = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: element.dataset.timeZone }).format(now);
      // Some browsers put a narrow no-break space before AM and PM. A plain space keeps the text in the site's font.
      element.textContent = text.replace(/\s/g, ' ');
      element.dateTime = now.toISOString();
      element.closest('[data-widget]')?.removeAttribute('hidden');
    } catch {
      // Unknown time zone or no support: leave the piece hidden.
    }
  }
}

// Keeps the copyright year current, even if the site was last built in an earlier year.
function showCurrentYear() {
  for (const element of document.querySelectorAll('[data-current-year]')) element.textContent = new Date().getFullYear();
}

// Fills in every widget on the page as it is now. Called again whenever a page change brings new content.
export function showWidgets() {
  showLocalTime();
  showCurrentYear();
}

// Fills in the widgets and keeps the time current: once at the start of the next minute, then every minute.
export function startWidgets() {
  showWidgets();
  const untilNextMinute = 60000 - (Date.now() % 60000);
  setTimeout(() => {
    showLocalTime();
    setInterval(showLocalTime, 60000);
  }, untilNextMinute);
}
