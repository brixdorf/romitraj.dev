// Tests for reading the OpenPGP key (scripts/lib/pgp.mjs) and publishing it with the files that
// let "gpg --locate-external-keys" find it (the Web Key Directory), and for publishing a file
// with a fingerprint in its address (scripts/lib/downloads.mjs).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test';
import { dearmor, keyFacts, publishKey, wkdHash } from './pgp.mjs';
import { publishFile } from './downloads.mjs';

const keyFile = new URL('../../src/assets/files/romitraj-pgp-public.asc', import.meta.url);
const armored = fs.readFileSync(keyFile, 'utf8');
const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

describe('dearmor', () => {
  it('gives the same bytes as "gpg --dearmor" (and "gpg --export")', () => {
    expect(sha256(dearmor(armored))).toBe(
      'd6c74e33e9e65c95fffc9e78214c984f97fcd3172f386c30a06b3feb2d6340ad',
    );
  });

  it('refuses a key whose checksum does not match, as a copy damaged on the way would', () => {
    const lines = armored.split('\n');
    const at = lines.findIndex((line) => line.startsWith('mDME'));
    lines[at] = 'nDME' + lines[at].slice(4);
    expect(() => dearmor(lines.join('\n'))).toThrow(/checksum/);
  });

  it('refuses text that is not an armored public key', () => {
    expect(() => dearmor('hello')).toThrow(/PUBLIC KEY BLOCK/);
  });
});

describe('keyFacts', () => {
  it('reads the facts the Contact card shows, as gpg prints them', () => {
    expect(keyFacts(dearmor(armored))).toEqual({
      fingerprint: '010F 1F08 E31C AFDB 78E1 AEEC CF7E F21B CBB8 D0BB',
      keyId: 'CF7EF21BCBB8D0BB',
      algorithm: 'Ed25519',
      created: '2026-09-29',
      expires: '2029-09-28',
      userIds: ['Romit Raj Sahu <hi@romitraj.dev>'],
    });
  });
});

describe('wkdHash', () => {
  it('hashes the part of an address before the @ as the Web Key Directory asks', () => {
    expect(wkdHash('hi')).toBe('aeii9rmagouy1owpp7e5ftpxjof7h41n');
    expect(wkdHash('Hi')).toBe('aeii9rmagouy1owpp7e5ftpxjof7h41n');
  });
});

describe('publishing', () => {
  let out;
  beforeAll(() => {
    out = fs.mkdtempSync(path.join(os.tmpdir(), 'pgp-test-'));
  });
  afterAll(() => fs.rmSync(out, { recursive: true, force: true }));

  it('writes the armored key for download, the binary key and an empty policy for WKD', () => {
    const key = publishKey({ source: keyFile, email: 'hi@romitraj.dev', outDir: out });
    expect(key.url).toMatch(/^\/romitraj-pgp-public\.asc\?v=[0-9a-f]{8}$/);
    expect(key.facts.keyId).toBe('CF7EF21BCBB8D0BB');
    expect(fs.readFileSync(path.join(out, 'romitraj-pgp-public.asc'), 'utf8')).toBe(armored);
    const binary = fs.readFileSync(
      path.join(out, '.well-known/openpgpkey/hu/aeii9rmagouy1owpp7e5ftpxjof7h41n'),
    );
    expect(binary.equals(dearmor(armored))).toBe(true);
    expect(fs.readFileSync(path.join(out, '.well-known/openpgpkey/policy'), 'utf8')).toBe('');
  });

  it('refuses to publish a key for an address the key does not carry', () => {
    expect(() =>
      publishKey({ source: keyFile, email: 'someone@romitraj.dev', outDir: out }),
    ).toThrow(/someone@romitraj\.dev/);
  });

  it('copies a file to its published place with a fingerprint in its address', () => {
    const source = path.join(out, 'source.pdf');
    fs.writeFileSync(source, 'a resume');
    expect(publishFile(source, out, 'resume.pdf')).toBe(
      `/resume.pdf?v=${sha256('a resume').slice(0, 8)}`,
    );
    expect(fs.readFileSync(path.join(out, 'resume.pdf'), 'utf8')).toBe('a resume');
  });
});
