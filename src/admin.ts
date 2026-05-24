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
    body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:var(--bg); color:var(--text); }
    header { background:#111827; color:#fff; padding:18px 24px; display:flex; align-items:center; justify-content:space-between; gap:16px; }
    header h1 { margin:0; font-size:20px; }
    main { max-width:1180px; margin:0 auto; padding:24px; }
    .grid { display:grid; grid-template-columns: 360px 1fr; gap:20px; align-items:start; }
    .card { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:18px; box-shadow:0 1px 2px rgba(0,0,0,.04); }
    h2 { margin:0 0 14px; font-size:18px; }
    h3 { margin:0 0 10px; font-size:15px; }
    label { display:block; font-size:13px; color:var(--muted); margin:12px 0 6px; }
    input, select { width:100%; padding:10px 11px; border:1px solid var(--line); border-radius:10px; font-size:14px; background:#fff; }
    input[type="checkbox"] { width:auto; }
    button { border:0; background:var(--brand); color:#fff; padding:9px 12px; border-radius:10px; cursor:pointer; font-weight:600; }
    button.secondary { background:#374151; }
    button.ghost { background:#eef2ff; color:#1d4ed8; }
    button.danger { background:var(--danger); }
    button:disabled { opacity:.55; cursor:not-allowed; }
    .row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
    .space { justify-content:space-between; }
    .muted { color:var(--muted); font-size:13px; }
    .status { margin:14px 0; padding:10px 12px; border-radius:10px; background:#eff6ff; color:#1e40af; font-size:13px; white-space:pre-wrap; }
    .status.error { background:#fef2f2; color:#991b1b; }
    .status.ok { background:#ecfdf5; color:#065f46; }
    table { width:100%; border-collapse:collapse; font-size:13px; }
    th, td { padding:10px; border-bottom:1px solid var(--line); text-align:left; vertical-align:top; }
    th { color:var(--muted); font-weight:700; background:#fafafa; position:sticky; top:0; }
    code { background:#f3f4f6; padding:2px 5px; border-radius:6px; }
    .pill { display:inline-flex; padding:3px 7px; border-radius:999px; font-size:12px; background:#f3f4f6; color:#374151; }
    .pill.ok { background:#ecfdf5; color:#047857; }
    .pill.off { background:#fef2f2; color:#b91c1c; }
    .hidden { display:none; }
    .toolbar { display:grid; grid-template-columns: 1fr 220px auto auto; gap:10px; margin-bottom:12px; }
    .scroll { overflow:auto; max-height:640px; border:1px solid var(--line); border-radius:12px; }
    .model-public { min-width:260px; }
    @media (max-width: 900px) { .grid { grid-template-columns:1fr; } .toolbar { grid-template-columns:1fr; } header { align-items:flex-start; flex-direction:column; } }
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
      <button class="secondary" onclick="logout()">清除 Token</button>
    </div>
  </header>
  <main>
    <section class="card" id="loginCard">
      <h2>登录</h2>
      <p class="muted">输入 Cloudflare Secret 中配置的 ADMIN_TOKEN。Token 会保存在当前浏览器 localStorage。</p>
      <div class="row">
        <input id="adminToken" type="password" placeholder="ADMIN_TOKEN" />
        <button onclick="saveToken()">保存并加载</button>
      </div>
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
          <input id="providerApiKey" type="password" placeholder="编辑时留空表示不修改" />
          <label class="row"><input id="providerEnabled" type="checkbox" checked /> 启用</label>
          <div class="row" style="margin-top:14px">
            <button onclick="saveProvider()">保存 Provider</button>
            <button class="ghost" onclick="resetProviderForm()">清空</button>
          </div>
          <hr style="border:0;border-top:1px solid var(--line);margin:18px 0" />
          <h3>Provider 列表</h3>
          <div id="providers"></div>
        </section>

        <section class="card">
          <div class="row space">
            <h2>模型管理</h2>
            <div class="row">
              <button class="secondary" onclick="syncAll()">同步全部</button>
              <button class="ghost" onclick="loadAll()">刷新</button>
            </div>
          </div>
          <div class="toolbar">
            <input id="modelSearch" placeholder="搜索 remote/public model id" oninput="renderModels()" />
            <select id="providerFilter" onchange="renderModels()"><option value="">所有 Provider</option></select>
            <button class="ghost" onclick="selectVisible(true)">选中可见</button>
            <button class="ghost" onclick="selectVisible(false)">取消可见</button>
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
    function headers() { return { 'Authorization': 'Bearer ' + token(), 'Content-Type': 'application/json' }; }
    function el(id) { return document.getElementById(id); }
    function esc(value) { return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

    function setStatus(message, type = '') {
      const node = el('status');
      node.textContent = message;
      node.className = 'status ' + type;
      node.classList.remove('hidden');
      if (type === 'ok') setTimeout(() => node.classList.add('hidden'), 2500);
    }

    async function api(path, options = {}) {
      const res = await fetch(path, { ...options, headers: { ...headers(), ...(options.headers || {}) } });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(data?.error?.message || 'Request failed: ' + res.status);
      return data;
    }

    function saveToken() {
      localStorage.setItem(tokenKey, el('adminToken').value.trim());
      boot();
    }

    function logout() {
      localStorage.removeItem(tokenKey);
      location.reload();
    }

    async function boot() {
      if (!token()) return;
      el('loginCard').classList.add('hidden');
      el('app').classList.remove('hidden');
      el('authState').textContent = '已登录';
      el('authState').className = 'pill ok';
      try { await loadAll(); } catch (err) { setStatus(err.message, 'error'); }
    }

    async function loadAll() {
      const [p, m] = await Promise.all([api('/api/providers'), api('/api/models')]);
      providers = p.data;
      models = m.data;
      renderProviders();
      renderProviderFilter();
      renderModels();
    }

    function renderProviders() {
      el('providers').innerHTML = providers.map(p =>
        '<div style="border:1px solid var(--line);border-radius:12px;padding:12px;margin-bottom:10px">' +
          '<div class="row space">' +
            '<strong>' + esc(p.name) + '</strong>' +
            '<span class="pill ' + (p.enabled ? 'ok' : 'off') + '">' + (p.enabled ? 'enabled' : 'disabled') + '</span>' +
          '</div>' +
          '<div class="muted"><code>' + esc(p.baseUrl) + '</code></div>' +
          '<div class="muted">models: ' + p.modelCount + ' · last sync: ' + esc(p.lastSyncedAt || '-') + '</div>' +
          '<div class="row" style="margin-top:10px">' +
            '<button class="ghost" onclick=\'editProvider(' + JSON.stringify(p).replace(/'/g, '&#39;') + ')\'>编辑</button>' +
            '<button class="secondary" onclick="syncProvider(\'' + esc(p.id) + '\')">同步模型</button>' +
            '<button class="danger" onclick="deleteProvider(\'' + esc(p.id) + '\')">删除</button>' +
          '</div>' +
        '</div>'
      ).join('') || '<p class="muted">暂无 provider。</p>';
    }

    function renderProviderFilter() {
      el('providerFilter').innerHTML = '<option value="">所有 Provider</option>' + providers.map(p => '<option value="' + esc(p.name) + '">' + esc(p.name) + '</option>').join('');
    }

    function visibleModels() {
      const q = el('modelSearch').value.trim().toLowerCase();
      const provider = el('providerFilter').value;
      return models.filter(m => (!provider || m.providerName === provider) && (!q || m.remoteModelId.toLowerCase().includes(q) || m.publicModelId.toLowerCase().includes(q)));
    }

    function renderModels() {
      el('models').innerHTML = visibleModels().map(m =>
        '<tr>' +
          '<td><input type="checkbox" ' + (m.selected ? 'checked' : '') + ' onchange="updateModel(\'' + esc(m.id) + '\', { selected: this.checked })" /></td>' +
          '<td><span class="pill ' + (m.providerEnabled ? 'ok' : 'off') + '">' + esc(m.providerName) + '</span></td>' +
          '<td><code>' + esc(m.remoteModelId) + '</code></td>' +
          '<td><input class="model-public" id="pub-' + esc(m.id) + '" value="' + esc(m.publicModelId) + '" /></td>' +
          '<td>' + esc(m.lastSeenAt) + '</td>' +
          '<td><button class="ghost" onclick="updateModel(\'' + esc(m.id) + '\', { publicModelId: el(\'pub-' + esc(m.id) + '\').value })">保存</button></td>' +
        '</tr>'
      ).join('') || '<tr><td colspan="6" class="muted">暂无模型。请先添加 provider 并同步模型。</td></tr>';
    }

    function resetProviderForm() {
      el('providerId').value = '';
      el('providerName').value = '';
      el('providerBaseUrl').value = '';
      el('providerApiKey').value = '';
      el('providerEnabled').checked = true;
    }

    function editProvider(p) {
      el('providerId').value = p.id;
      el('providerName').value = p.name;
      el('providerBaseUrl').value = p.baseUrl;
      el('providerApiKey').value = '';
      el('providerEnabled').checked = p.enabled;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function saveProvider() {
      const id = el('providerId').value;
      const body = {
        name: el('providerName').value,
        baseUrl: el('providerBaseUrl').value,
        enabled: el('providerEnabled').checked
      };
      const key = el('providerApiKey').value.trim();
      if (key) body.apiKey = key;
      try {
        await api(id ? '/api/providers/' + id : '/api/providers', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(body) });
        resetProviderForm();
        await loadAll();
        setStatus('Provider 已保存', 'ok');
      } catch (err) { setStatus(err.message, 'error'); }
    }

    async function deleteProvider(id) {
      if (!confirm('删除 provider 会同时删除其缓存模型，确认继续？')) return;
      try { await api('/api/providers/' + id, { method: 'DELETE' }); await loadAll(); setStatus('Provider 已删除', 'ok'); }
      catch (err) { setStatus(err.message, 'error'); }
    }

    async function syncProvider(id) {
      try { setStatus('正在同步 provider 模型...'); await api('/api/providers/' + id + '/sync', { method: 'POST' }); await loadAll(); setStatus('同步完成', 'ok'); }
      catch (err) { setStatus(err.message, 'error'); }
    }

    async function syncAll() {
      try { setStatus('正在同步所有 provider 模型...'); await api('/api/models/sync-all', { method: 'POST' }); await loadAll(); setStatus('全部同步完成', 'ok'); }
      catch (err) { setStatus(err.message, 'error'); }
    }

    async function updateModel(id, patch) {
      try { await api('/api/models/' + id, { method: 'PATCH', body: JSON.stringify(patch) }); await loadAll(); setStatus('模型已更新', 'ok'); }
      catch (err) { setStatus(err.message, 'error'); }
    }

    async function selectVisible(selected) {
      const items = visibleModels();
      if (!items.length) return;
      if (!confirm((selected ? '选中' : '取消') + '当前可见的 ' + items.length + ' 个模型？')) return;
      try {
        for (const model of items) await api('/api/models/' + model.id, { method: 'PATCH', body: JSON.stringify({ selected }) });
        await loadAll();
        setStatus('批量更新完成', 'ok');
      } catch (err) { setStatus(err.message, 'error'); }
    }

    el('adminToken').value = token();
    boot();
  </script>
</body>
</html>`;
}
