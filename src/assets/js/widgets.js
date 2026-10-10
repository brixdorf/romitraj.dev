// Live widgets: small pieces of the page filled in by a script. For now: the local time.
// Every widget fails quietly. Its piece of the page stays hidden unless the script fills it in.

// Shows the current time in a given time zone, such as "6:42 PM", and keeps it current.
function startLocalTime(root) {
  const show = () => {
    // Looked up on every tick, so copies made by the ticker are kept current too.
    for (const element of root.querySelectorAll('[data-local-time]')) {
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
  };
  show();
  // Wait for the start of the next minute, then update once a minute.
  const untilNextMinute = 60000 - (Date.now() % 60000);
  setTimeout(() => {
    show();
    setInterval(show, 60000);
  }, untilNextMinute);
}

// Keeps the copyright year current, even if the site was last built in an earlier year.
function showCurrentYear(root) {
  for (const element of root.querySelectorAll('[data-current-year]')) element.textContent = new Date().getFullYear();
}

export function startWidgets(root = document) {
  startLocalTime(root);
  showCurrentYear(root);
}
