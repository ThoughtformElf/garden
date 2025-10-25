import { CreateWebWorkerMLCEngine } from "@mlc-ai/web-llm";

// --- Singleton Engine Management ---
let engine;
let currentModelId;

// --- THIS IS THE DEFINITIVE FIX ---
// This helper function manually requests a WebGPU device with f16 support if available.
// This is what the official WebLLM demo does and is crucial for performance.
async function getWebGPUDevice() {
  if (!navigator.gpu) {
    console.warn("WebGPU is not supported in this browser.");
    return null;
  }
  
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    console.warn("Failed to get GPU adapter.");
    return null;
  }

  const supportedFeatures = Array.from(adapter.features.values());
  console.log("[WebLLM] Supported WebGPU Features:", supportedFeatures);

  if (supportedFeatures.includes("shader-f16")) {
    console.log("[WebLLM] shader-f16 is supported! Requesting device with f16 capabilities.");
    return await adapter.requestDevice({
      requiredFeatures: ["shader-f16"],
    });
  } else {
    console.warn("[WebLLM] shader-f16 is not supported. Performance may be suboptimal. Falling back to default device.");
    return await adapter.requestDevice();
  }
}


/**
 * Initializes the WebLLM engine by creating a dedicated worker.
 * @param {string} modelId - The ID of the model to load.
 * @param {function} progressCallback - A function to report loading progress.
 */
export async function initializeEngine(modelId, progressCallback) {
  if (engine && currentModelId === modelId) {
    progressCallback({ progress: 1, text: `Model ${modelId} is already loaded.` });
    return;
  }

  if (engine) {
    progressCallback({ progress: 0, text: `Unloading previous model...` });
    await engine.unload();
  }
  
  const worker = new Worker(
    new URL('./web-llm-worker.js', import.meta.url), 
    { type: 'module' }
  );
  
  // Manually get the best possible WebGPU device.
  const webgpuDevice = await getWebGPUDevice();

  const engineConfig = {
    initProgressCallback: (progress) => {
      const report = {
        progress: progress.progress,
        text: `Loading: ${progress.text.replace("[Unity]", "")}`
      };
      progressCallback(report);
    }
  };
  
  // If we successfully got a device, pass it to the engine config.
  if (webgpuDevice) {
      engineConfig.webgpuDevice = webgpuDevice;
  }

  engine = await CreateWebWorkerMLCEngine(worker, modelId, engineConfig);
  
  currentModelId = modelId;
}

/**
 * Communicates with the WebLLM engine.
 * @returns {Promise<AsyncGenerator>} A promise that resolves to the generator of text chunks.
 */
export async function getChatCompletionGenerator(modelId, prompt, signal, progressCallback) {
  if (!engine || currentModelId !== modelId) {
    await initializeEngine(modelId, progressCallback);
  }

  if (signal.aborted) throw new DOMException('Request aborted', 'AbortError');

  // Return the generator directly
  return engine.chat.completions.create({
    stream: true,
    messages: [{ role: 'user', content: prompt }],
  });
}