(() => {
  const $ = id => document.getElementById(id);
  const onAuthPage = document.body?.dataset?.page === 'auth';
  const say = (message, error=false) => { const el=$('authMessage'); if(el){el.textContent=message;el.classList.toggle('error',error);} };
  async function api(path, body) {
    const res = await fetch('/api/auth/' + path, {method: body ? 'POST' : 'GET', headers: body ? {'Content-Type':'application/json'} : {}, body: body ? JSON.stringify(body) : undefined, credentials:'same-origin'});
    const data = await res.json().catch(()=>({error:'Unexpected server response.'}));
    if(!res.ok) throw new Error(data.error || 'Request failed.'); return data;
  }
  async function authPageInit(){
    const form=$('authForm'); if(!form)return;
    let mode='login';
    const setMode=m=>{mode=m;$('loginTab')?.classList.toggle('active',m==='login');$('signupTab')?.classList.toggle('active',m==='signup');$('authTitle').textContent=m==='login'?'Welcome back.':'Create your Parkwise account.';$('authSubtitle').textContent=m==='login'?'Sign in to continue to Parkwise.':'Create your own Parkwise account.';$('nameField').hidden=m!=='signup';$('fullName').required=m==='signup';$('password').autocomplete=m==='login'?'current-password':'new-password';$('authSubmit').textContent=m==='login'?'Sign in':'Create account';say('');};
    $('loginTab')?.addEventListener('click',()=>setMode('login'));$('signupTab')?.addEventListener('click',()=>setMode('signup'));
    try { const s=await api('me'); if(s.authenticated){location.replace('index.html');return;} } catch(e){say('Cannot reach Parkwise authentication server. Start the site with run-local.bat or deploy server.py.',true);$('authSubmit').disabled=true;return;}
    form.addEventListener('submit',async e=>{e.preventDefault();const identifier=$('email').value.trim(),password=$('password').value,name=$('fullName')?.value.trim()||'';const btn=$('authSubmit');btn.disabled=true;btn.textContent=mode==='login'?'Signing in…':'Creating account…';say('');try{if(mode==='signup'){await api('signup',{identifier,password,name});say('Account created. You can now sign in.');setMode('login');$('email').value=identifier;}else{await api('login',{identifier,password});location.replace('index.html');}}catch(err){say(err.message||'Authentication failed.',true);}finally{btn.disabled=false;btn.textContent=mode==='login'?'Sign in':'Create account';}});
  }
  async function guardAndBadge(){if(onAuthPage)return;try{const data=await api('me');if(!data.authenticated){location.replace('auth.html');return;}const user=data.user;document.querySelectorAll('[data-profile-name]').forEach(el=>el.textContent=user.username||user.email);document.querySelectorAll('[data-profile-role]').forEach(el=>el.textContent=user.role==='test_administrator'?'Test Administrator':'Citizen account');document.querySelectorAll('[data-profile-avatar]').forEach(el=>el.textContent=(user.username||user.email).slice(0,2).toUpperCase());const top=document.querySelector('.top-actions');if(top&&!$('parkwiseSignOut')){const btn=document.createElement('button');btn.id='parkwiseSignOut';btn.type='button';btn.className='secondary-btn';btn.textContent='Sign out';btn.addEventListener('click',async()=>{try{await api('logout',{});location.replace('auth.html');}catch(e){alert(e.message);}});top.append(btn);}}catch(e){location.replace('auth.html');}}
  document.addEventListener('DOMContentLoaded',async()=>{if(onAuthPage)await authPageInit();else await guardAndBadge();});
})();