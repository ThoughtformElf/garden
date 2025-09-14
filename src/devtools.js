// src/devtools.js
import eruda from 'eruda';
import { exportAllGardens, importFromZip } from './data-portability.js';

export function initializeDevTools() {
  const el = document.getElementById('eruda-container');
  if (!el) return;

  eruda.init({
    container: el,
    tool: ['console', 'elements', 'network', 'resources'],
    inline: true,
    useShadowDom: false,
  });

  // --- Create the custom "Data" tab ---
  const dataTool = eruda.add({
    name: 'Data',
    init($el) {
      this._$el = $el;
      $el.html(`
        <div style="padding: 10px; font-family: Arial, sans-serif; color: #ccc; height: 100%; overflow-y: auto;">
          <h2 style="margin-top:0; border-bottom: 1px solid #555; padding-bottom: 5px;">Data Portability</h2>
          
          <div id="data-portability-controls">
            <h3 style="color: #E5C07B;">Export</h3>
            <p style="font-size: 14px; margin-bottom: 10px;">Export all gardens and files into a single .zip archive.</p>
            <button id="export-all-btn" class="eruda-button">Export All Gardens</button>
            
            <hr style="border: none; border-top: 1px solid #444; margin: 25px 0;">
            
            <h3 style="color: #E5C07B;">Import</h3>
            <p style="font-size: 14px; margin-bottom: 10px;">Import gardens from a .zip archive. This will overwrite any existing files with the same name.</p>
            <button id="import-all-btn" class="eruda-button">Import from .zip</button>
            <input type="file" id="import-file-input" accept=".zip" style="display: none;">
          </div>
        </div>
        <style>
          .eruda-button { 
            padding: 8px 12px; background-color: #4EC9B0; color: #111; 
            border: none; border-radius: 3px; cursor: pointer; font-weight: bold;
            font-size: 14px;
          }
          .eruda-button:hover { background-color: #5FDCC4; }
        </style>
      `);
      
      this._$exportBtn = $el.find('#export-all-btn');
      this._$importBtn = $el.find('#import-all-btn');
      this._$fileInput = $el.find('#import-file-input');

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
      
      this._$fileInput.on('change', async () => {
        // FIX: Directly access the files from the input element itself, not the event object.
        const file = this._$fileInput[0].files[0];
        if (!file) return;

        console.log(`Importing from file: ${file.name}`);
        try {
          await importFromZip(file, console.log);
        } catch (e) {
          console.error('Import failed:', e);
        }
      });
    },
    show() { this._$el.show(); },
    hide() { this._$el.hide(); },
  });

  return dataTool;
}
