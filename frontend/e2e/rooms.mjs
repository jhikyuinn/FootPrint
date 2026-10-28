// The room list in the user's own space (#85), in a browser against the running app.
// Another browser, not logged in, writes the old public list (footprint/entered/<alias>) straight to the relay, as anyone could.
// Needs the GUN relay, Fabric, the API server and `npx expo start --web` running (see README), and Chrome installed.
// Run from frontend/: npm run e2e:rooms
import { chromium } from 'playwright';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const glyphs = require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json');
const APP = process.env.E2E_APP_URL || 'http://localhost:8081';
const PEER = process.env.E2E_GUN_PEER || 'http://localhost:8765/gun';
const stamp = Date.now().toString(36).slice(-5);
const A = 'ra' + stamp, PW = 'password123';
const OLD = 'old_' + stamp, ROOM = 'rooms_' + stamp, EVIL = 'evil_' + stamp;

let failed = 0;
const check = (name, ok) => { if(!ok) { failed++; } console.log((ok ? 'PASS ' : 'FAIL ') + name); };
const icon = (page, name) => page.getByText(String.fromCodePoint(glyphs[name]), { exact: true });
const sees = (locator, timeout = 20000) => locator.waitFor({ timeout }).then(() => true, () => false);
const text = (page, value) => page.getByText(value, { exact: true });

const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL || 'chrome' });
try {
  // a bare GUN client in its own browser page: not logged in, so it can write the old public list but not A's user space
  const client = async () => {
    const p = await (await browser.newContext()).newPage();
    await p.goto(PEER.replace(/\/gun$/, '/'));
    await p.addScriptTag({ path: require.resolve('gun/gun.js') });
    await p.evaluate((peer) => { window.g = Gun({ peers: [peer] }); }, PEER);
    return p;
  };
  const other = await client();
  const put = (name, value) => other.evaluate(([alias, name, value]) => new Promise((resolve) =>
    g.get('footprint/entered').get(alias).get(name).put(value, (ack) => resolve(ack.err || 'ok'))), [A, name, value]);
  // what the relay holds, read by a new client with nothing cached, so the setup is known to be there
  const relayHas = async (name, value) => {
    const fresh = await client();
    const got = await fresh.evaluate(([alias, name]) => new Promise((resolve) => {
      setTimeout(() => resolve('timeout'), 10000);
      g.get('footprint/entered').get(alias).get(name).once((v) => resolve(v), { wait: 3000 });
    }), [A, name]);
    await fresh.context().close();
    return got === value;
  };
  const page = await (await browser.newContext()).newPage();
  page.on('dialog', (d) => d.accept());
  if(process.env.E2E_DEBUG) { page.on('console', (m) => console.log('console: ' + m.text().slice(0, 200))); }
  const start = async () => {
    await page.goto(APP);
    await text(page, 'Foot Print').waitFor({ timeout: 120000 });
    await page.getByPlaceholder('ID').fill(A);
    await page.getByPlaceholder('Password (8+ characters)').fill(PW);
  };
  // web keeps no login, so each reload logs in again and reads the room list again
  const login = async () => {
    await start();
    await text(page, 'Login').click();
    await text(page, 'Chat Search').waitFor({ timeout: 60000 });
  };
  // a room shows in the list once GUN delivers it; one that never shows is checked after a while
  const listed = (name) => sees(text(page, name), 20000);
  const notListed = async (name) => { await page.waitForTimeout(8000); return (await text(page, name).count()) === 0; };

  // an account from before #85: its rooms are in the old public list when it first logs in
  await start();
  const signedUp = page.waitForEvent('dialog', { timeout: 30000 });
  await text(page, 'SignUp').click();
  await signedUp;
  await put(OLD, true);
  check('(setup) the old public list on the relay holds a room', await relayHas(OLD, true));
  await text(page, 'Login').click();
  await text(page, 'Chat Search').waitFor({ timeout: 60000 });
  check('a room from the old public list is moved into the new list', await listed(OLD));

  await page.getByPlaceholder('Room Number').fill(ROOM);
  await icon(page, 'search-outline').click();
  await text(page, 'Create room').click();
  await text(page, 'LEDGER').waitFor({ timeout: 30000 });
  await icon(page, 'chevron-back-outline').click();
  check('an entered room is listed', await listed(ROOM));

  // after the move, the old list is ignored: adding or removing rooms there changes nothing
  await put(EVIL, true);
  await put(ROOM, null);
  check('(setup) the old public list on the relay was changed by another client', await relayHas(EVIL, true) && await relayHas(ROOM, null));
  await page.reload();
  await login();
  check('a room someone else put in the old list does not show', await listed(ROOM) && await notListed(EVIL));

  await page.getByPlaceholder('Room Number').fill(ROOM);
  await icon(page, 'search-outline').click();
  await text(page, 'LEDGER').waitFor({ timeout: 30000 });
  await icon(page, 'list-outline').click();
  await text(page, 'Leave Room').click();
  await text(page, 'Chat Search').waitFor({ timeout: 30000 });
  await page.reload();
  await login();
  check('a left room stays gone after logging in again', await listed(OLD) && await notListed(ROOM));
} catch(err) {
  check('finished without error: ' + err.message.split('\n')[0], false);
}
await browser.close();
console.log(failed ? `${failed} failed` : 'all passed');
process.exit(failed ? 1 : 0);
