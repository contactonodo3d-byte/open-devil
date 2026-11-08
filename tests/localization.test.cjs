const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');
const context=vm.createContext({window:{}});
for(const file of ['js/worldmap.js','js/data.js','js/locales/data.js','js/locales/news.js','js/locales/ui.js','js/locales/countries.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
const G=context.window;
test('every news headline has both authored translations and retains template parameters',()=>{
 const tokens=text=>[...text.matchAll(/\{\w+\}/g)].map(m=>m[0]).sort().join('|');
 assert.equal(Object.keys(G.LOCALE_NEWS).length,G.HEADLINES.length);
 for(const item of G.HEADLINES){assert.equal(G.LOCALE_NEWS[item.id].length,2);for(const text of G.LOCALE_NEWS[item.id]){assert.ok(text.trim());assert.equal(tokens(text),tokens(item.text),item.id);}}
});
test('all gameplay data has complete names and descriptions in both languages',()=>{
 for(const [items,key,fields] of [[G.TRAITS,'traits',2],[G.ARCHETYPES,'archetypes',2],[G.DIFFICULTIES,'difficulties',2],[G.ACTIVE_POWERS,'powers',2],[G.SECTORS,'sectors',2],[G.TRAIT_TABS,'tabs',2],[G.INTEL_LEVELS,'intel',1]]){
  for(const item of items){assert.equal(G.LOCALE_DATA[key][item.id].length,fields*2);assert.ok(G.LOCALE_DATA[key][item.id].every(text=>text.trim()));}
 }
 for(const id of Object.keys(G.ARCHETYPE_DOCTRINES))assert.equal(G.LOCALE_DATA.doctrines[id].length,4);
});
test('UI catalog entries are complete and English keys are unique',()=>{
 const keys=new Set();for(const row of G.LOCALE_UI){assert.equal(row.length,3,row[0]);assert.ok(row.every(text=>text.trim()));assert.ok(!keys.has(row[0]),'Duplicate: '+row[0]);keys.add(row[0]);}
});
test('all map countries have region codes or named exceptions',()=>{for(const c of G.WORLD_MAP.countries)assert.ok(G.LOCALE_COUNTRY_CODES[c.iso]||['CYN','SML'].includes(c.iso),c.iso);});
