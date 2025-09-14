// src/devtools.js
import eruda from 'eruda';
import { exportGardens, getGardensFromZip, importGardensFromZip } from './data-portability.js';
import { Modal } from './modal.js';

// --- Helper function to generate the selection UI ---
function createSelectionUI(title, items, allChecked = true) {
  // FIX: Use 'display: block' for each label to ensure it takes its own line.
  const itemCheckboxes = items.map(item => `
    <label style="display: block; margin: 8px 0; font-family: monospace; cursor: pointer;">
      <input type="checkbox" class="garden-select-checkbox" value="${item}" ${allChecked ? 'checked' : ''} style="margin-right: 8px; vertical-align: middle;">
      <span style="vertical-align: middle;">${item}</span>
    </label>
  `).join('');

  return `
    <div style="font-family: Arial, sans-serif;">
      <p style="margin-top: 0;">${title}</p>
      <div style="margin-bottom: 10px;">
        <button type="button" class="select-all-btn" style="margin-right: 5px;">Select All</button>
        <button type="button" class="select-none-btn">Deselect All</button>
      </div>
      <div class="garden-selection-list" style="max-height: 200px; overflow-y: auto; border: 1px solid #444; padding: 10px; border-radius: 3px;">
        ${itemCheckboxes}
      </div>
    </div>
  `;
}

export function initializeDevTools() {
  const el = document.getElementById('eruda-container');
  if (!el) return;

  eruda.init({
    container: el,
    tool: ['console', 'elements', 'network', 'resources'],
    inline: true,
    useShadowDom: false,
  });

  const dataTool = eruda.add({
    name: 'Data',
    init($el) {
      this._$el = $el;
      $el.html(`
        <div style="padding: 10px; font-family: Arial, sans-serif; color: #ccc;">
          <h2 style="margin-top:0;">Data Portability</h2>
          <button id="export-all-btn" class="eruda-button">Export...</button>
          <button id="import-all-btn" class="eruda-button">Import...</button>
          <input type="file" id="import-file-input" accept=".zip" style="display: none;">
        </div>
        <style>
          .eruda-button { 
            padding: 8px 12px; background-color: #4EC9B0; color: #111; 
            border: none; border-radius: 3px; cursor: pointer; font-weight: bold;
          }
          .eruda-button:hover { background-color: #5FDCC4; }
        </style>
      `);
      
      const exportBtn = $el.find('#export-all-btn')[0];
      const importBtn = $el.find('#import-all-btn')[0];
      const fileInput = $el.find('#import-file-input')[0];

      exportBtn.addEventListener('click', () => {
        const gardensRaw = localStorage.getItem('thoughtform_gardens');
        const gardens = gardensRaw ? JSON.parse(gardensRaw) : ['home'];
        
        const modal = new Modal({ title: 'Select Gardens to Export' });
        modal.show(createSelectionUI('Choose which gardens to include in the export:', gardens));
        
        const contentEl = modal.content;
        contentEl.querySelector('.select-all-btn').onclick = () => contentEl.querySelectorAll('.garden-select-checkbox').forEach(cb => cb.checked = true);
        contentEl.querySelector('.select-none-btn').onclick = () => contentEl.querySelectorAll('.garden-select-checkbox').forEach(cb => cb.checked = false);

        const exportHandler = async () => {
            const selectedGardens = Array.from(contentEl.querySelectorAll('.garden-select-checkbox:checked')).map(cb => cb.value);
            modal.destroy();
            console.log('Starting export...');
            try {
                await exportGardens(selectedGardens, console.log);
                console.log('%cExport process complete.', 'color: #4EC9B0; font-weight: bold;');
            } catch (e) {
                console.error('Export failed:', e);
            }
        };
        modal.addFooterButton('Export Selected', exportHandler);
        modal.addFooterButton('Cancel', () => modal.destroy());
      });
      
      importBtn.addEventListener('click', () => fileInput.click());
      
      fileInput.addEventListener('change', async () => {
        const file = fileInput.files[0];
        if (!file) return;

        const modal = new Modal({ title: 'Select Gardens to Import' });
        modal.show('Scanning zip file...');
        
        try {
            const gardensInZip = await getGardensFromZip(file);
            if (gardensInZip.length === 0) {
                modal.updateContent('No valid gardens found in this zip file.');
                modal.addFooterButton('Close', () => modal.destroy());
                return;
            }
            
            modal.updateContent(createSelectionUI(`Found ${gardensInZip.length} garden(s). Select which to import:`, gardensInZip));
            
            const contentEl = modal.content;
            contentEl.querySelector('.select-all-btn').onclick = () => contentEl.querySelectorAll('.garden-select-checkbox').forEach(cb => cb.checked = true);
            contentEl.querySelector('.select-none-btn').onclick = () => contentEl.querySelectorAll('.garden-select-checkbox').forEach(cb => cb.checked = false);

            const importHandler = async () => {
                const selectedGardens = Array.from(contentEl.querySelectorAll('.garden-select-checkbox:checked')).map(cb => cb.value);
                modal.clearFooter();
                modal.updateContent('Starting import...');
                
                let progressHTML = '';
                try {
                    await importGardensFromZip(file, selectedGardens, (msg) => {
                        progressHTML += `${msg}<br>`;
                        modal.updateContent(progressHTML);
                    });
                } catch(e) {
                    console.error('Import failed:', e);
                    modal.updateContent(`<strong>Error during import:</strong><br>${e.message}`);
                    modal.addFooterButton('Close', () => modal.destroy());
                }
            };
            modal.addFooterButton('Import Selected', importHandler);
            modal.addFooterButton('Cancel', () => modal.destroy());

        } catch (e) {
            console.error('Failed to read zip file:', e);
            modal.updateContent(`<strong>Error:</strong> Could not read the zip file.<br>${e.message}`);
            modal.addFooterButton('Close', () => modal.destroy());
        } finally {
            fileInput.value = '';
        }
      });
    },
    show() { this._$el.show(); },
    hide() { this._$el.hide(); },
  });

  return dataTool;
}
