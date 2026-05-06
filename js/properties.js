// ===== Properties Panel =====

function syncProperties() {
  const c = EDITOR.canvas();
  const obj = c.getActiveObject();
  if (!obj) return;

  document.getElementById('canvasProps').classList.add('hidden');
  document.getElementById('objectProps').classList.remove('hidden');

  const isText = obj.type === 'i-text' || obj.type === 'text';
  const isImage = obj.type === 'image';

  document.getElementById('textProps').classList.toggle('hidden', !isText);
  document.getElementById('fillProps').classList.toggle('hidden', isText);
  document.getElementById('imageProps').classList.toggle('hidden', !isImage);

  document.getElementById('objPropsTitle').textContent =
    isText ? 'Text' : isImage ? 'Image' : obj.type.charAt(0).toUpperCase() + obj.type.slice(1);

  // Position & size
  document.getElementById('objX').value = Math.round(obj.left);
  document.getElementById('objY').value = Math.round(obj.top);
  document.getElementById('objW').value = Math.round(obj.getScaledWidth());
  document.getElementById('objH').value = Math.round(obj.getScaledHeight());
  document.getElementById('objAngle').value = Math.round(obj.angle || 0);
  document.getElementById('objOpacity').value = obj.opacity ?? 1;

  // Fill
  if (!isText) {
    const fill = obj.fill || '#000000';
    document.getElementById('objFill').value = typeof fill === 'string' ? fill : '#000000';
    document.getElementById('objFillHex').value = typeof fill === 'string' ? fill : '#000000';
    document.getElementById('objStroke').value = obj.stroke || '#000000';
    document.getElementById('objStrokeW').value = obj.strokeWidth || 0;
  }

  // Text
  if (isText) {
    document.getElementById('fontFamily').value = obj.fontFamily || 'Inter';
    document.getElementById('fontSize').value = obj.fontSize || 24;
    document.getElementById('textColor').value = obj.fill || '#000000';
    document.getElementById('textColorHex').value = obj.fill || '#000000';
    document.getElementById('lineHeight').value = obj.lineHeight || 1.2;

    document.getElementById('boldBtn').classList.toggle('active', obj.fontWeight === 'bold');
    document.getElementById('italicBtn').classList.toggle('active', obj.fontStyle === 'italic');
    document.getElementById('underlineBtn').classList.toggle('active', !!obj.underline);

    document.querySelectorAll('[data-align]').forEach(b =>
      b.classList.toggle('active', b.dataset.align === (obj.textAlign || 'left')));
  }
}

// Expose for other modules
window.syncProperties = syncProperties;

// ===== Property change handlers =====

function getObj() { return EDITOR.canvas().getActiveObject(); }

function update(props) {
  const obj = getObj();
  if (!obj) return;
  obj.set(props);
  EDITOR.canvas().renderAll();
  EDITOR.saveHistory();
}

// Position & Size
['objX','objY','objW','objH','objAngle'].forEach(id => {
  document.getElementById(id).addEventListener('change', () => {
    const obj = getObj();
    if (!obj) return;
    const x = +document.getElementById('objX').value;
    const y = +document.getElementById('objY').value;
    const w = +document.getElementById('objW').value;
    const h = +document.getElementById('objH').value;
    const a = +document.getElementById('objAngle').value;
    obj.set({ left: x, top: y, angle: a });
    obj.scaleToWidth(w);
    obj.scaleToHeight(h);
    EDITOR.canvas().renderAll();
    EDITOR.saveHistory();
  });
});

document.getElementById('objOpacity').addEventListener('input', (e) => update({ opacity: parseFloat(e.target.value) }));

// Fill
document.getElementById('objFill').addEventListener('input', (e) => {
  update({ fill: e.target.value });
  document.getElementById('objFillHex').value = e.target.value;
});
document.getElementById('objFillHex').addEventListener('change', (e) => {
  if (/^#[0-9a-f]{6}$/i.test(e.target.value)) {
    update({ fill: e.target.value });
    document.getElementById('objFill').value = e.target.value;
  }
});
document.getElementById('objStroke').addEventListener('input', (e) => update({ stroke: e.target.value }));
document.getElementById('objStrokeW').addEventListener('change', (e) => update({ strokeWidth: +e.target.value }));

// Text
document.getElementById('fontFamily').addEventListener('change', (e) => update({ fontFamily: e.target.value }));
document.getElementById('fontSize').addEventListener('change', (e) => update({ fontSize: +e.target.value }));
document.getElementById('lineHeight').addEventListener('change', (e) => update({ lineHeight: +e.target.value }));

document.getElementById('textColor').addEventListener('input', (e) => {
  update({ fill: e.target.value });
  document.getElementById('textColorHex').value = e.target.value;
});
document.getElementById('textColorHex').addEventListener('change', (e) => {
  if (/^#[0-9a-f]{6}$/i.test(e.target.value)) {
    update({ fill: e.target.value });
    document.getElementById('textColor').value = e.target.value;
  }
});

document.getElementById('boldBtn').addEventListener('click', () => {
  const obj = getObj();
  if (!obj) return;
  const isBold = obj.fontWeight === 'bold';
  update({ fontWeight: isBold ? 'normal' : 'bold' });
  document.getElementById('boldBtn').classList.toggle('active', !isBold);
});

document.getElementById('italicBtn').addEventListener('click', () => {
  const obj = getObj();
  if (!obj) return;
  const isItalic = obj.fontStyle === 'italic';
  update({ fontStyle: isItalic ? 'normal' : 'italic' });
  document.getElementById('italicBtn').classList.toggle('active', !isItalic);
});

document.getElementById('underlineBtn').addEventListener('click', () => {
  const obj = getObj();
  if (!obj) return;
  update({ underline: !obj.underline });
  document.getElementById('underlineBtn').classList.toggle('active', !obj.underline);
});

document.querySelectorAll('[data-align]').forEach(btn => {
  btn.addEventListener('click', () => {
    update({ textAlign: btn.dataset.align });
    document.querySelectorAll('[data-align]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// Canvas bg
document.getElementById('canvasW').addEventListener('change', () => {
  EDITOR.canvas().setWidth(+document.getElementById('canvasW').value);
  EDITOR.canvas().renderAll();
});
document.getElementById('canvasH').addEventListener('change', () => {
  EDITOR.canvas().setHeight(+document.getElementById('canvasH').value);
  EDITOR.canvas().renderAll();
});

// Brush
document.getElementById('brushSize').addEventListener('input', (e) => {
  if (EDITOR.canvas().isDrawingMode) EDITOR.canvas().freeDrawingBrush.width = +e.target.value;
});
document.getElementById('brushColor').addEventListener('input', (e) => {
  if (EDITOR.canvas().isDrawingMode) EDITOR.canvas().freeDrawingBrush.color = e.target.value;
});
