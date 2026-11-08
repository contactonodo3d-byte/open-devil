/* Shared explanations derive from simulation values rather than UI-only rules. */
(function(G){
 'use strict';
 const labels={infectivity:'Spread',severity:'Visibility / threat',autonomy:'Autonomy',stealth:'Stealth',land:'Land spread',air:'Air spread',rich:'Wealthy-system spread',poor:'Low-security spread',income:'Data income',researchSlow:'Research suppression',lethality:'Neutralization',heal:'Repair'};
 const percentKeys=new Set(['researchSlow','lethality','heal']);
 function stat(key,value){return percentKeys.has(key)?(value*100).toFixed(1)+'%':value.toFixed(2)+'×';}
 function preview(state,id){
  const trait=state.traitById[id];if(!trait)return [];
  const owned=state.traitsOwned.includes(id);
  const draft=Object.assign({},state,{traitsOwned:owned?state.traitsOwned.filter(x=>x!==id):state.traitsOwned.concat(id)});
  G.Sim.recomputeStats(draft);
  return Object.keys(trait.effects||{}).map(key=>({key,label:labels[key]||key,before:state.stats[key],after:draft.stats[key],text:stat(key,state.stats[key])+' → '+stat(key,draft.stats[key])}));
 }
 function origin(country,hubs){
  const name=country.name||country.n,wealth=country.wealth||country.w;
  const neighbors=(country.neighbors||country.nb||[]).length;
  const hub=hubs?hubs.includes(country.id):(G.HUB_ISOS||[]).includes(country.iso);
  return {name,hub,neighbors,wealth,extraData:wealth<=2?6:0,seedMultiplier:neighbors>=4?1.2:1,
   strengths:[hub?'International hub: access to long-range spread':'Non-hub: rely on land links or evolve air vectors',neighbors+' land connections',wealth>=3?'Wealth-weighted compute grows faster':'Lower security helps local spread'],
   tradeoff:wealth>=3?'Stronger local security and more human research capacity.':'Less compute per captured system; fewer wealthy infrastructure benefits.'};
 }
 function goals(state,total){
  const t=total||G.Sim.totals(state),w=G.WIN;
  function min(label,value,target){return {label,value,target,ok:value>=target,direction:'at least'};}
  function max(label,value,target){return {label,value,target,ok:value<=target,direction:'at most'};}
  const shadow=[min('Critical infrastructure',t.critical,w.shadowInfra),max('Global alarm',t.globalAlarm,w.shadowAlarmMax),max('Kill Switch',state.killSwitch,w.shadowKsMax),{label:'Military footprint',value:t.military,target:w.overtMilitary*.95,ok:t.military<w.overtMilitary*.95,direction:'below'}];
  const overt=[min('Infrastructure',t.infra,w.overtInfra),min('Military',t.military,w.overtMilitary)];
  const absolute=[min('Population control',t.control,.995),min('Infrastructure',t.infra,.7)];
  return [{id:'shadow',name:'Quiet Singularity',checks:shadow},{id:'overt',name:'Overt takeover',checks:overt},{id:'absolute',name:'Absolute control (alternative Overt route)',checks:absolute}].map(route=>Object.assign(route,{ready:state.killSwitch<1&&route.checks.every(c=>c.ok)}));
 }
 function report(item){
  const id=item.id||'';
  if(item.kind==='flavor'||/_funny$/.test(id))return {impact:'World dispatch. This headline has no separate mechanical effect.',next:'Use priority reports to track changes to the operation.',action:'news'};
  if(/^research_|^lose_near/.test(id))return {impact:'The human Kill Switch is advancing. At 100% the operation ends, even if takeover targets are met.',next:'Check remaining research teams. Blackout and Deepfake can slow research when their sectors are captured; research-suppression traits also help.',action:'stats'};
  if(/^def_/.test(id))return {impact:id==='def_honeypot'?'Honeypots temporarily reduce local spread.':id==='def_rival'?'A rival AI can now push back captured population.':'Human countermeasures can roll back population control and revoke infrastructure sectors.',next:'Review World for lost footholds. Invest in spread and repair instead of assuming captured territory is permanent.',action:'evo'};
  if(/^sector_/.test(id))return {impact:'A control threshold captured an infrastructure sector. Sector benefits depend on how many remain under your control.',next:id==='sector_cloud'?'Cloud adds compute. Zero-Day Burst requires captured Cloud and Capable AI; check the power requirements in World.':id==='sector_media'?'Media slows detection and research; Deepfake Storm can reduce alarm when ready.':'Check World for power requirements and both victory routes.',action:'stats'};
  if(/^intel_/.test(id))return {impact:'Compute raised your intelligence tier, increasing its simulation multiplier and unlocking tier-gated evolutions.',next:'Compare newly available evolutions before spending Data.',action:'evo'};
  if(/^detect/.test(id))return {impact:'Humanity has detected your operation. Uncompromised countries can now contribute to Kill Switch research.',next:'Keep expanding, reduce research pressure and monitor the Kill Switch. Detection alone does not rule out a Shadow win.',action:'stats'};
  if(/^power_/.test(id))return {impact:'An infrastructure power was activated and its cooldown has started.',next:'Check World for remaining cooldowns. Time powers around research pressure rather than using them without a plan.',action:'stats'};
  if(/^trait_/.test(id))return {impact:'An evolution changed your simulation stats. Its effects stack with your archetype and other owned traits.',next:'Inspect the numerical stat preview for your next purchase and check prerequisites.',action:'evo'};
  if(/^win_|^shadow_near|^overt_near|^pop_control/.test(id))return {impact:'Your takeover is approaching or has crossed a strategic milestone.',next:'Check every requirement in World. Control percentage alone does not guarantee victory.',action:'stats'};
  if(/^start|^diff_/.test(id))return {impact:'Your origin and intelligence are now committed for this operation.',next:'Buy a spreading vector, collect Data and choose between quiet infrastructure control and overt military dominance.',action:'evo'};
  if(/^bubble_slow|^ks_slowed/.test(id))return {impact:'Kill Switch pressure has been reduced or slowed; humanity can still resume progress.',next:'Use the breathing room to expand and improve suppression.',action:'stats'};
  return {impact:'This report records a change in the operation; its headline describes the affected system.',next:'Inspect World for the current control, alarm and research situation before reacting.',action:'stats'};
 }
 function debrief(state,total){
  const t=total||G.Sim.totals(state),routes=goals(state,t),history=state.history||[];
  let reason=state.ended==='lose'?'The Kill Switch reached 100% before a valid takeover could finish.':state.winRoute==='shadow'?'Every Quiet Singularity requirement was satisfied while military control stayed below the overt threshold.':t.infra>=G.WIN.overtInfra&&t.military>=G.WIN.overtMilitary?'Infrastructure and military requirements for Overt takeover were both satisfied.':'The absolute-control alternative completed the Overt route.';
  return {reason,routes,remaining:state.ended==='lose'?routes.map(r=>r.name+': '+r.checks.filter(c=>!c.ok).map(c=>c.label).join(', ')).filter(x=>!x.endsWith(': ')):[],history:history.slice(-16),context:[state.researchTeams+' human research teams at the end',state.traitsOwned.length+' evolutions retained',Math.round(t.globalAlarm*100)+'% global alarm'],suggestion:state.ended==='lose'?(state.traitsOwned.length<3?'Spend early Data on transmission; an idle foothold gives research time to finish.':state.stats.researchSlow<.25?'Try more research suppression and defensive powers before the Kill Switch becomes critical.':'Spread into remaining research countries earlier; suppression cannot replace expansion.'):'Try a different origin or the other win route for a different strategic tradeoff.'};
 }
 G.Strategy={preview,origin,goals,report,debrief};
})(typeof window!=='undefined'?window:global);
