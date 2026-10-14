// The small questions the page's widgets ask the server: /api/weather, /api/now-playing and
// /api/posts (the latest blog posts). Each answers with a little JSON, or with "204 No Content"
// when there is nothing to show (the service behind it is down, or its keys are missing). The page
// then hides that widget, or, for the posts, keeps the list it already shows.
// Used by the live server (index.js) and by the local preview (eleventy.config.js).
import { weather } from './weather.js';
import { nowPlaying } from './spotify.js';
import { latestPosts } from './blog.js';

// "browserKeeps" is how many seconds a visitor's browser may reuse an answer.
const questions = {
  '/api/weather': { ask: weather, browserKeeps: 300 },
  '/api/now-playing': { ask: nowPlaying, browserKeeps: 30 },
  '/api/posts': { ask: latestPosts, browserKeeps: 300 },
};

// Answers the request if it is one of the questions above. Returns whether it did.
export async function answerApi(urlPath, method, response) {
  const question = questions[urlPath];
  if (!question) return false;
  let answer = null;
  try {
    answer = await question.ask();
  } catch {
    // Treated like a service that is down.
  }
  if (!answer) {
    response.writeHead(204, { 'Cache-Control': 'no-store' });
    response.end();
    return true;
  }
  response.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': `public, max-age=${question.browserKeeps}`,
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(method === 'HEAD' ? undefined : JSON.stringify(answer));
  return true;
}
