import CryptoJS from 'crypto-js';

// Time order, then message key, so every device puts the same messages in the same order.
// `at` is the time GUN stamped on the message: it syncs to every peer, unlike the encrypted createdAt.
export const byTime = (a, b) => (a.at - b.at) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);

// SHA-256 of the room as stored: sender, body and time of every message, in time order.
// Puts m into a list already in byTime order, without sorting it again.
// Messages mostly arrive in order, so the search starts at the end.
export const insertByTime = (list, m) => {
  let i = list.length;
  while(i > 0 && byTime(list[i - 1], m) > 0) { i--; }
  return [...list.slice(0, i), m, ...list.slice(i)];
};

export const hashMessages = (list) =>
  CryptoJS.SHA256(JSON.stringify([...list].sort(byTime).map((m) => [m.name, m.message, m.createdAt]))).toString();

// Hash of the room's first count messages in time order. A record covers the chat as it was when recorded,
// so messages added later do not change it, but changing an earlier message does.
export const hashFirst = (list, count) => hashMessages([...list].sort(byTime).slice(0, count));

// For each ledger record (oldest first), whether the chat still hashes to it: null for a record without a hash,
// or one that covers no messages (a room's creation), which every chat matches.
// shortcut: a message sent before a record but synced to the recorder only after it lands inside the record's
// first count messages and reads as a change; storing the covered message keys would tell them apart.
export const checkRecords = (list, records) =>
  records.map((r) => (r.Value.hash && r.Value.count > 0 ? hashFirst(list, r.Value.count) === r.Value.hash : null));

// What an automatic record of list writes after latest (the room's latest ledger record, or "None"), or null
// when it should not record: fewer than min new messages, or a chat that no longer starts with the messages
// the last hash covers (still syncing, or changed). Seq and PrevHash name the state it builds on, so when
// several members record at once the ledger keeps one and rejects the others.
export const nextRecord = (list, latest, min) => {
  if(latest === "None" || list.length - latest.LastCount < min) { return null; }
  if(hashFirst(list, latest.LastCount) !== latest.LastHash) { return null; }
  return { Hash: hashMessages(list), PrevHash: latest.LastHash, Count: list.length, Seq: latest.Seq + 1 };
};

// Messages newer than readAt; nothing while readAt has not loaded yet, so a room does not flash as all unread.
// times: { messageKey: GUN time of the message }, readAt: GUN time this user last had the room open
export const unreadCount = (times, readAt) =>
  readAt === undefined ? 0 : Object.values(times || {}).filter((at) => at > readAt).length;

// New messages store Date.now(); older ones stored a locale string, which is shown as is.
export const showTime = (t) => (/^\d+$/.test(String(t)) ? new Date(Number(t)).toLocaleString() : t);
