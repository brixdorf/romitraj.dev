// The OpenPGP public key: reads its facts (fingerprint, key ID, kind, expiry) for the Contact card
// on the About page, and publishes it twice during every build: as the armored text file people
// download, and in the Web Key Directory (WKD), the folder under /.well-known/openpgpkey/ where
// email programs look for the key of an address, so that "gpg --locate-external-keys
// hi@romitraj.dev" finds it. Only Node's built-in modules; nothing here is ever sent to a visitor
// but the key itself.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { publishFile } from './downloads.mjs';

// ---- Armor: the key as text, between BEGIN and END lines, in base64 ----

// The checksum armored keys may end with (a line starting with "="): CRC-24 from RFC 4880.
function crc24(bytes) {
  let crc = 0xb704ce;
  for (const byte of bytes) {
    crc ^= byte << 16;
    for (let bit = 0; bit < 8; bit++) {
      crc <<= 1;
      if (crc & 0x1000000) crc ^= 0x1864cfb;
    }
  }
  return crc & 0xffffff;
}

// Turns the armored text into the key's bytes, the same bytes "gpg --dearmor" gives.
export function dearmor(text) {
  const match =
    /-----BEGIN PGP PUBLIC KEY BLOCK-----\r?\n([\s\S]*?)-----END PGP PUBLIC KEY BLOCK-----/.exec(
      text,
    );
  if (!match) throw new Error('This is not an armored key: no BEGIN PGP PUBLIC KEY BLOCK line.');
  // Header lines ("Comment: ...") come first and end at the first blank line, if there are any.
  let lines = match[1].split(/\r?\n/).map((line) => line.trim());
  const blank = lines.indexOf('');
  if (blank !== -1 && lines.slice(0, blank).every((line) => line.includes(': ')))
    lines = lines.slice(blank + 1);
  lines = lines.filter(Boolean);
  const checksumLine = lines.find((line) => /^=[A-Za-z0-9+/]{4}$/.test(line));
  const bytes = Buffer.from(lines.filter((line) => line !== checksumLine).join(''), 'base64');
  if (
    checksumLine &&
    Buffer.from(checksumLine.slice(1), 'base64').readUIntBE(0, 3) !== crc24(bytes)
  )
    throw new Error('The key’s checksum does not match: the file is damaged.');
  return bytes;
}

// ---- Packets: the pieces a key is made of (RFC 9580, section 4) ----

function packets(bytes) {
  const found = [];
  let at = 0;
  while (at < bytes.length) {
    const first = bytes[at];
    if (!(first & 0x80)) throw new Error(`Not an OpenPGP packet at byte ${at}.`);
    let tag;
    let length;
    let start;
    if (first & 0x40) {
      // The new format: the tag, then a length of one, two or five bytes.
      tag = first & 0x3f;
      const octet = bytes[at + 1];
      if (octet < 192) [length, start] = [octet, at + 2];
      else if (octet < 224) [length, start] = [((octet - 192) << 8) + bytes[at + 2] + 192, at + 3];
      else if (octet === 255) [length, start] = [bytes.readUInt32BE(at + 2), at + 6];
      else throw new Error('Keys in pieces of unknown length are not supported.');
    } else {
      // The old format: tag and the size of the length share the first byte.
      tag = (first >> 2) & 0x0f;
      const size = [1, 2, 4][first & 0x03];
      if (!size) throw new Error('Packets of unknown length are not supported.');
      length = bytes.readUIntBE(at + 1, size);
      start = at + 1 + size;
    }
    found.push({ tag, body: bytes.subarray(start, start + length) });
    at = start + length;
  }
  return found;
}

// The subpackets of a version 4 signature that are covered by the signature itself.
function signedSubpackets(body) {
  const found = {};
  const end = 6 + body.readUInt16BE(4);
  let at = 6;
  while (at < end) {
    let length = body[at];
    if (length < 192) at += 1;
    else if (length < 255) [length, at] = [((length - 192) << 8) + body[at + 1] + 192, at + 2];
    else [length, at] = [body.readUInt32BE(at + 1), at + 5];
    found[body[at] & 0x7f] = body.subarray(at + 1, at + length);
    at += length;
  }
  return found;
}

