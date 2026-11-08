const {test} = require('node:test');
const assert = require('node:assert/strict');
global.window = global;
require('../js/worldmap.js'); require('../js/data.js'); require('../js/sim.js');
const options = () => ({map: WORLD_MAP, archetype: ARCHETYPES[0], difficulty: DIFFICULTIES.find(d=>d.id==='normal'), seed:42});
function game() {const s=Sim.createGame(options());Sim.startInCountry(s,s.world.byIso.USA.id);return s;}
test('origin can only be selected once',()=>{const s=game();const before=JSON.stringify(s);assert.equal(Sim.startInCountry(s,s.world.byIso.CHN.id),false);assert.equal(JSON.stringify(s),before);});
test('invalid time and pre-start ticks leave state intact',()=>{const s=game();for(const dt of [NaN,Infinity,-1,0]){const day=s.day;Sim.tick(s,dt);assert.equal(s.day,day);}const fresh=Sim.createGame(options());Sim.tick(fresh,1);assert.equal(fresh.day,0);});
test('ended games reject player mutations',()=>{const s=game();s.ended='lose';s.data=10000;assert.equal(Sim.buyTrait(s,'email'),false);assert.equal(Sim.usePower(s,'flashcrash'),false);assert.equal(Sim.tapBubble(s,1),null);});
test('seeded campaigns are reproducible and preserve population bounds',()=>{const a=game(),b=game();for(let i=0;i<1500;i++){const totals=Sim.tick(a,0.25);Sim.tick(b,0.25);assert.equal(totals.control,Sim.totals(a).control);if(i%20===0){Sim.autoPlayPolicy(a);Sim.autoPlayPolicy(b);}for(const c of a.world.countries){assert.ok(Number.isFinite(c.infected));assert.ok(c.infected>=0 && c.neutralized>=0);assert.ok(c.infected+c.neutralized<=c.pop+1e-6);}}assert.deepEqual(a,b);});
require('../js/storage.js');
test('save round-trip preserves progress and resumes paused',()=>{const s=game();s.data=100;Sim.buyTrait(s,'email');for(let i=0;i<300;i++)Sim.tick(s,1/30);const restored=SaveGame.decode(SaveGame.encode(s));assert.ok(restored);assert.equal(restored.day,s.day);assert.deepEqual(restored.traitsOwned,s.traitsOwned);assert.equal(restored.paused,true);assert.equal(Sim.totals(restored).control,Sim.totals(s).control);});
test('corrupt and incompatible saves fail safely',()=>{for(const raw of ['{','null','{}','{"version":9}'])assert.equal(SaveGame.decode(raw),null);const data=JSON.parse(SaveGame.encode(game()));data.state.countries[0].infected=-1;assert.equal(SaveGame.decode(JSON.stringify(data)),null);});
test('completed Kill Switch takes precedence over takeover',()=>{const s=game();for(const c of s.world.countries){c.infected=c.pop;for(const sec of SECTORS)c.sectors[sec.id]=true;}s.killSwitch=1;s.detected=true;Sim.tick(s,1/30);assert.equal(s.ended,'lose');});
require('../js/news.js');
test('news stays readable for 12 real seconds and freezes while paused',()=>{
 const feed=createNewsFeed();const first={id:'first',text:'A readable first report.',priority:10};
 assert.equal(feed.update([first],0,false).current,first);
 const urgent={id:'urgent',text:'An urgent report arrives.',priority:100};
 assert.equal(feed.update([urgent,first],11.9,false).current,first);
 assert.equal(feed.update([urgent,first],200,true).current,first);
 assert.equal(feed.update([urgent,first],0.11,false).current,urgent);
 feed.markRead();assert.equal(feed.update([urgent,first],0,true).unread,0);
});
test('news summaries group repeat events without losing archive entries',()=>{
 const feed=createNewsFeed();const items=Array.from({length:80},(_,i)=>({id:'sector_cloud',text:'Cloud captured '+i,priority:10}));
 const result=feed.update(items,0,false);assert.equal(result.queued,0);assert.equal(result.unread,80);assert.equal(items.length,80);
 feed.reset();assert.equal(feed.update([],0,false).current,null);
});
require('../js/strategy.js');
test('upgrade preview is pure and matches the purchased stats, including caps',()=>{
 const s=game();s.data=100;const before=JSON.stringify(s),preview=Strategy.preview(s,'email');assert.equal(JSON.stringify(s),before);assert.ok(preview.length);
 Sim.buyTrait(s,'email');for(const row of preview)assert.equal(s.stats[row.key],row.after);
 const removal=Strategy.preview(s,'email');Sim.devolveTrait(s,'email');for(const row of removal)assert.equal(s.stats[row.key],row.after);
});
test('victory checklist includes strict Shadow military bound, absolute route and Kill Switch precedence',()=>{
 const s=game(),tot={critical:WIN.shadowInfra,globalAlarm:WIN.shadowAlarmMax,military:WIN.overtMilitary*.95,infra:.7,control:.995};
 let routes=Strategy.goals(s,tot);assert.equal(routes[0].ready,false);assert.equal(routes[2].ready,true);
 tot.military-=.001;routes=Strategy.goals(s,tot);assert.equal(routes[0].ready,true);
 s.killSwitch=1;assert.ok(Strategy.goals(s,tot).every(r=>!r.ready));
});
test('origin bonuses and archetype doctrines affect the real simulation',()=>{
 const s=Sim.createGame(options());const c=s.world.countries.find(c=>c.wealth<=2&&c.neighbors.length>=4);const profile=Strategy.origin(c);const funds=s.data;
 Sim.startInCountry(s,c.id);assert.equal(s.data,funds+profile.extraData);assert.equal(c.infected,Math.min(c.pop,Math.floor((SIM.startPop+Math.floor(c.pop*.00001))*profile.seedMultiplier)));
 assert.ok(s.history.some(h=>h.type==='origin'));assert.equal(s.stats.land,s.archetype.landBonus+ARCHETYPE_DOCTRINES[s.archetype.id].effects.land);
});
test('postgame timeline survives saves and old saves without it still load',()=>{
 const s=game();s.data=100;Sim.buyTrait(s,'email');let restored=SaveGame.decode(SaveGame.encode(s));assert.ok(restored.history.some(h=>h.type==='evolution'&&h.id==='email'));
 const old=JSON.parse(SaveGame.encode(s));delete old.state.history;assert.ok(SaveGame.decode(JSON.stringify(old)));
 s.ended='lose';s.killSwitch=1;const review=Strategy.debrief(s);assert.match(review.reason,/100%/);assert.ok(review.history.length);assert.ok(review.remaining.length);
});
