import { chromium } from 'playwright-core';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const index = 'file://' + path.join(root, 'index.html');
const shot = '/workspace/open-devil-v3.png';
const shotEvo = '/workspace/open-devil-v3-evolve.png';
const exe = [
  '/home/box/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell',
  '/usr/bin/google-chrome-stable'
].find((p) => fs.existsSync(p));

if (!exe) {
  console.error('No chromium');
  process.exit(2);
}

const errors = [];
const browser = await chromium.launch({
  headless: true,
  executablePath: exe,
  args: ['--no-sandbox', '--allow-file-access-from-files']
});
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.on('pageerror', (e) => errors.push('pageerror:' + String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console:' + m.text()); });

await page.goto(index, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(400);
/* skip intro if present */
const skip = await page.$('#intro-skip');
if (skip) await skip.click();
await page.waitForTimeout(200);
await page.waitForSelector('#btn-begin', { state: 'visible', timeout: 5000 });
await page.click('#btn-begin');
await page.waitForTimeout(500);
await page.evaluate(() => {
  window.__OD.pickCountryIso('USA');
  const s = window.__OD.getState();
  s.speed = 3;
  for (let i = 0; i < 600; i++) {
    window.Sim.tick(s, 0.35);
    if (i % 30 === 0) window.Sim.autoPlayPolicy(s);
  }
  /* ensure some sectors / intel for visuals */
  s.speed = 1;
  s.paused = true;
});
await page.waitForTimeout(1200);
const snap = await page.evaluate(() => {
  const s = window.__OD.getState();
  const t = window.Sim.totals(s);
  return {
    day: Math.floor(s.day),
    control: +(t.control * 100).toFixed(2),
    infra: +(t.infra * 100).toFixed(1),
    critical: +(t.critical * 100).toFixed(1),
    military: +(t.military * 100).toFixed(1),
    intel: +s.intelligence.toFixed(1),
    intelLevel: s.intelLevel,
    traits: s.traitsOwned.length,
    countriesInf: t.countriesInf,
    ks: +(s.killSwitch * 100).toFixed(1),
    news: s.news[0] && s.news[0].text,
    newsLog: (s.newsLog || []).length
  };
});
console.log('snap', snap);
await page.screenshot({ path: shot, fullPage: false });
console.log('wrote', shot, fs.statSync(shot).size);

await page.evaluate(() => { window.__OD.openEvolve(); });
await page.waitForTimeout(600);
await page.screenshot({ path: shotEvo, fullPage: false });
console.log('wrote', shotEvo, fs.statSync(shotEvo).size);

console.log('errors', errors);
await browser.close();
process.exit(errors.length ? 1 : 0);
