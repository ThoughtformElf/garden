// src/devtools/data-tool.js
import { exportGardens, getGardensFromZip, importGardensFromZip, deleteGardens, resetDefaultSettings } from './data.js';
import { Modal } from '../util/modal.js';

function createSelectionUI(title, items, allChecked = true) {
  const itemCheckboxes = items.map(item => `
    <label>
      <input type="checkbox" class="garden-select-checkbox" value="${item}" ${allChecked ? 'checked' : ''}>
      <span>${item}</span>
    </label>
  `).join('');

  return `
    <div>
      <p>${title}</p>
      <div>
        <button type="button" class="select-all-btn">Select All</button>
        <button type="button" class="select-none-btn">Deselect All</button>
      </div>
      <div class="garden-selection-list">
        ${itemCheckboxes}
      </div>
    </div>
  `;
}

class DataTool {
  constructor(eruda) {
    this.eruda = eruda;
    this._$el = null;
  }

  add() {
    this.eruda.add({
      name: 'Data',
      init: ($el) => {
        this._$el = $el;
        this._render();
        this._bindEvents();
      },
      show: () => this._$el.show(),
      hide: () => this._$el.hide(),
    });
  }

  _render() {
    this._$el.html(`
      <div>
        <h2>Data Portability</h2>
        <button id="export-btn" class="eruda-button">Export...</button>
        <button id="import-btn" class="eruda-button">Import...</button>
        <input type="file" id="import-file-input" accept=".zip" style="display: none;">

        <hr>
        
        <h2>Maintenance</h2>
        <button id="update-app-btn" class="eruda-button">Update Application</button>
        <button id="reset-settings-btn" class="eruda-button">Reset Default Settings...</button>
        
        <hr>

        <h2>Danger Zone</h2>
        <p>
          <button id="clear-data-btn" class="eruda-button destructive">Clear Data...</button>
        </p>
      </div>
    `);
  }

  _bindEvents() {
    const $el = this._$el;
    $el.find('#export-btn')[0].addEventListener('click', () => this._handleExport());
    $el.find('#import-btn')[0].addEventListener('click', () => $el.find('#import-file-input')[0].click());
    $el.find('#import-file-input')[0].addEventListener('change', (e) => this._handleFileSelect(e));
    $el.find('#clear-data-btn')[0].addEventListener('click', () => this._handleClearData());
    $el.find('#reset-settings-btn')[0].addEventListener('click', () => this._handleResetSettings());
    $el.find('#update-app-btn')[0].addEventListener('click', () => this._handleAppUpdate());
  }

  _handleAppUpdate() {
    const updateCheckFn = window.thoughtform.updateApp;
    if (!updateCheckFn) {
        const errModal = new Modal({ title: 'Error' });
        errModal.updateContent('<p>Update check function is not available. The PWA module may not have loaded correctly.</p>');
        errModal.addFooterButton('Close', () => errModal.destroy());
        errModal.show();
        return;
    }

    const progressModal = new Modal({ title: 'Checking for Updates...' });
    progressModal.updateContent('<p>Contacting server for the latest version...</p>');
    progressModal.show();
    
    let updateFound = false;
    
    const originalOnNeedRefresh = updateCheckFn.onNeedRefresh;
    if (originalOnNeedRefresh) {
        updateCheckFn.onNeedRefresh = () => {
            updateFound = true;
            progressModal.destroy();
            originalOnNeedRefresh();
        };
    }

    updateCheckFn();

    setTimeout(() => {
        if (!updateFound) {
            progressModal.updateContent('<p>No new update found. You are on the latest version.</p>');
            progressModal.clearFooter();
            progressModal.addFooterButton('Close', () => progressModal.destroy());
        }
        if (updateCheckFn.onNeedRefresh !== originalOnNeedRefresh) {
           updateCheckFn.onNeedRefresh = originalOnNeedRefresh;
        }
    }, 5000);
  }

  async _handleResetSettings() {
    const confirmed = await Modal.confirm({
      title: 'Reset Default Settings?',
      message: `This will overwrite the default configuration and hook files in your 'Settings' garden with the latest versions from the application. <br><br><strong>Your custom scripts and other files will not be affected.</strong>`,
      okText: 'Reset Files'
    });

    if (!confirmed) return;

    const progressModal = new Modal({ title: 'Restoring Settings...' });
    let progressHTML = '';
    const logCallback = (msg) => {
      console.log(`[Settings Reset] ${msg}`);
      progressHTML += `<div>${msg}</div>`;
      progressModal.updateContent(`<div style="font-family: monospace; max-height: 300px; overflow-y: auto;">${progressHTML}</div>`);
    };
    
    progressModal.show();
    await resetDefaultSettings(logCallback);
  }

  _handleExport() {
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

        progressModal.addFooterButton('Cancel', () => {
            cancelled = true;
            progressModal.destroy();
        });

        progressModal.show();

        try {
            await exportGardens(selectedGardens, (msg) => {
                if (cancelled) throw new Error('Export cancelled by user.');
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
                progressModal.clearFooter();
                progressModal.updateContent(`<p style="color: #F44747;"><strong>Export Failed</strong><br>${e.message}</p>`);
                progressModal.addFooterButton('Close', () => progressModal.destroy());
            }
        }
    };
    
    modal.addFooterButton('Export Selected', exportHandler);
    modal.addFooterButton('Cancel', () => modal.destroy());
    modal.show();
  }

  async _handleFileSelect(event) {
    const fileInput = event.target;
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
                modal.updateContent(`<strong>Error during import:</strong><br>${e.message}`);
                modal.addFooterButton('Close', () => modal.destroy());
            }
        };
        
        modal.addFooterButton('Import Selected', importHandler);
        modal.addFooterButton('Cancel', () => modal.destroy());
    } catch (e) {
        modal.updateContent(`<strong>Error:</strong> Could not read the zip file.<br>${e.message}`);
        modal.addFooterButton('Close', () => modal.destroy());
    } finally {
        fileInput.value = '';
    }
  }

  _handleClearData() {
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
            modal.updateContent(`<strong>Error during deletion:</strong><br>${e.message}`);
            const closeBtn = modal.addFooterButton('Close', () => modal.destroy());
            closeBtn.classList.add('destructive');
        }
    };

    const deleteBtn = modal.addFooterButton('Delete Selected', deleteHandler);
    deleteBtn.classList.add('destructive');
    modal.addFooterButton('Cancel', () => modal.destroy());
    modal.show();
  }
}

export function addDataTool(eruda) {
  new DataTool(eruda).add();
}