// A stand-in for Open-Meteo, Spotify and the blog's feed that runs on this computer, for npm run
// check (and npm run speed). The check builds the site and starts its server with the addresses
// and keys below, so that every page it opens gets the same weather, the same track and the same
// blog posts on every run, nothing is asked of the real services, and the real keys in .env are
// never used.
// It can also misbehave on request, to test that the widgets hide quietly:
//   spotify: "playing" (a track is playing), "idle" (nothing is playing), "paused", "expired"
//            (the refresh token is refused) or "down" (every answer is an error)
//   weather: "up" or "down"
//   blog:    "same" (the posts the site is built with), "newer" (one more post, on top),
//            "down" (an error) or "broken" (an answer that is not a feed)
// "setMood" changes its mood while it runs.
import http from 'node:http';

export const pretendKeys = { id: 'pretend-id', secret: 'pretend-secret', refresh: 'pretend-refresh-token', access: 'pretend-access-token' };
export const pretendWeather = { temperature: 23, condition: 'partly cloudy' };
export const pretendTracks = {
  playing: { title: 'Pretend Song', artists: ['The Stand-Ins', 'Nobody'], url: 'https://open.spotify.com/track/pretend-playing' },
  lately: { title: 'Earlier Song', artists: ['Somebody'], url: 'https://open.spotify.com/track/pretend-earlier' },
};
// The blog's posts in the "same" feed, newest first, and the one more post of the "newer" feed.
// Their titles differ in length, so a list that changes can also change height, and the new
// post's description is longer, so the About page's piece about the latest post grows too.
const post = (slug, title, day, description = 'A stand-in.') => ({ title, url: `https://blog.romitraj.dev/blog/${slug}`, published: day, description });
export const pretendPosts = [
  post('stand-in-five', 'A stand-in post for the check', '2026-09-14'),
  post('stand-in-four', 'Another stand-in, with a title that runs on for quite a while longer', '2026-07-29'),
  post('stand-in-three', 'Three', '2026-03-30'),
  post('stand-in-two', 'A middling stand-in title', '2026-03-18'),
  post('stand-in-one', 'The first stand-in', '2026-03-16'),
];
export const pretendNewPost = post('stand-in-new', 'A brand new stand-in post, long enough to need more lines than the others', '2026-10-01', 'A stand-in with a longer description than the others, so that the piece about it on the About page needs more room than the one it replaces, on every width.');
const feed = (posts) => `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Stand-in blog</title><link>https://blog.romitraj.dev/</link>
${posts.map(({ title, url, published, description }) => `<item><title>${title}</title><link>${url}</link><pubDate>${new Date(published + 'T00:00:00Z').toUTCString()}</pubDate><description>${description}</description></item>`).join('')}
</channel></rss>
`;

const track = ({ title, artists, url }) => ({ type: 'track', name: title, artists: artists.map((name) => ({ name })), external_urls: { spotify: url } });

export async function startPretend(port, startMood = {}) {
  const mood = { spotify: 'playing', weather: 'up', blog: 'same', ...startMood };
  // How many times each address was asked, so a test can confirm that answers are being kept.
  const counts = { weather: 0, token: 0, playing: 0, lately: 0, feed: 0 };
  const server = http.createServer((request, response) => {
    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => {
      const url = new URL(request.url, 'http://127.0.0.1');
      const send = (status, value) => {
        response.writeHead(status, { 'Content-Type': 'application/json' });
        response.end(value === undefined ? undefined : JSON.stringify(value));
      };
      const { spotify, weather, blog } = mood;
      if (url.pathname === '/rss.xml') {
        counts.feed++;
        if (blog === 'down') return send(503, { error: true });
        response.writeHead(200, { 'Content-Type': 'application/rss+xml; charset=utf-8' });
        if (blog === 'broken') return response.end('<html><body>Not a feed</body></html>');
        return response.end(feed(blog === 'newer' ? [pretendNewPost, ...pretendPosts] : pretendPosts));
      }
      if (url.pathname === '/weather') {
        counts.weather++;
        if (weather === 'down') return send(503, { error: true });
        // 23.4 degrees and code 2, which weather.json calls "partly cloudy".
        return send(200, { current: { time: '2026-01-01T12:00', interval: 900, temperature_2m: 23.4, weather_code: 2 } });
      }
      if (url.pathname === '/token') {
        counts.token++;
        if (spotify === 'down') return send(503, { error: 'server_error' });
        const rightKeys = request.headers.authorization === `Basic ${Buffer.from(`${pretendKeys.id}:${pretendKeys.secret}`).toString('base64')}`;
        const form = new URLSearchParams(body);
        if (!rightKeys) return send(400, { error: 'invalid_client' });
        if (spotify === 'expired' || form.get('grant_type') !== 'refresh_token' || form.get('refresh_token') !== pretendKeys.refresh) return send(400, { error: 'invalid_grant', error_description: 'Refresh token revoked' });
        return send(200, { access_token: pretendKeys.access, token_type: 'Bearer', expires_in: 3600, scope: 'user-read-currently-playing user-read-recently-played' });
      }
      if (url.pathname.startsWith('/v1/')) {
        if (spotify === 'down') return send(503, { error: { status: 503 } });
        if (request.headers.authorization !== `Bearer ${pretendKeys.access}`) return send(401, { error: { status: 401, message: 'Invalid access token' } });
        if (url.pathname === '/v1/me/player/currently-playing') {
          counts.playing++;
          if (spotify === 'idle') return send(204);
          return send(200, { is_playing: spotify !== 'paused', currently_playing_type: 'track', item: track(pretendTracks.playing) });
        }
        if (url.pathname === '/v1/me/player/recently-played') {
          counts.lately++;
          return send(200, { items: [{ track: track(pretendTracks.lately), played_at: '2026-01-01T11:55:00Z' }] });
        }
      }
      send(404, { error: 'not found' });
    });
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  const address = `http://127.0.0.1:${port}`;
  return {
    counts,
    setMood: (change) => Object.assign(mood, change),
    // What the site's server is started with, in place of the real addresses and keys.
    env: { BLOG_FEED_URL: `${address}/rss.xml`, WEATHER_URL: `${address}/weather`, SPOTIFY_TOKEN_URL: `${address}/token`, SPOTIFY_API_URL: `${address}/v1`, SPOTIFY_CLIENT_ID: pretendKeys.id, SPOTIFY_CLIENT_SECRET: pretendKeys.secret, SPOTIFY_REFRESH_TOKEN: pretendKeys.refresh },
    stop: () => new Promise((resolve) => server.close(resolve)),
  };
}

// The same settings pointed at a port where nothing is listening: every service unreachable.
export const unreachable = (port) => ({ BLOG_FEED_URL: `http://127.0.0.1:${port}/rss.xml`, WEATHER_URL: `http://127.0.0.1:${port}/weather`, SPOTIFY_TOKEN_URL: `http://127.0.0.1:${port}/token`, SPOTIFY_API_URL: `http://127.0.0.1:${port}/v1`, SPOTIFY_CLIENT_ID: pretendKeys.id, SPOTIFY_CLIENT_SECRET: pretendKeys.secret, SPOTIFY_REFRESH_TOKEN: pretendKeys.refresh });
