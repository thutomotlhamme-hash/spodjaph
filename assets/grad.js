const G=window.SpData;
const S={data:null,pkg:null,campaign:null,location:null,date:null,time:null,booking:null,searchTimer:null};
const el=id=>document.getElementById(id);const q=new URLSearchParams(location.search);
const setStatus=(msg,type='')=>{const x=el('grad-status');if(!x)return;x.className=`status show ${type}`;x.innerHTML=msg};
const clearStatus=()=>{const x=el('grad-status');if(x)x.className='status'};
const fmtPackage=p=>`${p.name} · ${G.money(p.price_cents)} · ${p.duration_minutes} min · ${p.edited_images} edits${Number(p.reel_seconds)>0?` · ${p.reel_seconds}s reel`:''}`;
const norm=v=>String(v||'').trim().toLowerCase().replace(/\s+/g,' ');
const escAttr=v=>G.esc(String(v||''));

function generalCampaign(campaigns=[]){return campaigns.find(c=>c.slug==='gauteng-september-2026')||campaigns.find(c=>!c.university)||campaigns[0]||null}
function updateDateLimits(){
 const d=el('date'),c=S.campaign;if(!d)return;
 if(c?.starts_on)d.min=c.starts_on;if(c?.ends_on)d.max=c.ends_on;
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Johannesburg',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 if(c?.starts_on&&!d.value)d.value=c.starts_on>today?c.starts_on:today;
 S.date=d.value;S.time=null;renderEmptyTimes();
}
function renderEmptyTimes(msg='Choose package, location and date, then check whole-day availability.'){
 const wrap=el('times');if(wrap)wrap.innerHTML=`<span class="helper">${G.esc(msg)}</span>`;const st=el('selected-time');if(st)st.textContent='No time selected.'
}
function renderPackageSummary(){
 const p=S.data?.grad?.packages?.find(x=>x.slug===el('package')?.value);S.pkg=p;const box=el('package-summary');
 if(!box)return;if(!p){box.innerHTML='<small>Choose a package to see details.</small>';return}
 const items=Array.isArray(p.included_items)&&p.included_items.length?p.included_items:[];
 box.innerHTML=`<strong>${G.esc(p.name)} · ${G.money(p.price_cents)}</strong><small>${G.esc(p.tagline||'')} · ${p.duration_minutes} min · ${p.edited_images} edits${Number(p.reel_seconds)>0?` · ${p.reel_seconds}s reel`:''}</small>${items.length?`<ul>${items.map(x=>`<li>${G.esc(x)}</li>`).join('')}</ul>`:''}`;
 S.time=null;renderEmptyTimes();
}
function addLiveLocationsToDatalist(locations=[]){
 const dl=el('university-options');if(!dl)return;const existing=new Set([...dl.options].map(o=>norm(o.value)));
 locations.forEach(l=>{[l.name,l.area].filter(Boolean).forEach(v=>{if(!existing.has(norm(v))){const o=document.createElement('option');o.value=v;dl.appendChild(o);existing.add(norm(v))}})})
}
function loadSelects(data){
 S.data=data;const packages=data?.grad?.packages||[],campaigns=data?.grad?.campaigns||[],locations=data?.grad?.locations||[];
 const ps=el('package');ps.innerHTML='<option value="">Choose package</option>'+packages.map(p=>`<option value="${G.esc(p.slug)}">${G.esc(fmtPackage(p))}</option>`).join('');
 const wanted=q.get('package');if(wanted&&packages.some(p=>p.slug===wanted))ps.value=wanted;
 S.campaign=generalCampaign(campaigns);el('campaign').value=S.campaign?.slug||'gauteng-september-2026';
 addLiveLocationsToDatalist(locations);updateDateLimits();renderPackageSummary();
}
function setLocation(loc){
 S.location=loc;S.time=null;const input=el('location-search'),picked=el('location-picked'),results=el('location-results');
 if(input&&loc?.name)input.value=loc.name;
 if(el('university'))el('university').value=loc?.university||loc?.name||'';
 if(picked)picked.textContent=loc?.name?`${loc.name}${loc.detail?` · ${loc.detail}`:''}`:'Type a university, venue or address, then choose a result.';
 results?.classList.remove('show');renderEmptyTimes();
}
function exactKnownLocation(value){
 const n=norm(value);return (S.data?.grad?.locations||[]).find(l=>norm(l.name)===n||norm(l.area)===n||norm(`${l.name} ${l.area||''}`)===n)
}
async function searchLocations(term,{autoPick=false}={}){
 const results=el('location-results');if(term.trim().length<3){results?.classList.remove('show');return []}
 try{
  const r=await fetch(`${G.API_BASE}/grad-location-search?q=${encodeURIComponent(term.trim())}`);const out=await r.json().catch(()=>({}));if(!r.ok)throw new Error(out.error||'location_search_failed');const rows=out.results||[];
  if(autoPick&&rows.length){const x=rows[0];setLocation({kind:'custom',name:x.display_name||x.name,detail:x.travel_label||'',lat:Number(x.latitude),lon:Number(x.longitude),university:term});return rows}
  if(results){results.innerHTML=rows.length?rows.map((x,i)=>`<button type="button" class="location-result" data-i="${i}"><b>${G.esc(x.name||x.display_name)}</b><small>${G.esc(x.display_name||'')}${x.travel_label?` · ${G.esc(x.travel_label)}`:''}</small></button>`).join(''):'<div class="location-result"><b>No mapped match yet</b><small>Keep typing a more specific campus, venue or address.</small></div>';results.classList.add('show');results.querySelectorAll('button[data-i]').forEach(b=>b.addEventListener('click',()=>{const x=rows[Number(b.dataset.i)];setLocation({kind:'custom',name:x.display_name||x.name,detail:x.travel_label||'',lat:Number(x.latitude),lon:Number(x.longitude),university:term})}))}
  return rows;
 }catch(e){if(results){results.innerHTML='<div class="location-result"><b>Search unavailable</b><small>Try again in a moment or enter a known campus.</small></div>';results.classList.add('show')}return []}
}
async function resolveLocation(){
 const typed=el('location-search').value.trim();if(!typed)return null;
 if(S.location&&norm(S.location.name)===norm(typed))return S.location;
 const known=exactKnownLocation(typed);if(known){const loc={kind:'slug',slug:known.slug,name:known.name,detail:known.area||'',university:known.institution_slug||typed};setLocation(loc);return loc}
 const rows=await searchLocations(typed,{autoPick:true});return rows.length?S.location:null;
}
function groupName(iso){const h=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Johannesburg',hour:'2-digit',hour12:false}).format(new Date(iso)));return h<12?'Morning':h<17?'Afternoon':'Evening'}
function minuteLocal(iso){return Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Johannesburg',minute:'2-digit'}).format(new Date(iso)))}
function renderTimes(times){
 const chronological=[...times].filter(t=>minuteLocal(t.starts_at)%15===0).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at));
 const rows=chronological.length?chronological:[...times].sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at));
 const groups=['Morning','Afternoon','Evening'].map(name=>[name,rows.filter(t=>groupName(t.starts_at)===name)]).filter(([,xs])=>xs.length);
 const wrap=el('times');if(!groups.length){renderEmptyTimes('No times are available for this date/location. Try another date or location.');return}
 wrap.className='time-groups';wrap.innerHTML=groups.map(([name,xs])=>`<section class="time-group"><h4>${name}</h4><div class="times">${xs.map(t=>`<button class="time-btn" type="button" data-time="${escAttr(t.starts_at)}">${G.localTime(t.starts_at)}<br><small>${G.esc(t.recommendation||'Available')}</small></button>`).join('')}</div></section>`).join('');
 wrap.querySelectorAll('.time-btn').forEach(btn=>btn.addEventListener('click',()=>{wrap.querySelectorAll('.time-btn').forEach(x=>x.classList.remove('selected'));btn.classList.add('selected');S.time=btn.dataset.time;el('selected-time').textContent=`Selected: ${G.localDate(S.time)} at ${G.localTime(S.time)}`}));
}
async function checkTimes(){
 clearStatus();const pkg=el('package').value,date=el('date').value,camp=el('campaign').value;if(!pkg||!date||!el('location-search').value.trim()){setStatus('Choose a package, location and date first.','error');return}
 const b=el('check-times');b.disabled=true;b.textContent='Checking the day…';try{const loc=await resolveLocation();if(!loc)throw new Error('Choose a mapped university, campus, venue or address from the suggestions.');const u=new URL(`${G.API_BASE}/grad-custom-times`);u.searchParams.set('date',date);u.searchParams.set('package',pkg);u.searchParams.set('campaign',camp);if(loc.kind==='slug')u.searchParams.set('location',loc.slug);else{u.searchParams.set('lat',String(loc.lat));u.searchParams.set('lon',String(loc.lon))}const r=await fetch(u);const out=await r.json().catch(()=>({}));if(!r.ok)throw new Error(out.error||'Availability failed');renderTimes(out.times||[]);if(out.workday)setStatus(`Live availability loaded across ${G.esc(out.workday.start)}–${G.esc(out.workday.end)}. Pick the time that suits you.`,'success')
 }catch(e){setStatus(`Could not check live times: ${G.esc(e.message)}`,'error')}finally{b.disabled=false;b.textContent='Check live times →'}
}
function payload(){
 const fd=new FormData(el('grad-form')),loc=S.location||{};const base={full_name:fd.get('full_name'),email:fd.get('email'),phone:fd.get('phone'),university:fd.get('university')||el('location-search').value.trim(),package_slug:fd.get('package'),campaign_slug:fd.get('campaign'),requested_starts_at:S.time,requested_time_window:null,shoot_mode:fd.get('shoot_mode'),party_size:Number(fd.get('party_size')||1),accepted_policies:fd.get('accepted_policies')==='on',marketing_opt_in:fd.get('marketing_opt_in')==='on',portfolio_consent:fd.get('portfolio_consent')==='on',utm_source:q.get('utm_source'),utm_medium:q.get('utm_medium'),utm_campaign:q.get('utm_campaign'),ref_code:q.get('ref')||q.get('ref_code')};
 if(loc.kind==='slug')base.requested_location_slug=loc.slug;else{base.requested_location_slug=null;base.custom_location_name=loc.name;base.custom_location_address=loc.name;base.custom_latitude=loc.lat;base.custom_longitude=loc.lon}return base;
}
async function reserve(e){
 e.preventDefault();clearStatus();const form=el('grad-form');if(!form.reportValidity())return;if(!S.time){setStatus('Choose a live time before reserving.','error');return}if(!S.location){setStatus('Choose or resolve your university / shoot location first.','error');return}
 const btn=el('reserve');btn.disabled=true;btn.textContent='Reserving your time…';try{const r=await fetch(`${G.API_BASE}/grad-create-booking`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload())});const out=await r.json().catch(()=>({}));if(!r.ok)throw new Error(out.error||'Booking failed');S.booking=out;try{sessionStorage.setItem('spodja_grad_booking',JSON.stringify(out))}catch{}const payUrl=`/payment/?booking=${encodeURIComponent(out.booking_id)}&token=${encodeURIComponent(out.manage_token)}`;const packageLabel=el('package').options[el('package').selectedIndex]?.textContent?.trim()||'Grad House package';const locationLabel=(S.location?.name||el('location-search').value.trim()||'Selected location');const dateLabel=el('date').value||'';const timeLabel=S.time?G.localTime(S.time):'';const waText=`Hi Thuto, I’d like to confirm my Grad House booking. Package: ${packageLabel} University / Location: ${locationLabel} Date: ${dateLabel} Preferred Time: ${timeLabel} Name: ${(form.elements.namedItem('full_name')?.value||'').toString().trim()}`;const waUrl=`https://wa.me/27625683235?text=${encodeURIComponent(waText)}`;el('hold-box').style.display='block';el('hold-box').innerHTML=`<strong>Time held · ${G.esc(out.booking_reference)}</strong><small>Your slot is held while you complete payment. Total: ${G.money(out.total_amount_cents)}.</small><div class="actions" style="margin-top:14px;justify-content:flex-start"><a class="btn btn-primary" id="pay-now" href="${payUrl}">Choose payment method →</a><a class="btn btn-outline" href="${waUrl}" target="_blank" rel="noopener">Finish booking on WhatsApp →</a></div>`;
