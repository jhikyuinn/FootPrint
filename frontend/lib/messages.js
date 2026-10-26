import CryptoJS from 'crypto-js';

// Time order, then message key, so every device puts the same messages in the same order.
// `at` is the time GUN stamped on the message: it syncs to every peer, unlike the encrypted createdAt.
export const byTime = (a, b) => (a.at - b.at) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);

// SHA-256 of the room as stored: sender, body and time of every message, in time order.
export const hashMessages = (list) =>
  CryptoJS.SHA256(JSON.stringify([...list].sort(byTime).map((m) => [m.name, m.message, m.createdAt]))).toString();

// New messages store Date.now(); older ones stored a locale string, which is shown as is.
export const showTime = (t) => (/^\d+$/.test(String(t)) ? new Date(Number(t)).toLocaleString() : t);
