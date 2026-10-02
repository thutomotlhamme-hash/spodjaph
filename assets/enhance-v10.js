(()=>{
const HD='/assets/portfolio/hd/';
const sets={
 home:['_DSC2179.jpg','_DSC0396copy(3).jpg','_DSC0336copy(3).jpg','IMG_7556(1).JPG'],
 graduation:['grad-house-1.jpg','grad-house-5.jpg','grad-house-8.jpg','grad-house-10.jpg','grad-house-7.jpg'],
 events:['_DSC2181.jpg','_DSC2179.jpg','_DSC2115.jpg','_DSC2151.jpg'],
 portraits:['portrait-room-1.jpg','portrait-room-5.jpg','portrait-room-4.jpg','portrait-room-6.jpg'],
 brands:['_DSC0334copy(3).jpg','_DSC0336copy(3).jpg','_DSC2181.jpg','_DSC0396copy(3).jpg'],
 weddings:['wedding-lane-1.jpg','wedding-lane-5.jpg','wedding-lane-3.jpg','wedding-lane-6.jpg']
};
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
function urlFor(v){return v.startsWith('/')?v:HD+v}
function installSlider(host,images){if(!host||!images?.length)return;const layer=document.createElement('div');layer.className='v10-slides';const nodes=images.map((src,i)=>{const im=document.createElement('img');im.className='v10-slide'+(i===0?' is-active':'');im.src=urlFor(src);im.alt='';im.decoding=i===0?'sync':'async';if(i===0)im.fetchPriority='high';else im.loading='lazy';layer.appendChild(im);return im});host.appendChild(layer);if(images.length<2||reduce)return;const prog=document.createElement('div');prog.className='v10-slide-progress';const bars=images.map((_,i)=>{const b=document.createElement('i');if(i===0)b.className='active';prog.appendChild(b);return b});host.appendChild(prog);let idx=0;setInterval(()=>{nodes[idx].classList.remove('is-active');bars[idx].classList.remove('active');idx=(idx+1)%nodes.length;nodes[idx].classList.add('is-active');void bars[idx].offsetWidth;bars[idx].classList.add('active');const next=nodes[(idx+1)%nodes.length];if(next&&!next.complete){const p=new Image();p.src=next.src}},6000)}
function sliders(){const page=document.body.dataset.page||'';if(page==='home')installSlider(document.querySelector('.home-live-bg'),sets.home);else if(page==='graduation')installSlider(document.querySelector('.hero-media'),sets.graduation);else if(sets[page])installSlider(document.querySelector('.lane-hero-art'),sets[page])}
function shine(){document.querySelectorAll('.story-main,.story-small,.photo-card,.package,.lane-hero-art,.agency-image,.checkout-story .journey-visuals figure').forEach(x=>x.classList.add('v10-shine-frame'));const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('v10-in')}),{threshold:.08,rootMargin:'0px 0px -6%'});document.querySelectorAll('main section,.story-main,.story-small,.package-pick,.photo-card').forEach(x=>{x.classList.add('v10-rise');io.observe(x)})}
function book(){const d=document.querySelector('[data-book-lightbox]');if(!d)return;const img=d.querySelector('img'),shots=[...document.querySelectorAll('.book-shot img')];let idx=0;const show=i=>{idx=(i+shots.length)%shots.length;img.src=shots[idx].currentSrc||shots[idx].src;img.alt=''};shots.forEach((x,i)=>x.closest('.book-shot').addEventListener('click',()=>{show(i);d.showModal()}));d.querySelector('.book-close')?.addEventListener('click',()=>d.close());d.querySelector('.book-prev')?.addEventListener('click',()=>show(idx-1));d.querySelector('.book-next')?.addEventListener('click',()=>show(idx+1));d.addEventListener('click',e=>{if(e.target===d)d.close()});addEventListener('keydown',e=>{if(!d.open)return;if(e.key==='ArrowLeft')show(idx-1);if(e.key==='ArrowRight')show(idx+1)})}
function dynamicLogo(){
 const marks=[...document.querySelectorAll('a.brand img.spodja-brand-mark')];
 if(!marks.length)return;
 const wraps=[];
 marks.forEach(original=>{
  if(original.closest('.spodja-logo-juggle')){wraps.push(original.closest('.spodja-logo-juggle'));return}
  const wrap=document.createElement('span');wrap.className='spodja-logo-juggle';
  original.parentNode.insertBefore(wrap,original);wrap.appendChild(original);original.classList.add('spodja-logo-original');
  const accent=document.createElement('img');accent.className='spodja-brand-mark spodja-logo-accent';accent.src='/assets/branding/spodja-logo-accent.png';accent.alt='';accent.setAttribute('aria-hidden','true');accent.decoding='async';wrap.appendChild(accent);wraps.push(wrap)
 });
 if(reduce)return;
 let release=0;
 const pulse=()=>{clearTimeout(release);wraps.forEach(w=>w.classList.add('show-accent'));release=setTimeout(()=>wraps.forEach(w=>w.classList.remove('show-accent')),2800)};
 setTimeout(pulse,6500);setInterval(pulse,12000)
}
function init(){dynamicLogo();sliders();shine();book()}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
