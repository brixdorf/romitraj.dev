// Looks for dead links. Without an address it builds this site, serves it on this computer and
// checks every link, picture, script and stylesheet on every page, inside the site and out. With
// an address (pnpm run links https://blog.romitraj.dev) it does the same for that website as it
// is live. It lists the dead ones and the pages they are on, then the ones it could not be sure
// about (sites that turn programs away), which are worth opening in a browser.
// Run it with: pnpm run links        or: pnpm run links https://example.org
import fs from 'node:fs';
import path from 'node:path';
import { checkSite } from './lib/links.mjs';
import { root, siteDir, buildSite, startServer } from './lib/site.mjs';

const given = process.argv[2];
let start = given;
let options = {};
let server;

if (given) {
  if (!/^https?:\/\//i.test(given)) {
    console.log(
      `"${given}" is not a web address. Give a full one, such as https://blog.romitraj.dev`,
    );
    process.exit(2);
  }
} else {
  console.log('Building the site...');
  await buildSite();
  server = await startServer(4380);
  start = server.address + '/';
  // Every built page is read, also one nothing links to (the page for a missing address). Links
  // to the live address (romitraj.dev) are checked against this build, so a page that is not
  // live yet counts as there.
  const walk = (dir) =>
    fs
      .readdirSync(dir, { withFileTypes: true })
      .flatMap((entry) =>
        entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)],
      );
  const pages = walk(siteDir)
    .filter((file) => file.endsWith('.html'))
    .map(
      (file) =>
        '/' +
        path
          .relative(siteDir, file)
          .split(path.sep)
          .join('/')
          .replace(/index\.html$/, ''),
    );
  const site = JSON.parse(fs.readFileSync(path.join(root, 'src', '_data', 'site.json'), 'utf8'));
  options = { alsoRead: pages.map((page) => server.address + page), sameAs: [site.url] };
}

console.log(`Checking ${given || 'the built site'}...`);
let shown = 0;
const report = await checkSite(start, {
  ...options,
  onProgress: (count) => {
    if (count - shown >= 50) {
      shown = count;
      console.log(`  ${count} addresses checked`);
    }
  },
});
server?.stop();

const where = (address) => (server ? address.replace(server.address, '') || '/' : address);
// The pages a link is on: all of them, or the first three and a count when there are many.
const pagesOf = (on) => {
  const pages = on.map(where).sort();
  return pages.length > 4
    ? `${pages.slice(0, 3).join(', ')} and ${pages.length - 3} more pages`
    : pages.join(', ');
};
const list = (links) =>
  links
    .map((link) => `  ${where(link.url)}  (${link.reason})\n      on ${pagesOf(link.on)}`)
    .join('\n');

console.log(`\n${report.links} addresses on ${report.pages} pages.`);
if (report.unsure.length)
  console.log(
    `\nCould not be sure (${report.unsure.length}). These sites turned the checker away or had trouble; open them in a browser:\n${list(report.unsure)}`,
  );
if (report.dead.length) {
  console.log(`\nDEAD LINKS (${report.dead.length}):\n${list(report.dead)}`);
  process.exitCode = 1;
} else {
  console.log('\nNo dead links.');
}
