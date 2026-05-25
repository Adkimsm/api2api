export function adminHtml(): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>api2api Admin</title>
  <style>
    :root { color-scheme: light; --bg:#f6f7f9; --card:#fff; --text:#17202a; --muted:#6b7280; --line:#e5e7eb; --brand:#2563eb; --danger:#dc2626; --ok:#059669; }
    * { box-sizing: border-box; }
    html, body { width:100%; max-width:100%; overflow-x:hidden; }
    body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:var(--bg); color:var(--text); }
    header { background:#111827; color:#fff; padding:18px 24px; display:flex; align-items:center; justify-content:space-between; gap:16px; }
    header h1 { margin:0; font-size:20px; }
    main { width:100%; max-width:1180px; min-width:0; margin:0 auto; padding:24px; }
    .grid { display:grid; grid-template-columns: minmax(0, 360px) minmax(0, 1fr); gap:20px; align-items:start; min-width:0; max-width:100%; }
    .grid > * { min-width:0; max-width:100%; }
    .card { min-width:0; max-width:100%; background:var(--card); border:1px solid var(--line); border-radius:14px; padding:18px; box-shadow:0 1px 2px rgba(0,0,0,.04); }
    h2 { margin:0 0 14px; font-size:18px; }
    h3 { margin:0 0 10px; font-size:15px; }
    label { display:block; font-size:13px; color:var(--muted); margin:12px 0 6px; }
    input, select { width:100%; max-width:100%; min-width:0; padding:10px 11px; border:1px solid var(--line); border-radius:10px; font-size:14px; background:#fff; }
    input[type="checkbox"] { width:auto; min-width:18px; min-height:18px; }
    button { border:0; background:var(--brand); color:#fff; padding:9px 12px; border-radius:10px; cursor:pointer; font-weight:600; }
    button.secondary { background:#374151; }
    button.ghost { background:#eef2ff; color:#1d4ed8; }
    button.danger { background:var(--danger); }
    button:disabled { opacity:.55; cursor:not-allowed; }
    .row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; min-width:0; max-width:100%; }
    .space { justify-content:space-between; }
    .muted { color:var(--muted); font-size:13px; }
    .status { margin:14px 0; padding:10px 12px; border-radius:10px; background:#eff6ff; color:#1e40af; font-size:13px; white-space:pre-wrap; }
    .status.error { background:#fef2f2; color:#991b1b; }
    .status.ok { background:#ecfdf5; color:#065f46; }
    table { width:100%; min-width:720px; border-collapse:collapse; font-size:13px; }
    th, td { padding:10px; border-bottom:1px solid var(--line); text-align:left; vertical-align:top; }
    th { color:var(--muted); font-weight:700; background:#fafafa; position:sticky; top:0; }
    code { background:#f3f4f6; padding:2px 5px; border-radius:6px; white-space:normal; word-break:break-all; overflow-wrap:anywhere; }
    .pill { display:inline-flex; padding:3px 7px; border-radius:999px; font-size:12px; background:#f3f4f6; color:#374151; }
    .pill.ok { background:#ecfdf5; color:#047857; }
    .pill.off { background:#fef2f2; color:#b91c1c; }
    .hidden { display:none; }
    .toolbar { display:grid; grid-template-columns: minmax(0, 1fr) minmax(0, 220px) auto auto; gap:10px; margin-bottom:12px; min-width:0; max-width:100%; }
    .scroll { width:100%; min-width:0; max-width:100%; overflow:auto; -webkit-overflow-scrolling:touch; max-height:640px; border:1px solid var(--line); border-radius:12px; }
    .model-public { min-width:260px; }
    .provider-card { border:1px solid var(--line); border-radius:12px; padding:12px; margin-bottom:10px; }
    @media (max-width: 900px) {
      header { align-items:flex-start; flex-direction:column; }
      main { padding:14px; overflow-x:hidden; }
      .grid { grid-template-columns:1fr; }
      .toolbar { grid-template-columns:1fr; }
      .row.login-row input, .row.login-row button { width:100%; }
      .row > button { flex:1 1 auto; }
      button { min-height:40px; }
      .card { padding:14px; }
      .model-public { width:220px; min-width:220px; }
      .provider-card code { display:inline-block; max-width:100%; white-space:normal; word-break:break-all; overflow-wrap:anywhere; }
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>api2api Admin</h1>
      <div class="muted">Cloudflare Workers OpenAI-compatible aggregator</div>
    </div>
    <div class="row">
      <span id="authState" class="pill off">未登录</span>
      <button id="logoutBtn" class="secondary" type="button">清除 Token</button>
    </div>
  </header>
  <main>
    <section class="card" id="loginCard">
      <h2>登录</h2>
      <p class="muted">输入 Cloudflare Secret 中配置的 ADMIN_TOKEN。Token 会保存在当前浏览器 localStorage。</p>
      <div class="row login-row">
        <input id="adminToken" type="password" placeholder="ADMIN_TOKEN" autocomplete="current-password" />
        <button id="loginBtn" type="button">保存并加载</button>
      </div>
      <div id="loginStatus" class="status hidden"></div>
    </section>

    <div id="app" class="hidden">
      <div id="status" class="status hidden"></div>
      <div class="grid">
        <section class="card">
          <h2>添加 / 编辑 Provider</h2>
          <input id="providerId" type="hidden" />
          <label>Name</label>
          <input id="providerName" placeholder="openrouter" />
          <label>Base URL，必须包含 /v1</label>
          <input id="providerBaseUrl" placeholder="https://openrouter.ai/api/v1" />
          <label>API Key</label>
          <input id="providerApiKey" type="password" placeholder="编辑时留空表示不修改" autocomplete="off" />
          <label class="row"><input id="providerEnabled" type="checkbox" checked /> 启用</label>
          <div class="row" style="margin-top:14px">
            <button id="saveProviderBtn" type="button">保存 Provider</button>
            <button id="resetProviderBtn" class="ghost" type="button">清空</button>
          </div>
          <hr style="border:0;border-top:1px solid var(--line);margin:18px 0" />
          <h3>Provider 列表</h3>
          <div id="providers"></div>
        </section>

        <section class="card">
          <div class="row space">
            <h2>模型管理</h2>
            <div class="row">
              <button id="syncAllBtn" class="secondary" type="button">同步全部</button>
              <button id="refreshBtn" class="ghost" type="button">刷新</button>
            </div>
          </div>
          <div class="toolbar">
            <input id="modelSearch" placeholder="搜索 remote/public model id" />
            <select id="providerFilter"><option value="">所有 Provider</option></select>
            <button id="selectVisibleBtn" class="ghost" type="button">选中可见</button>
            <button id="unselectVisibleBtn" class="ghost" type="button">取消可见</button>
          </div>
          <div class="scroll">
            <table>
              <thead>
                <tr>
                  <th>暴露</th>
                  <th>Provider</th>
                  <th>Remote Model</th>
                  <th>Public Model ID</th>
                  <th>Last Seen</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody id="models"></tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  </main>

  <script>
    const tokenKey = 'api2api.adminToken';
    let providers = [];
    let models = [];

    function token() { return localStorage.getItem(tokenKey) || ''; }
    function el(id) { return document.getElementById(id); }
    function esc(value) { return String(value == null ? '' : value).replace(/[&<>'"]/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]; }); }
    function setNodeStatus(id, message, type) {
      const node = el(id);
      node.textContent = message;
      node.className = 'status ' + (type || '');
      node.classList.remove('hidden');
      if (type === 'ok') setTimeout(function() { node.classList.add('hidden'); }, 2500);
    }
    function setStatus(message, type) { setNodeStatus('status', message, type); }
    function setLoginStatus(message, type) { setNodeStatus('loginStatus', message, type); }
    function setBusy(isBusy) {
      document.querySelectorAll('button').forEach(function(button) { button.disabled = isBusy; });
    }
    function setProviderBusy(id, isBusy) {
      const card = document.querySelector('.provider-card[data-id="' + CSS.escape(id) + '"]');
      if (!card) return;
      card.querySelectorAll('button').forEach(function(button) { button.disabled = isBusy; });
    }

    async function api(path, options) {
      const opts = options || {};
      const res = await fetch(path, {
        method: opts.method || 'GET',
        body: opts.body,
        headers: Object.assign({
          'Authorization': 'Bearer ' + token(),
          'Content-Type': 'application/json'
        }, opts.headers || {})
      });
      const text = await res.text();
      let data = {};
      if (text) {
        try { data = JSON.parse(text); }
        catch (err) { throw new Error('Response is not JSON: ' + text.slice(0, 300)); }
      }
      if (!res.ok) throw new Error((data.error && data.error.message) || ('Request failed: ' + res.status));
      return data;
    }

    async function saveToken() {
      const value = el('adminToken').value.trim();
      if (!value) { setLoginStatus('请输入 ADMIN_TOKEN', 'error'); return; }
      localStorage.setItem(tokenKey, value);
      try {
        setBusy(true);
        await loadAll();
        showApp();
        setStatus('已登录。已加载 ' + providers.length + ' 个 provider、' + models.length + ' 个模型。', 'ok');
      } catch (err) {
        localStorage.removeItem(tokenKey);
        showLogin();
        setLoginStatus('登录失败：' + err.message, 'error');
      } finally {
        setBusy(false);
      }
    }

    function logout() {
      localStorage.removeItem(tokenKey);
      location.reload();
    }

    function showApp() {
      el('loginCard').classList.add('hidden');
      el('app').classList.remove('hidden');
      el('authState').textContent = '已登录';
      el('authState').className = 'pill ok';
    }

    function showLogin() {
      el('loginCard').classList.remove('hidden');
      el('app').classList.add('hidden');
      el('authState').textContent = '未登录';
      el('authState').className = 'pill off';
    }

    async function boot() {
      el('adminToken').value = token();
      if (!token()) { showLogin(); return; }
      try {
        setBusy(true);
        await loadAll();
        showApp();
        setStatus('已登录。已加载 ' + providers.length + ' 个 provider、' + models.length + ' 个模型。', 'ok');
      } catch (err) {
        localStorage.removeItem(tokenKey);
        showLogin();
        setLoginStatus('保存的 Token 无效或已过期，请重新输入。' + err.message, 'error');
      } finally {
        setBusy(false);
      }
    }

    async function loadAll() {
      const p = await api('/api/providers');
      const m = await api('/api/models');
      providers = p.data || [];
      models = m.data || [];
      renderProviders();
      renderProviderFilter();
      renderModels();
    }

    function renderProviders() {
      const root = el('providers');
      if (!providers.length) {
        root.innerHTML = '<p class="muted">已登录。暂无 Provider，请先添加一个上游 API。</p>';
        return;
      }
      root.innerHTML = providers.map(function(p) {
        return '<div class="provider-card" data-id="' + esc(p.id) + '">' +
          '<div class="row space"><strong>' + esc(p.name) + '</strong><span class="pill ' + (p.enabled ? 'ok' : 'off') + '">' + (p.enabled ? 'enabled' : 'disabled') + '</span></div>' +
          '<div class="muted"><code>' + esc(p.baseUrl) + '</code></div>' +
          '<div class="muted">models: ' + esc(p.modelCount) + ' · last sync: ' + esc(p.lastSyncedAt || '-') + '</div>' +
          '<div class="row" style="margin-top:10px">' +
            '<button class="ghost" type="button" data-action="edit-provider" data-id="' + esc(p.id) + '">编辑</button>' +
            '<button class="secondary" type="button" data-action="sync-provider" data-id="' + esc(p.id) + '">同步模型</button>' +
            '<button class="danger" type="button" data-action="delete-provider" data-id="' + esc(p.id) + '">删除</button>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    function renderProviderFilter() {
      const filter = el('providerFilter');
      const current = filter.value;
      filter.innerHTML = '<option value="">所有 Provider</option>' + providers.map(function(p) {
        return '<option value="' + esc(p.name) + '">' + esc(p.name) + '</option>';
      }).join('');
      filter.value = current;
      if (filter.value !== current) filter.value = '';
    }

    function visibleModels() {
      const q = el('modelSearch').value.trim().toLowerCase();
      const provider = el('providerFilter').value;
      return models.filter(function(m) {
        return (!provider || m.providerName === provider) && (!q || m.remoteModelId.toLowerCase().includes(q) || m.publicModelId.toLowerCase().includes(q));
      });
    }

    function renderModels() {
      const rows = visibleModels();
      if (!rows.length) {
        el('models').innerHTML = '<tr><td colspan="6" class="muted">暂无模型。请先添加 Provider 并同步模型，或调整搜索/筛选条件。</td></tr>';
        return;
      }
      el('models').innerHTML = rows.map(function(m) {
        return '<tr data-id="' + esc(m.id) + '">' +
          '<td><input type="checkbox" data-action="toggle-model" data-id="' + esc(m.id) + '" ' + (m.selected ? 'checked' : '') + ' /></td>' +
          '<td><span class="pill ' + (m.providerEnabled ? 'ok' : 'off') + '">' + esc(m.providerName) + '</span></td>' +
          '<td><code>' + esc(m.remoteModelId) + '</code></td>' +
          '<td><input class="model-public" data-public-id="' + esc(m.id) + '" value="' + esc(m.publicModelId) + '" /></td>' +
          '<td>' + esc(m.lastSeenAt) + '</td>' +
          '<td><button class="ghost" type="button" data-action="save-model" data-id="' + esc(m.id) + '">保存</button></td>' +
        '</tr>';
      }).join('');
    }

    function resetProviderForm() {
      el('providerId').value = '';
      el('providerName').value = '';
      el('providerBaseUrl').value = '';
      el('providerApiKey').value = '';
      el('providerEnabled').checked = true;
    }

    function editProvider(id) {
      const p = providers.find(function(item) { return item.id === id; });
      if (!p) return;
      el('providerId').value = p.id;
      el('providerName').value = p.name;
      el('providerBaseUrl').value = p.baseUrl;
      el('providerApiKey').value = '';
      el('providerEnabled').checked = p.enabled;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function saveProvider() {
      const id = el('providerId').value;
      const body = { name: el('providerName').value, baseUrl: el('providerBaseUrl').value, enabled: el('providerEnabled').checked };
      const key = el('providerApiKey').value.trim();
      if (key) body.apiKey = key;
      try {
        setBusy(true);
        await api(id ? '/api/providers/' + id : '/api/providers', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(body) });
        resetProviderForm();
        await loadAll();
        setStatus('Provider 已保存', 'ok');
      } catch (err) { setStatus(err.message, 'error'); }
      finally { setBusy(false); }
    }

    async function deleteProvider(id) {
      if (!confirm('删除 provider 会同时删除其缓存模型，确认继续？')) return;
      try { setProviderBusy(id, true); await api('/api/providers/' + id, { method: 'DELETE' }); await loadAll(); setStatus('Provider 已删除', 'ok'); }
      catch (err) { setStatus(err.message, 'error'); }
      finally { setProviderBusy(id, false); }
    }

    async function syncProvider(id) {
      try { setProviderBusy(id, true); setStatus('正在同步 provider 模型...'); await api('/api/providers/' + id + '/sync', { method: 'POST' }); await loadAll(); setStatus('同步完成', 'ok'); }
      catch (err) { setStatus(err.message, 'error'); }
      finally { setProviderBusy(id, false); }
    }

    async function syncAll() {
      try { setBusy(true); setStatus('正在同步所有 provider 模型...'); await api('/api/models/sync-all', { method: 'POST' }); await loadAll(); setStatus('全部同步完成', 'ok'); }
      catch (err) { setStatus(err.message, 'error'); }
      finally { setBusy(false); }
    }

    async function updateModel(id, patch) {
      try { setBusy(true); await api('/api/models/' + id, { method: 'PATCH', body: JSON.stringify(patch) }); await loadAll(); setStatus('模型已更新', 'ok'); }
      catch (err) { setStatus(err.message, 'error'); }
      finally { setBusy(false); }
    }

    async function selectVisible(selected) {
      const items = visibleModels();
      if (!items.length) return;
      if (!confirm((selected ? '选中' : '取消') + '当前可见的 ' + items.length + ' 个模型？')) return;
      try {
        setBusy(true);
        for (const model of items) await api('/api/models/' + model.id, { method: 'PATCH', body: JSON.stringify({ selected: selected }) });
        await loadAll();
        setStatus('批量更新完成', 'ok');
      } catch (err) { setStatus(err.message, 'error'); }
      finally { setBusy(false); }
    }

    el('loginBtn').addEventListener('click', saveToken);
    el('adminToken').addEventListener('keydown', function(event) { if (event.key === 'Enter') saveToken(); });
    el('logoutBtn').addEventListener('click', logout);
    el('saveProviderBtn').addEventListener('click', saveProvider);
    el('resetProviderBtn').addEventListener('click', resetProviderForm);
    el('syncAllBtn').addEventListener('click', syncAll);
    el('refreshBtn').addEventListener('click', async function() { try { setBusy(true); await loadAll(); setStatus('已刷新', 'ok'); } catch (err) { setStatus(err.message, 'error'); } finally { setBusy(false); } });
    el('selectVisibleBtn').addEventListener('click', function() { selectVisible(true); });
    el('unselectVisibleBtn').addEventListener('click', function() { selectVisible(false); });
    el('modelSearch').addEventListener('input', renderModels);
    el('providerFilter').addEventListener('change', renderModels);
    el('providers').addEventListener('click', function(event) {
      const target = event.target.closest('button[data-action]');
      if (!target) return;
      const id = target.getAttribute('data-id');
      const action = target.getAttribute('data-action');
      if (action === 'edit-provider') editProvider(id);
      if (action === 'sync-provider') syncProvider(id);
      if (action === 'delete-provider') deleteProvider(id);
    });
    el('models').addEventListener('change', function(event) {
      const target = event.target;
      if (target && target.getAttribute && target.getAttribute('data-action') === 'toggle-model') {
        updateModel(target.getAttribute('data-id'), { selected: target.checked });
      }
    });
    el('models').addEventListener('click', function(event) {
      const target = event.target.closest('button[data-action="save-model"]');
      if (!target) return;
      const id = target.getAttribute('data-id');
      const input = Array.from(document.querySelectorAll('input[data-public-id]')).find(function(item) { return item.getAttribute('data-public-id') === id; });
      if (input) updateModel(id, { publicModelId: input.value });
    });

    boot();
  </script>
</body>
</html>`;
}
