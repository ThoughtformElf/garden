// src/devtools/devtools.js
import { exportGardens, getGardensFromZip, importGardensFromZip, deleteGardens, resetDefaultSettings } from './data.js';
import { Modal } from '../util/modal.js';
import eruda from 'eruda';
import { Sync } from './sync/index.js';

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

export function initializeDevTools() {
  const el = document.getElementById('eruda-container');
  if (!el) return;

  eruda.init({
    container: el,
    tool: ['console', 'elements', 'network', 'resources'],
    inline: true,
    useShadowDom: false,
  });

  const consoleTool = eruda.get('console');
  if (consoleTool) {
    consoleTool.config.set('maxLogNum', 2000);
  }

  if (window.thoughtform) {
    window.thoughtform.eruda = eruda;
  }

  setTimeout(() => {
    const navBar = el.querySelector('.luna-tab-item')?.parentElement;
    if (navBar) {
      navBar.addEventListener('click', (e) => {
        const tabItem = e.target.closest('.luna-tab-item');
        if (tabItem) {
          const tabName = tabItem.innerText.toLowerCase();
          window.thoughtform.ui.toggleDevtools?.(true, tabName);
        }
      });
    }
  }, 500);

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
  
  const dataTool = eruda.add({
    name: 'Data',
    init($el) {
      this._$el = $el;
      $el.html(`
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
      
      const exportBtn = $el.find('#export-btn')[0];
      const importBtn = $el.find('#import-btn')[0];
      const fileInput = $el.find('#import-file-input')[0];
      const clearDataBtn = $el.find('#clear-data-btn')[0];
      const resetSettingsBtn = $el.find('#reset-settings-btn')[0];
      const updateAppBtn = $el.find('#update-app-btn')[0];

      updateAppBtn.addEventListener('click', () => {
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
      });

      resetSettingsBtn.addEventListener('click', async () => {
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
      });

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

            progressModal.show();

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
        modal.show();
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
        modal.show();
      });
    },
    show() { this._$el.show(); },
    hide() { this._$el.hide(); },
  });

  const syncTool = eruda.add({
    name: 'Sync',
    init($el) {
      this.sync = new Sync();
      this.sync.init($el.get(0));
    },
    show() {
      this.sync.show();
    },
    hide() {
      this.sync.hide();
    },
    destroy() {
      this.sync.destroy();
    }
  });

  const aiTool = eruda.add({
    name: 'AI',
    init($el) {
      this._$el = $el;
      $el.html(`
        <div style="padding: 10px;">
          <h2>AI Configuration</h2>
          <div class="sync-panel">
            <h3>Google Gemini</h3>
            <div class="sync-row" style="margin-bottom: 10px;">
              <label for="gemini-api-key" class="sync-label">API Key:</label>
              <input type="password" id="gemini-api-key" class="eruda-input flex-grow">
            </div>
            <div class="sync-row">
              <label for="gemini-model-name" class="sync-label">Model Name:</label>
              <input type="text" id="gemini-model-name" class="eruda-input flex-grow" placeholder="e.g., gemini-2.5-flash">
            </div>
          </div>
          <div class="sync-panel" style="margin-top: 15px;">
            <h3>Content Proxy</h3>
            <div class="sync-row">
              <label for="proxy-url" class="sync-label">Proxy URL:</label>
              <input type="text" id="proxy-url" class="eruda-input flex-grow" placeholder="https://proxy.thoughtform.garden">
            </div>
          </div>
          <button id="ai-save-config" class="eruda-button" style="margin-top: 15px;">Save</button>
          <div id="ai-save-status" style="margin-top: 10px; color: var(--base-accent-action);"></div>
        </div>
      `);

      const apiKeyInput = $el.find('#gemini-api-key')[0];
      const modelNameInput = $el.find('#gemini-model-name')[0];
      const proxyUrlInput = $el.find('#proxy-url')[0];
      const saveBtn = $el.find('#ai-save-config')[0];
      const saveStatus = $el.find('#ai-save-status')[0];

      apiKeyInput.value = localStorage.getItem('thoughtform_gemini_api_key') || '';
      modelNameInput.value = localStorage.getItem('thoughtform_gemini_model_name') || 'gemini-2.5-flash';
      proxyUrlInput.value = localStorage.getItem('thoughtform_proxy_url') || '';

      const saveConfig = () => {
        const apiKey = apiKeyInput.value.trim();
        const modelName = modelNameInput.value.trim() || 'gemini-2.5-flash';
        const proxyUrl = proxyUrlInput.value.trim();
        
        localStorage.setItem('thoughtform_gemini_api_key', apiKey);
        localStorage.setItem('thoughtform_gemini_model_name', modelName);
        localStorage.setItem('thoughtform_proxy_url', proxyUrl);
        
        window.thoughtform.ai?.loadConfig();

        saveStatus.textContent = 'Configuration saved!';
        setTimeout(() => { saveStatus.textContent = ''; }, 3000);
      };

      apiKeyInput.addEventListener('input', saveConfig);
      modelNameInput.addEventListener('input', saveConfig);
      proxyUrlInput.addEventListener('input', saveConfig);
      
      saveBtn.addEventListener('click', saveConfig);
    },
    show() { this._$el.show(); },
    hide() { this._$el.hide(); },
  });

  return eruda;
}