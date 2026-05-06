// ===== Batch Variant Generator =====

document.getElementById('batchBtn').addEventListener('click', () => {
  document.getElementById('batchModal').classList.remove('hidden');
});
document.getElementById('batchClose').addEventListener('click', () => document.getElementById('batchModal').classList.add('hidden'));
document.getElementById('batchCancelBtn').addEventListener('click', () => document.getElementById('batchModal').classList.add('hidden'));
document.querySelector('#batchModal .modal-backdrop').addEventListener('click', () => document.getElementById('batchModal').classList.add('hidden'));

document.getElementById('runBatchBtn').addEventListener('click', runBatch);

async function runBatch() {
  const c = EDITOR.canvas();
  const headlines = document.getElementById('batchHeadlines').value.split(',').map(s => s.trim()).filter(Boolean);
  const colors = document.getElementById('batchColors').value.split(',').map(s => s.trim()).filter(Boolean);
  const format = document.getElementById('batchFormat').value;

  const variants = Math.max(headlines.length, colors.length, 1);
  const baseJSON = JSON.stringify(c.toJSON());

  const progress = document.getElementById('batchProgress');
  const bar = document.getElementById('batchProgressBar');
  const text = document.getElementById('batchProgressText');
  progress.classList.remove('hidden');

  for (let i = 0; i < variants; i++) {
    text.textContent = `Generating ${i + 1}/${variants}...`;
    bar.style.width = `${((i + 1) / variants) * 100}%`;

    // Load base design
    await new Promise(resolve => {
      const parsed = JSON.parse(baseJSON);
      c.loadFromJSON(parsed, () => {
        c.renderAll();

        // Apply background color variant
        if (colors[i]) {
          c.setBackgroundColor(colors[i], () => c.renderAll());
        }

        // Apply headline variant — replace first text object
        if (headlines[i]) {
          const textObj = c.getObjects().find(o => o.type === 'i-text' || o.type === 'text');
          if (textObj) {
            textObj.set({ text: headlines[i] });
            c.renderAll();
          }
        }

        // Small delay to allow render
        setTimeout(async () => {
          const name = `${document.getElementById('designTitleInput').value || 'design'}-variant-${i + 1}`;

          if (format === 'png') {
            const dataURL = c.toDataURL({ format: 'png', multiplier: 1 });
            downloadFileFromURL(dataURL, `${name}.png`);
          } else {
            // Save to Supabase
            const user = EDITOR.currentUser();
            if (user) {
              await supabase.from('designs').insert({
                user_id: user.id,
                name,
                canvas_json: JSON.stringify(c.toJSON()),
                width: c.width,
                height: c.height,
              });
            }
          }
          resolve();
        }, 150);
      });
    });
  }

  // Restore original
  c.loadFromJSON(JSON.parse(baseJSON), () => {
    c.renderAll();
    EDITOR.updateLayers();
  });

  progress.classList.add('hidden');
  document.getElementById('batchModal').classList.add('hidden');
  EDITOR.showToast(`${variants} variants generated!`, 'success');
}

function downloadFileFromURL(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}
