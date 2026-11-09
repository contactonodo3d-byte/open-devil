const {test,expect}=require('@playwright/test');
// Network-failure injection must reach the media request, bypassing the worker.
test.use({serviceWorkers:'block'});
test('menu film plays silently, pauses on request and stops when entering the game',async({page})=>{
 await page.goto('http://127.0.0.1:8765/index.html');await page.locator('#intro-skip').click();
 const film=page.locator('#menu-film');await expect.poll(()=>film.evaluate(v=>v.currentTime)).toBeGreaterThan(.1);
 expect(await film.evaluate(v=>v.muted&&v.loop&&v.playsInline)).toBe(true);
 await page.locator('#menu-film-toggle').click();expect(await film.evaluate(v=>v.paused)).toBe(true);
 await page.locator('#menu-film-toggle').click();await expect.poll(()=>film.evaluate(v=>!v.paused)).toBe(true);
 await page.locator('#btn-begin').click();await expect.poll(()=>film.evaluate(v=>v.paused)).toBe(true);
});
test('reduced motion keeps the static planet and never downloads video',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});const requests=[];page.on('request',r=>{if(/menu-globe-v13\.(webm|mp4)/.test(r.url()))requests.push(r.url());});
 await page.goto('http://127.0.0.1:8765/index.html');await expect(page.locator('#btn-begin')).toBeVisible();
 expect(await page.locator('#menu-film').evaluate(v=>v.currentSrc)).toBe('');await expect(page.locator('#menu-film-toggle')).toBeHidden();expect(requests).toEqual([]);
});
test('failed video leaves the image and menu functional',async({page})=>{
 await page.route(/menu-globe-v13\.(webm|mp4)/,route=>route.abort());await page.goto('http://127.0.0.1:8765/index.html');await page.locator('#intro-skip').click();
 await page.locator('.hero-world img').evaluate(img=>img.decode());await expect(page.locator('#menu-film')).not.toHaveClass(/playing/);await page.locator('#btn-begin').click();await expect(page.locator('#country-select')).toBeVisible();
});
