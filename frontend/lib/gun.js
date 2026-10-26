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

// GUN cannot list its root keys, so every room is also registered here:
// rooms.get(name) = { name, host, createdAt }
// entered.get(alias).get(name) = true for every room that user has entered
export const rooms = gun.get('footprint/rooms');
export const entered = gun.get('footprint/entered');

// shortcut: GUN has no "everything arrived" signal, so reads wait this long for peers; raise it on slow networks
export const WAIT = 1000;

// once() with a deadline: GUN may never answer for data it does not have
export const readOnce = (chain) => new Promise((resolve) => {
  const timer = setTimeout(() => resolve(undefined), WAIT * 3);
  chain.once((data) => { clearTimeout(timer); resolve(data); }, { wait: WAIT });
});

export { SEA, GUN };
export default gun;
