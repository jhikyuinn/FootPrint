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

// GUN cannot list its root keys, so every room is also registered here:
// rooms.get(name) = { name, host, createdAt }: only read, for rooms made before room info moved to the host's space
// entered.get(alias).get(name) = true for every room that user has entered
export const rooms = gun.get('footprint/rooms');
export const entered = gun.get('footprint/entered');
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
