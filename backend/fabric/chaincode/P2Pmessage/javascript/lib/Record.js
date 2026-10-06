/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');

class Record extends Contract {

    async initLedger(ctx) {
        console.info('============= START : Initialize Ledger ===========');
        const Records = [
            {
                HostID: 'RYU',
                RoomNumber: 'Ryu0808',
                Function: 'create',
                PostID: 'RYU',
                DateTime: 'Wed Aug 8 2022 15:07:00 GMT+0900 (Korean Standard Time)',
                Hash: '4cbd530b13d80eeb31ac35a8a193fe0c882be8cf9383f96140f4f09b8bb273d3',
            },
            {
                HostID: 'kyuinn',
                RoomNumber: 'COM1206',
                Function: 'create',
                PostID: 'kyuinn',
                DateTime: 'Wed Aug 10 2022 15:43:00 GMT+0900 (Korean Standard Time)',
                Hash: '4eaa7f8ce23b8af1170a2078934fb3f5f68dbf7823dfbe67e00ef10efa40c988',
            },
        ];

        for (let i = 0; i < Records.length; i++) {
            Records[i].docType = 'Record';
            await ctx.stub.putState(Records[i].RoomNumber, Buffer.from(JSON.stringify(Records[i])));
            console.info('Added <--> ', Records[i]);
        }
        console.info('============= END : Initialize Ledger ===========');
    }

    async queryRecord(ctx, RoomNumber) {
        const recordAsBytes = await ctx.stub.getState(RoomNumber); // get the latest record of the room from chaincode state
        if (!recordAsBytes || recordAsBytes.length === 0) {
            throw new Error(`${RoomNumber} does not exist`);
        }

        console.log(recordAsBytes.toString());
        return recordAsBytes.toString();
    }

    async queryAllRecords(ctx) {
        const allResults = [];
        for await (const { key, value } of ctx.stub.getStateByRange('', '')) {
            const strValue = Buffer.from(value).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push({ Key: key, Record: record });
        }
        console.info(allResults);
        return JSON.stringify(allResults);
    }

    // Function is one of create, enter, record, invitation. PostID is the user the record is about.
    async recordHash(ctx, HostID, RoomNumber, DateTime, Hash, Function, PostID) {
        console.info('============= START : Create Record ===========');

        const Record = {
            HostID,
            RoomNumber,
            docType: 'Record',
            Function: Function || 'record',
            PostID: PostID || HostID,
            DateTime,
            Hash,
        };

        await ctx.stub.putState(RoomNumber, Buffer.from(JSON.stringify(Record)));
        console.info('============= END : Create Record ===========');
    }

    /**
     * Query every record that was written for a room, oldest first
     * @param {Context} ctx the transaction context
     * @param {String} RoomNumber room name
    */
    async queryHistory(ctx, RoomNumber) {
        const results = [];
        for await (const res of ctx.stub.getHistoryForKey(RoomNumber)) {
            const strValue = Buffer.from(res.value).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            results.push({
                TxId: res.txId,
                Timestamp: new Date(Number(res.timestamp.seconds.toString()) * 1000).toISOString(),
                IsDelete: res.isDelete,
                Value: record,
            });
        }
        // the history iterator returns the newest write first
        results.reverse();
        return JSON.stringify(results);
    }

}

module.exports = Record;
