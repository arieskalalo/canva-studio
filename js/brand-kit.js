// ===== Brand Kit =====

let brandKit = { colors: [], fonts: [], logoUrl: null };

// Open/Close
document.getElementById('brandKitBtn').addEventListener('click', () => {
  document.getElementById('brandKitModal').classList.toggle('hidden');
  loadBrandKit();
});
document.getElementById('brandKitClose').addEventListener('click', () => {
  document.getElementById('brandKitModal').classList.add('hidden');
});

async function loadBrandKit() {
  const user = EDITOR.currentUser();
  if (!user) return;
  const { data } = await supabase.from('brand_kits').select('*').eq('user_id', user.id).maybeSingle();
  if (data) {
    brandKit = { colors: data.colors || [], fonts: data.fonts || [], logoUrl: data.logo_url };
    renderBrandKit();
  }
}

function renderBrandKit() {
  // Colors
  const colorsEl = document.getElementById('brandColors');
  colorsEl.innerHTML = '';
  brandKit.colors.forEach((color, i) => {
    const swatch = document.createElement('div');
    swatch.className = 'brand-color-swatch';
    swatch.style.background = color;
    swatch.title = color;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-swatch';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', (e) => { e.stopPropagation(); brandKit.colors.splice(i, 1); renderBrandKit(); });
    swatch.appendChild(removeBtn);

    swatch.addEventListener('click', () => applyBrandColor(color));
    colorsEl.appendChild(swatch);
  });

  // Fonts
  const fontsEl = document.getElementById('brandFonts');
  fontsEl.innerHTML = '';
  brandKit.fonts.forEach((font, i) => {
    const tag = document.createElement('div');
    tag.className = 'brand-font-tag';
    tag.innerHTML = `<span style="font-family:${font}">${font}</span><span style="cursor:pointer" data-i="${i}">×</span>`;
    tag.addEventListener('click', () => applyBrandFont(font));
    tag.querySelector('[data-i]').addEventListener('click', (e) => { e.stopPropagation(); brandKit.fonts.splice(i, 1); renderBrandKit(); });
    fontsEl.appendChild(tag);
  });

  // Logo
  const logoPreview = document.getElementById('brandLogoPreview');
  const addLogoBtn = document.getElementById('addLogoToCanvas');
  if (brandKit.logoUrl) {
    logoPreview.innerHTML = `<img src="${brandKit.logoUrl}" />`;
    addLogoBtn.style.display = '';
  } else {
    logoPreview.textContent = 'No logo uploaded';
    addLogoBtn.style.display = 'none';
  }
}

// Add color
document.getElementById('addBrandColor').addEventListener('click', () => {
  const picker = document.createElement('input');
  picker.type = 'color';
  picker.addEventListener('input', (e) => {
    if (!brandKit.colors.includes(e.target.value)) {
      brandKit.colors.push(e.target.value);
      renderBrandKit();
    }
  });
  picker.click();
});

// Add font
document.getElementById('addBrandFont').addEventListener('click', () => {
  const font = document.getElementById('addFontSelect').value;
  if (font && !brandKit.fonts.includes(font)) {
    brandKit.fonts.push(font);
    renderBrandKit();
  }
});

// Logo upload
document.getElementById('uploadLogoBtn').addEventListener('click', () => {
  document.getElementById('brandLogoUpload').click();
});

document.getElementById('brandLogoUpload').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const user = EDITOR.currentUser();
  const path = `${user.id}/logo-${Date.now()}.${file.name.split('.').pop()}`;
  const { data, error } = await supabase.storage.from('brand-assets').upload(path, file, { upsert: true });
  if (!error) {
    const { data: urlData } = supabase.storage.from('brand-assets').getPublicUrl(path);
    brandKit.logoUrl = urlData.publicUrl;
    renderBrandKit();
  }
  e.target.value = '';
});

// Add logo to canvas
document.getElementById('addLogoToCanvas').addEventListener('click', () => {
  if (!brandKit.logoUrl) return;
  const c = EDITOR.canvas();
  fabric.Image.fromURL(brandKit.logoUrl, (img) => {
    img.scaleToWidth(150);
    img.set({ left: 20, top: 20 });
    c.add(img);
    c.setActiveObject(img);
    EDITOR.saveHistory();
    EDITOR.updateLayers();
  }, { crossOrigin: 'anonymous' });
});

// Save brand kit
document.getElementById('saveBrandKitBtn').addEventListener('click', async () => {
  const user = EDITOR.currentUser();
  if (!user) return;
  const { error } = await supabase.from('brand_kits').upsert({
    user_id: user.id,
    colors: brandKit.colors,
    fonts: brandKit.fonts,
    logo_url: brandKit.logoUrl,
    name: 'Default',
  }, { onConflict: 'user_id' });
  EDITOR.showToast(error ? 'Save failed.' : 'Brand Kit saved!', error ? 'error' : 'success');
});

function applyBrandColor(color) {
  const obj = EDITOR.canvas().getActiveObject();
  if (!obj) return;
  obj.set({ fill: color });
  EDITOR.canvas().renderAll();
  EDITOR.saveHistory();
  syncProperties();
}

function applyBrandFont(font) {
  const obj = EDITOR.canvas().getActiveObject();
  if (!obj) return;
  if (obj.type === 'i-text' || obj.type === 'text') {
    obj.set({ fontFamily: font });
    EDITOR.canvas().renderAll();
    EDITOR.saveHistory();
    syncProperties();
  }
}
