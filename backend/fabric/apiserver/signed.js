// Requests that change the ledger are signed by the app with the user's SEA key pair (#20).
// The body is { signed, pub }: signed is SEA.sign(payload, pair), pub is the pair's public key.
const SEA = require('gun/sea');

// A signed request older than this is refused, so a captured one cannot be sent again later
const MAX_AGE = 5 * 60 * 1000;

// The payload when `pub` signed it within MAX_AGE of now (payload.At, ms), otherwise null
async function readSigned(body, now = Date.now()) {
    if (!body || typeof body.signed !== 'string' || typeof body.pub !== 'string') { return null; }
    const data = await SEA.verify(body.signed, body.pub);
    if (!data || typeof data !== 'object' || !(Math.abs(now - data.At) <= MAX_AGE)) { return null; }
    return data;
}

module.exports = { readSigned, MAX_AGE };
