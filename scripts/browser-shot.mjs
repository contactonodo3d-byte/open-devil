import { chromium } from 'playwright-core';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const index = 'file://' + path.join(root, 'index.html');
const shot = '/workspace/open-devil-v2.png';
const exe = [
  '/home/box/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell',
  '/usr/bin/google-chrome-stable'
].find((p) => fs.existsSync(p));

const errors = [];
const browser = await chromium.launch({ headless: true, executablePath: exe, args: ['--no-sandbox', '--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(index, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(500);
await page.click('#btn-begin');
await page.waitForTimeout(400);
await page.evaluate(() => {
  window.__OD.pickCountryIso('USA');
  const s = window.__OD.getState();
  s.speed = 3;
  for (let i = 0; i < 500; i++) {
    window.Sim.tick(s, 0.3);
    if (i % 35 === 0) window.Sim.autoPlayPolicy(s);
  }
  s.speed = 2;
  s.paused = false;
});
// let a few animation frames update HUD + render
await page.waitForTimeout(1500);
const snap = await page.evaluate(() => {
  const s = window.__OD.getState();
  const t = window.Sim.totals(s);
  return { day: Math.floor(s.day), control: +(t.control * 100).toFixed(2), traits: s.traitsOwned.length, countriesInf: t.countriesInf, ks: +(s.killSwitch * 100).toFixed(1), news: s.news[0] && s.news[0].text };
});
console.log('snap', snap);
await page.screenshot({ path: shot });
console.log('errors', errors, 'size', fs.statSync(shot).size);
await browser.close();
process.exit(errors.length ? 1 : 0);
