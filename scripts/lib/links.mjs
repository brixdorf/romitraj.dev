// The dead-link checker behind "pnpm run links": reads every page of a website, collects every
// link, picture, script and stylesheet address in them, asks for each one once, and sorts the
// answers into fine, dead and unsure. Uses only Node's built-in fetch.

// The attributes that hold an address, and the <meta> tags whose content is one (the preview card).
const addressAttribute =
  /\s(href|src|srcset|content)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi;
const previewMeta = /^(og:image|og:url|twitter:image)$/i;
const tag = /<(a|link|img|script|source|iframe|video|audio|meta)\b[^>]*>/gi;
const skipped = /^(mailto:|tel:|data:|javascript:|blob:|about:)/i;

const decode = (text) =>
  text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

// Every address a page points to, as full addresses (relative ones resolved against the page),
// each once. Jumps to a section keep their "#section"; email, phone and script links are left out.
export function linksIn(html, pageUrl) {
  const found = new Set();
  const add = (raw) => {
    const address = decode(raw.trim());
    if (!address || skipped.test(address)) return;
    try {
      found.add(new URL(address, pageUrl).href);
    } catch {
      // Not an address at all; nothing to check.
    }
  };
  for (const [whole, name] of html.replace(/<!--[\s\S]*?-->/g, '').matchAll(tag)) {
    const attributes = {};
    for (const [, attribute, double, single, bare] of whole.matchAll(addressAttribute))
      attributes[attribute.toLowerCase()] = double ?? single ?? bare;
    if (name.toLowerCase() === 'meta') {
      const kind = /\s(?:property|name)\s*=\s*["']?([^"'\s>]+)/i.exec(whole)?.[1] || '';
      if (previewMeta.test(kind) && attributes.content) add(attributes.content);
      continue;
    }
    if (attributes.href !== undefined) add(attributes.href);
    if (attributes.src !== undefined) add(attributes.src);
    if (attributes.srcset)
      for (const candidate of attributes.srcset.split(',')) add(candidate.trim().split(/\s+/)[0]);
  }
  return [...found];
}

// The places on a page a link can jump to ("#the-problem"): every id, and the old name="" anchors.
export function idsIn(html) {
  return new Set(
    [...html.matchAll(/\s(?:id|name)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi)].map(
      ([, double, single, bare]) => double ?? single ?? bare,
    ),
  );
}

const reasons = { 404: '404 Not Found', 410: '410 Gone' };
const missingServer = {
  ENOTFOUND: 'no such website (the name does not exist)',
  EAI_AGAIN: 'no such website (the name could not be looked up)',
  ECONNREFUSED: 'nothing answers at that address',
  ECONNRESET: 'the connection was cut',
};

// What an answer means: "fine", "dead" (the page is not there), or "unsure" (the other site turned
// a program away, had a moment's trouble or was too slow; worth opening in a browser). On the site
// being checked itself every failure counts as dead: its own server does not turn programs away.
export function judge({ status, error, headers }, { inside = false } = {}) {
  if (error) {
    const code = error.code || error.cause?.code;
    if (missingServer[code]) return { verdict: 'dead', reason: missingServer[code] };
    if (error.name === 'TimeoutError' || error.name === 'AbortError')
      return { verdict: inside ? 'dead' : 'unsure', reason: 'no answer in time' };
    return {
      verdict: inside ? 'dead' : 'unsure',
      reason: `could not connect (${code || error.message})`,
    };
  }
  if (status < 400) return { verdict: 'fine', reason: String(status) };
  if (inside || status === 404 || status === 410)
    return { verdict: 'dead', reason: reasons[status] || `answered ${status}` };
  if (headers?.get?.('cf-mitigated') === 'challenge')
    return { verdict: 'unsure', reason: `${status}, stopped by a bot check` };
  if (status === 401 || status === 403 || status === 429 || status === 999)
    return { verdict: 'unsure', reason: `${status}, the site turns programs away` };
  if (status >= 500) return { verdict: 'unsure', reason: `${status}, the site had trouble` };
  return { verdict: 'unsure', reason: `answered ${status}` };
}

// Looks like a web page, so its links should be read too.
const isPage = (response) =>
  /text\/html|application\/xhtml/i.test(response.headers.get('content-type') || '');

// Checks a whole website. Starting from "start", reads every page on the same website (the same
// origin), checks every address any page points to, and returns:
//   { pages, links, dead: [{ url, reason, on: [pages] }], unsure: [...] }
// Options:
//   alsoRead: more pages to read even if nothing links to them (their own answer is not judged)
//   sameAs:   other origins that mean this same site (the live address while checking a local
//             copy); their links are checked against "start" instead
//   timeout:  how long to wait for one answer, in milliseconds
//   perHost:  how many requests to send to one website at a time
//   onProgress: called with the number of addresses checked so far
export async function checkSite(
  start,
  {
    alsoRead = [],
    sameAs = [],
    timeout = 15000,
    perHost = 3,
    onProgress = () => {},
    userAgent = 'Mozilla/5.0 (compatible; link-checker)',
  } = {},
) {
  const origin = new URL(start).origin;
  const aliases = sameAs.map((address) => new URL(address).origin);
  const local = (address) => {
    const url = new URL(address);
    if (aliases.includes(url.origin))
      return new URL(url.pathname + url.search + url.hash, origin).href;
    return url.href;
  };
  const inside = (address) => new URL(address).origin === origin;

  const linkedFrom = new Map(); // address (with #section) -> pages that point to it
  const answers = new Map(); // address without #section -> { verdict, reason, ids? }
  const pagesRead = new Set();
  const queues = new Map(); // host -> { running, waiting: [] }

  // Runs one request at a time per website, at most "perHost" together.
  const politely = (address, task) =>
    new Promise((resolve, reject) => {
      const host = new URL(address).host;
      const queue = queues.get(host) || { running: 0, waiting: [] };
      queues.set(host, queue);
      const run = () => {
        queue.running++;
        task()
          .then(resolve, reject)
          .finally(() => {
            queue.running--;
            queue.waiting.shift()?.();
          });
      };
      if (queue.running < perHost) run();
      else queue.waiting.push(run);
    });

  const request = (address, method) =>
    fetch(address, {
      method,
      redirect: 'follow',
      signal: AbortSignal.timeout(timeout),
      headers: { 'user-agent': userAgent, accept: 'text/html,application/xhtml+xml,*/*;q=0.8' },
    });

  // Asks for one address (once, however many pages point to it). Pages on this site are read
  // whole, for their links and the places they can jump to. Elsewhere, a quick HEAD request is
  // tried first, and a full one when that is refused (many servers answer HEAD wrongly).
  const ask = (address, { readAnyway = false } = {}) => {
    if (!answers.has(address))
      answers.set(
        address,
        politely(address, async () => {
          const own = inside(address);
          let response;
          try {
            if (!own) {
              response = await request(address, 'HEAD');
              if (response.ok) return judge({ status: response.status });
            }
            response = await request(address, 'GET');
          } catch {
            try {
              // One more try, in case it was a moment's trouble.
              response = await request(address, 'GET');
            } catch (again) {
              return judge({ error: again }, { inside: own });
            }
          }
          const answer = judge(
            { status: response.status, headers: response.headers },
            { inside: own },
          );
          if (own && (response.ok || readAnyway) && isPage(response)) {
            const finalAddress = response.url || address;
            const html = await response.text();
            answer.ids = idsIn(html);
            if (inside(finalAddress) && !pagesRead.has(finalAddress)) {
              pagesRead.add(finalAddress);
              for (const link of linksIn(html, finalAddress)) follow(local(link), finalAddress);
            }
          } else {
            await response.body?.cancel().catch(() => {});
          }
          onProgress(answers.size);
          return answer;
        }),
      );
    return answers.get(address);
  };

  const pending = new Set();
  const follow = (link, page) => {
    if (!linkedFrom.has(link)) linkedFrom.set(link, new Set());
    linkedFrom.get(link).add(page);
    const task = ask(link.split('#')[0]);
    pending.add(task);
  };

  const first = new URL(start).href;
  linkedFrom.set(first, new Set(['(the address you gave)']));
  pending.add(ask(first));
  for (const page of alsoRead) pending.add(ask(page, { readAnyway: true }));
  // New links keep arriving while pages are read; wait until no request is left.
  while (pending.size) {
    const batch = [...pending];
    pending.clear();
    await Promise.all(batch);
  }

  const dead = [];
  const unsure = [];
  for (const [link, pages] of linkedFrom) {
    const [address, section] = link.split('#');
    const answer = await answers.get(address);
    let verdict = answer.verdict;
    let reason = answer.reason;
    // A jump to a section of a page on this site must find that section.
    if (
      verdict === 'fine' &&
      section &&
      inside(address) &&
      answer.ids &&
      !answer.ids.has(decodeURIComponent(section))
    ) {
      verdict = 'dead';
      reason = `the page has no section "#${section}"`;
    }
    const entry = { url: link, reason, on: [...pages] };
    if (verdict === 'dead') dead.push(entry);
    else if (verdict === 'unsure') unsure.push(entry);
  }
  const byAddress = (a, b) => a.url.localeCompare(b.url);
  return {
    pages: pagesRead.size,
    links: linkedFrom.size,
    dead: dead.sort(byAddress),
    unsure: unsure.sort(byAddress),
  };
}
