(() => {
  const endpoint = '/.netlify/functions/auth?action=';
  const $ = id => document.getElementById(id);
  async function api(action, method='GET', body) {
    const res = await fetch(endpoint + encodeURIComponent(action), {method, credentials:'same-origin', headers: body ? {'Content-Type':'application/json'} : {}, body: body ? JSON.stringify(body) : undefined});
    const raw = await res.text(); let data;
    try { data = JSON.parse(raw); } catch { data = {error: raw.slice(0,180) || 'Unexpected server response.'}; }
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status}).`);
    return data;
  }
  const roleName = role => ({citizen:'Citizen',operator:'Parking Operator',officer:'Traffic Officer',admin:'Administrator',administrator:'Administrator',test_administrator:'Test Administrator'}[role] || role);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function init() {
    const msg = $('directoryMessage'), body = $('accountDirectoryBody'), identity = $('accountIdentity');
    const panel = $('accountDirectoryPanel');
    if (!msg || !body || !identity) return;
    if (panel) panel.hidden = true;
    body.innerHTML = '';
    try {
      const me = await api('me');
      if (!me.authenticated || !me.user) {
        identity.textContent = 'You are browsing as a guest. Sign in to view your account ID.';
        return;
      }
      const user = me.user;
      identity.innerHTML = `<strong>${escapeHtml(user.username || user.email)}</strong> · ${escapeHtml(roleName(user.role))} · Parkwise ID: <strong>${escapeHtml(user.userId || 'Assigning…')}</strong>`;
      const canManage = ['admin','administrator','test_administrator'].includes(String(user.role || '').toLowerCase());
      if (!canManage) {
        identity.insertAdjacentHTML('beforeend', '<p class="hint" style="margin-top:8px">The full account directory is available only to Administrators and the Test Administrator.</p>');
        return;
      }
      // The endpoint independently enforces authorization. Keep the panel hidden until it succeeds.
      const data = await api('users');
      if (panel) panel.hidden = false;
      msg.textContent = `${data.users.length} account(s). Role changes are checked by the server.`;
      body.innerHTML = data.users.map(u => `<tr style="border-top:1px solid var(--line,#26332d)"><td style="padding:10px;font-variant-numeric:tabular-nums">${escapeHtml(u.userId)}</td><td style="padding:10px">${escapeHtml(u.username)}<br><small>${escapeHtml(u.email)}</small></td><td style="padding:10px">${escapeHtml(roleName(u.role))}</td><td style="padding:10px">${u.role==='test_administrator' ? '<span class="hint">Protected</span>' : `<select data-user-id="${escapeHtml(u.userId)}" aria-label="Role for ${escapeHtml(u.username)}"><option value="citizen" ${u.role==='citizen'?'selected':''}>Citizen</option><option value="operator" ${u.role==='operator'?'selected':''}>Parking Operator</option><option value="officer" ${u.role==='officer'?'selected':''}>Traffic Officer</option><option value="admin" ${['admin','administrator'].includes(u.role)?'selected':''}>Administrator</option></select><button type="button" data-save-role="${escapeHtml(u.userId)}" class="secondary-btn" style="margin-left:6px">Save</button>`}</td></tr>`).join('');
      body.querySelectorAll('[data-save-role]').forEach(btn => btn.addEventListener('click', async () => {
        const id=btn.dataset.saveRole, select=body.querySelector(`select[data-user-id="${id}"]`);
        if (!select) return;
        btn.disabled=true; btn.textContent='Saving…';
        try { await api('set-role','POST',{userId:id,role:select.value}); msg.textContent='Role updated successfully.'; await init(); }
        catch(e) { msg.textContent=e.message || 'Could not update role.'; btn.disabled=false; btn.textContent='Save'; }
      }));
    } catch (e) {
      if (panel) panel.hidden = true;
      identity.textContent = 'Could not load account details.';
    }
  }
  document.addEventListener('DOMContentLoaded', init);
})();
