// A stand-in for Open-Meteo and Spotify that runs on this computer, for npm run check.
// The check starts the site's server with the addresses and keys below, so that every page it
// opens gets the same weather and the same track on every run, nothing is asked of the real
// services, and the real keys in .env are never used.
// It can also misbehave on request, to test that the widgets hide quietly:
//   spotify: "playing" (a track is playing), "idle" (nothing is playing), "paused", "expired"
//            (the refresh token is refused) or "down" (every answer is an error)
//   weather: "up" or "down"
import http from 'node:http';

export const pretendKeys = { id: 'pretend-id', secret: 'pretend-secret', refresh: 'pretend-refresh-token', access: 'pretend-access-token' };
export const pretendWeather = { temperature: 23, condition: 'partly cloudy' };
export const pretendTracks = {
  playing: { title: 'Pretend Song', artists: ['The Stand-Ins', 'Nobody'], url: 'https://open.spotify.com/track/pretend-playing' },
  lately: { title: 'Earlier Song', artists: ['Somebody'], url: 'https://open.spotify.com/track/pretend-earlier' },
};
const track = ({ title, artists, url }) => ({ type: 'track', name: title, artists: artists.map((name) => ({ name })), external_urls: { spotify: url } });

export async function startPretend(port, { spotify = 'playing', weather = 'up' } = {}) {
  // How many times each address was asked, so a test can confirm that answers are being kept.
  const counts = { weather: 0, token: 0, playing: 0, lately: 0 };
  const server = http.createServer((request, response) => {
    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => {
      const url = new URL(request.url, 'http://127.0.0.1');
      const send = (status, value) => {
        response.writeHead(status, { 'Content-Type': 'application/json' });
        response.end(value === undefined ? undefined : JSON.stringify(value));
      };
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
    // What the site's server is started with, in place of the real addresses and keys.
    env: { WEATHER_URL: `${address}/weather`, SPOTIFY_TOKEN_URL: `${address}/token`, SPOTIFY_API_URL: `${address}/v1`, SPOTIFY_CLIENT_ID: pretendKeys.id, SPOTIFY_CLIENT_SECRET: pretendKeys.secret, SPOTIFY_REFRESH_TOKEN: pretendKeys.refresh },
    stop: () => new Promise((resolve) => server.close(resolve)),
  };
}

// The same settings pointed at a port where nothing is listening: both services unreachable.
export const unreachable = (port) => ({ WEATHER_URL: `http://127.0.0.1:${port}/weather`, SPOTIFY_TOKEN_URL: `http://127.0.0.1:${port}/token`, SPOTIFY_API_URL: `http://127.0.0.1:${port}/v1`, SPOTIFY_CLIENT_ID: pretendKeys.id, SPOTIFY_CLIENT_SECRET: pretendKeys.secret, SPOTIFY_REFRESH_TOKEN: pretendKeys.refresh });
