import { CreateWebWorkerMLCEngine } from "@mlc-ai/web-llm";

// --- Singleton Engine Management ---
let engine;
let currentModelId;

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

  const engineConfig = {
    initProgressCallback: (progress) => {
      const report = {
        progress: progress.progress,
        text: `Loading: ${progress.text.replace("[Unity]", "")}`
      };
      progressCallback(report);
    }
  };

  engine = await CreateWebWorkerMLCEngine(worker, modelId, engineConfig);
  
  currentModelId = modelId;
}

/**
 * The main function, matching the interface of our other AI models.
 * @param {string} modelId - The model to use.
 * @param {string} prompt - The user's prompt.
 * @param {AbortSignal} signal - An AbortSignal to allow cancelling the request.
 * @param {function} progressCallback - Callback for initialization progress.
 * @returns {ReadableStream} A stream of text chunks from the AI.
 */
export async function streamChatCompletion(modelId, prompt, signal, progressCallback) {
  if (!engine || currentModelId !== modelId) {
    await initializeEngine(modelId, progressCallback);
  }

  if (signal.aborted) throw new DOMException('Request aborted', 'AbortError');

  console.log('[DEBUG] Prompt being sent to WebLLM:', { prompt });

  const chunks = await engine.chat.completions.create({
    stream: true,
    messages: [{ role: 'user', content: prompt }],
  });

  // --- THIS IS THE CORRECTED IMPLEMENTATION ---
  // We adapt the AsyncGenerator (`chunks`) returned by WebLLM into a standard ReadableStream.
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of chunks) {
          const text = chunk.choices[0]?.delta.content;
          if (text) {
            console.log(`[DEBUG] WebLLM chunk received: "${text}"`);
            controller.enqueue(text);
          }
        }
        console.log('[DEBUG] WebLLM stream finished.');
        controller.close();
      } catch (e) {
        console.error('[DEBUG] Error while reading from WebLLM stream:', e);
        controller.error(e);
      }
    }
  });
  // --- END OF CORRECTION ---
}