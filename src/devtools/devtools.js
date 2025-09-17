import eruda from 'eruda';
import { exportGardens, getGardensFromZip, importGardensFromZip, deleteGardens } from './data.js';
import { Modal } from '../util/modal.js';

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

  // --- Fix for Eruda elements panel inspection ---
  setTimeout(() => {
    const elementsPanel = el.querySelector('.eruda-elements');
    if (!elementsPanel) return;
    let wasVisible = false;
    const observer = new MutationObserver(() => {
      const isVisible = elementsPanel.style.display !== 'none';
      if (isVisible && !wasVisible) {
        const selectBtn = document.querySelector('.eruda-control > .eruda-icon-select');
        if (selectBtn) {
          selectBtn.click();
          selectBtn.click();
        }
      }
      wasVisible = isVisible;
    });
    observer.observe(elementsPanel, { attributes: true, attributeFilter: ['style'] });
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
        modal.updateContent(createSelectionUI('Choose which gardens to include in the export:', gardens));
        
        const contentEl = modal.content;
        contentEl.querySelector('.select-all-btn').onclick = () => contentEl.querySelectorAll('.garden-select-checkbox').forEach(cb => cb.checked = true);
        contentEl.querySelector('.select-none-btn').onclick = () => contentEl.querySelectorAll('.garden-select-checkbox').forEach(cb => cb.checked = false);
        
        const exportHandler = async () => {
            const selectedGardens = Array.from(contentEl.querySelectorAll('.garden-select-checkbox:checked')).map(cb => cb.value);
            modal.destroy();
            
            const progressModal = new Modal({ title: 'Exporting Gardens...' });
            progressModal.updateContent('<p>Preparing export. Please wait...</p>');
            
            let cancelled = false;
            let fullLog = '';

            const cancelButton = progressModal.addFooterButton('Cancel', () => {
                cancelled = true;
                progressModal.destroy();
                console.log('Export cancelled by user.');
            });

            progressModal.show(); // Show progress modal immediately

            try {
                await exportGardens(selectedGardens, (msg) => {
                    if (cancelled) throw new Error('Export cancelled by user.');
                    console.log(msg);
                    fullLog += msg + '<br>';
                    progressModal.updateContent(`<div style="font-family: monospace; max-height: 300px; overflow-y: auto;">${fullLog}</div>`);
                });
                
                if (!cancelled) {
                    progressModal.clearFooter();
                    progressModal.updateContent('<p>Export complete! The download will begin shortly.</p>');
                    setTimeout(() => progressModal.destroy(), 3000);
                }
            } catch (e) {
                if (!cancelled) {
                    console.error('Export failed:', e.message);
                    progressModal.clearFooter();
                    progressModal.updateContent(`<p style="color: #F44747;"><strong>Export Failed</strong><br>${e.message}</p>`);
                    progressModal.addFooterButton('Close', () => progressModal.destroy());
                }
            }
        };
        
        modal.addFooterButton('Export Selected', exportHandler);
        modal.addFooterButton('Cancel', () => modal.destroy());
        modal.show(); // Now show the selection modal
      });
      
      importBtn.addEventListener('click', () => fileInput.click());
      
      fileInput.addEventListener('change', async () => {
        const file = fileInput.files[0];
        if (!file) return;

        const modal = new Modal({ title: 'Select Gardens to Import' });
        modal.updateContent('Scanning zip file...');
        modal.show();
        
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
        modal.updateContent(createSelectionUI('Select gardens to permanently delete:', gardens, false));
        
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
        modal.show(); // Show modal after content and listeners are ready
      });
    },
    show() { this._$el.show(); },
    hide() { this._$el.hide(); },
  });
  return dataTool;
}
