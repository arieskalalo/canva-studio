// ===== Mockup Wrapper =====

let selectedMockup = null;

document.getElementById('mockupBtn').addEventListener('click', () => {
  document.getElementById('mockupModal').classList.toggle('hidden');
});
document.getElementById('mockupClose').addEventListener('click', () => {
  document.getElementById('mockupModal').classList.add('hidden');
});

document.querySelectorAll('.mockup-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.mockup-item').forEach(i => i.classList.remove('selected'));
    item.classList.add('selected');
    selectedMockup = item.dataset.mockup;
  });
});

document.getElementById('applyMockupBtn').addEventListener('click', applyMockup);

function applyMockup() {
  if (!selectedMockup) { EDITOR.showToast('Select a mockup first.', 'error'); return; }

  const c = EDITOR.canvas();
  const dataURL = c.toDataURL({ format: 'png', multiplier: 1 });
  const config = getMockupConfig(selectedMockup, c.width, c.height);

  // Create a new canvas with the mockup
  fabric.Image.fromURL(dataURL, (designImg) => {
    // Scale design to fit mockup screen area
    const scaleX = config.screenW / c.width;
    const scaleY = config.screenH / c.height;

    designImg.set({
      left: config.screenX,
      top: config.screenY,
      scaleX,
      scaleY,
      selectable: true,
    });

    // Draw device frame
    const frame = new fabric.Rect({
      left: config.frameX,
      top: config.frameY,
      width: config.frameW,
      height: config.frameH,
      rx: config.radius || 0,
      ry: config.radius || 0,
      fill: config.frameFill || '#1a1a1a',
      stroke: config.frameStroke || '#444',
      strokeWidth: 2,
      selectable: true,
    });

    // Screen background
    const screen = new fabric.Rect({
      left: config.screenX,
      top: config.screenY,
      width: config.screenW,
      height: config.screenH,
      fill: '#000',
      selectable: false,
      evented: false,
    });

    // Group: frame + screen + design
    const group = new fabric.Group([frame, screen, designImg], {
      left: 50,
      top: 50,
    });

    c.add(group);
    c.setActiveObject(group);
    c.renderAll();
    EDITOR.saveHistory();
    EDITOR.updateLayers();
    EDITOR.showToast(`${selectedMockup} mockup applied!`, 'success');
    document.getElementById('mockupModal').classList.add('hidden');
  });
}

function getMockupConfig(type, dw, dh) {
  const configs = {
    phone: { frameX: 0, frameY: 0, frameW: 160, frameH: 300, screenX: 10, screenY: 30, screenW: 140, screenH: 240, radius: 16, frameFill: '#1a1a1a', frameStroke: '#555' },
    tablet: { frameX: 0, frameY: 0, frameW: 260, frameH: 200, screenX: 12, screenY: 12, screenW: 236, screenH: 176, radius: 10, frameFill: '#2a2a2a', frameStroke: '#555' },
    laptop: { frameX: 0, frameY: 0, frameW: 300, frameH: 200, screenX: 14, screenY: 14, screenW: 272, screenH: 172, radius: 4, frameFill: '#222', frameStroke: '#444' },
    billboard: { frameX: 0, frameY: 0, frameW: 340, frameH: 160, screenX: 10, screenY: 10, screenW: 320, screenH: 140, radius: 2, frameFill: '#333', frameStroke: '#555' },
    poster: { frameX: 0, frameY: 0, frameW: 180, frameH: 260, screenX: 8, screenY: 8, screenW: 164, screenH: 244, radius: 2, frameFill: '#f5f5f0', frameStroke: '#ccc' },
    tshirt: { frameX: 10, frameY: 20, frameW: 160, frameH: 180, screenX: 40, screenY: 50, screenW: 100, screenH: 100, radius: 0, frameFill: 'transparent', frameStroke: 'transparent' },
  };
  return configs[type] || configs.phone;
}