const ed25519Oid = '2b06010401da470f01';
function algorithmName(key) {
  const algorithm = key[5];
  if (algorithm === 27) return 'Ed25519';
  if (algorithm === 28) return 'Ed448';
  if (algorithm === 22 && key.subarray(7, 7 + key[6]).toString('hex') === ed25519Oid)
    return 'Ed25519';
  if ([1, 2, 3].includes(algorithm)) return `RSA ${key.readUInt16BE(6)}`;
  return `algorithm ${algorithm}`;
}

const day = (seconds) => new Date(seconds * 1000).toISOString().slice(0, 10);

// The facts about the primary key, as gpg prints them: its fingerprint in groups of four, its long
// key ID, its kind, the days it was made and stops being valid (by its newest self-signature on a
// user ID), and its user IDs.
export function keyFacts(bytes) {
  const all = packets(bytes);
  const primary = all[0];
  if (primary?.tag !== 6 || primary.body[0] !== 4)
    throw new Error('This file does not start with a version 4 public key.');
  const fingerprint = createHash('sha1')
    .update(Buffer.from([0x99, primary.body.length >> 8, primary.body.length & 0xff]))
    .update(primary.body)
    .digest('hex')
    .toUpperCase();
  const created = primary.body.readUInt32BE(1);

  const userIds = [];
  let newest = null;
  for (const packet of all.slice(1)) {
    if (packet.tag === 14) break; // a subkey: what follows belongs to it
    if (packet.tag === 13) userIds.push(packet.body.toString('utf8'));
    // A version 4 certification of a user ID (signature types 0x10 to 0x13).
    if (
      packet.tag === 2 &&
      packet.body[0] === 4 &&
      packet.body[1] >= 0x10 &&
      packet.body[1] <= 0x13
    ) {
      const subpackets = signedSubpackets(packet.body);
      const made = subpackets[2]?.readUInt32BE(0) ?? 0;
      if (!newest || made >= newest.made) newest = { made, lasts: subpackets[9]?.readUInt32BE(0) };
    }
  }

  return {
    fingerprint: fingerprint.match(/.{4}/g).join(' '),
    keyId: fingerprint.slice(-16),
    algorithm: algorithmName(primary.body),
    created: day(created),
    expires: newest?.lasts ? day(created + newest.lasts) : null,
    userIds,
  };
}

// ---- The Web Key Directory ----

// The file name WKD gives an address: the part before the @, in lowercase, hashed with SHA-1 and
// written in z-base-32 (an alphabet chosen to be easy to read aloud).
const zBase32 = 'ybndrfg8ejkmcpqxot1uwisza345h769';
export function wkdHash(localPart) {
  const digest = createHash('sha1').update(localPart.toLowerCase()).digest();
  let bits = '';
  for (const byte of digest) bits += byte.toString(2).padStart(8, '0');
  return bits
    .match(/.{5}/g)
    .map((five) => zBase32[parseInt(five, 2)])
    .join('');
}

// Publishes the key into the built site: the armored file at the site's root (for the download
// link), and the binary key and an empty policy file under /.well-known/openpgpkey/ (the "direct"
// WKD method). Returns the download's address and the key's facts. Stops the build if the key
// does not carry the email address it is published for.
export function publishKey({ source, email, outDir }) {
  const file = source instanceof URL ? fileURLToPath(source) : source;
  const bytes = dearmor(fs.readFileSync(file, 'utf8'));
  const facts = keyFacts(bytes);
  if (!facts.userIds.some((id) => id.toLowerCase().includes(`<${email.toLowerCase()}>`)))
    throw new Error(
      `The OpenPGP key has no user ID for ${email}, so it cannot be published for it.`,
    );
  const url = publishFile(file, outDir, path.basename(file));
  const folder = path.join(outDir, '.well-known', 'openpgpkey');
  fs.mkdirSync(path.join(folder, 'hu'), { recursive: true });
  fs.writeFileSync(path.join(folder, 'hu', wkdHash(email.split('@')[0])), bytes);
  fs.writeFileSync(path.join(folder, 'policy'), '');
  return { url, facts };
}
