const {test,expect}=require('@playwright/test');
test('map remains centered when fitted and bounded when zoomed; satire stays readable',async({page})=>{
 await page.goto('http://127.0.0.1:8765/index.html?lang=es');await page.locator('#intro-skip').click();await page.locator('#btn-begin').click();
 const id=await page.evaluate(()=>String(WORLD_MAP.countries.findIndex(c=>c.iso==='BRA')));
 await page.locator('#country-select').selectOption(id);await page.locator('#country-go').click();await page.waitForTimeout(200);
 async function bounds(){return page.evaluate(()=>{const v=__OD.renderer.getView(),c=document.querySelector('#map');return {x:v.x,y:v.y,w:WORLD_MAP.w*v.scale,h:WORLD_MAP.h*v.scale,cw:c.clientWidth,ch:c.clientHeight};});}
 const fitted=await bounds();await page.evaluate(()=>__OD.renderer.pan(10000,-10000));expect(await bounds()).toEqual(fitted);
 await page.evaluate(()=>{const r=__OD.renderer,c=document.querySelector('#map');r.zoomAt(c.clientWidth/2,c.clientHeight/2,4);r.pan(-100000,100000);});
 const zoom=await bounds();for(const [p,extent,size]of [[zoom.x,zoom.w,zoom.cw],[zoom.y,zoom.h,zoom.ch]]){if(extent<=size)expect(p).toBeCloseTo((size-extent)/2);else {expect(p).toBeLessThanOrEqual(24);expect(p+extent).toBeGreaterThanOrEqual(size-24);}}
 await page.locator('#zoom-fit').click();await page.waitForTimeout(100);expect(await bounds()).toEqual(fitted);
 await page.evaluate(()=>{const s=__OD.getState();Sim.pushNews(s,'satire_union',{});Sim.pushNews(s,'future_2035',{});});
 await page.locator('#btn-news').click();await expect(page.locator('.news-card').filter({hasText:'SÁTIRA / FICCIÓN'})).toContainText('sindicato');await expect(page.locator('.news-card').filter({hasText:'FUTURO ESPECULATIVO'})).toContainText('2035');
 await page.locator('#news-filter').selectOption('important');await expect(page.locator('.news-card').filter({hasText:'SÁTIRA / FICCIÓN'})).toHaveCount(0);
});
