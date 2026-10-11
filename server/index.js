// Production server: serves the built site from _site/, and answers the two small questions the
// page's widgets ask (the weather and what is playing: see api.js). Uses only Node's built-in modules.
// Start it with: npm start
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { answerApi } from './api.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const siteDir = path.join(root, '_site');

try {
  process.loadEnvFile(path.join(root, '.env'));
} catch {
  // No .env file. That is fine: on the live server the values come from the host's settings.
}
const port = Number(process.env.PORT) || 3000;

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.woff2': 'font/woff2',
};

// Turns a URL path into a file inside baseDir, or null if there is no such file.
// The second line refuses any path that tries to climb out of baseDir.
function findFile(baseDir, urlPath) {
  const filePath = path.join(baseDir, urlPath);
  if (filePath !== baseDir && !filePath.startsWith(baseDir + path.sep)) return null;
  const stats = fs.statSync(filePath, { throwIfNoEntry: false });
  if (!stats) return null;
  if (stats.isFile()) return { filePath, size: stats.size };
  const indexPath = path.join(filePath, 'index.html');
  const indexStats = fs.statSync(indexPath, { throwIfNoEntry: false });
  return indexStats?.isFile() ? { filePath: indexPath, size: indexStats.size, isIndex: true } : null;
}

function send(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(body);
}

const server = http.createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') return send(response, 405, 'Method not allowed');

  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    return send(response, 400, 'Bad request');
  }
  if (urlPath.includes('\0')) return send(response, 400, 'Bad request');

  // The widgets' questions come first; everything else is a file from the built site.
  if (await answerApi(urlPath, request.method, response)) return;

  const found = findFile(siteDir, urlPath);
  if (!found) return send(response, 404, 'Not found');

  // A folder asked for without its closing slash: send the browser to the proper address.
  if (found.isIndex && !urlPath.endsWith('/')) {
    response.writeHead(301, { Location: urlPath + '/' });
    return response.end();
  }

  const extension = path.extname(found.filePath).toLowerCase();
  response.writeHead(200, {
    'Content-Type': types[extension] || 'application/octet-stream',
    'Content-Length': found.size,
    'Cache-Control': extension === '.html' ? 'no-cache' : 'public, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
  });
  if (request.method === 'HEAD') return response.end();
  fs.createReadStream(found.filePath).pipe(response);
});

server.listen(port, () => {
  console.log(`Site running at http://localhost:${port}`);
});
