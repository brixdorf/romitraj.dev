// The home page's list of blog posts, brought up to date while the page is open. The list in the
// page was built with the site; the server reads the blog's feed again every 30 minutes
// (/api/posts, see server/blog.js), and when it knows of a newer list, this puts it in place.
//
// Nothing the visitor can see may move when that happens. A new list can be taller or shorter
// than the old one (a longer title takes another line), which would push up or down everything
// under it. So the list is only replaced while it is out of sight below the window: at once when
// the page has just opened or arrived (the visitor is at the top), or else as soon as the visitor
// scrolls back up past it. If the list is the same, nothing is touched at all.
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Waits for the list to leave the window at the bottom, when it could not be replaced at once.
let waiting = null;

// What a list says: each post's address, title and date, to tell whether two lists are the same.
const contents = (list) => [...list.querySelectorAll('[data-post-link]')]
  .map((link) => [link.getAttribute('href'), link.querySelector('[data-post-title]').textContent, link.querySelector('[data-post-date]').getAttribute('datetime')].join(' '))
  .join('\n');

// Makes a list of cards from the posts, each a copy of the blank card in the page's <template>.
function makeList(section, posts) {
  const blank = section.querySelector('template[data-post-card]').content.firstElementChild;
  const list = document.createElement('ul');
  list.className = 'card-grid';
  list.setAttribute('data-posts-list', '');
  for (const post of posts) {
    const item = blank.cloneNode(true);
    item.querySelector('[data-post-link]').href = post.url;
    item.querySelector('[data-post-title]').textContent = post.title;
    const date = item.querySelector('[data-post-date]');
    date.dateTime = post.isoDate;
    date.textContent = post.date;
    list.append(item);
  }
  return list;
}

// Puts the posts from the server's answer in place of the list on the page, if they differ.
// Without an answer, the page keeps the list it has.
export function showPosts(answer) {
  waiting?.disconnect();
  waiting = null;
  const section = document.querySelector('[data-posts]');
  const current = section?.querySelector('[data-posts-list]');
  if (!current || !answer?.posts?.length || !section.querySelector('template[data-post-card]')) return;
  const fresh = makeList(section, answer.posts.slice(0, Number(section.dataset.count) || answer.posts.length));
  if (contents(fresh) === contents(current)) return;

  const replace = () => {
    current.replaceWith(fresh);
    // Everything under the list may now sit a little higher or lower: the movement tied to
    // scrolling (the footer's compass) measures its places again.
    ScrollTrigger.refresh();
  };
  const outOfSightBelow = (top) => top >= window.innerHeight;
  if (outOfSightBelow(current.getBoundingClientRect().top)) return replace();
  waiting = new IntersectionObserver((entries) => {
    const entry = entries[entries.length - 1];
    if (entry.isIntersecting || !outOfSightBelow(entry.boundingClientRect.top)) return;
    waiting.disconnect();
    waiting = null;
    replace();
  });
  waiting.observe(current);
}
