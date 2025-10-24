import { prebuiltAppConfig } from "@mlc-ai/web-llm";

// Helper function to prevent excessive calls while typing.
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

class AiTool {
  constructor(eruda) {
    this.eruda = eruda;
    this._$el = null;
    this.debouncedSave = debounce(() => this._handleSaveConfig(), 300);
  }

  add() {
    this.eruda.add({
      name: 'AI',
      init: ($el) => {
        this._$el = $el;
        this._render();
        this._bindEvents();
      },
      show: () => {
        this._$el.show();
        this._loadAndRenderProviders();
      },
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
                <select id="ai-active-provider" class="eruda-select" style="width: 100%;"></select>
            </div>
        </div>

        <div class="sync-panel" style="margin-bottom: 15px;">
          <h3>WebLLM (In-Browser)</h3>
          <div class="sync-row" style="margin-bottom: 10px;">
            <label for="webllm-model-select" class="sync-label">Model:</label>
            <select id="webllm-model-select" class="eruda-select flex-grow">
              <!-- This will be populated dynamically -->
            </select>
          </div>
          <div class="sync-row">
            <button id="load-webllm-btn" class="eruda-button" style="width: 100%;">Load Model</button>
          </div>
          <div id="webllm-status" style="margin-top: 10px; color: var(--base-accent-info); font-size: 0.9em;">
            Status: Not loaded.
          </div>
        </div>

        <div class="sync-panel">
          <h3>Google Gemini (Built-in)</h3>
          <div class="sync-row" style="margin-bottom: 10px;">
            <label for="gemini-api-key" class="sync-label">API Key:</label>
            <input type="password" id="gemini-api-key" class="eruda-input flex-grow">
          </div>
          <div class="sync-row">
            <label for="gemini-model-name" class="sync-label">Model Name:</label>
            <input type="text" id="gemini-model-name" class="eruda-input flex-grow" placeholder="e.g., gemini-2.5-flash">
          </div>
        </div>
        
        <div id="custom-providers-container" style="margin-top: 15px;">
            <h3>Custom OpenAI-Compatible Providers</h3>
            <div id="custom-providers-list"></div>
            <button id="add-provider-btn" class="eruda-button" style="margin-top: 10px;">Add New Provider</button>
        </div>

        <div class="sync-panel" style="margin-top: 15px;">
          <h3>Content Proxy</h3>
          <div class="sync-row">
            <label for="proxy-url" class="sync-label">Proxy URL:</label>
            <input type="text" id="proxy-url" class="eruda-input flex-grow" placeholder="https://proxy.thoughtform.garden">
          </div>
        </div>
        <div id="ai-save-status" style="margin-top: 10px; color: var(--base-accent-action);"></div>
      </div>
    `);
  }
  
  _loadAndRenderProviders() {
      let providers = JSON.parse(localStorage.getItem('thoughtform_ai_providers_list') || '[]');
      const activeProvider = localStorage.getItem('thoughtform_ai_provider') || 'gemini';
      
      if (providers.length === 0) {
        providers.push({
          id: 'custom',
          endpoint: 'http://localhost:11434/v1',
          model: '',
          apiKey: ''
        });
      }

      const providerListContainer = this._$el.find('#custom-providers-list')[0];
      const activeProviderSelect = this._$el.find('#ai-active-provider')[0];

      providerListContainer.innerHTML = '';
      activeProviderSelect.innerHTML = `
        <option value="webllm">WebLLM (In-Browser)</option>
        <option value="gemini">Google Gemini</option>
      `;

      providers.forEach(provider => {
          const providerEl = this._createProviderElement(provider);
          providerListContainer.appendChild(providerEl);
          
          const option = document.createElement('option');
          option.value = provider.id;
          option.textContent = provider.id;
          activeProviderSelect.appendChild(option);
      });
      
      activeProviderSelect.value = activeProvider;
  }
  
  _createProviderElement(provider) {
    const el = document.createElement('div');
    el.className = 'sync-panel provider-instance';
    el.dataset.providerId = provider.id;
    el.innerHTML = `
      <div class="sync-row space-between" style="margin-bottom: 10px;">
        <label class="sync-label">Provider ID:</label>
        <input type="text" class="eruda-input flex-grow provider-id" value="${provider.id}" placeholder="e.g., local-ollama">
        <button class="eruda-button destructive provider-delete-btn" style="margin-left: 10px;">Delete</button>
      </div>
      <div class="sync-row" style="margin-bottom: 10px;">
        <label class="sync-label">Endpoint URL:</label>
        <input type="text" class="eruda-input flex-grow provider-endpoint" value="${provider.endpoint || ''}" placeholder="http://localhost:11434/v1 (default)">
      </div>
      <div class="sync-row" style="margin-bottom: 10px;">
        <label class="sync-label">Model Name:</label>
        <input type="text" class="eruda-input flex-grow provider-model" value="${provider.model || ''}" placeholder="e.g., llama3 (required)">
      </div>
      <div class="sync-row">
        <label class="sync-label">API Key:</label>
        <input type="password" class="eruda-input flex-grow provider-apikey" value="${provider.apiKey || ''}" placeholder="Optional">
      </div>
    `;
    return el;
  }

  _bindEvents() {
    const $el = this._$el;

    // --- NEW: DYNAMICALLY POPULATE WEBLMM MODELS ---
    const modelSelect = $el.find('#webllm-model-select')[0];
    const categorizedModels = {
      Llama: [], Phi: [], Gemma: [], Mistral: [], Qwen: [], Other: []
    };

    prebuiltAppConfig.model_list.forEach(model => {
      const id = model.model_id.toLowerCase();
      if (id.startsWith('llama')) categorizedModels.Llama.push(model);
      else if (id.startsWith('phi')) categorizedModels.Phi.push(model);
      else if (id.startsWith('gemma')) categorizedModels.Gemma.push(model);
      else if (id.startsWith('mistral') || id.includes('hermes')) categorizedModels.Mistral.push(model);
      else if (id.startsWith('qwen')) categorizedModels.Qwen.push(model);
      else categorizedModels.Other.push(model);
    });

    let selectHTML = '';
    for (const category in categorizedModels) {
      if (categorizedModels[category].length > 0) {
        selectHTML += `<optgroup label="${category}">`;
        categorizedModels[category].forEach(model => {
          selectHTML += `<option value="${model.model_id}">${model.model_id}</option>`;
        });
        selectHTML += `</optgroup>`;
      }
    }
    modelSelect.innerHTML = selectHTML;
    // --- END OF NEW LOGIC ---

    $el.find('#gemini-api-key')[0].value = localStorage.getItem('thoughtform_gemini_api_key') || '';
    $el.find('#gemini-model-name')[0].value = localStorage.getItem('thoughtform_gemini_model_name') || 'gemini-2.5-flash';
    $el.find('#proxy-url')[0].value = localStorage.getItem('thoughtform_proxy_url') || '';

    $el[0].addEventListener('input', (e) => {
        if (e.target.classList.contains('provider-id')) {
            const providerInstance = e.target.closest('.provider-instance');
            const newId = e.target.value.trim();
            const oldId = providerInstance.dataset.providerId;

            const activeProviderSelect = this._$el.find('#ai-active-provider')[0];
            const optionToUpdate = activeProviderSelect.querySelector(`option[value="${oldId}"]`);

            if (optionToUpdate) {
                const wasSelected = activeProviderSelect.value === oldId;
                optionToUpdate.value = newId;
                optionToUpdate.textContent = newId;
                if (wasSelected) {
                    activeProviderSelect.value = newId;
                }
            }
            providerInstance.dataset.providerId = newId;
        }

        if (e.target.tagName === 'INPUT') {
            this.debouncedSave();
        }
    });

    $el[0].addEventListener('change', (e) => {
        if (e.target.id === 'ai-active-provider' || e.target.id === 'webllm-model-select') {
            this._handleSaveConfig({ render: false });
        }
    });

    $el[0].addEventListener('click', (e) => {
        if (e.target.id === 'add-provider-btn') {
            const newProvider = { id: `new-provider-${crypto.randomUUID().slice(0, 4)}`, endpoint: '', model: '', apiKey: '' };
            const providerEl = this._createProviderElement(newProvider);
            $el.find('#custom-providers-list')[0].appendChild(providerEl);
            this._handleSaveConfig({ render: true });
        }
        if (e.target.classList.contains('provider-delete-btn')) {
            e.target.closest('.provider-instance').remove();
            this._handleSaveConfig({ render: true });
        }
    });

    const loadBtn = $el.find('#load-webllm-btn')[0];
    const statusEl = $el.find('#webllm-status')[0];
    
    modelSelect.value = localStorage.getItem('thoughtform_webllm_model_id') || 'Llama-3-8B-Instruct-q4f16_1-MLC';

    loadBtn.addEventListener('click', () => {
        const selectedModel = modelSelect.value;
        loadBtn.disabled = true;
        loadBtn.textContent = 'Loading...';
        
        const progressCallback = (report) => {
            const percentage = (report.progress * 100).toFixed(1);
            statusEl.textContent = `${report.text} (${percentage}%)`;
            if (report.progress >= 1) {
                loadBtn.disabled = false;
                loadBtn.textContent = 'Reload Model';
            }
        };
        window.thoughtform.ai.initializeWebLlmEngine(selectedModel, progressCallback);
    });
  }

  _handleSaveConfig({ render = false } = {}) {
    const $el = this._$el;

    localStorage.setItem('thoughtform_ai_provider', $el.find('#ai-active-provider')[0].value);
    localStorage.setItem('thoughtform_webllm_model_id', $el.find('#webllm-model-select')[0].value);
    localStorage.setItem('thoughtform_gemini_api_key', $el.find('#gemini-api-key')[0].value.trim());
    localStorage.setItem('thoughtform_gemini_model_name', $el.find('#gemini-model-name')[0].value.trim() || 'gemini-2.5-flash');
    localStorage.setItem('thoughtform_proxy_url', $el.find('#proxy-url')[0].value.trim());

    const providers = [];
    Array.from($el.find('.provider-instance')).forEach(el => {
        providers.push({
            id: el.querySelector('.provider-id').value.trim(),
            endpoint: el.querySelector('.provider-endpoint').value.trim(),
            model: el.querySelector('.provider-model').value.trim(),
            apiKey: el.querySelector('.provider-apikey').value.trim(),
        });
    });
    localStorage.setItem('thoughtform_ai_providers_list', JSON.stringify(providers));

    if (render) {
        this._loadAndRenderProviders();
    }
    
    window.thoughtform.ai?.loadConfig();

    const saveStatus = $el.find('#ai-save-status')[0];
    saveStatus.textContent = 'Configuration saved!';
    clearTimeout(this.saveStatusTimeout);
    this.saveStatusTimeout = setTimeout(() => { saveStatus.textContent = ''; }, 2000);
  }
}

export function addAiTool(eruda) {
  new AiTool(eruda).add();
}