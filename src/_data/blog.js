// Fetches the latest posts from the blog's feed while the site is being built, for the home page's
// "Writing" cards and the About page's latest post. The feed is read by server/blog.js, which the
// live server also uses to bring the home page's list up to date between deploys.
// If the feed cannot be reached, it returns no posts and the page shows a plain link to the blog instead.
import fs from 'node:fs';
import { feedAddress, readFeed } from '../../server/blog.js';

const site = JSON.parse(fs.readFileSync('src/_data/site.json', 'utf8'));
// While developing, the feed is kept for an hour so that saving a file does not fetch it again each time.
const cacheFile = '.cache/blog.json';
const cacheMinutes = 60;

export default async function () {
  // Only the real feed is kept, and only while developing: a stand-in feed (npm run check) is never saved.
  const keeping = process.env.ELEVENTY_RUN_MODE === 'serve' && !process.env.BLOG_FEED_URL;
  if (keeping && fs.existsSync(cacheFile) && Date.now() - fs.statSync(cacheFile).mtimeMs < cacheMinutes * 60000) {
    return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  }
  // Two tries, in case the blog is slow to answer the first time.
  let problem = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch(feedAddress(), { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`the feed answered ${response.status}`);
      const result = { posts: readFeed(await response.text()), url: site.blogUrl };
      if (keeping) {
        fs.mkdirSync('.cache', { recursive: true });
        fs.writeFileSync(cacheFile, JSON.stringify(result));
      }
      return result;
    } catch (error) {
      problem = error.message;
    }
  }
  console.warn(`[blog] Could not load ${feedAddress()} (${problem}). The page will link to the blog instead.`);
  return { posts: [], url: site.blogUrl };
}
