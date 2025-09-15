// src/devtools.js

import eruda from 'eruda';
import { exportGardens, getGardensFromZip, importGardensFromZip, deleteGardens } from './data-portability.js';
import { Modal } from './modal.js';

function createSelectionUI(title, items, allChecked = true) {
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

  // --- FINAL FIX that works every time ---
  setTimeout(() => {
    const elementsPanel = el.querySelector('.eruda-elements');
    if (!elementsPanel) return;

    let isToggling = false; // Prevents the observer from firing multiple times rapidly

    const observer = new MutationObserver(() => {
      // Check if the panel is now visible and we're not already in the middle of a fix
      if (elementsPanel.style.display !== 'none' && !isToggling) {
        isToggling = true;
        
        const selectBtn = document.querySelector('.eruda-control > .eruda-icon-select');
        if (selectBtn) {
          // Double-click to ensure the state is toggled off
          selectBtn.click();
          selectBtn.click();
        }
        
        // Reset the flag after a short delay
        setTimeout(() => {
          isToggling = false;
        }, 100);
      }
    });

    // Watch for changes to the `style` attribute of the Elements panel itself.
    observer.observe(elementsPanel, {
      attributes: true,
      attributeFilter: ['style']
    });
  }, 500);
  // --- End of FIX ---

  const dataTool = eruda.add({
    name: 'Data',
    init($el) {
      this._$el = $el;
      $el.html(`
        <div style="padding: 10px; font-family: Arial, sans-serif; color: #ccc;">
          <h2 style="margin-top:0;">Data Portability</h2>
          <button id="export-btn" class="eruda-button">Export...</button>
          <button id="import-btn" class="eruda-button">Import...</button>
          <input type="file" id="import-file-input" accept=".zip" style="display: none;">
          
          <hr style="border: none; border-top: 1px solid #444; margin: 25px 0;">
          <h3 style="color: #F44747;">Danger Zone</h3>
          <button id="clear-data-btn" class="eruda-button destructive">Clear Data...</button>
        </div>
        <style>
          .eruda-button { 
            padding: 8px 12px; background-color: #4EC9B0; color: #111; 
            border: none; border-radius: 3px; cursor: pointer; font-weight: bold;
          }
          .eruda-button:hover { background-color: #5FDCC4; }
          .eruda-button.destructive { background-color: #F44747; color: #fff; }
          .eruda-button.destructive:hover { background-color: #FF5A5A; }
        </style>
      `);
      
      const exportBtn = $el.find('#export-btn')[0];
      const importBtn = $el.find('#import-btn')[0];
      const fileInput = $el.find('#import-file-input')[0];
      const clearDataBtn = $el.find('#clear-data-btn')[0];

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
                console.log('%cExport process initiated.', 'color: #4EC9B0; font-weight: bold;');
            } catch (e) {
                console.error('Export failed:', e.message);
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

      clearDataBtn.addEventListener('click', () => {
        const gardensRaw = localStorage.getItem('thoughtform_gardens');
        const gardens = gardensRaw ? JSON.parse(gardensRaw) : [];

        const modal = new Modal({ title: 'Clear Garden Data' });
        modal.show(createSelectionUI('Select gardens to permanently delete:', gardens, false));

        const contentEl = modal.content;
        contentEl.querySelector('.select-all-btn').onclick = () => contentEl.querySelectorAll('.garden-select-checkbox').forEach(cb => cb.checked = true);
        contentEl.querySelector('.select-none-btn').onclick = () => contentEl.querySelectorAll('.garden-select-checkbox').forEach(cb => cb.checked = false);

        const deleteHandler = async () => {
            const selectedGardens = Array.from(contentEl.querySelectorAll('.garden-select-checkbox:checked')).map(cb => cb.value);
            modal.clearFooter();
            modal.updateContent('Starting deletion...');
            
            let progressHTML = '';
            try {
                await deleteGardens(selectedGardens, (msg) => {
                    progressHTML += `${msg}<br>`;
                    modal.updateContent(progressHTML);
                });
            } catch (e) {
                console.error('Deletion failed:', e);
                modal.updateContent(`<strong>Error during deletion:</strong><br>${e.message}`);
                const closeBtn = modal.addFooterButton('Close', () => modal.destroy());
                closeBtn.classList.add('destructive');
            }
        };
        const deleteBtn = modal.addFooterButton('Delete Selected', deleteHandler);
        deleteBtn.classList.add('destructive');
        modal.addFooterButton('Cancel', () => modal.destroy());
      });
    },
    show() { this._$el.show(); },
    hide() { this._$el.hide(); },
  });

  return dataTool;
}
