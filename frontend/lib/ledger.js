// The ledger, through the API server (backend/fabric/apiserver). Every call throws when the ledger cannot be reached.
import axios from 'axios';
import { API_URL } from './config';

// The room's latest ledger record, or "None" when it was never created.
export const queryRoom = async (room) => (await axios.get(`${API_URL}/api/query/${encodeURIComponent(room)}`)).data;

// Every ledger record of the room, oldest first.
export const roomHistory = async (room) => (await axios.get(`${API_URL}/api/history/${encodeURIComponent(room)}`)).data;

// Public keys of everyone the ledger has recorded in the room. Its records cannot be removed, so neither can these members.
export const recordedPubs = (records) => records.flatMap((record) => [record.Value.hostpub, record.Value.postpub]).filter(Boolean);

// Writes a record of a room: { RoomNumber, Function, HostID, HostPub, PostID, PostPub, Hash }. The ledger sets its time.
export const recordHash = (record) => axios.post(`${API_URL}/api/recordhash`, record);
