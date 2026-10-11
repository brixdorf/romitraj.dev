// Gets the Spotify refresh token that the now-playing widget needs, and saves it in .env.
// Run it with: npm run spotify
//
// What it does: it opens Spotify's approval page in your browser. When you click Agree, Spotify
// sends the browser back to this script (which is listening on this computer only) with a
// one-time code. The script swaps that code for a refresh token and writes it into .env as
// SPOTIFY_REFRESH_TOKEN. The token is never printed.
//
// When to run it: once to begin with, and again every 6 months. Spotify's refresh tokens stop
// working 6 months after the approval, and using them does not extend that. After running it,
// copy the new SPOTIFY_REFRESH_TOKEN value from .env into the live site's settings as well
// (docs/guide.md, "Spotify").
//
// It needs SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env first, and the address below
// listed under "Redirect URIs" in the app's settings on developer.spotify.com/dashboard.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(root, '.env');
// Spotify does not accept "localhost": it has to be this computer's address written as numbers.
const host = '127.0.0.1';
const port = 8888;
const redirectUri = `http://${host}:${port}/callback`;
const authorizeUrl = 'https://accounts.spotify.com/authorize';
const tokenUrl = 'https://accounts.spotify.com/api/token';
const apiUrl = 'https://api.spotify.com/v1';
// What the site is allowed to read: the track playing now, and the tracks played lately.
const scopes = ['user-read-currently-playing', 'user-read-recently-played'];
const patienceMinutes = 5;

const stop = (message) => {
  console.error(`\n${message}\n`);
  process.exit(1);
};

if (!fs.existsSync(envFile)) stop('There is no .env file yet. Copy .env.example to .env, fill in SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET, and run this again.');
process.loadEnvFile(envFile);
const clientId = (process.env.SPOTIFY_CLIENT_ID || '').trim();
const clientSecret = (process.env.SPOTIFY_CLIENT_SECRET || '').trim();
if (!clientId || !clientSecret) stop('SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must both be filled in in .env. They are under Settings in your app on https://developer.spotify.com/dashboard.');

// Writes the token into .env, replacing an older one, with a note of when it will stop working.
function saveToken(token) {
  const text = fs.readFileSync(envFile, 'utf8');
  const newline = text.includes('\r\n') ? '\r\n' : '\n';
  const today = new Date();
  const until = new Date(today);
  until.setMonth(until.getMonth() + 6);
  const day = (date) => date.toISOString().slice(0, 10);
  const note = `# Spotify refresh token: obtained on ${day(today)}. It stops working about ${day(until)}. Run "npm run spotify" again before then.`;
  const lines = text.split(/\r?\n/).filter((line) => !line.startsWith('# Spotify refresh token: obtained on'));
  const at = lines.findIndex((line) => /^\s*SPOTIFY_REFRESH_TOKEN\s*=/.test(line));
  if (at === -1) {
    while (lines.length && lines[lines.length - 1] === '') lines.pop();
    lines.push('', note, `SPOTIFY_REFRESH_TOKEN=${token}`, '');
  } else {
    lines.splice(at, 1, note, `SPOTIFY_REFRESH_TOKEN=${token}`);
  }
  fs.writeFileSync(envFile, lines.join(newline));
  return day(until);
}

// Swaps the one-time code for tokens.
async function tokensFor(code) {
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
  });
  const answer = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Spotify refused the code (${response.status}${answer.error ? `, ${answer.error}` : ''}${answer.error_description ? `: ${answer.error_description}` : ''}). Check the Client ID and Client secret in .env.`);
  if (!answer.refresh_token) throw new Error('Spotify answered without a refresh token.');
  return answer;
}

// Asks Spotify for the last played track, to prove the new token works. Returns a line to print.
async function proof(accessToken) {
  const response = await fetch(`${apiUrl}/me/player/recently-played?limit=1`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (response.status === 403) return 'Spotify answered 403 to a test request. The account that owns the app needs Spotify Premium, and the account you approved with must be the owner or be listed under User Management in the app.';
  if (!response.ok) return `A test request to Spotify answered ${response.status}. The token was saved anyway.`;
  const track = (await response.json()).items?.[0]?.track;
  return track ? `It works. The last track played was "${track.name}" by ${track.artists.map((artist) => artist.name).join(', ')}.` : 'It works. (No recently played track to show.)';
}

const page = (title, words) => `<!doctype html><html lang="en"><meta charset="utf-8"><title>${title}</title><body style="font: 18px/1.5 system-ui, sans-serif; max-width: 34em; margin: 15vh auto; padding: 0 1em;"><h1 style="font-size: 1.4em;">${title}</h1><p>${words}</p></body></html>`;

// A random word sent along and expected back, so that only the answer to this run is accepted.
const state = crypto.randomBytes(16).toString('hex');
const approvalUrl = `${authorizeUrl}?${new URLSearchParams({ client_id: clientId, response_type: 'code', redirect_uri: redirectUri, scope: scopes.join(' '), state, show_dialog: 'true' })}`;

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, redirectUri);
  if (url.pathname !== '/callback') {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }
  const show = (status, title, words) => {
    response.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(page(title, words));
  };
  try {
    if (url.searchParams.get('state') !== state) throw new Error('The answer did not belong to this run. Close this tab and run "npm run spotify" again.');
    if (url.searchParams.get('error')) throw new Error(url.searchParams.get('error') === 'access_denied' ? 'You clicked Cancel on Spotify\'s page, so nothing was saved.' : `Spotify answered with an error: ${url.searchParams.get('error')}.`);
    const tokens = await tokensFor(url.searchParams.get('code'));
    const granted = (tokens.scope || '').split(' ');
    const missing = scopes.filter((scope) => !granted.includes(scope));
    if (missing.length) throw new Error(`Spotify did not grant: ${missing.join(', ')}.`);
    const until = saveToken(tokens.refresh_token);
    const result = await proof(tokens.access_token);
    show(200, 'Saved', 'The refresh token is in your .env file. You can close this tab and go back to the terminal.');
    console.log(`\nSaved SPOTIFY_REFRESH_TOKEN in .env (it is not shown here).\n${result}\nThis token stops working about ${until}. Run "npm run spotify" again before then.\n`);
    server.close();
    setTimeout(() => process.exit(0), 300);
  } catch (error) {
    show(400, 'Not saved', error.message);
    console.error(`\nNot saved: ${error.message}\n`);
    server.close();
    setTimeout(() => process.exit(1), 300);
  }
});

server.on('error', (error) => stop(error.code === 'EADDRINUSE' ? `Port ${port} is in use by another program. Close it and run this again.` : `Could not listen on ${redirectUri}: ${error.message}`));
server.listen(port, host, () => {
  console.log(`\nOpening Spotify's approval page in your browser. Log in if asked, then click Agree.\nIf no page opens, copy this address into your browser:\n\n${approvalUrl}\n\nWaiting for you (up to ${patienceMinutes} minutes)...`);
  // Open the default browser. If that fails, the address printed above still works.
  const opener = process.platform === 'win32' ? ['rundll32', ['url.dll,FileProtocolHandler', approvalUrl]] : process.platform === 'darwin' ? ['open', [approvalUrl]] : ['xdg-open', [approvalUrl]];
  try {
    spawn(opener[0], opener[1], { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
  } catch {
    // Nothing to do: the address is printed.
  }
});
setTimeout(() => stop(`No answer after ${patienceMinutes} minutes. Nothing was saved. Run "npm run spotify" again when you are ready.`), patienceMinutes * 60000).unref();
