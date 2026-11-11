// Tests for the extra headers the Web Key Directory's files are sent with (server/wkd.js).
import { describe, expect, it } from 'vite-plus/test';
import { wkdHeaders } from './wkd.js';

describe('wkdHeaders', () => {
  const wanted = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/octet-stream',
  };

  it('lets any website read the key and the policy, as raw bytes', () => {
    expect(wkdHeaders('/.well-known/openpgpkey/hu/aeii9rmagouy1owpp7e5ftpxjof7h41n')).toEqual(
      wanted,
    );
    expect(wkdHeaders('/.well-known/openpgpkey/policy')).toEqual(wanted);
  });

  it('adds nothing to any other file', () => {
    expect(wkdHeaders('/')).toBeNull();
    expect(wkdHeaders('/romitraj-pgp-public.asc')).toBeNull();
    expect(wkdHeaders('/.well-known/other')).toBeNull();
  });
});
