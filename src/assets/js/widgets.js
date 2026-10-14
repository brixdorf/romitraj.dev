// Live widgets: small pieces of the page filled in by a script. The local time and the year are
// worked out in the browser; the weather, the track playing on Spotify and the latest blog posts
// are asked from the site's own server (/api/weather, /api/now-playing and /api/posts: see
// server/api.js).
// Every widget fails quietly. Its piece of the page stays hidden unless the script can fill it
// in, and is hidden again if its service stops answering. The blog posts are the exception: the
// page is built with a list of them, and keeps the last good list it has (see posts.js).
import { showPosts } from './posts.js';

// How often the server is asked again, in milliseconds. The server itself keeps each answer
// for a while (15 minutes for the weather, 30 seconds for Spotify, 30 minutes for the blog's
// posts), so asking is cheap.
const every = { weather: 15 * 60 * 1000, nowPlaying: 30 * 1000, posts: 30 * 60 * 1000 };

// The latest answers, kept so that content arriving with a page change can be filled in at once.
const latest = { weather: null, nowPlaying: null, posts: null };

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

// Shows the weather, such as "24°C, partly cloudy". The wording comes from the piece itself
// ("data-format", from home.json). Without an answer the piece is hidden.
function showWeather() {
  const answer = latest.weather;
  for (const piece of document.querySelectorAll('[data-weather]')) {
    if (!answer) {
      piece.hidden = true;
      continue;
    }
    const text = piece.dataset.format.replace('{temperature}', answer.temperature).replace('{condition}', answer.condition);
    // If there is no word for the sky, drop the comma that would be left dangling.
    piece.querySelector('[data-weather-text]').textContent = text.replace(/[\s,]+$/, '');
    piece.hidden = false;
  }
}

// Shows the track playing on Spotify (or the last one played): its title as a link to the track,
// then the artists. Without an answer the piece is hidden.
function showNowPlaying() {
  const answer = latest.nowPlaying;
  for (const piece of document.querySelectorAll('[data-now-playing]')) {
    if (!answer) {
      piece.hidden = true;
      continue;
    }
    const label = piece.querySelector('[data-now-playing-label]');
    label.textContent = answer.playing ? label.dataset.playing : label.dataset.played;
    piece.querySelector('[data-now-playing-link]').href = answer.url;
    piece.querySelector('[data-now-playing-title]').textContent = answer.title;
    piece.querySelector('[data-now-playing-artists]').textContent = answer.artists.length ? `, ${answer.artists.join(', ')}` : '';
    piece.hidden = false;
  }
}

// Asks the server one of its questions. Anything but a proper answer counts as "nothing to show".
async function ask(address) {
  try {
    const response = await fetch(address, { headers: { Accept: 'application/json' } });
    return response.status === 200 ? await response.json() : null;
  } catch {
    return null;
  }
}

// Asks now, shows the answer, and asks again every so often while the page is in view.
// With "keepLastGood", a failed answer leaves the last good one in place instead of clearing it.
function keepCurrent(name, address, show, { keepLastGood = false } = {}) {
  const refresh = async () => {
    if (document.visibilityState === 'hidden') return;
    const answer = await ask(address);
    if (answer || !keepLastGood) latest[name] = answer;
    show();
  };
  refresh();
  setInterval(refresh, every[name]);
  // Coming back to the tab after a while: catch up at once.
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh(); });
}

// Fills in every widget on the page as it is now. Called again whenever a page change brings new content.
export function showWidgets() {
  showLocalTime();
  showCurrentYear();
  showWeather();
  showNowPlaying();
  showPosts(latest.posts);
}

// Fills in the widgets and keeps them current: the time once at the start of the next minute and
// then every minute, the weather, the track and the blog's posts by asking the server now and then.
export function startWidgets() {
  showWidgets();
  const untilNextMinute = 60000 - (Date.now() % 60000);
  setTimeout(() => {
    showLocalTime();
    setInterval(showLocalTime, 60000);
  }, untilNextMinute);
  keepCurrent('weather', '/api/weather', showWeather);
  keepCurrent('nowPlaying', '/api/now-playing', showNowPlaying);
  keepCurrent('posts', '/api/posts', () => showPosts(latest.posts), { keepLastGood: true });
}
