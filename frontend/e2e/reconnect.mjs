// Reconnect after a dropped relay connection (#58), in two browsers against the running app.
// Needs Fabric, the API server, the GUN relay and `npx expo start --web` running (see README), and Chrome installed.
// Run from frontend/: npm run e2e
import { chromium } from 'playwright';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const glyphs = require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json');
const APP = process.env.E2E_APP_URL || 'http://localhost:8081';
const stamp = Date.now().toString(36).slice(-5);
const A = 'ea' + stamp, B = 'eb' + stamp, PW = 'password123', ROOM = 'e2e_' + stamp;

let failed = 0;
const check = (name, ok) => { if(!ok) { failed++; } console.log((ok ? 'PASS ' : 'FAIL ') + name); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const icon = (page, name) => page.getByText(String.fromCodePoint(glyphs[name]), { exact: true });
const sees = (page, text) => page.getByText(text, { exact: true }).waitFor({ timeout: 20000 }).then(() => true, () => false);

async function signUpAndLogin(page, alias) {
  await page.goto(APP);
  await page.getByText('Foot Print').waitFor({ timeout: 120000 });
  await page.getByPlaceholder('ID').fill(alias);
  await page.getByPlaceholder('Password (8+ characters)').fill(PW);
  const signedUp = page.waitForEvent('dialog', { timeout: 30000 });
  await page.getByText('SignUp', { exact: true }).click();
  await signedUp;
  await page.getByText('Login', { exact: true }).click();
  await page.getByText('Chat Search').waitFor({ timeout: 60000 });
}

async function enter(page, create) {
  await page.getByPlaceholder('Room Number').fill(ROOM);
  await icon(page, 'search-outline').click();
  if(create) { await page.getByText('Create room', { exact: true }).click(); }
  await page.getByText('LEDGER', { exact: true }).waitFor({ timeout: 30000 });
}

async function send(page, text) {
  await page.getByPlaceholder('My message').fill(text);
  await page.getByPlaceholder('My message').press('Enter');
}

// B's socket to the relay goes through this route: cut() closes it, refuses new connections for ms and runs during() meanwhile
async function routeRelay(page) {
  const net = { blocked: false, live: [] };
  await page.routeWebSocket(/\/gun$/, (ws) => {
    if(net.blocked) { ws.close(); return; }
    ws.connectToServer();
    net.live.push(ws);
  });
  return async (ms, during) => {
    net.blocked = true;
    net.live.splice(0).forEach((ws) => ws.close());
    await sleep(500);
    await during();
    await sleep(ms);
    net.blocked = false;
  };
}

const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL || 'chrome' });
try {
  const page = async () => {
    const p = await (await browser.newContext()).newPage();
    p.on('dialog', (d) => d.accept());
    return p;
  };
  const a = await page(), b = await page();
  const cut = await routeRelay(b);
  await signUpAndLogin(a, A);
  await enter(a, true);
  await send(a, 'before the drop');
  await signUpAndLogin(b, B);
  await enter(b, false);
  check('B sees A before the drop', await sees(b, 'before the drop'));
  // 1s: GUN's own retry gets cancelled; 8s: longer than its 2s retry
  for(const ms of [1000, 8000]) {
    await cut(ms, () => send(b, `B during ${ms}ms`));
    await sleep(4000);
    await send(a, `A after ${ms}ms`);
    await send(b, `B after ${ms}ms`);
    check(`after a ${ms}ms drop, B gets A's message`, await sees(b, `A after ${ms}ms`));
    check(`after a ${ms}ms drop, A gets B's message`, await sees(a, `B after ${ms}ms`));
    check(`after a ${ms}ms drop, A gets what B sent while cut off`, await sees(a, `B during ${ms}ms`));
  }
} catch(err) {
  check('finished without error: ' + err.message.split('\n')[0], false);
}
await browser.close();
console.log(failed ? `${failed} failed` : 'all passed');
process.exit(failed ? 1 : 0);
