// ===== Core Editor =====

let canvas, currentUser, designId, designData;
let history = [], historyIndex = -1, isHistoryAction = false;

const params = new URLSearchParams(window.location.search);
designId = params.get('id');

// Auth guard + load design
(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = 'index.html'; return; }
  currentUser = session.user;

  if (designId) {
    const { data } = await supabase
      .from('designs')
      .select('*')
      .eq('id', designId)
      .eq('user_id', currentUser.id)
      .single();

    if (data) {
      designData = data;
      document.getElementById('designTitleInput').value = data.name;
      document.getElementById('canvasW').value = data.width;
      document.getElementById('canvasH').value = data.height;
      initCanvas(data.width, data.height, data.canvas_json);
    }
  } else {
    initCanvas(800, 600, null);
  }
})();

// Init Fabric.js canvas
function initCanvas(w, h, jsonData) {
  const el = document.getElementById('mainCanvas');
  el.width = w;
  el.height = h;

  canvas = new fabric.Canvas('mainCanvas', {
    width: w,
    height: h,
    backgroundColor: '#ffffff',
    preserveObjectStacking: true,
  });

  if (jsonData) {
    const parsed = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    canvas.loadFromJSON(parsed, () => {
      canvas.renderAll();
      updateLayers();
      saveHistory();
    });
  } else {
    saveHistory();
  }

  canvas.on('object:modified', () => { saveHistory(); updateLayers(); syncProperties(); });
  canvas.on('object:added', () => { updateLayers(); });
  canvas.on('selection:created', syncProperties);
  canvas.on('selection:updated', syncProperties);
  canvas.on('selection:cleared', () => {
    document.getElementById('objectProps').classList.add('hidden');
    document.getElementById('canvasProps').classList.remove('hidden');
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboard);
}

// ===== Tool Management =====
let currentTool = 'select';
let isDrawingShape = false;
let shapeStart = null;
let tempShape = null;

document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
  btn.addEventListener('click', () => setTool(btn.dataset.tool));
});

