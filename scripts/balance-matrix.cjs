global.window=global;
require('../js/worldmap.js');require('../js/data.js');require('../js/sim.js');
const rows=[];
for(const seed of [17,42,1337])for(const difficulty of DIFFICULTIES)for(const archetype of ARCHETYPES){
 const row=Sim.runHeadless({map:WORLD_MAP,archetype,difficulty,seed,autoPlay:true,startIso:'USA',maxDays:180,step:0.05});
 rows.push({seed,archetype:archetype.id,difficulty:difficulty.id,...row});
}
require('fs').writeFileSync(require('path').join(__dirname,'balance-matrix.json'),JSON.stringify(rows,null,2)+'\n');
for(const difficulty of DIFFICULTIES){const subset=rows.filter(r=>r.difficulty===difficulty.id);console.log(difficulty.id,subset.filter(r=>r.ended==='win').length+'/'+subset.length,'wins', 'shadow',subset.filter(r=>r.winRoute==='shadow').length,'mean data',Math.round(subset.reduce((a,r)=>a+r.data,0)/subset.length));}
