// The weather for the status ticker: the temperature and a word or two for the sky, from
// Open-Meteo (free for non-commercial sites, no key). The place comes from src/_data/site.json
// and the words from src/_data/weather.json. An answer is kept for 15 minutes.
// If Open-Meteo cannot be reached, the answer is nothing and the ticker hides its weather piece.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { remembered } from './cache.js';

const data = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), 'src', '_data');
const site = JSON.parse(fs.readFileSync(path.join(data, 'site.json'), 'utf8'));
const words = JSON.parse(fs.readFileSync(path.join(data, 'weather.json'), 'utf8')).conditions;

async function ask() {
  // WEATHER_URL is only set by npm run check, which points it at a stand-in on this computer.
  const url = new URL(process.env.WEATHER_URL || 'https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({ latitude: site.latitude, longitude: site.longitude, current: 'temperature_2m,weather_code', timezone: site.timeZone });
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) return null;
  const now = (await response.json()).current;
  if (typeof now?.temperature_2m !== 'number') return null;
  // "weather_code" is a number from a standard list; a number missing from weather.json gives no word.
  return { temperature: Math.round(now.temperature_2m), condition: words[now.weather_code] || '' };
}

export const weather = remembered(ask, { goodFor: 15 * 60 * 1000, retryAfter: 60 * 1000 });
