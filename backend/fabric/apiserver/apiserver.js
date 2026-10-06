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
                postid: entry.Value.PostID,
                hash: entry.Value.Hash,
                datetime: entry.Value.DateTime,
            },
        }));
        res.send(history);
    } catch (error) {
        sendError(res, error);
    }
});

app.post('/api/recordhash', async function(req, res){
    try{
        const { HostID, RoomNumber, DateTime, Hash, Function, PostID } = req.body;
        if (!HostID || !RoomNumber) {
            res.status(400).json({ error: 'HostID and RoomNumber are required' });
            return;
        }
        const contract = await getContract();
        await contract.submitTransaction('recordHash', HostID, RoomNumber, DateTime || '', Hash || '', Function || 'record', PostID || HostID);
        console.log(`Transaction has been submitted`);
        res.send(req.body);
    }
    catch (error) {
        sendError(res, error);
    }
});


app.listen(PORT, HOST, () => {
    console.log(`API server listening on ${HOST}:${PORT}`);
});
