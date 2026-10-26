// Encrypted rooms: messages are encrypted with a room key made from the room password.
// The room info holds secret, salt and check; check lets a password be verified.
// It lives in the host's own space (~hostpub/rooms/<room>), where only the host can write.
// Each user keeps the keys of the rooms they entered in their own space, encrypted to their own pair,
// so the password is asked only once per account.
import axios from 'axios';
import gun, { SEA, rooms, readOnce } from './gun';
import { API_URL } from './config';

const CHECK = 'footprint';

// The room's latest ledger record, or "None" when it was never created. Throws when the ledger cannot be reached.
export const queryRoom = async (room) => (await axios.get(`${API_URL}/api/query/${encodeURIComponent(room)}`)).data;

// The room info: undefined for a room that was never created, null when its host's info cannot be read.
// The ledger fixes the host (HostPub, from the room's first record), so nobody else can stand in for it.
export async function readRoom(room) {
  const record = await queryRoom(room);
  if(record === 'None') { return undefined; }
  // shortcut: rooms recorded before HostPub keep their info in the public room list, which anyone can change;
  // members with a saved key are still safe (Chat uses the key first), move these rooms if newcomers need the same
  if(!record.HostPub) { return readOnce(rooms.get(room)); }
  return (await readOnce(gun.get('~' + record.HostPub).get('rooms').get(room))) || null;
}

// { key, info }: info is merged into the room info, key is the room key
export async function makeSecretRoom(password) {
  const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
  const key = await SEA.work(password, salt);
  return { key, info: { secret: true, salt, check: await SEA.encrypt(CHECK, key) } };
}

// The room key, or null when the password is wrong
export async function unlockRoom(info, password) {
  const key = await SEA.work(password, info.salt);
  return (await SEA.decrypt(info.check, key)) === CHECK ? key : null;
}

export async function saveRoomKey(room, key, pair) {
  gun.user().get('roomkeys').get(room).put(await SEA.encrypt(key, pair));
}

export async function loadRoomKey(room, pair) {
  const stored = await readOnce(gun.user().get('roomkeys').get(room));
  return stored ? (await SEA.decrypt(stored, pair)) || null : null;
}

// A user's public encryption key by alias, or undefined when there is no such user
export async function findUserEpub(alias) {
  const ref = await readOnce(gun.get('~@' + alias));
  const soul = ref && Object.keys(ref).find((k) => k[0] === '~');
  const user = soul && await readOnce(gun.get(soul));
  return user ? user.epub : undefined;
}

// The room key encrypted so only the user with `epub` can open it (with the sender's epub)
export async function sealKeyFor(key, epub, pair) {
  return SEA.encrypt(key, await SEA.secret(epub, pair));
}

export async function openSealedKey(sealed, fromEpub, pair) {
  return (await SEA.decrypt(sealed, await SEA.secret(fromEpub, pair))) || null;
}
