// ===== AI Features =====
// Layout Generator + Copywriter: Claude API via Supabase Edge Function proxy
// Image Generation: Pollinations.ai (free, no API key)
// Background Removal: @imgly/background-removal (free, client-side)

// ===== Panel open/close =====
document.getElementById('aiPanelBtn').addEventListener('click', () => {
  document.getElementById('aiModal').classList.toggle('hidden');
});
document.getElementById('aiModalClose').addEventListener('click', () => {
  document.getElementById('aiModal').classList.add('hidden');
});

// AI tab switching
document.querySelectorAll('.ai-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.ai-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.ai-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('ai' + capitalise(tab.dataset.ai)).classList.add('active');
  });
});

function capitalise(str) { return str.charAt(0).toUpperCase() + str.slice(1); }

// ===== Layout Generator =====
document.getElementById('generateLayoutBtn').addEventListener('click', generateLayout);

async function generateLayout() {
  const prompt = document.getElementById('layoutPrompt').value.trim();
  if (!prompt) return;

  const btn = document.getElementById('generateLayoutBtn');
  const result = document.getElementById('layoutResult');
  btn.textContent = 'Generating...';
  btn.disabled = true;
  result.classList.add('hidden');

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(CLAUDE_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({
        task: 'layout',
        prompt,
        canvasWidth: EDITOR.canvas().width,
        canvasHeight: EDITOR.canvas().height,
      }),
    });

    const data = await res.json();
    if (data.layout) {
      applyAILayout(data.layout);
      result.innerHTML = '<span style="color:var(--success)">Layout applied to canvas!</span>';
    } else {
      result.innerHTML = `<span style="color:var(--danger)">${data.error || 'Failed to generate layout.'}</span>`;
    }
    result.classList.remove('hidden');
  } catch (err) {
    result.innerHTML = `<span style="color:var(--danger)">Error: ${err.message}</span>`;
    result.classList.remove('hidden');
  }

  btn.textContent = 'Generate Layout';
  btn.disabled = false;
}

function applyAILayout(layout) {
  const c = EDITOR.canvas();
  c.clear();
  c.setBackgroundColor(layout.background || '#ffffff', c.renderAll.bind(c));

  (layout.elements || []).forEach(el => {
    if (el.type === 'rect') {
      const shape = new fabric.Rect({ left: el.x, top: el.y, width: el.width, height: el.height, fill: el.fill || '#7C3AED', rx: el.radius || 0, ry: el.radius || 0 });
      c.add(shape);
    } else if (el.type === 'text') {
      const text = new fabric.IText(el.content || 'Text', {
        left: el.x, top: el.y, fontFamily: el.font || 'Inter',
        fontSize: el.size || 24, fill: el.color || '#000000',
        fontWeight: el.bold ? 'bold' : 'normal',
        textAlign: el.align || 'left',
        width: el.width || 300,
      });
      c.add(text);
    } else if (el.type === 'circle') {
      const circle = new fabric.Circle({ left: el.x, top: el.y, radius: el.radius || 40, fill: el.fill || '#7C3AED' });
      c.add(circle);
    }
  });

  c.renderAll();
  EDITOR.saveHistory();
  EDITOR.updateLayers();
}

// ===== Copywriter =====
document.getElementById('generateCopyBtn').addEventListener('click', generateCopy);

async function generateCopy() {
  const brand = document.getElementById('copyBrand').value.trim();
  const tone = document.getElementById('copyTone').value;
  const type = document.getElementById('copyType').value;
  if (!brand) return;

  const btn = document.getElementById('generateCopyBtn');
  const result = document.getElementById('copyResult');
  btn.textContent = 'Generating...';
  btn.disabled = true;
  result.classList.add('hidden');

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(CLAUDE_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({ task: 'copy', brand, tone, type }),
    });

    const data = await res.json();
    if (data.options) {
      const optionsEl = document.getElementById('copyOptions');
      optionsEl.innerHTML = '';
      data.options.forEach(text => {
        const btn = document.createElement('button');
        btn.className = 'btn-secondary btn-block';
        btn.style.marginBottom = '6px';
        btn.textContent = text;
        btn.addEventListener('click', () => addTextToCanvas(text));
        optionsEl.appendChild(btn);
      });
      result.classList.remove('hidden');
    }
  } catch (err) {
    document.getElementById('copyOptions').innerHTML = `<span style="color:var(--danger)">${err.message}</span>`;
    result.classList.remove('hidden');
  }

  btn.textContent = 'Generate Copy';
  btn.disabled = false;
}

