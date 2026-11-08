const {test,expect}=require('@playwright/test');
for(const viewport of [{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:768,height:1024},{width:1280,height:800}]){
 test(`workspace fits ${viewport.width}x${viewport.height}`,async({page},testInfo)=>{
  await page.setViewportSize(viewport);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8765/index.html');await page.locator('#intro-skip').click();
  await page.locator('#btn-begin').click();
  const id=await page.evaluate(()=>String(WORLD_MAP.countries.findIndex(c=>c.iso==='USA')));
  await page.locator('#country-select').selectOption(id);await page.locator('#country-go').click();
  await expect(page.locator('#country-panel')).toBeHidden();
  const balance=await page.evaluate(()=>Math.floor(__OD.getState().data));
  await expect(page.locator('#hud-data')).toHaveText(String(balance));
  for(const name of ['evo','stats','news']){
   await page.locator('#btn-'+name).click();
   const panel=page.locator('#'+name+'-panel');await expect(panel).toBeVisible();
   const geometry=await page.evaluate((name)=>{
    const rect=id=>{const r=document.getElementById(id).getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
    return {map:rect('map-wrap'),panel:rect(name+'-panel'),stage:rect('workspace-stage'),nav:document.querySelector('.game-nav').getBoundingClientRect().bottom,scroll:document.documentElement.scrollWidth};
   },name);
   expect(geometry.map.w).toBeGreaterThan(130);expect(geometry.map.h).toBeGreaterThan(100);
   expect(geometry.panel.y).toBeGreaterThanOrEqual(geometry.nav-1);
   expect(geometry.panel.bottom).toBeLessThanOrEqual(viewport.height+1);
   expect(geometry.scroll).toBeLessThanOrEqual(viewport.width);
   const overlap=Math.min(geometry.map.right,geometry.panel.right)-Math.max(geometry.map.x,geometry.panel.x);
   const vertical=Math.min(geometry.map.bottom,geometry.panel.bottom)-Math.max(geometry.map.y,geometry.panel.y);
   expect(overlap<=1||vertical<=1).toBe(true);
   const body=page.locator(name==='evo'?'#evo-body':name==='stats'?'#stats-body':'#news-log-body');
   expect((await body.boundingBox()).height).toBeGreaterThan(60);
   await body.evaluate(el=>{el.scrollTop=el.scrollHeight;});
   await expect(panel.locator('.sheet-close')).toBeInViewport();
   if(testInfo.project.name==='desktop')await page.screenshot({path:`test-results/dock-${viewport.width}-${viewport.height}-${name}.png`});
   await page.locator('#btn-map').click();await expect(panel).toBeHidden();
  }
  // Navigation can switch directly between workspaces and still return to play.
  await page.locator('#btn-evo').click();await page.locator('#btn-news').click();await expect(page.locator('#evo-panel')).toBeHidden();
  await page.locator('#btn-map').click();expect(await page.evaluate(()=>__OD.getState().paused)).toBe(false);
  expect(errors).toEqual([]);
 });
}
