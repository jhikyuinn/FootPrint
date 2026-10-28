// Encrypted rooms: messages are encrypted with a room key made from the room password.
// The room info holds secret, salt and check; check lets a password be verified.
// It lives in the host's own space (~hostpub/rooms/<room>), where only the host can write.
// Each user keeps the keys of the rooms they entered in their own space, encrypted to their own pair,
// so the password is asked only once per account.
import gun, { SEA, rooms, readOnce } from './gun';
import { queryRoom } from './ledger';

const CHECK = 'footprint';

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

// Whether `key` opens the room's check, so it is the key of this encrypted room
async function keyFits(info, key) {
  return !!(info && info.secret && info.check) && (await SEA.decrypt(info.check, key)) === CHECK;
}

// The room key, or null when the password is wrong
export async function unlockRoom(info, password) {
  const key = await SEA.work(password, info.salt);
  return (await keyFits(info, key)) ? key : null;
}

// Keeps a room key from an invitation. Anyone can send an invitation (#20), so the key must fit the room,
// and a key this user already has is never replaced: otherwise their messages could go out under a key
// only the inviter knows (#30). False when the key does not fit or the room info cannot be read.
export async function acceptRoomKey(room, key, pair) {
  if(await loadRoomKey(room, pair)) { return true; }
  if(!(await keyFits(await readRoom(room).catch(() => null), key))) { return false; }
  await saveRoomKey(room, key, pair);
  return true;
}

export async function saveRoomKey(room, key, pair) {
  gun.user().get('roomkeys').get(room).put(await SEA.encrypt(key, pair));
}

export async function loadRoomKey(room, pair) {
  const stored = await readOnce(gun.user().get('roomkeys').get(room));
  return stored ? (await SEA.decrypt(stored, pair)) || null : null;
}

// Public keys of every account with this alias. GUN does not stop two accounts from taking the same alias.
export async function aliasAccounts(alias) {
  const ref = await readOnce(gun.get('~@' + alias));
  return Object.keys(ref || {}).filter((k) => k[0] === '~').map((k) => k.slice(1));
}

// A user's { pub, epub } by alias: undefined when there is no such user,
// null when several accounts share the alias, so the caller cannot pick the wrong one (#32)
export async function findUser(alias) {
  const pubs = await aliasAccounts(alias);
  if(pubs.length > 1) { return null; }
  const user = pubs[0] && await readOnce(gun.get('~' + pubs[0]));
  return user && user.epub ? { pub: pubs[0], epub: user.epub } : undefined;
}

// The room key encrypted so only the user with `epub` can open it (with the sender's epub)
export async function sealKeyFor(key, epub, pair) {
  return SEA.encrypt(key, await SEA.secret(epub, pair));
}

export async function openSealedKey(sealed, fromEpub, pair) {
  return (await SEA.decrypt(sealed, await SEA.secret(fromEpub, pair))) || null;
}
