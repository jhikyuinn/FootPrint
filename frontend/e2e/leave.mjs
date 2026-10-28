// Leaving a room (#41) in two browsers against the running app.
// Needs the GUN relay, Fabric, the API server and `npx expo start --web` running (see README), and Chrome installed.
// Run from frontend/: npm run e2e:leave
import { chromium } from 'playwright';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const glyphs = require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json');
const APP = process.env.E2E_APP_URL || 'http://localhost:8081';
const API = process.env.E2E_API_URL || 'http://localhost:1206';
const stamp = Date.now().toString(36).slice(-5);
const A = 'la' + stamp, B = 'lb' + stamp, FREE = 'leave_' + stamp, SECRET = 'leaves_' + stamp, PW = 'password123', ROOM_PW = 'roompass1';

let failed = 0;
const check = (name, ok) => { if(!ok) { failed++; } console.log((ok ? 'PASS ' : 'FAIL ') + name); };
const icon = (page, name) => page.getByText(String.fromCodePoint(glyphs[name]), { exact: true });
const sees = (locator, timeout = 20000) => locator.waitFor({ timeout }).then(() => true, () => false);
const gone = (locator, timeout = 20000) => locator.waitFor({ state: 'detached', timeout }).then(() => true, () => false);
const text = (page, value) => page.getByText(value, { exact: true });
const history = async (room) => (await (await fetch(`${API}/api/history/${room}`)).json());

const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL || 'chrome' });
try {
  const open = async (alias) => {
    const page = await (await browser.newContext()).newPage();
    page.on('dialog', (d) => { if(process.env.E2E_DEBUG) { console.log('dialog (' + alias + '): ' + d.message()); } d.accept(); });
    await page.goto(APP);
    await text(page, 'Foot Print').waitFor({ timeout: 120000 });
    await page.getByPlaceholder('ID').fill(alias);
    await page.getByPlaceholder('Password (8+ characters)').fill(PW);
    const signedUp = page.waitForEvent('dialog', { timeout: 30000 });
    await text(page, 'SignUp').click();
    await signedUp;
    await text(page, 'Login').click();
    await text(page, 'Chat Search').waitFor({ timeout: 60000 });
    return page;
  };
  // create: null enters an existing room, false makes a free room, true an encrypted one
  const enter = async (page, room, create = null) => {
    await page.getByPlaceholder('Room Number').fill(room);
    await icon(page, 'search-outline').click();
    if(create !== null) {
      if(create) {
        await text(page, 'Encrypted room').click();
        await page.getByPlaceholder('Room password').fill(ROOM_PW);
      }
      await text(page, 'Create room').click();
    }
  };
  const opened = (page) => sees(text(page, 'LEDGER'), 30000);
  const send = async (page, value) => {
    await page.getByPlaceholder('My message').fill(value);
    await page.getByPlaceholder('My message').press('Enter');
  };
  const leave = async (page) => {
    await icon(page, 'list-outline').click();
    await text(page, 'Leave Room').click();
    await text(page, 'Chat Search').waitFor({ timeout: 30000 });
  };
  // leaves the chat and opens it again, so the member list is read again
  const reopen = async (page, room) => {
    await icon(page, 'chevron-back-outline').click();
    await enter(page, room);
    await opened(page);
    await icon(page, 'list-outline').click();
  };

  const a = await open(A), b = await open(B);
  await enter(a, FREE, false);
  await opened(a);
  await enter(b, FREE);
  await opened(b);
  await send(b, 'B was here');
  await text(a, 'B was here').waitFor({ timeout: 30000 });
  await reopen(a, FREE);
  check('A sees B as a member before B leaves', await sees(a.getByLabel('Member ' + B)));
  await icon(a, 'close-outline').first().click();

  await leave(b);
  check("the room is gone from B's room list", await gone(text(b, FREE)));
  const records = await history(FREE);
  const last = records[records.length - 1].Value;
  check('the ledger records the leave', last.function === 'leave' && last.postid === B);

  await reopen(a, FREE);
  check("B is not in A's member list after leaving", await gone(a.getByLabel('Member ' + B)));
  check("B's message is still in the room", await sees(text(a, 'B was here')));
  await icon(a, 'close-outline').first().click();

  await enter(b, FREE);
  await opened(b);
  check('B entering again is recorded', await (async () => {
    for(let i = 0; i < 30; i++) {
      const value = (await history(FREE)).at(-1).Value;
      if(value.function === 'enter' && value.postid === B) { return true; }
      await a.waitForTimeout(1000);
    }
    return false;
  })());
  await reopen(a, FREE);
  check("B is back in A's member list", await sees(a.getByLabel('Member ' + B)));

  // an encrypted room needs its password again after leaving, since the saved room key is removed
  await icon(b, 'chevron-back-outline').click();
  await icon(a, 'close-outline').first().click();
  await icon(a, 'chevron-back-outline').click();
  await enter(a, SECRET, true);
  await opened(a);
  await enter(b, SECRET);
  await b.getByPlaceholder('Room password').fill(ROOM_PW);
  await text(b, 'Enter').click();
  check('B enters the encrypted room with its password', await opened(b));
  await leave(b);
  await enter(b, SECRET);
  check('after leaving, the encrypted room asks for the password again', await sees(b.getByPlaceholder('Room password'), 30000));
} catch(err) {
  check('finished without error: ' + err.message.split('\n')[0], false);
}
await browser.close();
console.log(failed ? `${failed} failed` : 'all passed');
process.exit(failed ? 1 : 0);
