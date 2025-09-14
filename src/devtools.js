// src/devtools.js
import eruda from 'eruda';
import { exportAllGardens, importFromZip } from './data-portability.js';
import { Modal } from './modal.js';

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
          <h2 style="margin-top:0; border-bottom: 1px solid #555; padding-bottom: 5px;">Data Portability</h2>
          <h3 style="color: #E5C07B;">Export</h3>
          <p style="font-size: 14px; margin-bottom: 10px;">Export all gardens into a .zip archive.</p>
          <button id="export-all-btn" class="eruda-button">Export All Gardens</button>
          <hr style="border: none; border-top: 1px solid #444; margin: 25px 0;">
          <h3 style="color: #E5C07B;">Import</h3>
          <p style="font-size: 14px; margin-bottom: 10px;">Import from a .zip archive. Overwrites existing files.</p>
          <button id="import-all-btn" class="eruda-button">Import from .zip</button>
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
      
      this._$exportBtn = $el.find('#export-all-btn');
      this._$importBtn = $el.find('#import-all-btn');
      this._$fileInput = $el.find('#import-file-input');

      // Export: Simple, non-blocking, logs to console.
      this._$exportBtn.on('click', async () => {
        console.log('Starting export of all gardens...');
        try {
          await exportAllGardens(console.log);
          console.log('%cExport completed successfully.', 'color: #4EC9B0; font-weight: bold;');
        } catch (e) {
          console.error('Export failed:', e);
        }
      });
      
      this._$importBtn.on('click', () => {
        this._$fileInput[0].click();
      });
      
      // Import: Uses a modal that persists on error.
      this._$fileInput.on('change', async () => {
        const file = this._$fileInput[0].files[0];
        if (!file) return;

        const modal = new Modal({ title: 'Import in Progress' });
        modal.show(`Reading ${file.name}...`);
        
        let progressHTML = '';
        try {
          await importFromZip(file, (msg) => {
            progressHTML += `${msg}<br>`;
            modal.updateContent(progressHTML);
          });
          // On success, importFromZip reloads the page, so the modal is destroyed automatically.
        } catch (e) {
          console.error('Import failed:', e);
          modal.updateContent(`<strong>Error during import:</strong><br>${e.message}`);
          modal.addFooterButton('Close', () => modal.destroy());
        }
      });
    },
    show() { this._$el.show(); },
    hide() { this._$el.hide(); },
  });

  return dataTool;
}
