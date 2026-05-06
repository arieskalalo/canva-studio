// ===== Version History =====

document.getElementById('versionBtn').addEventListener('click', async () => {
  document.getElementById('versionModal').classList.remove('hidden');
  await loadVersions();
});

document.getElementById('versionClose').addEventListener('click', () => {
  document.getElementById('versionModal').classList.add('hidden');
});

document.querySelector('#versionModal .modal-backdrop').addEventListener('click', () => {
  document.getElementById('versionModal').classList.add('hidden');
});

document.getElementById('saveVersionBtn').addEventListener('click', saveVersion);

async function saveVersion() {
  const name = document.getElementById('versionName').value.trim() || `Snapshot ${new Date().toLocaleString()}`;
  const designId = EDITOR.designId();
  if (!designId) { EDITOR.showToast('Save design first.', 'error'); return; }

  const json = JSON.stringify(EDITOR.canvas().toJSON());

  const { error } = await supabase.from('design_versions').insert({
    design_id: designId,
    version_name: name,
    canvas_json: json,
  });

  if (!error) {
    document.getElementById('versionName').value = '';
    EDITOR.showToast('Snapshot saved!', 'success');
    await loadVersions();
  }
}

async function loadVersions() {
  const designId = EDITOR.designId();
  if (!designId) return;

  const list = document.getElementById('versionsList');
  list.innerHTML = '<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:16px">Loading...</div>';

  const { data, error } = await supabase
    .from('design_versions')
    .select('*')
    .eq('design_id', designId)
    .order('created_at', { ascending: false });

  list.innerHTML = '';

  if (error || !data || data.length === 0) {
    list.innerHTML = '<div class="versions-empty">No saved snapshots yet.</div>';
    return;
  }

  data.forEach(v => {
    const item = document.createElement('div');
    item.className = 'version-item';
    item.innerHTML = `
      <div class="version-info">
        <span class="version-name">${v.version_name}</span>
        <span class="version-date">${new Date(v.created_at).toLocaleString()}</span>
      </div>
      <button data-id="${v.id}">Restore</button>
    `;
    item.querySelector('button').addEventListener('click', () => restoreVersion(v));
    list.appendChild(item);
  });
}

function restoreVersion(v) {
  if (!confirm(`Restore snapshot "${v.version_name}"? Unsaved changes will be lost.`)) return;
  const c = EDITOR.canvas();
  const parsed = typeof v.canvas_json === 'string' ? JSON.parse(v.canvas_json) : v.canvas_json;
  c.loadFromJSON(parsed, () => {
    c.renderAll();
    EDITOR.updateLayers();
    EDITOR.saveHistory();
    EDITOR.showToast('Snapshot restored!', 'success');
    document.getElementById('versionModal').classList.add('hidden');
  });
}
