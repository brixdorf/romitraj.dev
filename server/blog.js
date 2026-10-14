// The latest posts from the blog, read from its feed (https://blog.romitraj.dev/rss.xml).
// Two users: the build (src/_data/blog.js) writes them into the home page and the About page, and
// the live server answers /api/posts with them (api.js), so both pages can show a new post
// without a new deploy.
// The server keeps the list for 30 minutes. If the feed cannot be read, it keeps answering with
// the last list it did read; before the first good read, it answers with nothing, and the page
// keeps the list it was built with.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { remembered } from './cache.js';

const data = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), 'src', '_data');
const site = JSON.parse(fs.readFileSync(path.join(data, 'site.json'), 'utf8'));
const shown = JSON.parse(fs.readFileSync(path.join(data, 'home.json'), 'utf8')).writing.count;
const blogHost = new URL(site.blogUrl).host;

// BLOG_FEED_URL is only set by npm run check and npm run speed, which point it at a stand-in on this computer.
export const feedAddress = () => process.env.BLOG_FEED_URL || new URL('/rss.xml', site.blogUrl).href;

// Pulls the text of one tag out of a piece of the feed, and tidies it for display.
const read = (xml, tag) => {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  if (!match) return '';
  return match[1]
    .replace(/^<!\[CDATA\[|\]\]>$/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    // The serif used for titles has a curly apostrophe but no straight one.
    .replace(/'/g, '’')
    .trim();
};

// Only a link to a page on the blog itself is kept, so the list can never point anywhere else.
const onTheBlog = (url) => {
  try {
    const address = new URL(url);
    return address.protocol === 'https:' && address.host === blogHost;
  } catch {
    return false;
  }
};

// Every post in the feed, newest first as the feed gives them: title, link, short description and date.
export const readFeed = (xml) => [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, item]) => {
  const date = new Date(read(item, 'pubDate'));
  return {
    title: read(item, 'title'),
    url: read(item, 'link'),
    description: read(item, 'description'),
    isoDate: Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10),
    date: Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date),
  };
}).filter((post) => post.title && onTheBlog(post.url));

// Reads the feed once. The answer is the posts the home page shows (as many as "writing.count"
// in home.json; the About page shows the first), or nothing if the feed cannot be read or holds
// no posts.
async function ask() {
  const response = await fetch(feedAddress(), { signal: AbortSignal.timeout(8000) });
  if (!response.ok) return null;
  const posts = readFeed(await response.text()).slice(0, shown).map(({ title, url, description, isoDate, date }) => ({ title, url, description, isoDate, date }));
  return posts.length ? { posts } : null;
}

// A keeper of the list with its own timings (the check uses short ones to test it).
export const keepPosts = (timings) => remembered(ask, { ...timings, keepLastGood: true });

export const latestPosts = keepPosts({ goodFor: 30 * 60 * 1000, retryAfter: 5 * 60 * 1000 });
