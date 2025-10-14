class AiTool {
  constructor(eruda) {
    this.eruda = eruda;
    this._$el = null;
  }

  add() {
    this.eruda.add({
      name: 'AI',
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
            <input type="text" id="gemini-model-name" class="eruda-input flex-grow" placeholder="e.g., gemini-1.5-flash">
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
  }

  _bindEvents() {
    const $el = this._$el;
    const apiKeyInput = $el.find('#gemini-api-key')[0];
    const modelNameInput = $el.find('#gemini-model-name')[0];
    const proxyUrlInput = $el.find('#proxy-url')[0];
    const saveBtn = $el.find('#ai-save-config')[0];

    apiKeyInput.value = localStorage.getItem('thoughtform_gemini_api_key') || '';
    modelNameInput.value = localStorage.getItem('thoughtform_gemini_model_name') || 'gemini-1.5-flash';
    proxyUrlInput.value = localStorage.getItem('thoughtform_proxy_url') || '';

    const saveConfig = () => this._handleSaveConfig();

    apiKeyInput.addEventListener('input', saveConfig);
    modelNameInput.addEventListener('input', saveConfig);
    proxyUrlInput.addEventListener('input', saveConfig);
    saveBtn.addEventListener('click', saveConfig);
  }

  _handleSaveConfig() {
    const $el = this._$el;
    const apiKey = $el.find('#gemini-api-key')[0].value.trim();
    const modelName = $el.find('#gemini-model-name')[0].value.trim() || 'gemini-1.5-flash';
    const proxyUrl = $el.find('#proxy-url')[0].value.trim();
    
    localStorage.setItem('thoughtform_gemini_api_key', apiKey);
    localStorage.setItem('thoughtform_gemini_model_name', modelName);
    localStorage.setItem('thoughtform_proxy_url', proxyUrl);
    
    window.thoughtform.ai?.loadConfig();

    const saveStatus = $el.find('#ai-save-status')[0];
    saveStatus.textContent = 'Configuration saved!';
    setTimeout(() => { saveStatus.textContent = ''; }, 3000);
  }
}

export function addAiTool(eruda) {
  new AiTool(eruda).add();
}