# Hyperledger Fabric

The FootPrint-specific parts of the Fabric backend, extracted from
[jhikyuinn/HyperLedgerFabric_Samples](https://github.com/jhikyuinn/HyperLedgerFabric_Samples)
(commit `a4f47f0`, 2022-08-12). Everything else in that repository is unmodified
[hyperledger/fabric-samples](https://github.com/hyperledger/fabric-samples) at commit `9f9cec7`.

| Path | What it is |
| --- | --- |
| `chaincode/P2Pmessage/javascript` | The chaincode (`lib/Record.js`): `initLedger`, `queryRecord`, `queryAllRecords`, `queryHistory`, `recordHash`, and `invite`, `queryInvitations`, `respondInvitation` |
| `apiserver` | Express REST server the app calls, plus the setup scripts `enrollAdmin` and `registerUser` |
| `startFabric.sh` / `networkDown.sh` | Start the test network and deploy the chaincode as `P2Pmessage` / stop it |

## Running

The scripts and the API server use the fabric-samples test network, which is not stored here.
They work with the current `main` of fabric-samples (checked with commit `5789681`, 2026-09-18)
and Fabric 2.5.16 / Fabric CA 1.5.17.

Run the network from Linux or WSL2 (Docker Desktop with WSL integration), not from Git Bash.
`jq` must be installed (`sudo apt install jq`).

    # 1. test network, cloned next to this file (it is git-ignored)
    git clone https://github.com/hyperledger/fabric-samples.git

    # 2. Fabric binaries and config, into fabric-samples/bin and fabric-samples/config
    cd fabric-samples
    curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh
    bash install-fabric.sh --fabric-version 2.5.16 --ca-version 1.5.17 binary
    cd ..

    # 3. Docker images
    bash fabric-samples/install-fabric.sh --fabric-version 2.5.16 --ca-version 1.5.17 docker
    docker pull couchdb:3.4.2
    docker pull hyperledger/fabric-nodeenv:2.5

    # 4. network, channel `mychannel` and chaincode
    bash startFabric.sh

    # 5. API server (Node 18 or newer; can run on Windows while the network runs in WSL)
    cd apiserver
    npm install
    node enrollAdmin
    node registerUser
    node apiserver

`bash networkDown.sh` stops the network and deletes the ledger and the wallet, so run
`enrollAdmin` and `registerUser` again after the next `startFabric.sh`.

The API server listens on `0.0.0.0:1206`; set `HOST` and `PORT` to change it. The app reads
the address from `EXPO_PUBLIC_API_URL` (default `http://localhost:1206`, see `frontend/lib/config.js`),
so point it at the machine running the API server.
The wallet created in `apiserver/wallet` holds private keys and is git-ignored.

### Problems seen on WSL with the repository on a Windows drive (`/mnt/c`)

- `install-fabric.sh ... binary` stops with `tar: Cannot utime: Operation not permitted` after the
  Fabric binaries and before the CA binaries. Extract the CA archive by hand inside `fabric-samples`:

      curl -sSL https://github.com/hyperledger/fabric-ca/releases/download/v1.5.17/hyperledger-fabric-ca-linux-amd64-1.5.17.tar.gz | tar xz -m --no-same-permissions --no-overwrite-dir

- `error getting credentials` while `startFabric.sh` pulls `couchdb`: pull the images in step 3
  from a Windows terminal instead. When this happens the peers never start and the script still
  ends with the "Next, start the API server" message, so check `docker ps` for the two peers,
  the orderer and the two `dev-peer...P2Pmessage` containers.

## Changes made during extraction

- The connection profile path in `apiserver/*.js` points to `../fabric-samples/test-network` instead of `../../test-network`.
- `apiserver/package.json` lists `express`, `cors`, `body-parser` and `fabric-network`, which the code requires but the original file did not declare.
- `startFabric.sh` deploys only the JavaScript chaincode and passes the name `P2Pmessage` directly, so the edit to `test-network/scripts/deployCC.sh` is no longer needed.
- Left out: the committed wallet identities, the unchanged fabcar copies (Go, Java, TypeScript chaincode and clients), the copied commercial-paper files, and `Go-apiserver`.

## Changes made for the current frontend

- Each record is written once, under the composite key `record~<room>~<seq>`. The room key only keeps the host, the record count, the last hash and the number of messages it covers (#16).
- `recordHash(HostID, RoomNumber, Hash, Function, PostID, HostPub, PostPub, Seq, PrevHash, Count)`: a `Seq` that is already written is rejected, and a hashed record must name the room's last hash as `PrevHash` and cannot cover fewer messages (`Count`) than the last one (#17). The record time is the transaction time, not a time the app sends.
- The first record fixes the room's host; a later `create` is stored as `enter`.
- Invitations are stored under their own key (`invite~<to>~<room>`), not as room records.
- New chaincode functions `queryAllRecords` and `queryHistory` (the old `queryHistory` was a commercial-paper leftover that could not run), with the routes `/api/queryallrecords` and `/api/history/:room`.
- `GET /api/query/:room` answers `"None"` for an unknown room, and errors return HTTP 500 instead of stopping the server.
- `initLedger` stores its two sample records under their room names (`Ryu0808`, `COM1206`) instead of `Record0` and `Record1`, so `queryRecord` can find them.
- The server connects to the gateway once and reuses the connection.
- The chaincode depends on `fabric-contract-api` / `fabric-shim` 2.5.
- `frontend/Screen/Ready.js` and `historylist.js` call `/api/history/:room` instead of `/api/query/:room`, because `Chat.js` needs `/api/query/:room` to return a single record.

## API

| Method | Path | Chaincode call | Notes |
| --- | --- | --- | --- |
| GET | `/api/query/:room` | `queryRecord(RoomNumber)` | Latest record of the room, `{ Seq, TxId, HostID, HostPub, RoomNumber, docType, Function, PostID, PostPub, DateTime, Hash, Count, PrevHash, LastHash, LastCount }`, or the string `"None"` for an unknown room. `LastHash` / `LastCount` are the room's last hash and the messages it covers, even when the latest record is an `enter` without a hash. |
| GET | `/api/queryallrecords` | `queryAllRecords()` | Latest record of every room: `[{ Key, Record }]`. |
| GET | `/api/history/:room` | `queryHistory(RoomNumber)` | Every record written for the room, oldest first: `[{ TxId, Timestamp, Value: { roomnumber, function, hostid, hostpub, postid, postpub, seq, hash, prevhash, count, datetime } }]`. Empty list for an unknown room. |
| POST | `/api/recordhash` | `recordHash(HostID, RoomNumber, Hash, Function, PostID, HostPub, PostPub, Seq, PrevHash, Count)` | Body: `HostID`, `RoomNumber`, `Hash`, `Function`, `PostID`, `HostPub`, `PostPub`, and optional `Seq`, `PrevHash`, `Count`. Responds with the request body; 400 without `HostID` or `RoomNumber`, 500 when the chaincode rejects the record. |

Records are never overwritten. A hashed record covers the room's first `Count` messages and names the
hash before it, so the app can check every record against the first `Count` messages of the chat:
added messages keep older records matching, a changed message breaks every record that covers it.
An `enter` record has no hash and leaves the room's last hash as it was.

`apiserver` uses the `fabric-network` SDK, which works with Fabric 2.5 but is deprecated and does
not work with Fabric 3. Moving to `@hyperledger/fabric-gateway` is the next step if the network is upgraded.
