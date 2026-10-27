// Checks exported minutes without the app: npm run verify-minutes -- <minutes.json> [api url]
// The ledger records come from the API server (default http://localhost:1206), never from the file.
// Exits 0 when every check passes, 1 otherwise.
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { verifyMinutes } from '../lib/minutes.js';

const require = createRequire(import.meta.url);
const SEA = require('gun/sea');

const [file, api = 'http://localhost:1206'] = process.argv.slice(2);
if (!file) {
  console.error('usage: npm run verify-minutes -- <minutes.json> [api url]');
  process.exit(2);
}

const minutes = JSON.parse(await readFile(file, 'utf8'));
const res = await fetch(`${api}/api/history/${encodeURIComponent(minutes.room)}`);
if (!res.ok) {
  console.error(`Could not read the ledger records of ${minutes.room}: HTTP ${res.status}`);
  process.exit(2);
}
const records = await res.json();
const result = await verifyMinutes(minutes, records, SEA.verify);

const mark = (good) => (good ? 'ok  ' : 'FAIL');
console.log(`Room ${minutes.room}, exported by ${minutes.exportedBy.alias} at ${minutes.exportedAt}\n`);
console.log('Senders (the account name each key signed; which person holds an account is not proven):');
Object.entries(result.senders).forEach(([pub, s]) => {
  const entered = s.entered ? `entered at ledger record #${s.entered.record} (${s.entered.function}, ${s.entered.datetime}, tx ${s.entered.txid.slice(0, 12)}...)` : 'never recorded in the room';
  console.log(`${mark(s.aliasSigned && s.entered)} ${s.alias}  key ${pub.slice(0, 12)}...  ${s.aliasSigned ? '' : 'name not signed by this key, '}${entered}`);
});
console.log('');
minutes.messages.forEach((m, i) => {
  const r = result.messages[i];
  const good = r.inSpace && r.signed && r.textMatches && r.member;
  const why = [!r.signed && 'not signed by the sender', !r.inSpace && 'not in the sender\'s space',
    !r.textMatches && 'text differs from the ciphertext', !r.member && 'sender not verified (see Senders)'].filter(Boolean);
  console.log(`${mark(good)} #${i + 1} ${m.alias}: ${m.text}${why.length ? `  <- ${why.join(', ')}` : ''}`);
});
console.log('');
records.forEach((r, i) => {
  if (result.matches[i] === null) { return; }
  console.log(`${mark(result.matches[i])} ledger record #${i + 1} (${r.Value.function}, first ${r.Value.count} messages, tx ${r.TxId.slice(0, 12)}...)`);
});
const rest = minutes.messages.length - result.covered;
console.log(`\n${result.ok ? 'VERIFIED' : 'NOT VERIFIED'}: ${minutes.messages.length} messages, ${result.covered} covered by ledger hashes`
  + (rest > 0 ? `, ${rest} newer ones signed but not on the ledger yet` : ''));
process.exit(result.ok ? 0 : 1);
