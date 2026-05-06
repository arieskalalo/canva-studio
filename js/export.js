// ===== Export Module =====

// Toggle export dropdown
document.getElementById('exportDropBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  document.getElementById('exportMenu').classList.toggle('hidden');
});

document.addEventListener('click', () => document.getElementById('exportMenu').classList.add('hidden'));

document.querySelectorAll('.export-option').forEach(btn => {
  btn.addEventListener('click', () => {
    exportDesign(btn.dataset.format);
    document.getElementById('exportMenu').classList.add('hidden');
  });
});

function exportDesign(format) {
  const c = EDITOR.canvas();
  const name = document.getElementById('designTitleInput').value || 'design';

  switch (format) {
    case 'png': exportPNG(c, name); break;
    case 'jpg': exportJPG(c, name); break;
    case 'svg': exportSVG(c, name); break;
    case 'pdf': exportPDF(c, name); break;
    case 'vidspark': exportToVidspark(c, name); break;
  }
}

function exportPNG(c, name) {
  const dataURL = c.toDataURL({ format: 'png', multiplier: 1 });
  downloadFile(dataURL, `${name}.png`);
  EDITOR.showToast('PNG exported!', 'success');
}

function exportJPG(c, name) {
  const dataURL = c.toDataURL({ format: 'jpeg', quality: 0.95, multiplier: 1 });
  downloadFile(dataURL, `${name}.jpg`);
  EDITOR.showToast('JPG exported!', 'success');
}

function exportSVG(c, name) {
  const svg = c.toSVG();
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  downloadFile(url, `${name}.svg`);
  URL.revokeObjectURL(url);
  EDITOR.showToast('SVG exported!', 'success');
}

async function exportPDF(c, name) {
  if (!window.jspdf) { EDITOR.showToast('PDF library loading...', ''); return; }
  const { jsPDF } = window.jspdf;
  const dataURL = c.toDataURL({ format: 'jpeg', quality: 0.95, multiplier: 1 });
  const pxToMm = 0.2645833;
  const w = c.width * pxToMm;
  const h = c.height * pxToMm;
  const orientation = w > h ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ orientation, unit: 'mm', format: [w, h] });
  pdf.addImage(dataURL, 'JPEG', 0, 0, w, h);
  pdf.save(`${name}.pdf`);
  EDITOR.showToast('PDF exported!', 'success');
}

function exportToVidspark(c, name) {
  const json = JSON.stringify(c.toJSON());
  const dataURL = c.toDataURL({ format: 'png', multiplier: 1 });
  const payload = { name, width: c.width, height: c.height, canvas_json: json, preview: dataURL, source: 'canva-studio' };
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  downloadFile(url, `${name}.vidspark.json`);
  URL.revokeObjectURL(url);
  EDITOR.showToast('Exported for Vidspark! Import the .json file in Vidspark.', 'success');
}

function downloadFile(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}
