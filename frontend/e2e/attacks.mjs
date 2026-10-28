// Attacks on a user's own space (~pub), from a GUN client that is not logged in and has no SEA:
// it writes raw values to the relay, as anyone on the network could. Each PASS means the attack failed.
// Needs the GUN relay, Fabric, the API server and `npx expo start --web` running (see README), and Chrome installed.
// Run from frontend/: npm run e2e:attacks
import { chromium } from 'playwright';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const glyphs = require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json');
const APP = process.env.E2E_APP_URL || 'http://localhost:8081';
const PEER = process.env.E2E_GUN_PEER || 'http://localhost:8765/gun';
const stamp = Date.now().toString(36).slice(-5);
const A = 'xa' + stamp, PW = 'password123';
const KEEP = 'keep_' + stamp, LEFT = 'left_' + stamp, EVIL1 = 'evila_' + stamp, EVIL2 = 'evilb_' + stamp;

// how this GUN version stores a signed value: {":": value, "~": signature} as a string
const signedValue = (v) => typeof v === 'string' && v.startsWith('{":"') && v.includes('"~":');
let failed = 0;
const check = (name, ok) => { if(!ok) { failed++; } console.log((ok ? 'PASS ' : 'FAIL ') + name); };
const icon = (page, name) => page.getByText(String.fromCodePoint(glyphs[name]), { exact: true });
const text = (page, value) => page.getByText(value, { exact: true });

const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL || 'chrome' });
try {
  // plain gun.js, no SEA: it neither signs nor checks signatures
  const client = async () => {
    const p = await (await browser.newContext()).newPage();
    await p.goto(PEER.replace(/\/gun$/, '/'));
    await p.addScriptTag({ path: require.resolve('gun/gun.js') });
    await p.evaluate((peer) => { window.g = Gun({ peers: [peer] }); }, PEER);
    return p;
  };
  const attacker = await client();
  // inside a user's space even the link to a child node is signed, so a client without SEA cannot follow it:
  // the attacker names the child node (its soul, ~pub/entered) directly
  const node = (path) => `g.get(${JSON.stringify(path[0])})` + path.slice(1).map((k) => `.get(${JSON.stringify(k)})`).join('');
  // the raw value as stored (a signed value reads as "SEA{...}" without SEA), read by a fresh client
  const raw = async (path) => {
    const fresh = await client();
    const value = await fresh.evaluate((code) => new Promise((resolve) => {
      setTimeout(() => resolve('timeout'), 10000);
      eval(code).once((v) => resolve(v === undefined ? 'undefined' : v), { wait: 3000 });
    }), node(path));
    await fresh.context().close();
    return value;
  };
  const write = (path, value) => attacker.evaluate(([code, value]) => new Promise((resolve) => {
    setTimeout(() => resolve('no ack'), 10000);
    eval(code).put(value, (ack) => resolve(ack.err || 'ok'));
  }), [node(path), value]);

  // the app, as A; each new context is a new device
  const device = async () => {
    const page = await (await browser.newContext()).newPage();
    page.on('dialog', (d) => d.accept());
    await page.goto(APP);
    await text(page, 'Foot Print').waitFor({ timeout: 120000 });
    return page;
  };
  const login = async (page) => {
    await page.getByPlaceholder('ID').fill(A);
    await page.getByPlaceholder('Password (8+ characters)').fill(PW);
    await text(page, 'Login').click();
    await text(page, 'Chat Search').waitFor({ timeout: 60000 });
  };
  const enter = async (page, room, create) => {
    await page.getByPlaceholder('Room Number').fill(room);
    await icon(page, 'search-outline').click();
    if(create) { await text(page, 'Create room').click(); }
    await text(page, 'LEDGER').waitFor({ timeout: 30000 });
  };
  const listed = async (page, name) => { await page.waitForTimeout(8000); return (await text(page, name).count()) > 0; };

  const a = await device();
  await a.getByPlaceholder('ID').fill(A);
  await a.getByPlaceholder('Password (8+ characters)').fill(PW);
  const signedUp = a.waitForEvent('dialog', { timeout: 30000 });
  await text(a, 'SignUp').click();
  await signedUp;
  await login(a);
  for(const room of [KEEP, LEFT]) { await enter(a, room, true); await icon(a, 'chevron-back-outline').click(); }

  // A's public key, from the alias index anyone can read
  const pub = await attacker.evaluate((alias) => new Promise((resolve) => {
    g.get('~@' + alias).once((d) => resolve(Object.keys(d || {}).find((k) => k[0] === '~').slice(1)), { wait: 3000 });
  }), A);
  const oldLeft = await raw(['~' + pub + '/entered', LEFT]);
  const moved = await raw(['~' + pub + '/moved', 'entered']);
  console.log('(setup) A = ' + A + ', pub = ' + String(pub).slice(0, 12) + '..., values read: ' + [oldLeft, moved].map((v) => String(v).slice(0, 12)).join(', '));
  check('(setup) the attacker can read the values A signed', [oldLeft, moved].every(signedValue));

  // A leaves LEFT: its entry is now a newer signed null
  await enter(a, LEFT, false);
  await icon(a, 'list-outline').click();
  await text(a, 'Leave Room').click();
  await text(a, 'Chat Search').waitFor({ timeout: 30000 });

  // 1. unsigned writes into A's space: add a room, remove one
  const acks = [];
  acks.push(await write(['~' + pub + '/entered', EVIL1], true));
  acks.push(await write(['~' + pub + '/entered', KEEP], null));
  // 2. a value A signed elsewhere, moved to another key
  acks.push(await write(['~' + pub + '/entered', EVIL2], moved));
  // 3. A's old signed true for the room A left, sent again
  acks.push(await write(['~' + pub + '/entered', LEFT], oldLeft));
  console.log('(info) relay answers to the 4 writes: ' + acks.join(' | '));
  const keepOnRelay = await raw(['~' + pub + '/entered', KEEP]);
  console.log('(info) the relay now holds for KEEP: ' + String(keepOnRelay).slice(0, 20));

  await a.reload();
  await text(a, 'Foot Print').waitFor({ timeout: 120000 });
  await login(a);
  check('1. an unsigned write cannot add a room to A\'s list', !(await listed(a, EVIL1)));
  check('1. an unsigned write cannot remove a room from A\'s list', await listed(a, KEEP));
  check('2. a value A signed for another key is not accepted', !(await listed(a, EVIL2)));
  check('3. A\'s old signed value does not bring back a room A left', !(await listed(a, LEFT)));

  // 4. on a new device everything comes from the relay, which keeps whatever it was sent
  const other = await device();
  await login(other);
  check('4. on a new device A still sees the room the unsigned write tried to remove', await listed(other, KEEP));
  check('4. on a new device the attacker\'s rooms do not show', !(await listed(other, EVIL1)) && !(await listed(other, EVIL2)) && !(await listed(other, LEFT)));
} catch(err) {
  check('finished without error: ' + err.message.split('\n')[0], false);
}
await browser.close();
console.log(failed ? `${failed} failed` : 'all passed');
process.exit(failed ? 1 : 0);
