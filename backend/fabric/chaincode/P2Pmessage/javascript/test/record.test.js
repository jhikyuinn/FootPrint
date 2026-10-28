'use strict';

// Runs the contract against an in-memory stub: node --test
const test = require('node:test');
const assert = require('node:assert');
const Record = require('../lib/Record');

// Only the stub calls the contract uses. Writes are seen at once, like separate committed transactions.
function newCtx() {
    const state = new Map();
    let tx = 0;
    const sorted = (keep) => [...state.keys()].filter(keep).sort().map((key) => ({ key, value: state.get(key) }));
    const iterate = async function* (items) { yield* items; };
    const stub = {
        getState: async (key) => state.get(key) || Buffer.alloc(0),
        putState: async (key, value) => { state.set(key, value); },
        createCompositeKey: (type, attrs) => '\u0000' + [type, ...attrs].join('\u0000') + '\u0000',
        getStateByRange: () => iterate(sorted((key) => !key.startsWith('\u0000'))),
        getStateByPartialCompositeKey: (type, attrs) => {
            const prefix = stub.createCompositeKey(type, attrs);
            return iterate(sorted((key) => key.startsWith(prefix)));
        },
        getTxID: () => `tx${tx}`,
        getTxTimestamp: () => ({ seconds: { toString: () => String(1700000000 + tx++) }, nanos: 0 }),
    };
    return { stub, state };
}

const contract = new Record();
const record = (ctx, room, fn, hash, { seq = '', prev = '', count = 0, host = 'alice', sig = '' } = {}) =>
    contract.recordHash(ctx, host, room, hash, fn, host, 'pubA', 'pubA', seq, prev, String(count), sig);

test('records get their own keys and the history lists them oldest first', async () => {
    const ctx = newCtx();
    await record(ctx, 'room1', 'create', 'h0');
    await record(ctx, 'room1', 'record', 'h1', { prev: 'h0', count: 3, sig: 'SEA{signed}' });
    await record(ctx, 'room2', 'create', 'x0');

    const history = JSON.parse(await contract.queryHistory(ctx, 'room1'));
    assert.deepStrictEqual(history.map((entry) => [entry.Value.Seq, entry.Value.Hash]), [[0, 'h0'], [1, 'h1']]);
    assert.strictEqual(history[0].Timestamp, '2023-11-14T22:13:20.000Z');
    assert.strictEqual(JSON.parse(await contract.queryRecord(ctx, 'room1')).Hash, 'h1');
    // the signed request is kept with the record (#20)
    assert.deepStrictEqual(history.map((entry) => entry.Value.Sig), ['', 'SEA{signed}']);

    const meta = JSON.parse(ctx.state.get('room1').toString());
    assert.deepStrictEqual([meta.Count, meta.LastHash, meta.LastCount, meta.HostID], [2, 'h1', 3, 'alice']);
});

test('the same seq cannot be written twice', async () => {
    const ctx = newCtx();
    await record(ctx, 'room1', 'create', 'h0', { seq: '0' });
    await record(ctx, 'room1', 'record', 'h1', { seq: '1', prev: 'h0', count: 1 });
    await assert.rejects(record(ctx, 'room1', 'record', 'other', { seq: '1', prev: 'h0', count: 1 }), /already written/);
    assert.strictEqual(JSON.parse(await contract.queryHistory(ctx, 'room1')).length, 2);
});

test('a room key that is a prefix of another does not mix their records', async () => {
    const ctx = newCtx();
    await record(ctx, 'room', 'create', 'a');
    await record(ctx, 'room1', 'create', 'b');
    assert.strictEqual(JSON.parse(await contract.queryHistory(ctx, 'room')).length, 1);
    assert.deepStrictEqual(JSON.parse(await contract.queryAllRecords(ctx)).map((r) => r.Key), ['room', 'room1']);
});

test('the first record fixes the host and a second create becomes enter', async () => {
    const ctx = newCtx();
    await record(ctx, 'room1', 'create', 'h0');
    await record(ctx, 'room1', 'create', 'h1', { host: 'mallory' });
    const latest = JSON.parse(await contract.queryRecord(ctx, 'room1'));
    assert.deepStrictEqual([latest.HostID, latest.Function, latest.PostID, latest.Hash], ['alice', 'enter', 'mallory', '']);
    // the late create's hash did not replace the room's first one
    assert.strictEqual(latest.LastHash, 'h0');
});

test('a room never recorded does not exist', async () => {
    await assert.rejects(contract.queryRecord(newCtx(), 'nope'), /does not exist/);
});

test('a hashed record must build on the last hash and cannot cover fewer messages', async () => {
    const ctx = newCtx();
    await record(ctx, 'room1', 'create', 'h0');
    await record(ctx, 'room1', 'record', 'h5', { prev: 'h0', count: 5 });
    // someone who has not seen h5 yet
    await assert.rejects(record(ctx, 'room1', 'record', 'h6', { prev: 'h0', count: 6 }), /newer hash/);
    await assert.rejects(record(ctx, 'room1', 'record', 'h4', { prev: 'h5', count: 4 }), /fewer messages/);
    // naming it enter does not skip the check
    await assert.rejects(record(ctx, 'room1', 'enter', 'x', { prev: 'h0', count: 9 }), /newer hash/);
    // an entry without a hash keeps the last hash
    await record(ctx, 'room1', 'enter', '', { host: 'bob' });
    await record(ctx, 'room1', 'record', 'h7', { prev: 'h5', count: 7 });
    const history = JSON.parse(await contract.queryHistory(ctx, 'room1')).map((e) => [e.Value.Hash, e.Value.PrevHash, e.Value.Count]);
    assert.deepStrictEqual(history, [['h0', '', 0], ['h5', 'h0', 5], ['', '', 0], ['h7', 'h5', 7]]);
});
