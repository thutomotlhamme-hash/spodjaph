// "Book on WhatsApp": the second way to book, next to paying online.
// The form's own submit goes to secure payment (site.js / grad.js); this only
// handles the WhatsApp button, carrying the client's choices into the message.
(()=>{
const PHONE='27625683235';
const q=(s,r=document)=>r.querySelector(s);const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const clean=v=>String(v??'').trim();
const selectedPackage=form=>clean(q('input[name="package_pick"]:checked',form)?.value||q('select[name="package"]',form)?.selectedOptions?.[0]?.textContent||'');
const selectedExtras=form=>qa('input[name="coverage_needs"]:checked',form).map(x=>clean(x.value)).filter(v=>v&&v!=='photography');
const open=text=>window.open(`https://wa.me/${PHONE}?text=${encodeURIComponent(text)}`,'_blank','noopener');
const ASK='Please confirm availability and send me the payment link to secure the booking.';
function generic(form){
 const page=document.body.dataset.page||''; const type=clean(q('[name="client_type"]',form)?.value||page);
 const names={events:{lobola:'Lobola', 'matric-dance':'Matric Dance', birthday:'Birthday','baby-shower':'Baby Shower'},weddings:{intimate:'Wedding Lane',traditional:'Traditional / Lobola Wedding','full-day':'Wedding Lane'},portraits:{personal:'Portrait Room',professional:'Portrait Room',couples:'Portrait Room'},brands:{brand:'Brand Desk',agency:'Brand Desk',corporate:'Brand Desk'}};
 const journey=names[page]?.[type]||({events:'Events Avenue',weddings:'Wedding Lane',portraits:'Portrait Room',brands:'Brand Desk'}[page]||'Spodja PH');
 const pkg=selectedPackage(form)||'To confirm'; const date=clean(q('[name="shoot_date"]',form)?.value); const time=clean(q('[name="event_time"]',form)?.value); const venue=clean(q('[name="venue"]',form)?.value||q('[name="city"]',form)?.value); const name=clean(q('[name="contact_name"]',form)?.value); const extras=selectedExtras(form);
 let text=`Hi Thuto, I’d like to book my ${journey} shoot.\nPackage: ${pkg}`;
 if(date) text+=`\nDate: ${date}`; if(time) text+=`\nPreferred Time: ${time}`; if(venue) text+=`\nVenue / Location: ${venue}`; if(name) text+=`\nName: ${name}`; if(extras.length) text+=`\nUpsells: ${extras.join(', ')}`;
 open(`${text}\n\n${page==='brands'?'Please send me a quote.':ASK}`);
}
function grad(form){
 const pkg=clean(q('#package')?.selectedOptions?.[0]?.textContent)||'Grad House package'; const loc=clean(q('#location-search')?.value); const date=clean(q('#date')?.value); const timeBtn=q('.time-btn.selected'); const time=timeBtn?clean(timeBtn.textContent.split(/\n/)[0]):''; const name=clean(q('[name="full_name"]',form)?.value);
 open(`Hi Thuto, I’d like to book my Grad House shoot.\nPackage: ${pkg}\nUniversity / Location: ${loc}\nDate: ${date}\nPreferred Time: ${time}\nName: ${name}\n\n${ASK}`);
}
document.addEventListener('click',e=>{
 const btn=e.target.closest?.('[data-whatsapp-book]');if(!btn)return;const form=btn.closest('form');if(!form)return;
 e.preventDefault();if(!form.reportValidity())return;
 if(form.id==='grad-form'){if(!q('.time-btn.selected')){const st=q('#grad-status');if(st){st.className='status show error';st.textContent='Choose a live time first, then book on WhatsApp.'}return}grad(form)}else generic(form);
});
function eventJourney(){if(document.body.dataset.page!=='events')return;const form=q('[data-lane-form]');if(!form)return;const journey=new URLSearchParams(location.search).get('journey')||location.pathname.split('/').filter(Boolean).pop();const b=q(`[data-flow-tab="${CSS.escape(journey||'')}"]`);if(b) setTimeout(()=>{b.click();q('#book')?.scrollIntoView({block:'start'})},30);q('.journey-copy-link')?.addEventListener('click',async()=>{const key=clean(q('[name="client_type"]',form)?.value)||'birthday';const url=`${location.origin}/events/${key}/`;try{await navigator.clipboard.writeText(url);const x=q('.journey-copy-link');if(x){const old=x.textContent;x.textContent='Link copied ✓';setTimeout(()=>x.textContent=old,1500)}}catch{prompt('Copy client link',url)}})}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',eventJourney):eventJourney();
})();
