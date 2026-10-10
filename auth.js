(() => {
  const $ = id => document.getElementById(id);
  const onAuthPage = document.body?.dataset?.page === 'auth';
  const say = (message, error=false) => { const el=$('authMessage'); if(el){el.textContent=message;el.classList.toggle('error',error);} };
  async function api(path, body) {
    const res = await fetch('/.netlify/functions/auth?action=' + encodeURIComponent(path), {method: body ? 'POST' : 'GET', headers: body ? {'Content-Type':'application/json'} : {}, body: body ? JSON.stringify(body) : undefined, credentials:'same-origin'});
    const raw = await res.text();
    let data;
    try { data = JSON.parse(raw); } catch { data = {error: raw.slice(0,180) || 'Empty response from server.'}; }
    if(!res.ok) throw new Error(`Auth endpoint returned HTTP ${res.status}: ${data.error || res.statusText || 'Request failed.'}`);
    return data;
  }
  async function authPageInit(){
    const form=$('authForm'); if(!form)return;
    let mode='login';
    const setMode=m=>{mode=m;$('loginTab')?.classList.toggle('active',m==='login');$('signupTab')?.classList.toggle('active',m==='signup');$('authTitle').textContent=m==='login'?'Welcome back.':'Create your Parkwise account.';$('authSubtitle').textContent=m==='login'?'Sign in to continue to Parkwise.':'Create your own Parkwise account.';$('emailLabel').textContent=m==='login'?'Email or username':'Email address';$('email').placeholder=m==='login'?'Email address or username':'you@example.com';$('nameField').hidden=m!=='signup';$('fullName').required=m==='signup';$('confirmPasswordField').hidden=m!=='signup';$('confirmPassword').required=m==='signup';$('password').autocomplete=m==='login'?'current-password':'new-password';$('password').minLength=m==='login'?1:10;$('authSubmit').textContent=m==='login'?'Sign in':'Create account';$('confirmPassword').value='';say('');};
    $('loginTab')?.addEventListener('click',()=>setMode('login'));$('signupTab')?.addEventListener('click',()=>setMode('signup'));
    const eyeOpen='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
    const eyeClosed='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 3 18 18M10.6 5.2A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a16 16 0 0 1-4 4.7M6.2 6.2C3.5 8 2 12 2 12s3.6 7 10 7c1.1 0 2.1-.2 3-.5"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
    document.querySelectorAll('[data-password-toggle]').forEach(button=>button.addEventListener('click',()=>{const input=$(button.dataset.passwordToggle);if(!input)return;const show=input.type==='password';input.type=show?'text':'password';button.setAttribute('aria-pressed',String(show));const label=show?'Hide password':'Show password';button.setAttribute('aria-label',label);button.title=label;button.innerHTML=show?eyeClosed:eyeOpen;}));
    // Login is optional. Visiting auth.html is the user's explicit choice to sign in.
    try { await api('me'); } catch(e) {
      say(`Parkwise sign-in check failed: ${e.message || 'Could not reach the server.'} If this is a 404, make sure Netlify's publish/base directory is the folder containing netlify.toml and netlify/functions/auth.mjs, then redeploy. If it is a 500/503, open Netlify → Functions → auth → logs. You can still browse without signing in.`, true);
    }
    form.addEventListener('submit',async e=>{e.preventDefault();const identifier=$('email').value.trim(),password=$('password').value,passwordConfirm=$('confirmPassword').value,name=$('fullName')?.value.trim()||'';if(mode==='signup'&&password!==passwordConfirm){say('Passwords do not match. Please re-enter them.',true);$('confirmPassword').focus();return;}if(mode==='signup'&&password.length<10){say('Use a password with at least 10 characters.',true);$('password').focus();return;}const btn=$('authSubmit');btn.disabled=true;btn.textContent=mode==='login'?'Signing in…':'Creating account…';say('');try{if(mode==='signup'){await api('signup',{identifier,password,passwordConfirm,name});say('Account created. You can now sign in.');$('password').value='';$('confirmPassword').value='';setMode('login');$('email').value=identifier;}else{await api('login',{identifier,password});location.replace('index.html');}}catch(err){say(err.message||'Authentication failed.',true);}finally{btn.disabled=false;btn.textContent=mode==='login'?'Sign in':'Create account';}});
  }
  async function guardAndBadge(){
    if(onAuthPage)return;
    // Public pages remain accessible without an account. Authentication is optional.
    try {
      const data=await api('me');
      if(!data.authenticated)return;
      const user=data.user;
      document.querySelectorAll('[data-profile-name]').forEach(el=>el.textContent=user.username||user.email);
      document.querySelectorAll('[data-profile-role]').forEach(el=>el.textContent=user.role==='test_administrator'?'Test Administrator':'Citizen account');
      document.querySelectorAll('[data-profile-avatar]').forEach(el=>el.textContent=(user.username||user.email).slice(0,2).toUpperCase());
      const top=document.querySelector('.top-actions');
      if(top&&!$('parkwiseSignOut')){
        const btn=document.createElement('button');btn.id='parkwiseSignOut';btn.type='button';btn.className='secondary-btn';btn.textContent='Sign out';
        btn.addEventListener('click',async()=>{try{await api('logout',{});location.reload();}catch(e){alert(e.message);}});
        top.append(btn);
      }
    } catch(e) {
      // Do not block browsing if authentication service is unavailable.
    }
  }
  document.addEventListener('DOMContentLoaded',async()=>{if(onAuthPage)await authPageInit();else await guardAndBadge();});
})();