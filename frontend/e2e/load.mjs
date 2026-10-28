// How long a room with many messages takes to open (#45): a measurement, not a pass/fail test.
// A browser GUN client logged in as the user writes N messages the way the app does (encrypted, in the user's space),
// then a new device (nothing cached) opens the room and the times are printed.
// Needs the GUN relay, Fabric, the API server and `npx expo start --web` running (see README), and Chrome installed.
// Run from frontend/: npm run e2e:load   (E2E_COUNT=1000 by default)
import { chromium } from 'playwright';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const glyphs = require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json');
const APP = process.env.E2E_APP_URL || 'http://localhost:8081';
const PEER = process.env.E2E_GUN_PEER || 'http://localhost:8765/gun';
const COUNT = Number(process.env.E2E_COUNT || 1000);
// E2E_REUSE=<stamp of an earlier run> opens that run's room again instead of writing a new one
const REUSE = process.env.E2E_REUSE;
const stamp = REUSE || Date.now().toString(36).slice(-5);
const A = 'ma' + stamp, PW = 'password123', ROOM = 'load_' + stamp;
const label = (i) => 'load ' + String(i).padStart(4, '0');

const icon = (page, name) => page.getByText(String.fromCodePoint(glyphs[name]), { exact: true });
const text = (page, value) => page.getByText(value, { exact: true });
const seconds = (ms) => (ms / 1000).toFixed(1) + 's';

const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL || 'chrome' });
let code = 0;
try {
  const device = async () => {
    const page = await (await browser.newContext()).newPage();
    page.on('dialog', (d) => d.accept());
    await page.goto(APP);
    await text(page, 'Foot Print').waitFor({ timeout: 120000 });
    await page.getByPlaceholder('ID').fill(A);
    await page.getByPlaceholder('Password (8+ characters)').fill(PW);
    return page;
  };
  const login = async (page) => {
    await text(page, 'Login').click();
    await text(page, 'Chat Search').waitFor({ timeout: 60000 });
  };

  if(!REUSE) {
    // sign up, and create the free room (its messages use the sender's epub as the key)
    const a = await device();
    const signedUp = a.waitForEvent('dialog', { timeout: 30000 });
    await text(a, 'SignUp').click();
    await signedUp;
    await login(a);
    await a.getByPlaceholder('Room Number').fill(ROOM);
    await icon(a, 'search-outline').click();
    await text(a, 'Create room').click();
    await text(a, 'LEDGER').waitFor({ timeout: 30000 });
    await a.context().close();

    // the same account in a bare GUN + SEA page writes the messages
    const seeder = await (await browser.newContext()).newPage();
    await seeder.goto(PEER.replace(/\/gun$/, '/'));
    await seeder.addScriptTag({ path: require.resolve('gun/gun.js') });
    await seeder.addScriptTag({ path: require.resolve('gun/sea.js') });
    const started = Date.now();
    const acked = await seeder.evaluate(([peer, alias, pw, room, count]) => new Promise((resolve, reject) => {
      const gun = Gun({ peers: [peer] });
      const user = gun.user();
      user.auth(alias, pw, async (ack) => {
        if(ack.err) { reject(new Error(ack.err)); return; }
        const key = user._.sea.epub;
        let done = 0;
        const write = async (i) => {
          const message = await SEA.encrypt('load ' + String(i).padStart(4, '0'), key);
          const createdAt = await SEA.encrypt(String(Date.now()), key);
          await new Promise((ok) => {
            const timer = setTimeout(ok, 10000);
            user.get('msgs').get(room).set({ message, createdAt }, (ack) => { clearTimeout(timer); if(!ack.err) { done++; } ok(); });
          });
        };
        // in batches, so the relay is not sent everything at once; the last one alone, so it is the latest
        for(let start = 0; start < count - 1; start += 50) {
          await Promise.all(Array.from({ length: Math.min(50, count - 1 - start) }, (_, j) => write(start + j)));
        }
        await write(count - 1);
        resolve(done);
      });
    }), [PEER, A, PW, ROOM, COUNT]);
    console.log(`(setup) wrote ${acked}/${COUNT} messages in ${seconds(Date.now() - started)}, account ${A} / ${PW}, room ${ROOM}`);
    await seeder.context().close();
  }

  // a new device opens the room
  const b = await device();
  await login(b);
  await b.getByPlaceholder('Room Number').fill(ROOM);
  const opening = Date.now();
  await icon(b, 'search-outline').click();
  await text(b, 'LEDGER').waitFor({ timeout: 60000 });
  console.log('room screen shown after ' + seconds(Date.now() - opening));
  const shown = () => b.getByText(/^load \d{4}$/).count();
  let first = null;
  const latest = text(b, label(COUNT - 1));
  for(const until = Date.now() + Number(process.env.E2E_WAIT || 180000); Date.now() < until && !(await latest.count());) {
    if(first === null && await shown()) { first = Date.now() - opening; }
    await b.waitForTimeout(250);
  }
  const last = (await latest.count()) ? Date.now() - opening : null;
  console.log('first message shown after ' + ((first ?? last) === null ? 'never' : seconds(first ?? last)));
  console.log('latest message shown after ' + (last === null ? 'never' : seconds(last)));
  console.log('messages drawn: ' + await shown());

  // scroll to the top of the list, and time until older messages are drawn; the message that was at the top
  // must still be in view afterwards (the list keeps the reader's place)
  // twice right away, while messages may still arrive, then twice once they have (a new message would add to the count too)
  for(let page = 1; page <= 4 && last !== null; page++) {
    if(page === 3) { await b.waitForTimeout(Number(process.env.E2E_SETTLE || 30000)); }
    const before = await shown();
    if(before >= COUNT) { break; }
    const top = await b.getByText(/^load \d{4}$/).first().textContent();
    const scrolled = Date.now();
    await latest.evaluate((el) => {
      while(el && !(el.scrollHeight > el.clientHeight && /(auto|scroll)/.test(getComputedStyle(el).overflowY))) { el = el.parentElement; }
      el.scrollTop = 0;
    });
    let after = before;
    for(const until = Date.now() + 30000; Date.now() < until && after <= before;) { await b.waitForTimeout(50); after = await shown(); }
    const waited = Date.now() - scrolled;
    // while messages still arrive, one landing before the scroll registers can push the top message out first
    const kept = !(await text(b, top).count()) ? 'no, it was pushed out' : await text(b, top).evaluate((el) => {
      let list = el;
      while(list && !(list.scrollHeight > list.clientHeight && /(auto|scroll)/.test(getComputedStyle(list).overflowY))) { list = list.parentElement; }
      const r = el.getBoundingClientRect(), v = list.getBoundingClientRect();
      return r.bottom > v.top && r.top < v.bottom;
    });
    console.log(`scroll up ${page}: ${before} -> ${after} drawn after ${(waited / 1000).toFixed(2)}s, the top message ${top} still in view: ${kept}`);
  }
} catch(err) {
  console.log('error: ' + err.message.split('\n')[0]);
  code = 1;
}
await browser.close();
process.exit(code);
