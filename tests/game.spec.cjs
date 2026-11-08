const {test,expect}=require('@playwright/test');
test('start, input cancellation, pause, evolve and restart',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/index.html');
 await page.locator('#intro-skip').click();
 await expect(page.locator('#archetype-list .selected')).toHaveCount(1);
 await page.locator('#difficulty-list .card').last().click();
 await page.locator('#btn-begin').click();
 await expect(page.locator('#map')).toBeVisible();
 await expect.poll(async()=>page.evaluate(()=>{const c=document.querySelector('#map');return c.clientHeight===c.parentElement.clientHeight;})).toBe(true);
 const dimensions=await page.evaluate(()=>{const c=document.querySelector('#map');return {width:c.clientWidth,parent:c.parentElement.clientWidth,height:c.clientHeight,parentHeight:c.parentElement.clientHeight};});
 expect(dimensions.width).toBe(dimensions.parent);expect(dimensions.height).toBe(dimensions.parentHeight);
 // A slow drag and a canceled touch must never choose an origin.
 await page.evaluate(()=>{const c=document.querySelector('#map');for(const [type,x] of [['pointerdown',100],['pointermove',102],['pointermove',104],['pointermove',108],['pointerup',108]])c.dispatchEvent(new PointerEvent(type,{pointerId:7,clientX:x,clientY:200,bubbles:true}));});
 expect(await page.evaluate(()=>__OD.getMode())).toBe('pick');
 await page.evaluate(()=>{const c=document.querySelector('#map');for(const type of ['pointerdown','pointercancel'])c.dispatchEvent(new PointerEvent(type,{pointerId:8,clientX:200,clientY:200,bubbles:true}));});
 expect(await page.evaluate(()=>__OD.getMode())).toBe('pick');
 expect(await page.evaluate(()=>__OD.pickCountryIso('USA'))).toBe(true);
 await page.locator('[data-speed="0"]').click();
 const day=await page.evaluate(()=>__OD.getState().day);await page.waitForTimeout(150);
 expect(await page.evaluate(()=>__OD.getState().day)).toBe(day);
 await page.locator('#btn-evo').click();await expect(page.locator('#evo-panel')).toBeVisible();
 await page.evaluate(()=>{const s=__OD.getState();s.ended='lose';__OD.ui.showEnd(s,Sim.totals(s));});
 await page.locator('#restart').click();await page.locator('#btn-begin').click();
 expect(await page.evaluate(()=>__OD.getState().difficulty.id)).toBe('normal');
 expect(await page.evaluate(()=>__OD.ui.getSelected())).toBe(-1);
 expect(errors).toEqual([]);
});

test('guide, keyboard origin and saved operation survive reload',async({page},testInfo)=>{
 await page.goto('http://127.0.0.1:8765/index.html');
 await page.locator('#intro-skip').click();
 await page.screenshot({path:`test-results/menu-${testInfo.project.name}.png`,fullPage:true});
 await page.locator('#btn-guide').click();await expect(page.locator('#guide-dialog')).toBeVisible();await page.keyboard.press('Escape');
 await page.locator('#btn-begin').click();
 const usa=await page.evaluate(()=>String(WORLD_MAP.countries.findIndex(c=>c.iso==='USA')));
 await page.locator('#country-select').selectOption(usa);await page.locator('#country-go').click();
 await page.evaluate(()=>{const s=__OD.getState();s.data=100;Sim.buyTrait(s,'email');s.paused=true;});
 await page.screenshot({path:`test-results/game-${testInfo.project.name}.png`});
 await page.locator('#btn-menu').click();await expect(page.locator('#btn-continue')).toBeVisible();
 await page.reload();await page.locator('#intro-skip').click();await page.locator('#btn-continue').click();
 expect(await page.evaluate(()=>__OD.getState().traitsOwned)).toContain('email');
 expect(await page.evaluate(()=>__OD.getState().paused)).toBe(true);
 await page.locator('#btn-evo').click();await page.screenshot({path:`test-results/evolution-${testInfo.project.name}.png`});
 await page.locator('#evo-panel .sheet-close').click();await expect(page.locator('#evo-panel')).toBeHidden();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);expect(overflow).toBe(false);
});

test('installed shell loads offline',async({page,context})=>{
 await page.goto('http://127.0.0.1:8765/index.html');
 await page.evaluate(()=>navigator.serviceWorker.ready);
 await page.reload();
 await context.setOffline(true);await page.reload();
 await page.locator('#intro-skip').click();await expect(page.locator('#btn-begin')).toBeVisible();
 await context.setOffline(false);
});
