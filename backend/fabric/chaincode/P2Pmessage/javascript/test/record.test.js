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
const record = (ctx, room, fn, hash, seq = '', host = 'alice') =>
    contract.recordHash(ctx, host, room, hash, fn, host, 'pubA', 'pubA', seq);

test('records get their own keys and the history lists them oldest first', async () => {
    const ctx = newCtx();
    await record(ctx, 'room1', 'create', 'h0');
    await record(ctx, 'room1', 'record', 'h1');
    await record(ctx, 'room2', 'create', 'x0');

    const history = JSON.parse(await contract.queryHistory(ctx, 'room1'));
    assert.deepStrictEqual(history.map((entry) => [entry.Value.Seq, entry.Value.Hash]), [[0, 'h0'], [1, 'h1']]);
    assert.strictEqual(history[0].Timestamp, '2023-11-14T22:13:20.000Z');
    assert.strictEqual(JSON.parse(await contract.queryRecord(ctx, 'room1')).Hash, 'h1');

    const meta = JSON.parse(ctx.state.get('room1').toString());
    assert.deepStrictEqual([meta.Count, meta.LastHash, meta.HostID], [2, 'h1', 'alice']);
});

test('the same seq cannot be written twice', async () => {
    const ctx = newCtx();
    await record(ctx, 'room1', 'create', 'h0', '0');
    await record(ctx, 'room1', 'record', 'h1', '1');
    await assert.rejects(record(ctx, 'room1', 'record', 'other', '1'), /already written/);
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
    await record(ctx, 'room1', 'create', 'h1', '', 'mallory');
    const latest = JSON.parse(await contract.queryRecord(ctx, 'room1'));
    assert.deepStrictEqual([latest.HostID, latest.Function, latest.PostID], ['alice', 'enter', 'mallory']);
});

test('a room never recorded does not exist', async () => {
    await assert.rejects(contract.queryRecord(newCtx(), 'nope'), /does not exist/);
});