setStatus('Your time is reserved. Continue to choose Yoco, Paystack or Ozow and complete payment before the hold expires.','success');el('hold-box').scrollIntoView({behavior:'smooth',block:'center'})
 }catch(e){const map={time_just_taken:'That time was just taken. Check live times again.',location_requires_travel_approval:'This location needs a travel confirmation before instant checkout.',missing_required_fields:'Complete your name, number, email, location, date, package, time and required policy acceptance.'};setStatus(G.esc(map[e.message]||`Could not reserve: ${e.message}`),'error');if(e.message==='time_just_taken')checkTimes()}finally{btn.disabled=false;btn.textContent='Reserve this time →'}
}
function initLocationInput(){
 const input=el('location-search'),results=el('location-results');if(!input)return;
 input.addEventListener('input',()=>{S.location=null;S.time=null;el('location-picked').textContent='Searching / waiting for a location choice…';clearTimeout(S.searchTimer);S.searchTimer=setTimeout(()=>searchLocations(input.value),280)});
 input.addEventListener('change',()=>{const known=exactKnownLocation(input.value);if(known)setLocation({kind:'slug',slug:known.slug,name:known.name,detail:known.area||'',university:input.value})});
 input.addEventListener('focus',()=>{if(input.value.trim().length>=3)searchLocations(input.value)});
 document.addEventListener('click',e=>{if(!e.target.closest('.location-combo'))results?.classList.remove('show')});
}
function init(){
 const wait=()=>{if(G.state.data)loadSelects(G.state.data);else document.addEventListener('spodja:data',ev=>loadSelects(ev.detail),{once:true})};wait();
 el('package').addEventListener('change',renderPackageSummary);el('date').addEventListener('change',()=>{S.time=null;renderEmptyTimes()});el('check-times').addEventListener('click',checkTimes);el('grad-form').addEventListener('submit',reserve);initLocationInput();
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
