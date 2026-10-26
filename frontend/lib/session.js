import React, { useEffect } from 'react';
import gun from './gun';

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
