(() => {
  const cfg = window.PARKWISE_AUTH_CONFIG || {};
  const configured = typeof cfg.supabaseUrl === 'string' &&
    /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(cfg.supabaseUrl) &&
    typeof cfg.supabaseAnonKey === 'string' &&
    cfg.supabaseAnonKey.length > 20 &&
    !cfg.supabaseUrl.includes('YOUR_SUPABASE') &&
    !cfg.supabaseAnonKey.includes('YOUR_SUPABASE');
  let client = null;
  if (configured && window.supabase?.createClient) {
    client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
  }
  const $ = id => document.getElementById(id);
  const onAuthPage = document.body?.dataset?.page === 'auth';
  const say = (message, error=false) => {
    const el = $('authMessage');
    if (el) { el.textContent = message; el.classList.toggle('error', error); }
  };
  const escape = s => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const authPageInit = async () => {
    const loginTab=$('loginTab'), signupTab=$('signupTab'), form=$('authForm');
    if (!form) return;
    let mode='login';
    const setMode = m => {
      mode=m; loginTab?.classList.toggle('active',m==='login'); signupTab?.classList.toggle('active',m==='signup');
      $('authTitle').textContent=m==='login'?'Welcome back.':'Create your Parkwise account.';
      $('authSubtitle').textContent=m==='login'?'Sign in to continue to Parkwise.':'Sign up to save your own Parkwise account.';
      $('nameField').hidden=m!=='signup'; $('fullName').required=m==='signup';
      $('password').autocomplete=m==='login'?'current-password':'new-password';
      $('authSubmit').textContent=m==='login'?'Sign in':'Create account';
      say('');
    };
    loginTab?.addEventListener('click',()=>setMode('login'));
    signupTab?.addEventListener('click',()=>setMode('signup'));
    if (!configured || !client) {
      say('Authentication is not configured yet. Create a Supabase project, then add its Project URL and publishable/anon key to auth-config.js.', true);
      $('authSubmit').disabled=true;
      const note=document.createElement('a'); note.href='https://supabase.com/dashboard';note.target='_blank';note.rel='noopener';note.className='auth-setup-link';note.textContent='Open Supabase setup ↗';form.after(note);
      return;
    }
    const {data:{session}}=await client.auth.getSession();
    if(session){location.replace('index.html');return;}
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      const identifier=$('email').value.trim(), password=$('password').value, name=$('fullName')?.value.trim()||'';
      // Convenience alias for the preconfigured test-admin account. This does not create an account.
      const email=identifier.toLowerCase()==='bhuviking007' ? 'bkgaming208@gmail.com' : identifier;
      const submit=$('authSubmit');submit.disabled=true;submit.textContent=mode==='login'?'Signing in…':'Creating account…';say('');
      try {
        if(mode==='signup'){
          const {data,error}=await client.auth.signUp({email,password,options:{data:{display_name:name,role:'citizen'},emailRedirectTo:location.origin+'/auth.html'}});
          if(error)throw error;
          if(data.session){say('Account created. Signing you in…');location.replace('index.html');}
          else say('Account created. Check your email for a confirmation link, then return here to sign in.');
        } else {
          const {error}=await client.auth.signInWithPassword({email,password});
          if(error)throw error;
          location.replace('index.html');
        }
      } catch(err) { say(err?.message||'Authentication failed. Please try again.',true); }
      finally {submit.disabled=false;submit.textContent=mode==='login'?'Sign in':'Create account';}
    });
  };
  const guardAndBadge = async () => {
    if (!configured || !client) return; // Fail open until configured so existing demo pages still work.
    try {
      const {data:{session},error}=await client.auth.getSession();
      if(error)throw error;
      if(!session && !onAuthPage){location.replace('auth.html');return;}
      if(onAuthPage)return;
      const user=session.user;
      const displayName=user.user_metadata?.display_name || (user.email?.toLowerCase()==='bkgaming208@gmail.com' ? 'Bhuviking007' : user.email?.split('@')[0]) || 'Parkwise user';
      // Elevated role is read from trusted app_metadata, not user-editable user_metadata.
      const roleKey=String(user.app_metadata?.role || '').toLowerCase();
      const roleLabel=roleKey==='test_administrator' ? 'Test Administrator' : 'Citizen account';
      document.querySelectorAll('[data-profile-name]').forEach(el=>el.textContent=displayName);
      document.querySelectorAll('[data-profile-role]').forEach(el=>el.textContent=roleLabel);
      document.querySelectorAll('[data-profile-avatar]').forEach(el=>el.textContent=displayName.trim().slice(0,2).toUpperCase());
      const top=document.querySelector('.top-actions');
      if(top&&!$('parkwiseSignOut')){
        const btn=document.createElement('button');btn.id='parkwiseSignOut';btn.type='button';btn.className='secondary-btn';btn.textContent='Sign out';btn.addEventListener('click',async()=>{
          btn.disabled=true;const {error}=await client.auth.signOut();if(error){btn.disabled=false;alert('Could not sign out: '+error.message);return;}location.replace('auth.html');
        });top.append(btn);
      }
    } catch(err) {
      console.error('Parkwise auth session check failed:',err);
      if(!onAuthPage) location.replace('auth.html');
    }
  };
  document.addEventListener('DOMContentLoaded',async()=>{
    if(onAuthPage) await authPageInit();
    await guardAndBadge();
  });
})();