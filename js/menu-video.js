/* Decorative menu film: lazy loading, silent inline playback and a static fallback. */
(function(){
 'use strict';
 const menu=document.getElementById('boot-screen'),video=document.getElementById('menu-film'),button=document.getElementById('menu-film-toggle');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let loaded=false,userPaused=false,inView=true;
 function label(){const paused=video.paused;button.setAttribute('aria-label',I18n.text(paused?'Play animation':'Pause animation'));button.querySelector('use').setAttribute('href',paused?'#icon-play':'#icon-pause');}
 function update(){
  const visible=!menu.classList.contains('hidden')&&!document.hidden&&inView;
  if(!visible||reduced.matches||userPaused){video.pause();if(reduced.matches)video.classList.remove('playing');return;}
  if(!loaded){loaded=true;video.querySelectorAll('source').forEach(s=>s.src=s.dataset.src);video.load();}
  const attempt=video.play();if(attempt)attempt.catch(()=>{label();});
 }
 video.muted=true;
 video.addEventListener('playing',()=>{video.classList.add('playing');label();});
 video.addEventListener('pause',label);
 video.addEventListener('error',()=>{video.classList.remove('playing');button.hidden=true;});
 button.addEventListener('click',()=>{userPaused=!video.paused;if(userPaused){video.pause();label();}else update();});
 new MutationObserver(update).observe(menu,{attributes:true,attributeFilter:['class']});
 if(window.IntersectionObserver)new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;update();}).observe(video);
 document.addEventListener('visibilitychange',update);
 reduced.addEventListener('change',()=>{button.hidden=reduced.matches;update();});
 button.hidden=reduced.matches;label();update();
})();
