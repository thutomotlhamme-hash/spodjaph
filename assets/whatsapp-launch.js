(()=>{
const PHONE='27625683235';
const q=(s,r=document)=>r.querySelector(s);const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const clean=v=>String(v??'').trim();
const selectedPackage=form=>clean(q('input[name="package_pick"]:checked',form)?.value||q('select[name="package"]',form)?.selectedOptions?.[0]?.textContent||'');
const selectedExtras=form=>qa('input[name="coverage_needs"]:checked',form).map(x=>clean(x.value)).filter(v=>v&&v!=='photography');
const open=text=>window.open(`https://wa.me/${PHONE}?text=${encodeURIComponent(text)}`,'_blank','noopener');
function generic(form){
 const page=document.body.dataset.page||''; const type=clean(q('[name="client_type"]',form)?.value||page);
 const names={events:{lobola:'Lobola', 'matric-dance':'Matric Dance', birthday:'Birthday','baby-shower':'Baby Shower'},weddings:{intimate:'Wedding Lane',traditional:'Traditional / Lobola Wedding','full-day':'Wedding Lane'},portraits:{personal:'Portrait Room',professional:'Portrait Room',couples:'Portrait Room'},brands:{brand:'Brand Desk',agency:'Brand Desk',corporate:'Brand Desk'}};
 const journey=names[page]?.[type]||({events:'Events Avenue',weddings:'Wedding Lane',portraits:'Portrait Room',brands:'Brand Desk'}[page]||'Spodja PH');
 const pkg=selectedPackage(form)||'To confirm'; const date=clean(q('[name="shoot_date"]',form)?.value); const time=clean(q('[name="event_time"]',form)?.value); const venue=clean(q('[name="venue"]',form)?.value||q('[name="city"]',form)?.value); const name=clean(q('[name="contact_name"]',form)?.value); const extras=selectedExtras(form);
 let text=`Hi Thuto, I’d like to confirm my ${journey} booking.\nPackage: ${pkg}`;
 if(date) text+=`\nDate: ${date}`; if(time) text+=`\nPreferred Time: ${time}`; if(venue) text+=`\nVenue / Location: ${venue}`; if(name) text+=`\nName: ${name}`; if(extras.length) text+=`\nUpsells: ${extras.join(', ')}`;
 open(text);
}
function grad(form){
 const pkg=clean(q('#package')?.selectedOptions?.[0]?.textContent)||'Grad House package'; const loc=clean(q('#location-search')?.value); const date=clean(q('#date')?.value); const timeBtn=q('.time-btn.selected'); const time=timeBtn?clean(timeBtn.textContent.split(/\n/)[0]):clean(q('#selected-time')?.textContent.replace(/^Selected:\s*/,'').split(' at ')[1]||''); const name=clean(q('[name="full_name"]',form)?.value);
 const text=`Hi Thuto, I’d like to confirm my Grad House booking.\nPackage: ${pkg}\nUniversity / Location: ${loc}\nDate: ${date}\nPreferred Time: ${time}\nName: ${name}`; open(text);
}
document.addEventListener('submit',e=>{const form=e.target;if(!(form instanceof HTMLFormElement))return;if(form.matches('[data-lane-form]')){e.preventDefault();e.stopImmediatePropagation();if(!form.reportValidity())return;generic(form)}else if(form.id==='grad-form'){e.preventDefault();e.stopImmediatePropagation();if(!form.reportValidity())return;if(!q('.time-btn.selected')){const st=q('#grad-status');if(st){st.className='status show error';st.textContent='Choose a live time before continuing to WhatsApp.'}return}grad(form)}},true);
function eventJourney(){if(document.body.dataset.page!=='events')return;const form=q('[data-lane-form]');if(!form)return;const journey=new URLSearchParams(location.search).get('journey')||location.pathname.split('/').filter(Boolean).pop();const b=q(`[data-flow-tab="${CSS.escape(journey||'')}"]`);if(b) setTimeout(()=>{b.click();q('#book')?.scrollIntoView({block:'start'})},30);q('.journey-copy-link')?.addEventListener('click',async()=>{const key=clean(q('[name="client_type"]',form)?.value)||'birthday';const url=`${location.origin}/events/${key}/`;try{await navigator.clipboard.writeText(url);const x=q('.journey-copy-link');if(x){const old=x.textContent;x.textContent='Link copied ✓';setTimeout(()=>x.textContent=old,1500)}}catch{prompt('Copy client link',url)}})}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',eventJourney):eventJourney();
})();