function setTool(tool) {
  currentTool = tool;
  document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-tool="${tool}"]`)?.classList.add('active');

  canvas.isDrawingMode = false;
  canvas.selection = true;
  canvas.defaultCursor = 'default';

  document.getElementById('drawProps').classList.add('hidden');

  switch (tool) {
    case 'select':
      canvas.selection = true;
      break;
    case 'draw':
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.width = parseInt(document.getElementById('brushSize').value) || 5;
      canvas.freeDrawingBrush.color = document.getElementById('brushColor').value || '#000000';
      document.getElementById('drawProps').classList.remove('hidden');
      break;
    case 'text':
      canvas.defaultCursor = 'text';
      canvas.selection = false;
      canvas.once('mouse:down', addText);
      break;
    case 'image':
      document.getElementById('imageUpload').click();
      setTool('select');
      break;
    default:
      canvas.selection = false;
      canvas.defaultCursor = 'crosshair';
      break;
  }
}

// Draw shapes on mouse events
canvas.on('mouse:down', (e) => {
  if (!['rect', 'circle', 'triangle', 'line'].includes(currentTool)) return;
  isDrawingShape = true;
  shapeStart = canvas.getPointer(e.e);
  createTempShape(shapeStart);
});

canvas.on('mouse:move', (e) => {
  if (!isDrawingShape || !tempShape) return;
  const ptr = canvas.getPointer(e.e);
  updateTempShape(ptr);
});

canvas.on('mouse:up', () => {
  if (!isDrawingShape) return;
  isDrawingShape = false;
  if (tempShape) {
    if (tempShape.width < 5 && tempShape.height < 5 && currentTool !== 'line') {
      canvas.remove(tempShape);
    } else {
      canvas.setActiveObject(tempShape);
      saveHistory();
    }
    tempShape = null;
    setTool('select');
  }
});

function createTempShape(start) {
  const fill = '#7C3AED';
  const stroke = 'transparent';

  if (currentTool === 'rect') {
    tempShape = new fabric.Rect({ left: start.x, top: start.y, width: 0, height: 0, fill, stroke, strokeWidth: 0 });
  } else if (currentTool === 'circle') {
    tempShape = new fabric.Ellipse({ left: start.x, top: start.y, rx: 0, ry: 0, fill, stroke, strokeWidth: 0 });
  } else if (currentTool === 'triangle') {
    tempShape = new fabric.Triangle({ left: start.x, top: start.y, width: 0, height: 0, fill, stroke, strokeWidth: 0 });
  } else if (currentTool === 'line') {
    tempShape = new fabric.Line([start.x, start.y, start.x, start.y], { stroke: '#000000', strokeWidth: 2, selectable: true });
  }

  if (tempShape) canvas.add(tempShape);
}

function updateTempShape(ptr) {
  const w = ptr.x - shapeStart.x;
  const h = ptr.y - shapeStart.y;

  if (currentTool === 'rect' || currentTool === 'triangle') {
    tempShape.set({
      left: Math.min(ptr.x, shapeStart.x),
      top: Math.min(ptr.y, shapeStart.y),
      width: Math.abs(w),
      height: Math.abs(h),
    });
  } else if (currentTool === 'circle') {
    tempShape.set({
      left: Math.min(ptr.x, shapeStart.x),
      top: Math.min(ptr.y, shapeStart.y),
      rx: Math.abs(w) / 2,
      ry: Math.abs(h) / 2,
    });
  } else if (currentTool === 'line') {
    tempShape.set({ x2: ptr.x, y2: ptr.y });
  }

  canvas.renderAll();
}

// Add text
function addText(e) {
  const ptr = canvas.getPointer(e.e);
  const text = new fabric.IText('Double-click to edit', {
    left: ptr.x,
    top: ptr.y,
    fontFamily: 'Inter',
    fontSize: 24,
    fill: '#000000',
  });
  canvas.add(text);
  canvas.setActiveObject(text);
  saveHistory();
  updateLayers();
  canvas.selection = true;
  setTool('select');
}

// Upload image
document.getElementById('imageUpload').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    fabric.Image.fromURL(ev.target.result, (img) => {
      const maxW = canvas.width * 0.6;
      if (img.width > maxW) img.scaleToWidth(maxW);
      img.set({ left: 50, top: 50 });
      canvas.add(img);
      canvas.setActiveObject(img);
      saveHistory();
      updateLayers();
    });
  };
  reader.readAsDataURL(file);
  e.target.value = '';
});

// ===== History (Undo/Redo) =====
function saveHistory() {
  if (isHistoryAction) return;
  const json = JSON.stringify(canvas.toJSON());
  history = history.slice(0, historyIndex + 1);
  history.push(json);
  if (history.length > 50) history.shift();
  historyIndex = history.length - 1;
  updateHistoryBtns();
}

function undo() {
  if (historyIndex <= 0) return;
  historyIndex--;
  loadHistoryState();
}

function redo() {
  if (historyIndex >= history.length - 1) return;
  historyIndex++;
  loadHistoryState();
}

function loadHistoryState() {
  isHistoryAction = true;
  canvas.loadFromJSON(history[historyIndex], () => {
    canvas.renderAll();
    updateLayers();
    isHistoryAction = false;
    updateHistoryBtns();
  });
}

function updateHistoryBtns() {
  document.getElementById('undoBtn').disabled = historyIndex <= 0;
  document.getElementById('redoBtn').disabled = historyIndex >= history.length - 1;
}

document.getElementById('undoBtn').addEventListener('click', undo);
document.getElementById('redoBtn').addEventListener('click', redo);

// ===== Keyboard shortcuts =====
function handleKeyboard(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    if (e.key === 'y') { e.preventDefault(); redo(); }
    if (e.key === 's') { e.preventDefault(); saveDesign(); }
    if (e.key === 'c') { canvas.getActiveObject() && copyObject(); }
    if (e.key === 'v') { pasteObject(); }
  }

  if (e.key === 'v') setTool('select');
  if (e.key === 't') setTool('text');
  if (e.key === 'r') setTool('rect');
  if (e.key === 'c') setTool('circle');
  if (e.key === 'l') setTool('line');
  if (e.key === 'p') setTool('draw');
  if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
}

let clipboard = null;
function copyObject() {
  canvas.getActiveObject().clone((c) => { clipboard = c; });
}

function pasteObject() {
  if (!clipboard) return;
  clipboard.clone((c) => {
    canvas.discardActiveObject();
    c.set({ left: c.left + 20, top: c.top + 20, evented: true });
    if (c._objects) {
      c._objects.forEach(o => canvas.add(o));
      canvas.setActiveObject(c);
    } else {
      canvas.add(c);
      canvas.setActiveObject(c);
    }
    clipboard.top += 20;
    clipboard.left += 20;
    canvas.requestRenderAll();
    saveHistory();
    updateLayers();
  });
}

function deleteSelected() {
  const active = canvas.getActiveObjects();
  if (!active.length) return;
  active.forEach(o => canvas.remove(o));
  canvas.discardActiveObject();
  canvas.renderAll();
  saveHistory();
  updateLayers();
}

document.getElementById('deleteObjBtn').addEventListener('click', deleteSelected);

// ===== Layers =====
function updateLayers() {
  const list = document.getElementById('layersList');
  list.innerHTML = '';
  const objects = canvas.getObjects().slice().reverse();
  const active = canvas.getActiveObject();

  objects.forEach((obj, i) => {
    const realIdx = canvas.getObjects().length - 1 - i;
    const item = document.createElement('div');
    item.className = 'layer-item' + (obj === active ? ' selected' : '');

    const typeIcon = getLayerIcon(obj.type);
    const name = obj.name || getLayerName(obj, realIdx);

    item.innerHTML = `
      ${typeIcon}
      <span class="layer-name">${name}</span>
      <div class="layer-actions">
        <button class="layer-action-btn" title="Move Up">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>
        </button>
        <button class="layer-action-btn" title="Move Down">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <button class="layer-action-btn" title="Delete">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `;

    item.addEventListener('click', (e) => {
      if (e.target.closest('.layer-actions')) return;
      canvas.setActiveObject(obj);
      canvas.renderAll();
      updateLayers();
      syncProperties();
    });

    const [upBtn, downBtn, delBtn] = item.querySelectorAll('.layer-action-btn');

    upBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      canvas.bringForward(obj);
      canvas.renderAll();
      saveHistory();
      updateLayers();
    });

    downBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      canvas.sendBackwards(obj);
      canvas.renderAll();
      saveHistory();
      updateLayers();
    });

    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      canvas.remove(obj);
      canvas.renderAll();
      saveHistory();
      updateLayers();
    });

    list.appendChild(item);
  });
}

function getLayerIcon(type) {
  const icons = {
    'rect': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="layer-icon"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>',
    'circle': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>',
    'ellipse': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="12" rx="10" ry="6"/></svg>',
    'triangle': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4L2 20h20L12 4z"/></svg>',
    'i-text': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>',
    'text': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="12" y1="4" x2="12" y2="20"/></svg>',
    'image': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    'path': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/></svg>',
    'line': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="19" x2="19" y2="5"/></svg>',
  };
  return icons[type] || icons['rect'];
}

function getLayerName(obj, idx) {
  if (obj.type === 'i-text' || obj.type === 'text') return obj.text?.substring(0, 20) || 'Text';
  const names = { rect: 'Rectangle', circle: 'Circle', ellipse: 'Ellipse', triangle: 'Triangle', image: 'Image', path: 'Path', line: 'Line' };
  return (names[obj.type] || 'Object') + ' ' + (idx + 1);
}

// Layers toggle
const layersPanel = document.getElementById('layersPanel');
document.getElementById('layersToggle').addEventListener('click', () => {
  layersPanel.classList.toggle('expanded');
});

// ===== Save =====
async function saveDesign() {
  if (!currentUser || !designId) return;
  const btn = document.getElementById('saveBtn');
  btn.querySelector('span') ? btn.querySelector('span').textContent = 'Saving...' : null;

  const json = JSON.stringify(canvas.toJSON());
  const name = document.getElementById('designTitleInput').value.trim() || 'Untitled Design';
  const thumbnail = canvas.toDataURL({ format: 'jpeg', quality: 0.4, multiplier: 0.3 });

  // Upload thumbnail
  let thumbUrl = null;
  const thumbBlob = dataURLtoBlob(thumbnail);
  const { data: thumbData } = await supabase.storage
    .from('thumbnails')
    .upload(`${currentUser.id}/${designId}.jpg`, thumbBlob, { upsert: true, contentType: 'image/jpeg' });

  if (thumbData) {
    const { data: urlData } = supabase.storage.from('thumbnails').getPublicUrl(`${currentUser.id}/${designId}.jpg`);
    thumbUrl = urlData?.publicUrl;
  }

  const { error } = await supabase.from('designs').update({
    name,
    canvas_json: json,
    width: canvas.width,
    height: canvas.height,
    thumbnail_url: thumbUrl,
    updated_at: new Date().toISOString(),
  }).eq('id', designId);

  showToast(error ? 'Save failed.' : 'Design saved!', error ? 'error' : 'success');
}

document.getElementById('saveBtn').addEventListener('click', saveDesign);

// Auto-save every 2 minutes
setInterval(saveDesign, 120000);

// ===== Canvas background / size from properties =====
document.getElementById('canvasBg').addEventListener('input', (e) => {
  canvas.setBackgroundColor(e.target.value, canvas.renderAll.bind(canvas));
  document.getElementById('canvasBgHex').value = e.target.value;
});

document.getElementById('canvasBgHex').addEventListener('change', (e) => {
  const val = e.target.value;
  if (/^#[0-9a-f]{6}$/i.test(val)) {
    canvas.setBackgroundColor(val, canvas.renderAll.bind(canvas));
    document.getElementById('canvasBg').value = val;
  }
});

// ===== Zoom =====
document.getElementById('zoomSelect').addEventListener('change', (e) => {
  const zoom = parseFloat(e.target.value);
  const stage = document.getElementById('canvasStage');
  stage.style.transform = `scale(${zoom})`;
  stage.style.transformOrigin = 'top left';
});

// ===== Arrange =====
document.getElementById('bringFrontBtn').addEventListener('click', () => {
  const obj = canvas.getActiveObject();
  if (obj) { canvas.bringToFront(obj); canvas.renderAll(); saveHistory(); updateLayers(); }
});

document.getElementById('sendBackBtn').addEventListener('click', () => {
  const obj = canvas.getActiveObject();
  if (obj) { canvas.sendToBack(obj); canvas.renderAll(); saveHistory(); updateLayers(); }
});

document.getElementById('flipHBtn').addEventListener('click', () => {
  const obj = canvas.getActiveObject();
  if (obj) { obj.set('flipX', !obj.flipX); canvas.renderAll(); saveHistory(); }
});

document.getElementById('flipVBtn').addEventListener('click', () => {
  const obj = canvas.getActiveObject();
  if (obj) { obj.set('flipY', !obj.flipY); canvas.renderAll(); saveHistory(); }
});

// ===== Utility =====
function dataURLtoBlob(dataurl) {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8 = new Uint8Array(n);
  while (n--) u8[n] = bstr.charCodeAt(n);
  return new Blob([u8], { type: mime });
}

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type}`;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 2500);
}

// Export canvas and supabase client for other modules
window.EDITOR = { canvas: () => canvas, currentUser: () => currentUser, designId: () => designId, saveDesign, showToast, updateLayers, saveHistory, dataURLtoBlob };
