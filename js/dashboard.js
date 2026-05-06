// ===== Dashboard Logic =====

let currentUser = null;

// Auth guard
(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = 'index.html'; return; }
  currentUser = session.user;

  const name = currentUser.user_metadata?.full_name || currentUser.email.split('@')[0];
  document.getElementById('dashUserName').textContent = name;
  document.getElementById('dashUserEmail').textContent = currentUser.email;
  document.getElementById('dashAvatar').textContent = name.charAt(0).toUpperCase();

  loadDesigns();
})();

// Sign out
document.getElementById('signOutBtn').addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.href = 'index.html';
});

// Load designs
async function loadDesigns() {
  const grid = document.getElementById('designsGrid');
  const loading = document.getElementById('designsLoading');
  const empty = document.getElementById('designsEmpty');

  const { data, error } = await supabase
    .from('designs')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('updated_at', { ascending: false });

  loading.remove();

  if (error || !data || data.length === 0) {
    grid.appendChild(empty);
    empty.classList.remove('hidden');
    return;
  }

  data.forEach(design => {
    const card = createDesignCard(design);
    grid.appendChild(card);
  });
}

function createDesignCard(design) {
  const card = document.createElement('div');
  card.className = 'design-card';
  card.innerHTML = `
    <div class="design-thumb">
      ${design.thumbnail_url
        ? `<img src="${design.thumbnail_url}" alt="${design.name}" />`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" width="40" height="40"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/></svg>`
      }
    </div>
    <div class="design-card-footer">
      <span class="design-card-name">${design.name}</span>
      <span class="design-card-date">${formatDate(design.updated_at)}</span>
    </div>
    <div class="design-card-menu">
      <button class="design-menu-btn" data-action="open" title="Open">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button class="design-menu-btn" data-action="duplicate" title="Duplicate">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      </button>
      <button class="design-menu-btn" data-action="delete" title="Delete">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
      </button>
    </div>
  `;

  card.addEventListener('click', (e) => {
    if (e.target.closest('.design-card-menu')) return;
    openDesign(design.id);
  });

  card.querySelector('[data-action="open"]').addEventListener('click', () => openDesign(design.id));
  card.querySelector('[data-action="duplicate"]').addEventListener('click', (e) => { e.stopPropagation(); duplicateDesign(design); });
  card.querySelector('[data-action="delete"]').addEventListener('click', (e) => { e.stopPropagation(); deleteDesign(design.id, card); });

  return card;
}

function openDesign(id) {
  window.location.href = `editor.html?id=${id}`;
}

async function duplicateDesign(design) {
  const { data, error } = await supabase.from('designs').insert({
    user_id: currentUser.id,
    name: design.name + ' (Copy)',
    canvas_json: design.canvas_json,
    width: design.width,
    height: design.height,
  }).select().single();

  if (!error && data) {
    showToast('Design duplicated!', 'success');
    const card = createDesignCard(data);
    document.getElementById('designsGrid').prepend(card);
  }
}

async function deleteDesign(id, card) {
  if (!confirm('Delete this design? This cannot be undone.')) return;
  const { error } = await supabase.from('designs').delete().eq('id', id);
  if (!error) { card.remove(); showToast('Design deleted.'); }
}

// Quick size cards
document.querySelectorAll('.size-card').forEach(card => {
  card.addEventListener('click', () => {
    document.getElementById('newDesignW').value = card.dataset.w;
    document.getElementById('newDesignH').value = card.dataset.h;
    document.getElementById('newDesignName').value = card.querySelector('span').textContent;
    openNewDesignModal();
  });
});

// New Design modal
document.getElementById('newDesignBtn').addEventListener('click', openNewDesignModal);
document.getElementById('newDesignClose').addEventListener('click', closeNewDesignModal);
document.getElementById('newDesignCancelBtn').addEventListener('click', closeNewDesignModal);
document.getElementById('newDesignBackdrop').addEventListener('click', closeNewDesignModal);

function openNewDesignModal() { document.getElementById('newDesignModal').classList.remove('hidden'); }
function closeNewDesignModal() { document.getElementById('newDesignModal').classList.add('hidden'); }

document.getElementById('createDesignBtn').addEventListener('click', async () => {
  const name = document.getElementById('newDesignName').value.trim() || 'Untitled Design';
  const w = parseInt(document.getElementById('newDesignW').value) || 800;
  const h = parseInt(document.getElementById('newDesignH').value) || 600;

  const { data, error } = await supabase.from('designs').insert({
    user_id: currentUser.id,
    name,
    width: w,
    height: h,
    canvas_json: JSON.stringify({ version: '5.3.1', objects: [], background: '#ffffff' }),
  }).select().single();

  if (!error && data) {
    window.location.href = `editor.html?id=${data.id}`;
  }
});

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function showToast(msg, type = '') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}
