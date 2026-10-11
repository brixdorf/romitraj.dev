// What is playing on Spotify, for the status ticker: the track playing right now, or the last one
// played if nothing is. An answer is kept for 30 seconds, so however many people have the site
// open, Spotify is asked at most a few times a minute.
//
// It needs three values from .env (locally) or the host's settings (live): SPOTIFY_CLIENT_ID,
// SPOTIFY_CLIENT_SECRET and SPOTIFY_REFRESH_TOKEN. "npm run spotify" gets the third one.
// With the refresh token, Spotify hands out a short-lived access token (an hour or so), and with
// that the two questions below can be asked. None of the three values, and neither token, is
// ever sent to a visitor.
//
// If anything is missing or fails, the answer is nothing and the ticker hides its piece.
import { remembered } from './cache.js';

// The two addresses are only changed by npm run check, which points them at a stand-in on this computer.
const tokenUrl = () => process.env.SPOTIFY_TOKEN_URL || 'https://accounts.spotify.com/api/token';
const apiUrl = () => process.env.SPOTIFY_API_URL || 'https://api.spotify.com/v1';
const patience = () => AbortSignal.timeout(5000);

let access = { token: '', until: 0 };
// Spotify may hand out a newer refresh token along with an access token. It is used for as long
// as this server keeps running.
let newerRefreshToken = '';
// After Spotify refuses the refresh token, it is not asked again for an hour.
let refusedUntil = 0;

async function accessToken() {
  if (Date.now() < access.until) return access.token;
  const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret, SPOTIFY_REFRESH_TOKEN: saved } = process.env;
  if (!id || !secret || !saved || Date.now() < refusedUntil) return null;
  const response = await fetch(tokenUrl(), {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: newerRefreshToken || saved }),
    signal: patience(),
  });
  const answer = await response.json().catch(() => ({}));
  if (!response.ok || !answer.access_token) {
    if (answer.error === 'invalid_grant') {
      refusedUntil = Date.now() + 60 * 60 * 1000;
      console.error('Spotify no longer accepts the refresh token (they stop working after 6 months). Run "npm run spotify" and update SPOTIFY_REFRESH_TOKEN. The now-playing line stays hidden until then.');
    }
    return null;
  }
  if (answer.refresh_token) newerRefreshToken = answer.refresh_token;
  access = { token: answer.access_token, until: Date.now() + (Number(answer.expires_in || 3600) - 60) * 1000 };
  return access.token;
}

// The few facts the ticker shows about a track. The link must be a real Spotify address.
function describe(track, playing) {
  const url = track?.external_urls?.spotify;
  if (!track?.name || typeof url !== 'string' || !url.startsWith('https://open.spotify.com/')) return null;
  return { playing, title: track.name, artists: (track.artists || []).map((artist) => artist.name).filter(Boolean), url };
}

async function ask() {
  const token = await accessToken();
  if (!token) return null;
  const get = (question) => fetch(apiUrl() + question, { headers: { Authorization: `Bearer ${token}` }, signal: patience() });

  const now = await get('/me/player/currently-playing');
  if (now.status === 401) access.until = 0;
  if (now.status === 200) {
    const playing = await now.json();
    if (playing.is_playing && playing.item?.type === 'track') return describe(playing.item, true);
  } else if (now.status !== 204) {
    return null;
  }

  // Nothing is playing (Spotify answers 204 for that), or it is paused, or it is a podcast: the last track played.
  const lately = await get('/me/player/recently-played?limit=1');
  if (!lately.ok) return null;
  return describe((await lately.json()).items?.[0]?.track, false);
}

export const nowPlaying = remembered(ask, { goodFor: 30 * 1000, retryAfter: 60 * 1000 });
