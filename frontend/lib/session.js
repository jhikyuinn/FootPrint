import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import gun from './gun';

// Staying logged in (#11): the login is kept in the device's secure store (Keychain / Keystore), never in
// AsyncStorage, which is not encrypted. The pair is kept, not the password: logging in with it needs no network.
// shortcut: web has no secure store, so web asks for the password every time
const STORED = 'footprint.login';
const canStore = Platform.OS !== 'web';

export async function rememberLogin(alias, pair) {
  if(canStore) { await SecureStore.setItemAsync(STORED, JSON.stringify({ alias, pair })); }
}

export async function forgetLogin() {
  if(canStore) { await SecureStore.deleteItemAsync(STORED); }
}

// Logs in with the kept login; false when there is none or GUN refuses it (then it is dropped)
export async function restoreLogin() {
  const stored = canStore && await SecureStore.getItemAsync(STORED);
  if(!stored) { return false; }
  const { alias, pair } = JSON.parse(stored);
  const ok = await new Promise((resolve) => gun.user().auth(pair, (res) => resolve(!res.err)));
  if(!ok) { await forgetLogin(); return false; }
  // GUN names a user logged in by pair after its public key; the screens show the alias
  gun.user().is.alias = alias;
  return true;
}

// The logged-in user from GUN's own session: { alias, pair }, or null when nobody is logged in.
// The pair holds the private keys, so it stays in memory and never goes into navigation params.
export function session() {
  const user = gun.user();
  return user.is && user._.sea ? { alias: user.is.alias, pair: user._.sea } : null;
}

// A screen that needs a login gets alias and pair as props; without a session it goes back to Main.
export function withSession(Screen) {
  return function SessionScreen(props) {
    const me = session();
    useEffect(() => {
      if(!me) { props.navigation.reset({ index: 0, routes: [{ name: 'Main' }] }); }
    }, [!me]);
    return me ? <Screen {...props} alias={me.alias} pair={me.pair} /> : null;
  };
}
