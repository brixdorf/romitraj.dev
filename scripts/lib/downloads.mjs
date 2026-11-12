// Publishes a file that visitors open or download as it is (the resume, the OpenPGP key): copies
// it into the built site and gives its plain address. Its address never changes, so the server
// tells browsers and Cloudflare to check for a newer version each time (server/files.js).
import fs from 'node:fs';
import path from 'node:path';

// Copies "source" to "published" (a path inside the built site, such as "resume.pdf") and returns
// its address: "/resume.pdf".
export function publishFile(source, outDir, published) {
  const target = path.join(outDir, published);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  return `/${published}`;
}
