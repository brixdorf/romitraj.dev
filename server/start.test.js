// Tests how the live server is started. Railpack's finished image has Node.js but no pnpm, so
// railpack.json must start the server with node itself, the same file "pnpm start" runs here.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vite-plus/test';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (name) => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));

describe('the live start command', () => {
  const start = read('railpack.json').deploy?.startCommand ?? '';

  it('runs node directly, never a package manager', () => {
    expect(start).toMatch(/^node /);
    expect(start).not.toMatch(/\b(pnpm|npm|npx|corepack)\b/);
  });

  it('is the same command as the start script', () => {
    expect(start).toBe(read('package.json').scripts.start);
  });

  it('names a file that exists', () => {
    expect(fs.existsSync(path.join(root, start.split(' ')[1]))).toBe(true);
  });
});
