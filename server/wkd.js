// The Web Key Directory: the files under /.well-known/openpgpkey/ that let anyone's email program
// find the OpenPGP key for the site's email address (scripts/lib/pgp.mjs writes them). They are
// sent as raw bytes, and any website may read them, as the standard asks.
const folder = '/.well-known/openpgpkey/';

export function wkdHeaders(urlPath) {
  if (!urlPath.startsWith(folder)) return null;
  return {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/octet-stream',
  };
}
