// Run with: node lib/messages.test.mjs
import assert from 'node:assert';
import { byTime, hashMessages, showTime } from './messages.js';

const a = { key: 'a', at: 1, name: 'n1', message: 'm1', createdAt: 't1' };
const b = { key: 'b', at: 2, name: 'n2', message: 'm2', createdAt: 't2' };
const c = { key: 'c', at: 2, name: 'n3', message: 'm3', createdAt: 't3' };

// a late-synced old message lands in place, equal times fall back to the key
assert.deepStrictEqual([c, b, a].sort(byTime), [a, b, c]);
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
console.log('ok');
