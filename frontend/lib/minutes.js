// Minutes: a room's messages in a file anyone can check without the app, the room password or the room key.
// For each message it proves who wrote it (the sender's GUN signature), what it says (the message's own
// AES key, which opens that message only) and that the ledger hashes cover it unchanged.
import CryptoJS from 'crypto-js';
import { checkRecords, byTime } from './messages.js';

export const FORMAT = 'footprint-minutes/1';
// the signed fields of a message, as the sender wrote them (both encrypted)
const FIELDS = ['message', 'createdAt'];

// The AES key SEA used for one ciphertext: SHA-256 of the encryption secret and the ciphertext's salt
// (gun/sea.js aeskey). It opens this ciphertext only, and the secret cannot be worked back from it.
// Buffer is SEA.Buffer, so the salt is read exactly as SEA reads it.
export const aesKey = (secret, ciphertext, Buffer) => {
  const salt = Buffer.from(JSON.parse(ciphertext.slice(3)).s, 'base64').toString('utf8');
  return CryptoJS.SHA256(secret + salt).toString(CryptoJS.enc.Base64);
};

// One message of the minutes. node is the message's raw GUN node, whose values are still signed:
// { ":": value, "~": signature }, with the write times in node._[">"]. secret is the key it was encrypted with.
export const minuteMessage = ({ soul, pub, alias, text, time, node, secret, Buffer }) => ({
  soul,
  sender: pub,
  alias,
  text,
  time: String(time),
  fields: Object.fromEntries(FIELDS.map((field) => {
    const raw = JSON.parse(node[field]);
    return [field, { value: raw[':'], sig: raw['~'], state: node._['>'][field], key: aesKey(secret, raw[':'], Buffer) }];
  })),
});

// A sender's account name as their key signed it. node is the raw user node (gun._.graph['~' + pub]).
// This proves which account wrote a message, not which person holds the account (see README, limits).
export const minuteSender = (node) => {
  const raw = JSON.parse(node.alias);
  return { alias: raw[':'], sig: raw['~'], state: node._['>'].alias };
};

// senders: { pub: minuteSender(...) } for every sender in messages
export const buildMinutes = ({ room, by, messages, senders, records, exportedAt }) => ({
  format: FORMAT,
  room,
  exportedAt,
  exportedBy: by,
  senders,
  messages: [...messages].sort((a, b) => byTime(entry(a), entry(b))),
  // for reading only: a verifier takes the records from the ledger, never from the file
  records,
});

// A minutes message as the room hash sees it (lib/messages hashMessages)
const entry = (m) => ({ key: m.soul, at: m.fields.message.state, name: m.sender, message: m.fields.message.value, createdAt: m.fields.createdAt.value });

const fromBase64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

// Opens one SEA ciphertext with its own AES key; undefined when the key does not open it.
// AES-GCM checks the ciphertext too, so a changed one never opens.
export async function aesDecrypt(ciphertext, key) {
  try {
    const { ct, iv } = JSON.parse(ciphertext.slice(3));
    const aes = await crypto.subtle.importKey('raw', fromBase64(key), 'AES-GCM', false, ['decrypt']);
    return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(iv) }, aes, fromBase64(ct)));
  } catch (e) {
    return undefined;
  }
}

// Checks minutes against the room's ledger records (oldest first, as /api/history returns them).
// verify is SEA.verify: it gives back the signed data when the signature is the sender's, undefined otherwise.
export async function verifyMinutes(minutes, records, verify) {
  // each sender: the account name their key signed, and the first ledger record of them in the room
  const senders = Object.fromEntries(await Promise.all(Object.entries(minutes.senders || {}).map(async ([pub, a]) => {
    const aliasSigned = undefined !== await verify({ m: { '#': '~' + pub, '.': 'alias', ':': a.alias, '>': a.state }, s: a.sig }, pub);
    const first = records.findIndex((r) => r.Value.hostpub === pub || r.Value.postpub === pub);
    const entered = first === -1 ? null : { record: first + 1, function: records[first].Value.function, datetime: records[first].Timestamp, txid: records[first].TxId };
    return [pub, { alias: a.alias, aliasSigned, entered }];
  })));
  const messages = await Promise.all(minutes.messages.map(async (m) => {
    // the soul is in the sender's own space, where only their key can write
    const inSpace = m.soul.startsWith('~' + m.sender + '/');
    const fields = await Promise.all(FIELDS.map(async (field) => {
      const f = m.fields[field];
      const signed = undefined !== await verify({ m: { '#': m.soul, '.': field, ':': f.value, '>': f.state }, s: f.sig }, m.sender);
      const plain = await aesDecrypt(f.value, f.key);
      return { signed, opens: plain === (field === 'message' ? m.text : m.time) };
    }));
    return {
      soul: m.soul,
      alias: m.alias,
      inSpace,
      signed: fields.every((f) => f.signed),
      textMatches: fields.every((f) => f.opens),
      // the sender's signed account name is known, and the ledger recorded them in the room
      member: Boolean(senders[m.sender] && senders[m.sender].aliasSigned && senders[m.sender].entered),
    };
  }));
  const matches = checkRecords(minutes.messages.map(entry), records);
  // how many of the first messages a matching ledger hash covers
  const covered = Math.max(0, ...records.filter((r, i) => matches[i] === true).map((r) => r.Value.count));
  const ok = minutes.format === FORMAT
    && messages.every((m) => m.inSpace && m.signed && m.textMatches && m.member)
    && !matches.includes(false);
  return { ok, senders, messages, matches, covered };
}
