// Publishes a file that visitors download as it is (the resume, the OpenPGP key): copies it into
// the built site and gives its address with a fingerprint, so a changed file is fetched afresh.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

// Copies "source" to "published" (a path inside the built site, such as "resume.pdf") and returns
// its address with a fingerprint: "/resume.pdf?v=1a2b3c4d".
export function publishFile(source, outDir, published) {
  const content = fs.readFileSync(source);
  const target = path.join(outDir, published);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
  const version = createHash('sha256').update(content).digest('hex').slice(0, 8);
  return `/${published}?v=${version}`;
}
