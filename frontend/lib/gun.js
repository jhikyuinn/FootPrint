import 'react-native-get-random-values';
// must load before gun/sea: SEA reads crypto.subtle once, when it is imported
import './cryptoBridge';
import "gun/lib/mobile.js";
import GUN from 'gun/gun';
import SEA from 'gun/sea';
import 'gun/lib/radix.js';
import 'gun/lib/radisk.js';
import 'gun/lib/store.js';
import AsyncStorage from '@react-native-async-storage/async-storage'
import asyncStore from 'gun/lib/ras.js';
import { GUN_PEER } from './config';

GUN({ store: asyncStore({ AsyncStorage }) })

const gun = new GUN(GUN_PEER);

// GUN never reconnects after a dropped connection: on close its reconnect() runs twice, and the second call
// cancels the first one's retry after the peer was already removed from opt.peers (#58).
// So the relay is dialed again, the same way GUN dials it first, whenever no peer is connected.
// shortcut: uses GUN internals (opt.peers, opt.mesh.hi); recheck on a GUN upgrade, e2e/reconnect.mjs catches a break
let dial;
setInterval(() => {
  const { peers, mesh } = gun._.opt;
  // skip while connected, or while the last dial is still connecting
  if(!mesh || Object.keys(peers).length || (dial && dial.wire && dial.wire.readyState === 0)) { return; }
  mesh.hi(dial = { id: GUN_PEER, url: GUN_PEER });
}, 2000);

// GUN does not resend what was written while disconnected, so the relay and the other users never get it (#58).
// Every field written while disconnected is logged with its original state and signature, and kept in storage
// so a reload or restart before reconnecting does not lose it (#64). On reconnecting it is sent again, with the
// fields written just before the drop. A new put would get a new state, and message states are part of the room hash.
const RESEND_MARGIN = 10000; // writes just before the drop may have gone into a socket that was already dead
const UNSENT = 'footprint/unsent';
// when the connection dropped; the app starts disconnected until the relay answers
let droppedAt = Date.now();
// unsent fields, as a GUN put: { soul: { _: { '#': soul, '>': { key: state } }, key: value } }
let unsent = {};
const addField = (put, soul, key, value, state) => {
  const node = put[soul] = put[soul] || { _: { '#': soul, '>': {} } };
  if(node._['>'][key] > state) { return; }
  node[key] = value;
  node._['>'][key] = state;
};
const addPut = (put, from) => Object.entries(from).forEach(([soul, node]) =>
  Object.entries(node._['>']).forEach(([key, state]) => addField(put, soul, key, node[key], state)));
const loaded = AsyncStorage.getItem(UNSENT).then((saved) => { if(saved) { addPut(unsent, JSON.parse(saved)); } }).catch(() => {});

gun._.on('bye', function(peer) { this.to.next(peer); droppedAt = droppedAt || Date.now(); });
// every field that reaches the graph, written here or loaded; only recent ones while disconnected are logged
gun._.on('put', function(msg) {
  this.to.next(msg);
  const put = msg.put;
  if(!droppedAt || !put || !(put['>'] >= droppedAt - RESEND_MARGIN)) { return; }
  addField(unsent, put['#'], put['.'], put[':'], put['>']);
  AsyncStorage.setItem(UNSENT, JSON.stringify(unsent)).catch(() => {});
});
gun._.on('hi', function(peer) {
  this.to.next(peer);
  if(!droppedAt) { return; }
  const since = droppedAt - RESEND_MARGIN;
  droppedAt = 0;
  loaded.then(() => {
    const put = {};
    addPut(put, unsent);
    Object.entries(gun._.graph).forEach(([soul, node]) => {
      const states = (node._ || {})['>'] || {};
      Object.keys(states).filter((key) => states[key] >= since).forEach((key) => addField(put, soul, key, node[key], states[key]));
    });
    if(Object.keys(put).length) { gun._.opt.mesh.say({ put }, peer); }
    // the log is kept a while: if the connection drops again at once, the next reconnect sends it again
    setTimeout(() => {
      if(droppedAt) { return; }
      unsent = {};
      AsyncStorage.removeItem(UNSENT).catch(() => {});
    }, RESEND_MARGIN);
  });
});

// GUN cannot list its root keys, so every room is also registered here:
// rooms.get(name) = { name, host, createdAt }: only read, for rooms made before room info moved to the host's space
// entered.get(alias).get(name) = true for every room that user has entered
export const rooms = gun.get('footprint/rooms');
export const entered = gun.get('footprint/entered');
// room names become GUN node names and URL parts: # breaks GUN, ~ is GUN's user space, / could reach
// the nodes above (a room "footprint/rooms" would write into the room list, #31)
export const ROOM_NAME = /^[0-9A-Za-z가-힣_-]{1,30}$/;
// lastRead().get(name) = GUN time this user last had the room open (in the user's own space)
export const lastRead = () => gun.user().get('lastread');

// shortcut: GUN has no "everything arrived" signal, so reads wait this long for peers; raise it on slow networks
export const WAIT = 1000;

// once() with a deadline: GUN may never answer for data it does not have.
// once() starts on the next tick: called inside another GUN callback, GUN replays its cache under that
// callback's pass, drops the new listener and never asks again, so the read never answers (#56)
export const readOnce = (chain) => new Promise((resolve) => {
  const timer = setTimeout(() => resolve(undefined), WAIT * 3);
  setTimeout(() => chain.once((data) => { clearTimeout(timer); resolve(data); }, { wait: WAIT }));
});

export { SEA, GUN };
export default gun;
