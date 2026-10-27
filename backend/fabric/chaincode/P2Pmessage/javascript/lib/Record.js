/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');

// A room's records live under their own keys (record, room, seq) that are written once and never replaced.
// The room key only keeps what later records need: the host, the record count and the last hash
// with the message count it covers.
const recordKey = (ctx, room, seq) => ctx.stub.createCompositeKey('record', [room, String(seq).padStart(10, '0')]);

async function readJSON(ctx, key) {
    const bytes = await ctx.stub.getState(key);
    return bytes && bytes.length > 0 ? JSON.parse(bytes.toString()) : null;
}

// The room's latest record, with the last hash and its message count (a latest enter record has no hash)
async function latestRecord(ctx, room) {
    const meta = await readJSON(ctx, room);
    if (!meta) {
        throw new Error(`${room} does not exist`);
    }
    const record = await readJSON(ctx, recordKey(ctx, room, meta.Count - 1));
    return { ...record, LastHash: meta.LastHash, LastCount: meta.LastCount };
}

class Record extends Contract {

    async initLedger(ctx) {
        console.info('============= START : Initialize Ledger ===========');
        await this.recordHash(ctx, 'RYU', 'Ryu0808', '4cbd530b13d80eeb31ac35a8a193fe0c882be8cf9383f96140f4f09b8bb273d3', 'create', 'RYU', '', '', '');
        await this.recordHash(ctx, 'kyuinn', 'COM1206', '4eaa7f8ce23b8af1170a2078934fb3f5f68dbf7823dfbe67e00ef10efa40c988', 'create', 'kyuinn', '', '', '');
        console.info('============= END : Initialize Ledger ===========');
    }

    // The room's latest record
    async queryRecord(ctx, RoomNumber) {
        return JSON.stringify(await latestRecord(ctx, RoomNumber));
    }

    // Latest record of every room: [{ Key, Record }]. The range skips composite keys, so it only sees room keys.
    async queryAllRecords(ctx) {
        const allResults = [];
        for await (const { key } of ctx.stub.getStateByRange('', '')) {
            allResults.push({ Key: key, Record: await latestRecord(ctx, key) });
        }
        return JSON.stringify(allResults);
    }

    // Function is one of create, enter, record. PostID is the user the record is about.
    // HostPub and PostPub are the public keys of the host and of PostID (empty from older clients).
    // Seq is the record number the caller expects to write; empty appends. A taken Seq is rejected,
    // so two callers recording the same state cannot both succeed.
    // Hash covers the first Count messages of the room. A record names the last hash it builds on (PrevHash),
    // so a record made without seeing the latest one is rejected, and Count can only grow.
    // (Invitations used to be written here too; they now have their own key, see invite.)
    async recordHash(ctx, HostID, RoomNumber, Hash, Function, PostID, HostPub, PostPub, Seq, PrevHash, Count) {
        const meta = await readJSON(ctx, RoomNumber);
        const seq = meta ? meta.Count : 0;
        if (Seq !== undefined && Seq !== '' && Number(Seq) !== seq) {
            throw new Error(`Record ${Seq} of ${RoomNumber} is already written (next is ${seq})`);
        }
        const key = recordKey(ctx, RoomNumber, seq);
        if (await readJSON(ctx, key)) {
            throw new Error(`Record ${seq} of ${RoomNumber} is already written`);
        }

        // The first record of a room fixes its host: later records keep it, whatever the caller sends,
        // so nobody can take over a room by recording it again.
        if (meta) {
            HostID = meta.HostID;
            HostPub = meta.HostPub;
            if (Function === 'create') {
                // the room already has its first hash; a late create only makes its caller a member
                Function = 'enter';
                Hash = '';
            }
        }
        const lastHash = meta ? meta.LastHash : '';
        const lastCount = meta ? meta.LastCount : 0;
        const count = Number(Count) || 0;
        // every hashed record is checked, whatever its Function, or a caller could skip the check by naming it enter
        if (Hash) {
            if ((PrevHash || '') !== lastHash) {
                throw new Error(`${RoomNumber} has a newer hash than the one this record builds on`);
            }
            if (count < lastCount) {
                throw new Error(`A record of ${RoomNumber} cannot cover fewer messages (${count}) than the last one (${lastCount})`);
            }
        }

        // the transaction time, which every peer agrees on, not a time the app sends
        const ts = ctx.stub.getTxTimestamp();
        const record = {
            docType: 'Record',
            Seq: seq,
            TxId: ctx.stub.getTxID(),
            HostID,
            HostPub: HostPub || '',
            RoomNumber,
            Function: Function || 'record',
            PostID: PostID || HostID,
            PostPub: PostPub || '',
            DateTime: new Date(Number(ts.seconds.toString()) * 1000 + Math.floor(ts.nanos / 1e6)).toISOString(),
            Hash: Hash || '',
            // only a hashed record covers messages; it builds on the last hash
            Count: Hash ? count : 0,
            PrevHash: Hash ? lastHash : '',
        };
        await ctx.stub.putState(key, Buffer.from(JSON.stringify(record)));
        await ctx.stub.putState(RoomNumber, Buffer.from(JSON.stringify({
            docType: 'Room',
            RoomNumber,
            HostID,
            HostPub: record.HostPub,
            Count: seq + 1,
            // enter records carry no hash; the last hash stays the last one that was recorded
            LastHash: record.Hash || lastHash,
            LastCount: record.Hash ? record.Count : lastCount,
        })));
    }

    // Every record of a room, oldest first (the composite key range is sorted by seq)
    async queryHistory(ctx, RoomNumber) {
        const results = [];
        for await (const { value } of ctx.stub.getStateByPartialCompositeKey('record', [RoomNumber])) {
            const record = JSON.parse(Buffer.from(value).toString('utf8'));
            results.push({ TxId: record.TxId, Timestamp: record.DateTime, Value: record });
        }
        return JSON.stringify(results);
    }

    // An invitation lives under its own key (invite, To, RoomNumber), so it never replaces the room's
    // latest hash and stays until the invited user answers. Inviting again resets it to pending.
    // Key is the room key encrypted for To (empty for a free room), FromEpub lets To decrypt it.
    async invite(ctx, RoomNumber, From, FromEpub, To, DateTime, Key) {
        if (!RoomNumber || !From || !To) {
            throw new Error('RoomNumber, From and To are required');
        }
        const invitation = { docType: 'Invitation', RoomNumber, From, FromEpub, To, DateTime, Key, Status: 'pending' };
        await ctx.stub.putState(ctx.stub.createCompositeKey('invite', [To, RoomNumber]), Buffer.from(JSON.stringify(invitation)));
    }

    // Every invitation sent to a user, whatever its status
    async queryInvitations(ctx, To) {
        const results = [];
        for await (const { value } of ctx.stub.getStateByPartialCompositeKey('invite', [To])) {
            results.push(JSON.parse(Buffer.from(value).toString('utf8')));
        }
        return JSON.stringify(results);
    }

    // Status is accepted or declined
    async respondInvitation(ctx, RoomNumber, To, Status) {
        if (Status !== 'accepted' && Status !== 'declined') {
            throw new Error(`Unknown status ${Status}`);
        }
        const key = ctx.stub.createCompositeKey('invite', [To, RoomNumber]);
        const bytes = await ctx.stub.getState(key);
        if (!bytes || bytes.length === 0) {
            throw new Error(`No invitation to ${RoomNumber} for ${To}`);
        }
        const invitation = JSON.parse(bytes.toString());
        invitation.Status = Status;
        await ctx.stub.putState(key, Buffer.from(JSON.stringify(invitation)));
    }

}

module.exports = Record;
