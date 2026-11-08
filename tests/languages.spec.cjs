const {test,expect}=require('@playwright/test');
for(const [code,menu,evolution,goals,impact] of [['es','Iniciar operación','Evolucionar','Caminos a la victoria','Impacto:'],['pt','Iniciar operação','Evoluir','Caminhos para a vitória','Impacto:']]){
 test(`${code} localizes the menu, game, news and saved operations`,async({page},info)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8765/index.html');await page.locator('#intro-skip').click();
  await page.locator('[data-archetype="social"]').click();await page.locator('[data-difficulty="casual"]').click();
  await page.locator('#language-select').selectOption(code);await page.waitForURL(new RegExp('lang='+code));
  await expect(page.locator('#btn-begin')).toContainText(menu);
  expect(await page.evaluate(()=>localStorage.getItem('open-devil-language'))).toBe(code);
  await expect(page.locator('#archetype-list .selected')).toHaveAttribute('data-archetype','social');
  await expect(page.locator('#difficulty-list .selected')).toHaveAttribute('data-difficulty','casual');
  expect(await page.locator('#archetype-list h3').allTextContents()).toEqual(await page.evaluate(()=>ARCHETYPES.map(a=>a.name)));
  expect(await page.locator('html').getAttribute('lang')).toBe(code==='pt'?'pt-BR':code);
  await page.screenshot({path:`test-results/language-menu-${code}-${info.project.name}.png`,fullPage:true});
  await page.locator('#btn-begin').click();const id=await page.evaluate(()=>String(WORLD_MAP.countries.findIndex(c=>c.iso==='USA')));
  await page.locator('#country-select').selectOption(id);await expect(page.locator('#origin-preview')).toContainText('Estados Unidos');
  await page.locator('#country-go').click();await expect(page.locator('#btn-evo')).toHaveText(evolution);
  await page.locator('#btn-evo').click();await expect(page.locator('[data-trait="email"] .effect-preview')).toContainText(code==='es'?'Propagación':'Propagação');
  await page.locator('[data-trait="email"]').click();await page.locator('#btn-stats').click();await expect(page.locator('.goal-checklist')).toContainText(goals);
  await page.locator('#btn-news').click();await expect(page.locator('.report-impact').first()).toContainText(impact);
  await expect(page.locator('.news-card').first()).not.toContainText('Inboxes worldwide');
  await page.screenshot({path:`test-results/language-news-${code}-${info.project.name}.png`});
  await page.locator('#btn-map').click();await page.locator('#btn-menu').click();
  const snapshot=await page.evaluate(()=>localStorage.getItem('open-devil-operation-v1'));expect(snapshot).toBeTruthy();
  await page.locator('#language-select').selectOption('en');await page.waitForURL(/lang=en/);
  await expect(page.locator('#btn-begin')).toContainText('Launch operation');
  expect(await page.evaluate(()=>localStorage.getItem('open-devil-operation-v1'))).toBe(snapshot);
  await page.locator('#btn-continue').click();expect(await page.evaluate(()=>__OD.getState().traitsOwned)).toContain('email');
  expect(await page.evaluate(()=>__OD.getState().paused)).toBe(true);expect(errors).toEqual([]);
 });
}
