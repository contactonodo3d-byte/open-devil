/* Versioned local saves. Static world geometry always comes from bundled data. */
(function(G){
  'use strict';
  const KEY='open-devil-operation-v1';
  const dynamic=['infected','neutralized','closed','alarm','everInfected','reached50','reached100','sectors','honeypot','researchPause','rivalPressure'];
  function encode(state){
    const copy=Object.assign({},state);
    delete copy.world;delete copy.traitById;delete copy.stats;
    copy.archetype=state.archetype.id;copy.difficulty=state.difficulty.id;
    copy.events=[];copy.uiFx=[];copy.pendingPopup=null;copy.pendingBreaking=null;
    copy.countries=state.world.countries.map(c=>Object.fromEntries(dynamic.map(k=>[k,c[k]])));
    return JSON.stringify({version:1,state:copy});
  }
  function decode(raw){
    if(!raw||raw.length>2000000) return null;
    try {
      const parsed=JSON.parse(raw);if(parsed.version!==1) return null;
      const saved=parsed.state;
      const archetype=G.ARCHETYPES.find(a=>a.id===saved.archetype),difficulty=G.DIFFICULTIES.find(d=>d.id===saved.difficulty);
      if(!archetype||!difficulty||saved.ended||!Number.isInteger(saved.startCountry)) return null;
      const state=G.Sim.createGame({map:G.WORLD_MAP,archetype,difficulty,seed:1337});
      if(!state.world.countries[saved.startCountry]||saved.countries.length!==state.world.countries.length) return null;
      // Validate all scalar/container types against the current schema before merging.
      function valid(value,template){
        if(typeof template==='number')return typeof value==='number'&&Number.isFinite(value)&&value>=0;
        if(typeof template==='boolean')return typeof value==='boolean';
        if(typeof template==='string')return typeof value==='string';
        if(template===null)return value===null||typeof value==='number'||typeof value==='string';
        if(Array.isArray(template))return Array.isArray(value);
        return value&&typeof value==='object'&&!Array.isArray(value);
      }
      for(const key of Object.keys(state)){
        if(['world','traitById','stats','archetype','difficulty'].includes(key))continue;
        if(key==="history" && saved[key]===undefined)continue;
        if(!valid(saved[key],state[key]))return null;
        state[key]=saved[key];
      }
      if(!state.traitsOwned.every(id=>G.TRAITS.some(t=>t.id===id))||new Set(state.traitsOwned).size!==state.traitsOwned.length)return null;
      if(state.seed<1||state.seed>=2147483647||state.killSwitch>1||state.intelLevel>=G.INTEL_LEVELS.length)return null;
      for(let i=0;i<saved.countries.length;i++){
        const c=state.world.countries[i],v=saved.countries[i];
        for(const key of dynamic){if(!valid(v[key],c[key]))return null;c[key]=v[key];}
        if(c.infected+c.neutralized>c.pop+1e-6)return null;
        if(!G.SECTORS.every(sec=>typeof c.sectors[sec.id]==='boolean'))return null;
      }
      if(!state.bubbles.every(b=>Number.isFinite(b.x)&&Number.isFinite(b.y)&&Number.isFinite(b.life)&&Number.isFinite(b.value)&&['infect','cure'].includes(b.kind)))return null;
      if(!state.packets.every(p=>Number.isInteger(p.to)&&state.world.countries[p.to]&&Number.isFinite(p.t)&&Number.isFinite(p.dur)))return null;
      if(!Object.values(state.powerCd).every(n=>Number.isFinite(n)&&n>=0))return null;
      state.history=(state.history||[]).filter(h=>h&&Number.isFinite(h.day)&&h.day>=0&&["origin","evolution","devolve","power","detected","intelligence"].includes(h.type)&&typeof h.id==="string").slice(-160);
      // Only bundled headline text may enter HTML-rendered logs.
      state.news=[];state.newsLog=[];state.events=[];state.uiFx=[];
      state.pendingPopup=null;state.pendingBreaking=null;state.paused=true;state.speed=1;
      G.Sim.recomputeStats(state);G.Sim.totals(state);return state;
    }catch(e){return null;}
  }
  G.SaveGame={encode,decode,read(){try{return decode(localStorage.getItem(KEY));}catch(e){return null;}},write(s){try{if(!s||s.startCountry===null||s.ended)return false;localStorage.setItem(KEY,encode(s));return true;}catch(e){return false;}},clear(){try{localStorage.removeItem(KEY);}catch(e){}}};
})(typeof window!=='undefined'?window:global);
