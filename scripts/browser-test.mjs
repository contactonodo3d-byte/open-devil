import { chromium } from 'playwright-core';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const index = 'file://' + path.join(root, 'index.html');
const shot = path.resolve('/workspace/open-devil-v2.png');

const consoleErrors = [];
const pageErrors = [];

const exeCandidates = [
  '/home/box/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome',
  '/home/box/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome'
];
const exe = exeCandidates.find((p) => fs.existsSync(p));
console.log('using chrome', exe);

const browser = await chromium.launch({
  headless: true,
  executablePath: exe,
  args: ['--allow-file-access-from-files', '--disable-web-security', '--no-sandbox']
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('console', (msg) => {
  const t = msg.type();
  const text = msg.text();
  if (t === 'error') consoleErrors.push(text);
  console.log('[console:' + t + ']', text);
});
page.on('pageerror', (err) => {
  pageErrors.push(String(err));
  console.log('[pageerror]', err);
});

await page.goto(index, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(800);

const hasMap = await page.evaluate(() => !!(window.WORLD_MAP && window.WORLD_MAP.countries && window.Sim));
console.log('hasMap', hasMap, 'countries', await page.evaluate(() => window.WORLD_MAP && window.WORLD_MAP.countries.length));

await page.click('#btn-begin');
await page.waitForTimeout(500);

const mode1 = await page.evaluate(() => window.__OD && window.__OD.getMode());
console.log('mode after begin', mode1);

const picked = await page.evaluate(() => window.__OD.pickCountryIso('USA'));
console.log('picked USA', picked);

await page.waitForTimeout(300);
await page.evaluate(() => {
  const s = window.__OD.getState();
  s.speed = 3;
  s.paused = false;
});

const start = Date.now();
while (Date.now() - start < 20000) {
  await page.waitForTimeout(1000);
  const snap = await page.evaluate(() => {
    const s = window.__OD.getState();
    const t = window.Sim.totals(s);
    return { day: s.day, control: t.control, data: s.data, mode: window.__OD.getMode(), ended: s.ended, countriesInf: t.countriesInf };
  });
  console.log('t+' + Math.round((Date.now() - start) / 1000) + 's', snap);
}

await page.screenshot({ path: shot, fullPage: true });
console.log('screenshot', shot, fs.existsSync(shot) ? fs.statSync(shot).size : 0);

console.log('consoleErrors', consoleErrors);
console.log('pageErrors', pageErrors);

await browser.close();
if (pageErrors.length || consoleErrors.length) process.exit(1);
