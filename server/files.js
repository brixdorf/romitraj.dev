// How the server sends one file from the built site: its type, how long browsers and Cloudflare
// may keep it, whether a PDF opens in the browser, and the Web Key Directory's extra headers.
import path from 'node:path';
import { wkdHeaders } from './wkd.js';

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
  '.jxl': 'image/jxl',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.pdf': 'application/pdf',
  '.asc': 'application/pgp-keys',
  '.woff2': 'font/woff2',
};

export const typeOf = (filePath) =>
  types[path.extname(filePath).toLowerCase()] || 'application/octet-stream';

// The headers for the file "filePath" (by default the address itself), asked for at "urlPath"
// with "search" (the part of the address from "?"), "size" bytes long, last changed at "mtimeMs".
// - A file asked for with a fingerprint ("?v=...", the stylesheet, the scripts, the pictures)
//   may be kept for an hour: a changed file gets a new fingerprint, so a new address.
// - Anything else (the pages, the resume, the key) has a plain address that never changes, so
//   browsers and Cloudflare must check with the server each time ("no-cache"). The ETag lets them
//   do that cheaply: an unchanged file is answered "not modified", with no body.
// - A PDF opens in the browser ("inline") under its own name, instead of downloading at once.
export function fileHeaders({ urlPath, filePath = urlPath, search = '', size, mtimeMs }) {
  const fingerprinted = /[?&]v=/.test(search);
  const headers = {
    'Content-Type': typeOf(filePath),
    'Content-Length': size,
    'Cache-Control': fingerprinted ? 'public, max-age=3600' : 'no-cache',
    ETag: `"${size.toString(16)}-${Math.floor(mtimeMs).toString(16)}"`,
    'X-Content-Type-Options': 'nosniff',
  };
  if (path.extname(filePath).toLowerCase() === '.pdf')
    headers['Content-Disposition'] = `inline; filename="${path.basename(filePath)}"`;
  return { ...headers, ...wkdHeaders(urlPath) };
}

// Whether the browser already holds this version of the file (its If-None-Match header names
// the file's ETag), so the server can answer 304 "not modified" with no body.
export function isUnchanged(requestHeaders, etag) {
  const held = requestHeaders['if-none-match'];
  return Boolean(held) && held.split(',').some((tag) => tag.trim() === etag);
}
