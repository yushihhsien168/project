(function(){
  'use strict';
  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn,{once:true}); else fn(); }
  ready(function(){
    // Reading progress
    var bar=document.createElement('div'); bar.className='pm-progress'; document.body.appendChild(bar);
    function progress(){
      var h=document.documentElement.scrollHeight-window.innerHeight;
      bar.style.width=(h>0?Math.min(100,Math.max(0,window.scrollY/h*100)):0)+'%';
    }
    window.addEventListener('scroll',progress,{passive:true}); progress();

    // Scroll reveal for public-facing content.
    var selectors=['.kpi','.home-intro','.pain-card','.audience-card','.decision-check','.decision-promise','.flagship-card','.platform-section','.moat-grid>div','.trust-grid>div','.invest-item','.cta-section .cta-box','.detail-view .section','.pm-company section .card','.pm-company .flow div'];
    var nodes=[]; selectors.forEach(function(sel){document.querySelectorAll(sel).forEach(function(el){nodes.push(el);});});
    nodes.forEach(function(el,i){
      if(!el.classList.contains('pm-reveal')){
        el.classList.add('pm-reveal');
        if(i%4===1) el.classList.add('pm-delay-1');
        if(i%4===2) el.classList.add('pm-delay-2');
        if(i%4===3) el.classList.add('pm-delay-3');
      }
    });
    if('IntersectionObserver' in window){
      var io=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting){entry.target.classList.add('pm-visible');io.unobserve(entry.target);}})},{threshold:.12,rootMargin:'0px 0px -40px'});
      nodes.forEach(function(el){io.observe(el);});
    }else nodes.forEach(function(el){el.classList.add('pm-visible');});

    // Gentle pointer parallax for hero visual, disabled on touch.
    var visual=document.querySelector('.hero-visual');
    if(visual && window.matchMedia && window.matchMedia('(pointer:fine)').matches){
      var targetX=0,targetY=0,currentX=0,currentY=0;
      document.addEventListener('pointermove',function(e){
        targetX=(e.clientX/window.innerWidth-.5)*8; targetY=(e.clientY/window.innerHeight-.5)*6;
      },{passive:true});
      function tick(){currentX+=(targetX-currentX)*.05;currentY+=(targetY-currentY)*.05;visual.style.transform='translate3d('+currentX+'px,'+currentY+'px,0)';requestAnimationFrame(tick)}
      requestAnimationFrame(tick);
    }
  });
})();
