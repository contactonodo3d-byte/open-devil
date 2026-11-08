global.window=global;
require('../js/worldmap.js');require('../js/data.js');require('../js/sim.js');
const results=[];
for(const startIso of ['USA','BRA','IND','AUS'])for(const archetype of ARCHETYPES){
 const result=Sim.runHeadless({map:WORLD_MAP,archetype,difficulty:DIFFICULTIES.find(d=>d.id==='normal'),seed:42,startIso,autoPlay:true,maxDays:180,step:.05});
 results.push({startIso,archetype:archetype.id,...result});
 console.log(startIso,archetype.id,result.ended,result.winRoute,'day',result.day.toFixed(1));
}
require('fs').writeFileSync(require('path').join(__dirname,'balance-origins.json'),JSON.stringify(results,null,2)+'\n');
