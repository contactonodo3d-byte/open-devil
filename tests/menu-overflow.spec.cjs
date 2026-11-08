const {test,expect}=require('@playwright/test');
for(const lang of ['en','es','pt']){
 test(`menu cannot drift sideways in ${lang}`,async({page},info)=>{
  await page.setViewportSize({width:390,height:700});
  await page.goto('http://127.0.0.1:8765/index.html?lang='+lang);
  if(await page.locator('#intro-skip').isVisible())await page.locator('#intro-skip').click();
  for(const width of [320,390,430,844]){
   await page.setViewportSize({width,height:width===844?390:700});
   const geometry=await page.locator('#boot-screen').evaluate(el=>{
    el.scrollLeft=100;el.scrollTop=250;
    return {width:el.clientWidth,scrollWidth:el.scrollWidth,left:el.scrollLeft,vertical:el.scrollHeight>el.clientHeight};
   });
   expect(geometry.scrollWidth,JSON.stringify({lang,width,...geometry})).toBeLessThanOrEqual(geometry.width);
   expect(geometry.left).toBe(0);
   expect(await page.locator('#boot-screen').evaluate(el=>getComputedStyle(el).touchAction)).toBe('pan-y pinch-zoom');
   expect(geometry.vertical).toBe(true);
   await expect(page.locator('#language-select')).toBeAttached();
   expect(await page.locator('#language-select').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
   if(width===390){await page.locator('#boot-screen').evaluate(el=>{el.scrollTop=100;});await page.screenshot({path:`test-results/menu-contained-${info.project.name}-${lang}.png`});}
   await page.locator('#btn-begin').scrollIntoViewIfNeeded();await expect(page.locator('#btn-begin')).toBeInViewport();
   expect(await page.locator('#boot-screen').evaluate(el=>el.scrollLeft)).toBe(0);
  }
 });
}
