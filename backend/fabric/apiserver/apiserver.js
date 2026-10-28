var express = require('express');
var bodyParser = require('body-parser');
var app = express();
const cors = require("cors");

app.use(
    cors({
        origin:true,
        credentials:true,
        methods: ["POST","PUT","GET","OPTIONS","HEAD"]
    }
)
);

app.use(bodyParser.json());

const { Gateway, Wallets } = require('fabric-network');
const { readSigned } = require('./signed');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 1206;
const HOST = process.env.HOST || '0.0.0.0';

let contractPromise;

// Connect to the gateway once and reuse the contract for every request.
function getContract() {
    if (!contractPromise) {
        contractPromise = connect().catch((error) => {
            contractPromise = undefined;
            throw error;
        });
    }
    return contractPromise;
}

async function connect() {
    const ccpPath = path.resolve(__dirname, '..', 'fabric-samples', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    // Create a new file system based wallet for managing identities.
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);

    // Check to see if we've already enrolled the user.
    const identity = await wallet.get('appUser');
    if (!identity) {
        throw new Error('An identity for the user "appUser" does not exist in the wallet. Run the registerUser.js application before retrying');
    }
    // Create a new gateway for connecting to our peer node.
    const gateway = new Gateway();
    await gateway.connect(ccp, { wallet, identity: 'appUser', discovery: { enabled: true, asLocalhost: true } });
    // Get the network (channel) our contract is deployed to.
    const network = await gateway.getNetwork('mychannel');
    // Get the contract from the network.
    return network.getContract('P2Pmessage');
}

function unsigned(res) {
    res.status(401).json({ error: 'A request signed in the last few minutes is required' });
}

function sendError(res, error) {
    console.error(`Failed to evaluate transaction: ${error}`);
    res.status(500).json({ error: error.message });
}

// Latest record of a room, or the string "None" when the room has never been recorded.
app.get('/api/query/:roomState', async function (req,res){
    try{
        const contract = await getContract();
        const result = await contract.evaluateTransaction('queryRecord',req.params.roomState);
        console.log(`Transaction has been evaluated`);
        res.send(JSON.parse(result));
    } catch (error) {
        if (String(error.message).includes('does not exist')) {
            res.send("None");
            return;
        }
        sendError(res, error);
    }
});

// Latest record of every room: [{ Key, Record }]
app.get('/api/queryallrecords', async function (req,res){
    try{
        const contract = await getContract();
        const result = await contract.evaluateTransaction('queryAllRecords');
        console.log(`Transaction has been evaluated`);
        res.send(JSON.parse(result));
    } catch (error) {
        sendError(res, error);
    }
});

// Every record written for a room, oldest first: [{ TxId, Timestamp, Value }]
app.get('/api/history/:roomState', async function (req,res){
    try{
        const contract = await getContract();
        const result = await contract.evaluateTransaction('queryHistory',req.params.roomState);
        console.log(`Transaction has been evaluated`);
        // the app reads the history values with lower-case field names
        const history = JSON.parse(result).map((entry) => ({
            TxId: entry.TxId,
            Timestamp: entry.Timestamp,
            Value: {
                roomnumber: entry.Value.RoomNumber,
                function: entry.Value.Function,
                hostid: entry.Value.HostID,
                hostpub: entry.Value.HostPub,
                postid: entry.Value.PostID,
                postpub: entry.Value.PostPub,
                seq: entry.Value.Seq,
                hash: entry.Value.Hash,
                prevhash: entry.Value.PrevHash,
                count: entry.Value.Count,
                datetime: entry.Value.DateTime,
                // SEA.sign of the request by postpub; anyone can check it with SEA.verify(sig, postpub)
                sig: entry.Value.Sig,
            },
        }));
        res.send(history);
    } catch (error) {
        sendError(res, error);
    }
});

app.post('/api/recordhash', async function(req, res){
    try{
        // Seq is the record number the app expects to write; leave it out to append. The time is the transaction's.
        // Hash covers the room's first Count messages and builds on PrevHash, the room's last hash.
        // the record is signed by the user it is about (PostPub); a host key other than the signer's is refused,
        // so nobody can create a room in someone else's name. The signature is kept in the record.
        const data = await readSigned(req.body);
        if (!data) { unsigned(res); return; }
        const { HostID, RoomNumber, Hash, Function, PostID, HostPub, PostPub, Seq, PrevHash, Count } = data;
        if (!HostID || !RoomNumber) {
            res.status(400).json({ error: 'HostID and RoomNumber are required' });
            return;
        }
        if (PostPub !== req.body.pub || (HostPub && HostPub !== req.body.pub)) {
            res.status(403).json({ error: 'A record can only be signed by the user it is about' });
            return;
        }
        const contract = await getContract();
        await contract.submitTransaction('recordHash', HostID, RoomNumber, Hash || '', Function || 'record', PostID || HostID, HostPub || '', PostPub, Seq === undefined ? '' : String(Seq), PrevHash || '', String(Count || 0), req.body.signed);
        console.log(`Transaction has been submitted`);
        res.send(data);
    }
    catch (error) {
        sendError(res, error);
    }
});

// Invitations are stored apart from the room records, so they never replace a room's latest hash.
// Every invitation route needs a signed request (#35): the sender signs an invitation, the invited user
// (ToPub) signs reading and answering theirs. The sender's key and signature are kept in the invitation.
// Signed { RoomNumber, From, FromEpub, To, ToPub, DateTime, Key, At }
app.post('/api/invite', async function(req, res){
    try{
        const data = await readSigned(req.body);
        if (!data) { unsigned(res); return; }
        const { RoomNumber, From, FromEpub, To, ToPub, DateTime, Key } = data;
        if (!RoomNumber || !From || !ToPub) {
            res.status(400).json({ error: 'RoomNumber, From and ToPub are required' });
            return;
        }
        const contract = await getContract();
        await contract.submitTransaction('invite', RoomNumber, From, req.body.pub, FromEpub || '', To || '', ToPub, DateTime || '', Key || '', req.body.signed);
        res.send({ RoomNumber, From, To, ToPub });
    } catch (error) {
        sendError(res, error);
    }
});

// Every invitation sent to a public key: [{ RoomNumber, From, FromPub, FromEpub, To, ToPub, DateTime, Key, Sig, Status }].
// Query ?signed= is that key's signature of { List: <pub>, At }, so only its owner can read the list.
app.get('/api/invitations/:pub', async function (req,res){
    try{
        const data = await readSigned({ signed: req.query.signed, pub: req.params.pub });
        if (!data || data.List !== req.params.pub) { unsigned(res); return; }
        const contract = await getContract();
        const result = await contract.evaluateTransaction('queryInvitations', req.params.pub);
        res.send(JSON.parse(result));
    } catch (error) {
        sendError(res, error);
    }
});

// Signed by the invited user: { RoomNumber, Status: accepted | declined, At }
app.post('/api/invitation/respond', async function(req, res){
    try{
        const data = await readSigned(req.body);
        if (!data) { unsigned(res); return; }
        const { RoomNumber, Status } = data;
        if (!RoomNumber || (Status !== 'accepted' && Status !== 'declined')) {
            res.status(400).json({ error: 'RoomNumber and Status (accepted or declined) are required' });
            return;
        }
        const contract = await getContract();
        await contract.submitTransaction('respondInvitation', RoomNumber, req.body.pub, Status);
        res.send({ RoomNumber, ToPub: req.body.pub, Status });
    } catch (error) {
        sendError(res, error);
    }
});

app.listen(PORT, HOST, () => {
    console.log(`API server listening on ${HOST}:${PORT}`);
});
