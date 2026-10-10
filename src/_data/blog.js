// Fetches the latest posts from the blog's feed while the site is being built.
// If the feed cannot be reached, it returns no posts and the page shows a plain link to the blog instead.
import fs from 'node:fs';

const site = JSON.parse(fs.readFileSync('src/_data/site.json', 'utf8'));
const feedUrl = new URL('/rss.xml', site.blogUrl).href;
// While developing, the feed is kept for an hour so that saving a file does not fetch it again each time.
const cacheFile = '.cache/blog.json';
const cacheMinutes = 60;

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

const parse = (xml) => [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, item]) => {
  const date = new Date(read(item, 'pubDate'));
  return {
    title: read(item, 'title'),
    url: read(item, 'link'),
    description: read(item, 'description'),
    isoDate: Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10),
    date: Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date),
  };
}).filter((post) => post.title && post.url);

export default async function () {
  const serving = process.env.ELEVENTY_RUN_MODE === 'serve';
  if (serving && fs.existsSync(cacheFile) && Date.now() - fs.statSync(cacheFile).mtimeMs < cacheMinutes * 60000) {
    return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  }
  // Two tries, in case the blog is slow to answer the first time.
  let problem = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch(feedUrl, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`the feed answered ${response.status}`);
      const result = { posts: parse(await response.text()), url: site.blogUrl };
      fs.mkdirSync('.cache', { recursive: true });
      fs.writeFileSync(cacheFile, JSON.stringify(result));
      return result;
    } catch (error) {
      problem = error.message;
    }
  }
  console.warn(`[blog] Could not load ${feedUrl} (${problem}). The page will link to the blog instead.`);
  return { posts: [], url: site.blogUrl };
}
