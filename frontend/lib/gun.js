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

export const GUN_PEER = "http://localhost:8765/gun";

GUN({ store: asyncStore({ AsyncStorage }) })

const gun = new GUN(GUN_PEER);

export { SEA };
export default gun;
