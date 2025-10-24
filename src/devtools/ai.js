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
        
        <div class="sync-panel" style="margin-bottom: 15px;">
            <h3>Active Provider</h3>
            <div class="sync-row">
                <select id="ai-active-provider" class="eruda-select" style="width: 100%;">
                    <option value="gemini">Google Gemini</option>
                    <option value="custom">Custom OpenAI-Compatible</option>
                </select>
            </div>
        </div>

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
          <h3>Custom OpenAI-Compatible Provider</h3>
           <div class="sync-row" style="margin-bottom: 10px;">
            <label for="custom-endpoint-url" class="sync-label">Endpoint URL:</label>
            <input type="text" id="custom-endpoint-url" class="eruda-input flex-grow" placeholder="http://localhost:11434/v1 (default)">
          </div>
          <div class="sync-row" style="margin-bottom: 10px;">
            <label for="custom-model-name" class="sync-label">Model Name:</label>
            <input type="text" id="custom-model-name" class="eruda-input flex-grow" placeholder="e.g., llama3 (required)">
          </div>
          <div class="sync-row">
            <label for="custom-api-key" class="sync-label">API Key (Optional):</label>
            <input type="password" id="custom-api-key" class="eruda-input flex-grow">
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

    // --- Input Elements ---
    const activeProviderSelect = $el.find('#ai-active-provider')[0];
    const geminiApiKeyInput = $el.find('#gemini-api-key')[0];
    const geminiModelNameInput = $el.find('#gemini-model-name')[0];
    const customEndpointUrlInput = $el.find('#custom-endpoint-url')[0];
    const customModelNameInput = $el.find('#custom-model-name')[0];
    const customApiKeyInput = $el.find('#custom-api-key')[0];
    const proxyUrlInput = $el.find('#proxy-url')[0];
    const saveBtn = $el.find('#ai-save-config')[0];

    // --- Load Saved Values ---
    activeProviderSelect.value = localStorage.getItem('thoughtform_ai_provider') || 'gemini';
    geminiApiKeyInput.value = localStorage.getItem('thoughtform_gemini_api_key') || '';
    geminiModelNameInput.value = localStorage.getItem('thoughtform_gemini_model_name') || 'gemini-2.5-flash';
    customEndpointUrlInput.value = localStorage.getItem('thoughtform_custom_endpoint_url') || '';
    customModelNameInput.value = localStorage.getItem('thoughtform_custom_model_name') || '';
    customApiKeyInput.value = localStorage.getItem('thoughtform_custom_api_key') || '';
    proxyUrlInput.value = localStorage.getItem('thoughtform_proxy_url') || '';

    // --- Event Listeners ---
    const saveConfig = () => this._handleSaveConfig();
    
    // Auto-save on input change for a smoother experience
    activeProviderSelect.addEventListener('change', saveConfig);
    geminiApiKeyInput.addEventListener('input', saveConfig);
    geminiModelNameInput.addEventListener('input', saveConfig);
    customEndpointUrlInput.addEventListener('input', saveConfig);
    customModelNameInput.addEventListener('input', saveConfig);
    customApiKeyInput.addEventListener('input', saveConfig);
    proxyUrlInput.addEventListener('input', saveConfig);
    saveBtn.addEventListener('click', saveConfig);
  }

  _handleSaveConfig() {
    const $el = this._$el;

    // --- Read Values from DOM ---
    const activeProvider = $el.find('#ai-active-provider')[0].value;
    const geminiApiKey = $el.find('#gemini-api-key')[0].value.trim();
    const geminiModelName = $el.find('#gemini-model-name')[0].value.trim() || 'gemini-2.5-flash';
    const customEndpointUrl = $el.find('#custom-endpoint-url')[0].value.trim();
    const customModelName = $el.find('#custom-model-name')[0].value.trim();
    const customApiKey = $el.find('#custom-api-key')[0].value.trim();
    const proxyUrl = $el.find('#proxy-url')[0].value.trim();
    
    // --- Save to localStorage ---
    localStorage.setItem('thoughtform_ai_provider', activeProvider);
    localStorage.setItem('thoughtform_gemini_api_key', geminiApiKey);
    localStorage.setItem('thoughtform_gemini_model_name', geminiModelName);
    localStorage.setItem('thoughtform_custom_endpoint_url', customEndpointUrl);
    localStorage.setItem('thoughtform_custom_model_name', customModelName);
    localStorage.setItem('thoughtform_custom_api_key', customApiKey);
    localStorage.setItem('thoughtform_proxy_url', proxyUrl);
    
    // --- Reload Config in AiService ---
    window.thoughtform.ai?.loadConfig();

    // --- Show Feedback ---
    const saveStatus = $el.find('#ai-save-status')[0];
    saveStatus.textContent = 'Configuration saved!';
    setTimeout(() => { saveStatus.textContent = ''; }, 3000);
  }
}

export function addAiTool(eruda) {
  new AiTool(eruda).add();
}