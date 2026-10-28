// The ledger, through the API server (backend/fabric/apiserver). Every call throws when the ledger cannot be reached.
import axios from 'axios';
import { API_URL } from './config';
import { SEA } from './gun';

// The room's latest ledger record, or "None" when it was never created.
export const queryRoom = async (room) => (await axios.get(`${API_URL}/api/query/${encodeURIComponent(room)}`)).data;

// Every ledger record of the room, oldest first.
export const roomHistory = async (room) => (await axios.get(`${API_URL}/api/history/${encodeURIComponent(room)}`)).data;

// Public keys of everyone the ledger has recorded in the room. Its records cannot be removed, so neither can these members.
export const recordedPubs = (records) => records.flatMap((record) => [record.Value.hostpub, record.Value.postpub]).filter(Boolean);

// Writes a record of a room: { RoomNumber, Function, HostID, HostPub, PostID, PostPub, Hash }. The ledger sets its time.
export const recordHash = async (record, pair) => axios.post(`${API_URL}/api/recordhash`, await signed(record, pair));

// { signed, pub }: the payload signed with the user's pair, so the API server knows who sent it (#20, #35).
// At makes it expire, so a captured request cannot be sent again later.
export const signed = async (payload, pair) => ({ signed: await SEA.sign({ ...payload, At: Date.now() }, pair), pub: pair.pub });
