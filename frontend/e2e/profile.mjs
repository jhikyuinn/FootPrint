// Profile photo and introduction, the profile in the chat, and password change (#12),
// in two browsers against the running app.
// Needs the GUN relay, Fabric, the API server and `npx expo start --web` running (see README), and Chrome installed.
// Run from frontend/: npm run e2e:profile
import { chromium } from 'playwright';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const glyphs = require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json');
const APP = process.env.E2E_APP_URL || 'http://localhost:8081';
const stamp = Date.now().toString(36).slice(-5);
const A = 'pa' + stamp, B = 'pb' + stamp, ROOM = 'prof_' + stamp, OLD = 'password123', NEW = 'newpassword456';
const BIO = 'Testing #12';

let failed = 0;
const check = (name, ok) => { if(!ok) { failed++; } console.log((ok ? 'PASS ' : 'FAIL ') + name); };
const icon = (page, name) => page.getByText(String.fromCodePoint(glyphs[name]), { exact: true });
const sees = (locator, timeout = 20000) => locator.waitFor({ timeout }).then(() => true, () => false);
const text = (page, value) => page.getByText(value, { exact: true });

const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL || 'chrome' });
try {
  const open = async () => {
    const page = await (await browser.newContext()).newPage();
    page.dialogs = [];
    page.on('dialog', (d) => { page.dialogs.push(d.message()); d.accept(); });
    await page.goto(APP);
    await text(page, 'Foot Print').waitFor({ timeout: 120000 });
    return page;
  };
  // the next alert's text, from the moment the action starts
  const nextDialog = async (page, action) => {
    const seen = page.dialogs.length;
    await action();
    for(let i = 0; i < 600 && page.dialogs.length === seen; i++) { await page.waitForTimeout(100); }
    return page.dialogs[seen] || '';
  };
  const login = async (page, alias, password) => {
    await page.getByPlaceholder('ID').fill(alias);
    await page.getByPlaceholder('Password (8+ characters)').fill(password);
    await text(page, 'Login').click();
  };
  const signUp = async (page, alias) => {
    await page.getByPlaceholder('ID').fill(alias);
    await page.getByPlaceholder('Password (8+ characters)').fill(OLD);
    await nextDialog(page, () => text(page, 'SignUp').click());
    await login(page, alias, OLD);
    await text(page, 'Chat Search').waitFor({ timeout: 60000 });
  };
  const openUser = async (page) => {
    await text(page, 'Chat Search').waitFor({ timeout: 60000 });
    await icon(page, 'person-circle-outline').click();
    await text(page, 'Edit profile').waitFor();
  };
  const enter = async (page, create) => {
    await page.getByPlaceholder('Room Number').fill(ROOM);
    await icon(page, 'search-outline').click();
    if(create) { await text(page, 'Create room').click(); }
    await text(page, 'LEDGER').waitFor({ timeout: 30000 });
  };

  const a = await open();
  await signUp(a, A);
  await openUser(a);

  // a wide picture, so the center square has to be cut out
  const png = Buffer.from((await a.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 300; canvas.height = 200;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#B5452F'; ctx.fillRect(0, 0, 300, 200);
    return canvas.toDataURL('image/png');
  })).split(',')[1], 'base64');
  await text(a, 'Edit profile').click();
  const chooser = a.waitForEvent('filechooser');
  await text(a, 'Change photo').click();
  await (await chooser).setFiles({ name: 'me.png', mimeType: 'image/png', buffer: png });
  await text(a, 'Remove photo').waitFor({ timeout: 20000 });
  await a.getByPlaceholder('About me').fill(BIO);
  await text(a, 'Save').click();
  const photo = a.getByLabel(A + ' profile photo');
  check('the saved photo and introduction show on the User screen', await sees(photo) && await sees(text(a, BIO)));
  const stored = await photo.evaluate((el) => (el.querySelector('img') || el).getAttribute('src') || getComputedStyle(el.firstChild || el).backgroundImage);
  check('the photo is stored as a small inline JPEG', /data:image\/jpeg;base64,/.test(stored) && stored.length < 20000);

  // web keeps no login, so a reload asks for the password and reads the profile again
  await a.reload();
  await text(a, 'Foot Print').waitFor({ timeout: 120000 });
  await login(a, A, OLD);
  await openUser(a);
  check('the photo and introduction are still there after a reload', await sees(a.getByLabel(A + ' profile photo')) && await sees(text(a, BIO)));

  // B meets A in a room and opens A's profile from the photo next to A's message
  await icon(a, 'chatbubble-ellipses-outline').click();
  await enter(a, true);
  const b = await open();
  await signUp(b, B);
  await enter(b, false);
  await a.getByPlaceholder('My message').fill('hello from A');
  await a.getByPlaceholder('My message').press('Enter');
  await text(b, 'hello from A').waitFor({ timeout: 30000 });
  check("B sees A's photo next to A's message", await sees(b.getByLabel(A + ' profile photo')));
  await b.getByLabel('Open ' + A + "'s profile").first().click();
  check("tapping it shows A's ID and introduction", await sees(text(b, 'Profile')) && await sees(text(b, A).last()) && await sees(text(b, BIO)));
  await b.getByLabel('Close profile').click();

  // leaving the chat by reload (web keeps no login)
  await a.reload();
  await text(a, 'Foot Print').waitFor({ timeout: 120000 });
  await login(a, A, OLD);
  await openUser(a);
  const fill = async (current) => {
    await text(a, 'Change password').click();
    await a.getByPlaceholder('Current password').fill(current);
    await a.getByPlaceholder('New password (8+ characters)').fill(NEW);
    await a.getByPlaceholder('New password again').fill(NEW);
  };
  await fill('wrongpassword');
  const wrong = await nextDialog(a, () => text(a, 'Change password').last().click());
  check('a wrong current password is refused: ' + wrong, wrong !== '' && wrong !== 'Password changed');
  await text(a, 'Cancel').click();

  // this only succeeds if the refused attempt left the old password in place
  await fill(OLD);
  const changed = await nextDialog(a, () => text(a, 'Change password').last().click());
  check('the right current password changes it', changed === 'Password changed');

  await text(a, 'Logout').click();
  await text(a, 'Foot Print').waitFor({ timeout: 60000 });
  const old = await nextDialog(a, () => login(a, A, OLD));
  check('the old password no longer logs in: ' + old, old !== '' && !(await sees(text(a, 'Chat Search'), 3000)));
  await login(a, A, NEW);
  check('the new password logs in', await sees(text(a, 'Chat Search'), 60000));
} catch(err) {
  check('finished without error: ' + err.message.split('\n')[0], false);
}
await browser.close();
console.log(failed ? `${failed} failed` : 'all passed');
process.exit(failed ? 1 : 0);