function addTextToCanvas(text) {
  const c = EDITOR.canvas();
  const obj = c.getActiveObject();
  if (obj && (obj.type === 'i-text' || obj.type === 'text')) {
    obj.set({ text });
    c.renderAll();
  } else {
    const t = new fabric.IText(text, { left: 50, top: 50, fontFamily: 'Inter', fontSize: 28, fill: '#000000' });
    c.add(t);
    c.setActiveObject(t);
    c.renderAll();
    EDITOR.updateLayers();
  }
  EDITOR.saveHistory();
  EDITOR.showToast('Text added!', 'success');
}

// ===== Image Generator (Pollinations.ai - free) =====
document.getElementById('generateImageBtn').addEventListener('click', generateImage);

async function generateImage() {
  const prompt = document.getElementById('imagePrompt').value.trim();
  if (!prompt) return;

  const style = document.getElementById('imageStyle').value;
  const fullPrompt = style ? `${prompt}, ${style}` : prompt;

  const btn = document.getElementById('generateImageBtn');
  const result = document.getElementById('imageGenResult');
  const loading = document.getElementById('imageGenLoading');

  btn.disabled = true;
  btn.textContent = 'Generating...';
  result.classList.add('hidden');
  loading.classList.remove('hidden');

  try {
    // Pollinations.ai — completely free, no API key
    const encodedPrompt = encodeURIComponent(fullPrompt);
    const seed = Math.floor(Math.random() * 999999);
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&seed=${seed}&nologo=true`;

    const img = document.getElementById('generatedImg');
    img.onload = () => {
      loading.classList.add('hidden');
      result.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Generate Image';
    };
    img.onerror = () => {
      loading.classList.add('hidden');
      EDITOR.showToast('Image generation failed. Try again.', 'error');
      btn.disabled = false;
      btn.textContent = 'Generate Image';
    };
    img.src = url;
    img.dataset.url = url;
  } catch (err) {
    loading.classList.add('hidden');
    EDITOR.showToast('Error: ' + err.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Generate Image';
  }
}

document.getElementById('addGeneratedImg').addEventListener('click', () => {
  const img = document.getElementById('generatedImg');
  if (!img.src) return;

  fabric.Image.fromURL(img.src, (fabricImg) => {
    const maxW = EDITOR.canvas().width * 0.6;
    if (fabricImg.width > maxW) fabricImg.scaleToWidth(maxW);
    fabricImg.set({ left: 50, top: 50 });
    EDITOR.canvas().add(fabricImg);
    EDITOR.canvas().setActiveObject(fabricImg);
    EDITOR.saveHistory();
    EDITOR.updateLayers();
    EDITOR.showToast('Image added to canvas!', 'success');
  }, { crossOrigin: 'anonymous' });
});

// ===== Background Removal (@imgly/background-removal - free, client-side) =====
document.getElementById('bgRemoveBtn').addEventListener('click', removeBackground);

let bgRemovalModule = null;

async function removeBackground() {
  const c = EDITOR.canvas();
  const obj = c.getActiveObject();
  if (!obj || obj.type !== 'image') {
    EDITOR.showToast('Select an image first.', 'error');
    return;
  }

  const btn = document.getElementById('bgRemoveBtn');
  const status = document.getElementById('bgRemoveStatus');
  btn.textContent = 'Processing...';
  btn.disabled = true;
  status.style.display = 'flex';
  status.querySelector('.status-text').textContent = 'Loading AI model...';

  try {
    // Lazy-load the background removal library
    if (!bgRemovalModule) {
      const script = document.createElement('script');
      script.type = 'module';
      // Using dynamic import for the ESM module
      await new Promise((resolve, reject) => {
        const inlineScript = document.createElement('script');
        inlineScript.type = 'module';
        inlineScript.textContent = `
          import { removeBackground } from 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/dist/background-removal.js';
          window.__bgRemove = removeBackground;
          window.dispatchEvent(new Event('bgRemoveReady'));
        `;
        window.addEventListener('bgRemoveReady', resolve, { once: true });
        document.head.appendChild(inlineScript);
      });
      bgRemovalModule = window.__bgRemove;
    }

    status.querySelector('.status-text').textContent = 'Removing background...';

    // Get image data URL
    const dataURL = obj.toDataURL();
    const blob = EDITOR.dataURLtoBlob(dataURL);

    const resultBlob = await bgRemovalModule(blob, {
      publicPath: 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/dist/',
    });

    const resultURL = URL.createObjectURL(resultBlob);

    fabric.Image.fromURL(resultURL, (newImg) => {
      newImg.set({
        left: obj.left,
        top: obj.top,
        scaleX: obj.scaleX,
        scaleY: obj.scaleY,
        angle: obj.angle,
      });
      c.remove(obj);
      c.add(newImg);
      c.setActiveObject(newImg);
      c.renderAll();
      EDITOR.saveHistory();
      EDITOR.updateLayers();
      URL.revokeObjectURL(resultURL);
      EDITOR.showToast('Background removed!', 'success');
    });

  } catch (err) {
    EDITOR.showToast('Background removal failed: ' + err.message, 'error');
  }

  btn.textContent = 'Remove Background';
  btn.disabled = false;
  status.style.display = 'none';
}

// ===== Smart Resize =====
document.getElementById('resizeCanvasBtn').addEventListener('click', () => {
  document.getElementById('resizeModal').classList.remove('hidden');
});
document.getElementById('resizeClose').addEventListener('click', () => document.getElementById('resizeModal').classList.add('hidden'));
document.getElementById('resizeCancelBtn').addEventListener('click', () => document.getElementById('resizeModal').classList.add('hidden'));
document.querySelector('#resizeModal .modal-backdrop').addEventListener('click', () => document.getElementById('resizeModal').classList.add('hidden'));

document.querySelectorAll('.resize-presets .size-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.resize-presets .size-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    document.getElementById('resizeW').value = card.dataset.w;
    document.getElementById('resizeH').value = card.dataset.h;
  });
});

document.getElementById('applyResizeBtn').addEventListener('click', smartResize);

function smartResize() {
  const newW = parseInt(document.getElementById('resizeW').value);
  const newH = parseInt(document.getElementById('resizeH').value);
  if (!newW || !newH) { EDITOR.showToast('Enter width and height.', 'error'); return; }

  const c = EDITOR.canvas();
  const oldW = c.width;
  const oldH = c.height;
  const scaleX = newW / oldW;
  const scaleY = newH / oldH;

  c.setWidth(newW);
  c.setHeight(newH);
  document.getElementById('mainCanvas').width = newW;
  document.getElementById('mainCanvas').height = newH;

  c.getObjects().forEach(obj => {
    obj.set({
      left: obj.left * scaleX,
      top: obj.top * scaleY,
      scaleX: (obj.scaleX || 1) * scaleX,
      scaleY: (obj.scaleY || 1) * scaleY,
    });
    obj.setCoords();
  });

  c.renderAll();
  document.getElementById('canvasW').value = newW;
  document.getElementById('canvasH').value = newH;
  EDITOR.saveHistory();
  document.getElementById('resizeModal').classList.add('hidden');
  EDITOR.showToast(`Canvas resized to ${newW}×${newH}!`, 'success');
}
