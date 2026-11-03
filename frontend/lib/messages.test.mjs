// Run with: node lib/messages.test.mjs
import assert from 'node:assert';
import { byTime, checkRecords, hashFirst, hashMessages, insertByTime, leftPubs, messageList, nextRecord, PAGE, showTime, unreadCount } from './messages.js';

const a = { key: 'a', at: 1, name: 'n1', message: 'm1', createdAt: 't1' };
const b = { key: 'b', at: 2, name: 'n2', message: 'm2', createdAt: 't2' };
const c = { key: 'c', at: 2, name: 'n3', message: 'm3', createdAt: 't3' };

// a late-synced old message lands in place, equal times fall back to the key
assert.deepStrictEqual([c, b, a].sort(byTime), [a, b, c]);
// inserting in any arrival order gives the sorted list
for (const order of [[a, b, c], [c, b, a], [b, c, a], [c, a, b]]) {
  assert.deepStrictEqual(order.reduce(insertByTime, []), [a, b, c]);
}
// arrival order does not change the hash (two devices agree)
assert.strictEqual(hashMessages([c, a, b]), hashMessages([a, b, c]));
// changing the body, the sender or the time changes the hash
assert.notStrictEqual(hashMessages([a, b]), hashMessages([a, { ...b, message: 'x' }]));
assert.notStrictEqual(hashMessages([a, b]), hashMessages([a, { ...b, name: 'x' }]));
assert.notStrictEqual(hashMessages([a, b]), hashMessages([a, { ...b, createdAt: 'x' }]));
// numeric times are formatted (SEA.decrypt may hand back a number), old strings pass through
assert.strictEqual(showTime(0), new Date(0).toLocaleString());
assert.strictEqual(showTime('0'), new Date(0).toLocaleString());
assert.strictEqual(showTime('2022. 8. 12. 오후 3:00:00'), '2022. 8. 12. 오후 3:00:00');
// unread: only messages after the last read time; none before the read time has loaded; a never-read room counts all
assert.strictEqual(unreadCount({ x: 1, y: 5, z: 9 }, 4), 2);
assert.strictEqual(unreadCount({ x: 1, y: 5 }, undefined), 0);
assert.strictEqual(unreadCount({ x: 1, y: 5 }, 0), 2);
assert.strictEqual(unreadCount(undefined, 0), 0);
// records cover the first count messages: adding messages keeps old records matching,
// changing an old message breaks every record that covers it
const d = { key: 'd', at: 3, name: 'n4', message: 'm4', createdAt: 't4' };
const rec = (hash, count) => ({ Value: { hash, count } });
const records = [rec(hashMessages([]), 0), rec(hashFirst([a, b], 1), 1), rec(hashMessages([a, b]), 2), rec('', 0), rec(hashMessages([a, b, c]), 3)];
assert.strictEqual(hashFirst([c, b, a], 2), hashMessages([a, b]));
// the creation record covers no messages, so it is not checked
assert.deepStrictEqual(checkRecords([a, b, c, d], records), [null, true, true, null, true]);
assert.deepStrictEqual(checkRecords([a, { ...b, message: 'x' }, c, d], records), [null, true, false, null, false]);
// automatic records: only after min new messages, only on a chat that starts with the last hash, at the next seq
const latest = { Seq: 4, LastHash: hashMessages([a, b]), LastCount: 2 };
assert.strictEqual(nextRecord([a, b, c], latest, 2), null);
assert.deepStrictEqual(nextRecord([a, b, c, d], latest, 2), { Hash: hashMessages([a, b, c, d]), PrevHash: latest.LastHash, Count: 4, Seq: 5 });
assert.strictEqual(nextRecord([a, { ...b, message: 'x' }, c, d], latest, 2), null);
assert.strictEqual(nextRecord([a, b], latest, 0) && nextRecord([a, b], latest, 1), null);
assert.strictEqual(nextRecord([a, b, c], 'None', 1), null);

// leaving: a key is left while its latest record is a leave; entering again (or recording a hash) undoes it
const membership = (fn, pub) => ({ Value: { function: fn, postpub: pub, hostpub: 'host' } });
assert.deepStrictEqual([...leftPubs([membership('create', 'host'), membership('enter', 'p1'), membership('leave', 'p1')])], ['p1']);
assert.deepStrictEqual([...leftPubs([membership('create', 'host'), membership('leave', 'p1'), membership('enter', 'p1')])], []);
assert.deepStrictEqual([...leftPubs([membership('create', 'host'), membership('leave', 'host'), membership('record', 'p2')])], ['host']);
assert.deepStrictEqual([...leftPubs([membership('leave', 'p1'), membership('record', 'p1')])], []);
assert.deepStrictEqual([...leftPubs([])], []);
// messageList: the screen draws the latest `shown` messages
const msg = (i) => ({ key: 'k' + String(i).padStart(4, '0'), at: i });
const fill = (n, keep = false) => Array.from({ length: n }, (_, i) => i).reduce((s, i) => messageList(s, { message: msg(i), keep }), messageList.initial);
const drawn = (s) => s.messages.slice(-s.shown).map((m) => m.at);
let list = fill(120);
assert.strictEqual(list.messages.length, 120);
assert.deepStrictEqual(drawn(list), Array.from({ length: PAGE }, (_, i) => 70 + i));
// the same key again changes nothing
assert.strictEqual(messageList(list, { message: msg(5) }), list);
// scrolling to the top draws PAGE more
assert.deepStrictEqual(drawn(messageList(list, { type: 'more' }))[0], 20);
// at the bottom a new message pushes the oldest drawn one out
assert.deepStrictEqual(drawn(messageList(list, { message: msg(200) }))[0], 71);
// scrolled up: a new message, or a late old one inside the drawn part, keeps the top message in view
assert.deepStrictEqual(drawn(messageList(list, { message: msg(200), keep: true }))[0], 70);
assert.deepStrictEqual(drawn(messageList(list, { message: { key: 'late', at: 80.5 }, keep: true }))[0], 70);
// scrolled up: a late message older than the drawn part does not change what is drawn
assert.deepStrictEqual(drawn(messageList(list, { message: { key: 'late', at: 10.5 }, keep: true })), drawn(list));
// back at the bottom only the latest PAGE are drawn again
assert.deepStrictEqual(drawn(messageList(messageList(list, { type: 'more' }), { type: 'bottom' })), drawn(list));
assert.strictEqual(messageList(list, { type: 'bottom' }), list);
console.log('ok');
