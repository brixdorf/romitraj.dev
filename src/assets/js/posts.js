// The blog's posts on the home page (the list of cards) and on the About page (the piece about the
// latest post), brought up to date while the page is open. Both were built with the site; the
// server reads the blog's feed again every 30 minutes (/api/posts, see server/blog.js), and when
// it knows of newer posts, this puts them in place.
//
// Nothing the visitor can see may move when that happens. New posts can take more or less room
// than the old ones (a longer title takes another line), which would push up or down what comes
// after them. So a piece is only changed while it is out of sight below the window: at once when
// the page has just opened or arrived (and the piece is below the window), or else as soon as the
// visitor scrolls back up above it. Even then the change is tried first and undone at once if
// anything in sight moved (on the About page a card beside the piece can grow with it); the
// browser draws nothing in between, so the visitor never sees the try. A page that is arriving
// through a page change is not on the screen yet, so its pieces are changed straight away.
// A piece that already says the same is never touched.
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// The pieces waiting for their turn, by name, each with the way to stop waiting.
const waiting = new Map();

function stopWaiting(name) {
  waiting.get(name)?.();
  waiting.delete(name);
}

// Where everything the visitor can see is on the screen: only the part inside the window counts,
// so a box that holds a piece (the page's content as a whole) may grow below the window.
function placesInSight() {
  const height = window.innerHeight;
  const places = [];
  for (const element of document.body.querySelectorAll('*')) {
    const rect = element.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= height || (!rect.width && !rect.height)) continue;
    places.push([element, rect.left, Math.max(rect.top, 0), rect.width, Math.min(rect.bottom, height)]);
  }
  return places;
}
const movedInSight = (places) => places.some(([element, ...was]) => {
  if (!element.isConnected) return true;
  const rect = element.getBoundingClientRect();
  const now = [rect.left, Math.max(rect.top, 0), rect.width, Math.min(rect.bottom, window.innerHeight)];
  return now.some((value, index) => Math.abs(value - was[index]) > 0.5);
});

// Changes the page ("change" makes the change and returns a function that undoes it) only where
// the visitor cannot see it, as described at the top. "spot" is the piece now on the page, or
// what sits just above where it will go; "fresh" is the new piece.
function changeUnseen(name, { spot, fresh, change, arriving }) {
  stopWaiting(name);
  const done = () => ScrollTrigger.refresh();
  if (arriving) {
    change();
    return done();
  }
  const attempt = () => {
    if (!spot.isConnected || spot.getBoundingClientRect().top < window.innerHeight) return false;
    const before = placesInSight();
    const undo = change();
    if (fresh.getBoundingClientRect().top >= window.innerHeight && !movedInSight(before)) {
      // Everything under the piece may now sit a little higher or lower: the movement tied to
      // scrolling (the footer's compass) measures its places again.
      done();
      return true;
    }
    undo();
    return false;
  };
  if (attempt()) return;
  // Try again whenever the visitor scrolls or the window changes size, once per frame at most.
  let queued = false;
  const check = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      if (waiting.has(name) && attempt()) stopWaiting(name);
    });
  };
  addEventListener('scroll', check, { passive: true });
  addEventListener('resize', check);
  waiting.set(name, () => {
    removeEventListener('scroll', check);
    removeEventListener('resize', check);
  });
}

// Fills a copy of a blank piece with a post's address, title, date and (if it has a place for
// one) its short description.
function fill(piece, post) {
  piece.querySelector('[data-post-link]').href = post.url;
  piece.querySelector('[data-post-title]').textContent = post.title;
  const date = piece.querySelector('[data-post-date]');
  date.dateTime = post.isoDate;
  date.textContent = post.date;
  const text = piece.querySelector('[data-post-text]');
  if (text && post.description) text.textContent = post.description;
  else text?.remove();
  return piece;
}

// What a piece says: each post's address, title, date and description, to tell whether two are the same.
const contents = (piece) => [...piece.querySelectorAll('[data-post-link]')]
  .map((link) => {
    const post = link.closest('[data-latest-post], li') || piece;
    return [link.getAttribute('href'), post.querySelector('[data-post-title]').textContent, post.querySelector('[data-post-date]').getAttribute('datetime'), post.querySelector('[data-post-text]')?.textContent || ''].join(' ');
  })
  .join('\n');

// The home page: the list of cards, each a copy of the blank card in the page's <template>.
function showList(posts, arriving) {
  const section = document.querySelector('[data-posts]');
  const current = section?.querySelector('[data-posts-list]');
  const blank = section?.querySelector('template[data-post-card]')?.content.firstElementChild;
  if (!current || !blank) return stopWaiting('list');
  const fresh = document.createElement('ul');
  fresh.className = 'card-grid';
  fresh.setAttribute('data-posts-list', '');
  for (const post of posts.slice(0, Number(section.dataset.count) || posts.length)) fresh.append(fill(blank.cloneNode(true), post));
  if (contents(fresh) === contents(current)) return stopWaiting('list');
  changeUnseen('list', {
    spot: current,
    fresh,
    arriving,
    change: () => {
      current.replaceWith(fresh);
      return () => fresh.replaceWith(current);
    },
  });
}

// The About page: the piece about the latest post, a copy of the blank one in the page's
// <template>, which also marks where the piece goes if the page was built without one.
function showLatest(post, arriving) {
  const template = document.querySelector('template[data-latest-post-blank]');
  const blank = template?.content.firstElementChild;
  if (!blank) return stopWaiting('latest');
  const current = template.parentNode.querySelector('[data-latest-post]');
  const fresh = fill(blank.cloneNode(true), post);
  if (current && contents(fresh) === contents(current)) return stopWaiting('latest');
  const spot = current || template.previousElementSibling;
  if (!spot) return stopWaiting('latest');
  changeUnseen('latest', {
    spot,
    fresh,
    arriving,
    change: () => {
      if (current) current.replaceWith(fresh);
      else template.before(fresh);
      return () => (current ? fresh.replaceWith(current) : fresh.remove());
    },
  });
}

// Puts the posts from the server's answer in place on the page as it is now, where they differ.
// Without an answer, the page keeps what it has. "arriving" says the page is coming in through
// a page change and is not on the screen yet.
export function showPosts(answer, { arriving = false } = {}) {
  if (!answer?.posts?.length) {
    stopWaiting('list');
    stopWaiting('latest');
    return;
  }
  showList(answer.posts, arriving);
  showLatest(answer.posts[0], arriving);
}
