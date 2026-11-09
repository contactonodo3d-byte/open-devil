(function(G){
 'use strict';
 const supported=['en','es','pt'];
 let stored;try{stored=localStorage.getItem('open-devil-language');}catch(e){}
 const requested=new URLSearchParams(location.search).get('lang');
 const browser=(navigator.language||'en').slice(0,2);
 const language=supported.includes(requested)?requested:supported.includes(stored)?stored:supported.includes(browser)?browser:'en';
 const column=language==='pt'?1:0;
 const dictionary=new Map();
 if(language!=='en')G.LOCALE_UI.forEach(row=>dictionary.set(row[0],row[column+1]));
 function bind(items,translations,fields){
  if(language==='en')return;
  items.forEach(item=>{const row=translations[item.id];if(!row)return;fields.forEach((field,i)=>{
   if(item[field]&&row[i*2+column]){dictionary.set(item[field],row[i*2+column]);item[field]=row[i*2+column];}
  });});
 }
 bind(G.ARCHETYPES,G.LOCALE_DATA.archetypes,['name','flavor']);
 bind(G.DIFFICULTIES,G.LOCALE_DATA.difficulties,['name','desc']);
 bind(G.TRAITS,G.LOCALE_DATA.traits,['name','desc']);
 bind(Object.entries(G.ARCHETYPE_DOCTRINES).map(([id,item])=>Object.assign(item,{id})),G.LOCALE_DATA.doctrines,['name','desc']);
 bind(G.ACTIVE_POWERS,G.LOCALE_DATA.powers,['name','desc']);
 bind(G.SECTORS,G.LOCALE_DATA.sectors,['name','desc']);
 bind(G.TRAIT_TABS,G.LOCALE_DATA.tabs,['name','subtitle']);
 bind(G.INTEL_LEVELS,G.LOCALE_DATA.intel,['name']);
 if(language!=='en'){
  G.HEADLINES.forEach(item=>{const row=G.LOCALE_NEWS[item.id];if(row){dictionary.set(item.text,row[column]);item.text=row[column];}});
  const names=new Intl.DisplayNames([language==='pt'?'pt-BR':'es'],{type:'region'});
  G.WORLD_MAP.countries.forEach(c=>{
   const exceptional={CYN:['Chipre del Norte','Chipre do Norte'],SML:['Somalilandia','Somalilândia']};
   if(exceptional[c.iso]){const name=exceptional[c.iso][column];dictionary.set(c.n,name);c.n=name;return;}
   const region=G.LOCALE_COUNTRY_CODES[c.iso];
   if(region){const name=names.of(region);dictionary.set(c.n,name);c.n=name;}
  });
 }
 const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const keys=[...dictionary.keys()].sort((a,b)=>b.length-a.length);
 // Unicode boundaries avoid translating English fragments inside Spanish/Portuguese words.
 const matcher=language==='en'?null:new RegExp('(?<![\\p{L}\\p{N}_])(?:'+keys.map(escape).join('|')+')(?![\\p{L}\\p{N}_])','gu');
 function text(value){
  const source=value==null?'':String(value);
  if(language==='en')return source;
  const translated=dictionary.has(source)?dictionary.get(source):source.replace(matcher,part=>dictionary.get(part));
  return translated.replace(/(\d)\.(\d)/g,'$1,$2');
 }
 function apply(root){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  let node;
  while((node=walker.nextNode())){
   if(node.parentElement&&node.parentElement.closest('script,style,#language-select'))continue;
   const next=text(node.nodeValue);if(next!==node.nodeValue)node.nodeValue=next;
  }
  root.querySelectorAll('[aria-label],[title],[placeholder]').forEach(el=>{
   for(const key of ['aria-label','title','placeholder'])if(el.hasAttribute(key))el.setAttribute(key,text(el.getAttribute(key)));
  });
 }
 function html(value){
  if(language==='en')return value;
  const template=document.createElement('template');template.innerHTML=String(value);apply(template.content);return template.innerHTML;
 }
 function setLanguage(code){
  if(!supported.includes(code)||code===language)return;
  try{localStorage.setItem('open-devil-language',code);sessionStorage.setItem('open-devil-language-switch','1');
   sessionStorage.setItem('open-devil-menu-choice',JSON.stringify({archetype:document.querySelector('#archetype-list .selected')?.dataset.archetype,difficulty:document.querySelector('#difficulty-list .selected')?.dataset.difficulty}));
  }catch(e){}
  const url=new URL(location.href);url.searchParams.set('lang',code);url.searchParams.set('v','12');location.replace(url.href);
 }
 G.I18n={language,text,html,setLanguage};
 document.documentElement.lang=language==='pt'?'pt-BR':language;
 apply(document.body);
 const select=document.getElementById('language-select');select.value=language;select.onchange=()=>setLanguage(select.value);
})(window);
