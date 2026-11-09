const {test,expect}=require('@playwright/test');
test('evolution handle expands by swipe and tap without trapping navigation',async({page},info)=>{
 await page.setViewportSize({width:390,height:700});
 await page.goto('http://127.0.0.1:8765/index.html?lang=es');
 await page.locator('#intro-skip').click();await page.locator('#btn-begin').click();
 const id=await page.evaluate(()=>String(WORLD_MAP.countries.findIndex(c=>c.iso==='USA')));
 await page.locator('#country-select').selectOption(id);await page.locator('#country-go').click();await page.locator('#btn-evo').click();
 const grip=page.locator('#evo-expand'),body=page.locator('#evo-body');
 const compact=(await body.boundingBox()).height;
 async function swipe(delta){const r=await grip.boundingBox();if(info.project.name==="mobile"){const c=await page.context().newCDPSession(page);const x=r.x+r.width/2,y=r.y+r.height/2;await c.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x,y}]});await c.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x,y:y+delta}]});await c.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});await c.detach();return;}await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2,r.y+r.height/2+delta,{steps:6});await page.mouse.up();}
 await swipe(-90);await expect(grip).toHaveAttribute('aria-expanded','true');
 expect((await body.boundingBox()).height).toBeGreaterThan(compact+150);
 await expect(page.locator('#map-wrap')).toBeHidden();await expect(page.locator('.game-nav')).toBeInViewport();
 await expect(page.locator('#evo-panel .sheet-close')).toBeInViewport();
 await body.evaluate(el=>el.scrollTop=el.scrollHeight);await expect(grip).toHaveAttribute('aria-expanded','true');
 await page.screenshot({path:`test-results/evolution-expanded-${info.project.name}.png`});
 await swipe(90);await expect(grip).toHaveAttribute('aria-expanded','false');await expect(page.locator('#map-wrap')).toBeVisible();
 // Keyboard activation is an alternative to dragging.
 await grip.focus();await page.keyboard.press('Enter');await expect(grip).toHaveAttribute('aria-expanded','true');
 await page.locator('#btn-stats').click();await expect(page.locator('#game-screen')).not.toHaveClass(/evo-expanded/);
 await page.locator('#btn-evo').click();await grip.click();await expect(grip).toHaveAttribute('aria-expanded','true');
 await page.locator('#evo-panel .sheet-close').click();await expect(page.locator('#evo-panel')).toBeHidden();
 expect(await page.evaluate(()=>__OD.getState().paused)).toBe(false);
 await page.locator('#btn-evo').click();await expect(grip).toHaveAttribute('aria-expanded','false');
});
