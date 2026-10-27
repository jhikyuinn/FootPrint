// Run with: node lib/minutes.test.mjs
// Messages are signed and encrypted with real SEA keys, the way GUN writes them to a user's space.
import assert from 'node:assert';
import { createRequire } from 'node:module';
import { buildMinutes, minuteMessage, minuteSender, verifyMinutes } from './minutes.js';
import { hashMessages } from './messages.js';

const require = createRequire(import.meta.url);
const SEA = require('gun/sea');

const room = 'room1';
const [alice, bob, eve] = await Promise.all([SEA.pair(), SEA.pair(), SEA.pair()]);
const roomKey = 'room-secret';

// A message node as GUN keeps it: each value signed over its soul, field, value and write time
let clock = 1700000000000;
async function write(pair, text) {
  const soul = '~' + pair.pub + '/' + Math.random().toString(36).slice(2);
  const time = String(clock);
  const node = { _: { '#': soul, '>': {} } };
  for (const [field, plain] of [['message', text], ['createdAt', time]]) {
    const value = await SEA.encrypt(plain, roomKey);
    const state = clock++;
    const { s } = await SEA.sign({ '#': soul, '.': field, ':': value, '>': state }, pair, null, { raw: 1 });
    node[field] = JSON.stringify({ ':': value, '~': s });
    node._['>'][field] = state;
  }
  return minuteMessage({ soul, pub: pair.pub, alias: pair === alice ? 'alice' : 'bob', text, time, node, secret: roomKey, Buffer: SEA.Buffer });
}

const messages = [await write(alice, 'hello'), await write(bob, 'hi alice'), await write(alice, 'agreed')];
const entries = (list) => list.map((m) => ({ key: m.soul, at: m.fields.message.state, name: m.sender, message: m.fields.message.value, createdAt: m.fields.createdAt.value }));
const ledger = [
  { TxId: 't0', Timestamp: 'T0', Value: { function: 'create', hostpub: alice.pub, postpub: alice.pub, hash: hashMessages([]), count: 0 } },
  { TxId: 't1', Timestamp: 'T1', Value: { function: 'enter', hostpub: alice.pub, postpub: bob.pub, hash: '', count: 0 } },
  { TxId: 't2', Timestamp: 'T2', Value: { function: 'record', hostpub: alice.pub, postpub: alice.pub, hash: hashMessages(entries(messages.slice(0, 2))), count: 2 } },
];
// the user node as GUN keeps it: the account name signed by the account's key
async function userNode(pair, alias) {
  const { s } = await SEA.sign({ '#': '~' + pair.pub, '.': 'alias', ':': alias, '>': 1 }, pair, null, { raw: 1 });
  return { alias: JSON.stringify({ ':': alias, '~': s }), _: { '>': { alias: 1 } } };
}
const senders = { [alice.pub]: minuteSender(await userNode(alice, 'alice')), [bob.pub]: minuteSender(await userNode(bob, 'bob')) };
const minutes = buildMinutes({ room, by: { alias: 'alice', pub: alice.pub }, messages, senders, records: ledger, exportedAt: 'now' });
const check = (m, records = ledger) => verifyMinutes(m, records, SEA.verify);
const copy = () => JSON.parse(JSON.stringify(minutes));

// the file holds no room key, yet every message opens and is signed by its sender
assert.ok(!JSON.stringify(minutes).includes(roomKey));
let result = await check(minutes);
assert.strictEqual(result.ok, true);
assert.deepStrictEqual(result.matches, [null, null, true]);
assert.strictEqual(result.covered, 2);
assert.deepStrictEqual(result.senders[bob.pub], { alias: 'bob', aliasSigned: true, entered: { record: 2, function: 'enter', datetime: 'T1', txid: 't1' } });

// changed text in the file: the message's key opens the ciphertext to something else
let m = copy(); m.messages[1].text = 'no';
result = await check(m);
assert.deepStrictEqual([result.ok, result.messages[1].textMatches], [false, false]);

// another user's key cannot claim the message: the signature is not theirs
m = copy(); m.messages[1].sender = eve.pub; m.messages[1].soul = '~' + eve.pub + m.messages[1].soul.slice(bob.pub.length + 1);
result = await check(m);
assert.deepStrictEqual([result.ok, result.messages[1].signed], [false, false]);

// a re-encrypted message under the same sender keeps no valid signature, and the ledger hash breaks
m = copy(); m.messages[0].fields.message.value = await SEA.encrypt('bye', roomKey);
result = await check(m);
assert.strictEqual(result.ok, false);
assert.strictEqual(result.messages[0].signed, false);
assert.deepStrictEqual(result.matches, [null, null, false]);
assert.strictEqual(result.covered, 0);

// a message left out of the file breaks the ledger hash that covered it
m = copy(); m.messages.splice(1, 1);
result = await check(m);
assert.deepStrictEqual([result.ok, result.matches[2]], [false, false]);

// a sender the ledger never recorded in the room is flagged
result = await check(minutes, [ledger[0], ledger[2]]);
assert.deepStrictEqual([result.ok, result.messages[1].member, result.senders[bob.pub].entered], [false, false, null]);

// an account name the key did not sign is flagged
m = copy(); m.senders[bob.pub].alias = 'ceo';
result = await check(m);
assert.deepStrictEqual([result.ok, result.senders[bob.pub].aliasSigned, result.messages[1].member], [false, false, false]);

console.log('ok');
process.exit(0);
