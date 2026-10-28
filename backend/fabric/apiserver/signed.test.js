// Run with: node --test
const test = require('node:test');
const assert = require('node:assert');
const SEA = require('gun/sea');
const { readSigned, MAX_AGE } = require('./signed');

test('accepts only a fresh payload signed by pub', async () => {
    const [alice, eve] = await Promise.all([SEA.pair(), SEA.pair()]);
    const now = Date.now();
    const signed = await SEA.sign({ RoomNumber: 'r', At: now }, alice);

    assert.deepStrictEqual(await readSigned({ signed, pub: alice.pub }, now), { RoomNumber: 'r', At: now });
    // someone else's key, a changed payload, or no signature at all
    assert.strictEqual(await readSigned({ signed, pub: eve.pub }, now), null);
    assert.strictEqual(await readSigned({ signed: signed.replace('"r"', '"x"'), pub: alice.pub }, now), null);
    assert.strictEqual(await readSigned({ RoomNumber: 'r', pub: alice.pub }, now), null);
    // replayed after MAX_AGE, or with no time
    assert.strictEqual(await readSigned({ signed, pub: alice.pub }, now + MAX_AGE + 1), null);
    const noTime = await SEA.sign({ RoomNumber: 'r' }, alice);
    assert.strictEqual(await readSigned({ signed: noTime, pub: alice.pub }, now), null);
});
