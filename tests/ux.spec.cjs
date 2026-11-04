const {test,expect}=require('@playwright/test');
async function start(page){
 await page.goto('http://127.0.0.1:8765/index.html');await page.locator('#intro-skip').click();await page.locator('#btn-begin').click();
 const usa=await page.evaluate(()=>String(WORLD_MAP.countries.findIndex(c=>c.iso==='USA')));
 await page.locator('#country-select').selectOption(usa);await page.locator('#country-go').click();await page.waitForTimeout(600);
 if(await page.locator('#country-close').isVisible()) await page.locator('#country-close').click();
}
async function view(page){return page.evaluate(()=>{const v=__OD.renderer.getView(),c=document.querySelector('#map');return {x:v.x,y:v.y,scale:v.scale,centerX:(c.clientWidth/2-v.x)/v.scale,centerY:(c.clientHeight/2-v.y)/v.scale};});}
test('events never hijack the map; resizing preserves zoom and location',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await start(page);
 await page.locator('#zoom-in').click();
 const before=await view(page);
 await page.evaluate(()=>{const s=__OD.getState();for(let i=0;i<15;i++){s.uiFx.push({type:i%2?'fall':'breach',country:i,t:0});}Sim.pushNews(s,'detect',{});});
 await page.waitForTimeout(1000);expect(await view(page)).toEqual(before);
 const size=page.viewportSize();await page.setViewportSize({width:size.width,height:size.height+60});
 await page.waitForTimeout(200);const resized=await view(page);
 expect(resized.scale).toBe(before.scale);expect(resized.centerX).toBeCloseTo(before.centerX,5);expect(resized.centerY).toBeCloseTo(before.centerY,5);
 await page.evaluate(()=>{const r=__OD.renderer;r.focusOn(100,100,1,1);r.pan(30,10);});
 const manual=await view(page);await page.waitForTimeout(300);expect(await view(page)).toEqual(manual);
 expect(errors).toEqual([]);
});
test('Evolve has a persistent exit and preserves the previous pause state',async({page},testInfo)=>{
 await start(page);expect(await page.evaluate(()=>__OD.getState().paused)).toBe(false);
 await page.locator('#btn-evo').click();const day=await page.evaluate(()=>__OD.getState().day);
 await page.waitForTimeout(200);expect(await page.evaluate(()=>__OD.getState().day)).toBe(day);
 await page.locator('#evo-body').evaluate(el=>{el.scrollTop=el.scrollHeight;});
 await expect(page.getByRole('button',{name:'Back to map from Evolution lab'})).toBeInViewport();
 await page.screenshot({path:`test-results/ux-evolve-${testInfo.project.name}.png`});
 await page.getByRole('button',{name:'Back to map from Evolution lab'}).click();
 await expect(page.locator('#evo-panel')).toBeHidden();expect(await page.evaluate(()=>__OD.getState().paused)).toBe(false);
 await page.locator('[data-speed="0"]').click();await page.locator('#btn-evo').click();await page.keyboard.press('Escape');
 expect(await page.evaluate(()=>__OD.getState().paused)).toBe(true);await expect(page.locator('#btn-evo')).toBeFocused();
 await page.locator('#btn-stats').click();await page.locator('#btn-map').click();
 await expect(page.locator('#stats-panel')).toBeHidden();expect(await page.evaluate(()=>__OD.getState().paused)).toBe(true);
});
test('news stays steady and opens readable cards without surprise popups',async({page},testInfo)=>{
 await start(page);const headline=await page.locator('#ticker-text').textContent();
 await page.locator('[data-speed="3"]').click();
 await page.evaluate(()=>{const s=__OD.getState();Sim.pushNews(s,'detect',{});Sim.pushNews(s,'research_25',{});Sim.pushNews(s,'sector_cloud',{country:'Canada'});});
 await page.waitForTimeout(300);await expect(page.locator('#ticker-text')).toHaveText(headline);
 expect(await page.locator('#event-popup:visible,#breaking-banner:visible').count()).toBe(0);
 await page.locator('#news-ticker').click();await expect(page.locator('.news-card').first()).toBeVisible();
 expect(await page.evaluate(()=>__OD.getState().paused)).toBe(true);
 await page.locator('#news-filter').selectOption('important');expect(await page.locator('.news-card:not(.important)').count()).toBe(0);
 await page.screenshot({path:`test-results/ux-news-${testInfo.project.name}.png`});
 await page.getByRole('button',{name:'Back to map from Situation room'}).click();
 expect(await page.evaluate(()=>__OD.getState().paused)).toBe(false);await expect(page.locator('#news-ticker')).toBeFocused();
});

test('playthrough: evolve, return, inspect midgame reports, and continue',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await start(page);
 await page.locator('#btn-evo').click();
 const funds=await page.evaluate(()=>__OD.getState().data);
 await page.locator('[data-trait="email"]').click();
 expect(await page.evaluate(()=>__OD.getState().traitsOwned)).toContain('email');
 expect(await page.evaluate(()=>__OD.getState().data)).toBeLessThan(funds);
 await page.getByRole('button',{name:'Back to map from Evolution lab'}).click();
 const before=await view(page);
 // Advance real simulation steps to inspect natural midgame reports without waiting minutes.
 await page.evaluate(()=>{const s=__OD.getState();for(let i=0;i<600&&!s.ended;i++)Sim.tick(s,SIM.dayLength*0.05);});
 await page.waitForTimeout(200);expect(await view(page)).toEqual(before);
 await page.locator('#btn-news').click();expect(await page.locator('.news-card').count()).toBeGreaterThan(3);
 await page.getByRole('button',{name:'Back to map from Situation room'}).click();
 await page.locator('#btn-help').click();expect(await page.evaluate(()=>__OD.getState().paused)).toBe(true);
 await page.locator('#guide-done').click();await expect.poll(()=>page.evaluate(()=>__OD.getState().paused)).toBe(false);
 await page.locator('#btn-stats').click();await expect(page.locator('#stats-body table')).toBeVisible();
 await page.getByRole('button',{name:'Back to map from Global intelligence'}).click();
 expect(await page.evaluate(()=>__OD.getState().paused)).toBe(false);expect(errors).toEqual([]);
});
