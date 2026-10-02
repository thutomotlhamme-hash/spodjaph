(()=>{
const API='https://agdzdhjkkkvjpwhzitlj.supabase.co/functions/v1/spodja-gallery-api';
const f=document.getElementById('gallery-access-form'),s=document.getElementById('gallery-access-status');
if(!f)return;
const codeInput=document.getElementById('gallery-code');const prefill=new URLSearchParams(location.search).get('code');if(prefill&&codeInput)codeInput.value=prefill.toUpperCase();
f.addEventListener('submit',async e=>{
  e.preventDefault();
  const code=document.getElementById('gallery-code').value.trim().toUpperCase();
  const email=document.getElementById('gallery-email').value.trim();const name=document.getElementById('gallery-name')?.value.trim()||'';const marketing=!!document.getElementById('gallery-marketing')?.checked;
  const btn=f.querySelector('button[type=submit]');
  s.textContent='Opening your private gallery…';btn.disabled=true;
  try{
    const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'access',code,email,name,marketing_opt_in:marketing})});
    const out=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(out.error||'gallery_access_failed');
    sessionStorage.setItem('spodja_gallery_session',out.session_token);localStorage.setItem('spodja_gallery_session',out.session_token);
    sessionStorage.setItem('spodja_gallery_bootstrap',JSON.stringify(out));
    location.href=`/gallery/?g=${encodeURIComponent(out.gallery?.slug||'gallery')}`;
  }catch(err){
    const map={gallery_not_found:'We could not find that gallery code.',gallery_expired:'This gallery has expired. Contact Spodja if you need it reopened.',email_required:'Please enter the email used for your booking.',invalid_email:'Please enter a valid email address.'};
    s.textContent=map[err.message]||'That gallery could not open right now. Check the code or contact Spodja.';btn.disabled=false;
  }
});
})();
