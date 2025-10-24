/**
 * Communicates with an OpenAI-compatible API to get a streaming chat completion.
 * @param {string} endpoint - The base URL of the API endpoint (e.g., "http://localhost:11434/v1").
 * @param {string} apiKey - The API key (can be optional for local models).
 * @param {string} modelName - The name of the model to use.
 * @param {string} prompt - The user's prompt.
 * @param {AbortSignal} signal - An AbortSignal to allow cancelling the request.
 * @returns {ReadableStream} A stream of text chunks from the AI.
 */
export async function streamChatCompletion(endpoint, apiKey, modelName, prompt, signal) {
  // Ensure the endpoint doesn't end with a slash to avoid double slashes
  const cleanEndpoint = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
  const url = `${cleanEndpoint}/chat/completions`;

  const requestBody = {
    model: modelName,
    messages: [{
      role: 'user',
      content: prompt
    }],
    stream: true
  };

  const headers = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody),
      signal: signal,
    });

    if (!response.ok) {
      // Try to get a more detailed error message from the body
      const errorBody = await response.json().catch(() => ({ error: { message: response.statusText } }));
      console.error('OpenAI-Compatible API Error:', errorBody);
      throw new Error(`API request failed: ${errorBody.error?.message || response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    return new ReadableStream({
      async pull(controller) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.substring(5).trim();
              if (jsonStr === '[DONE]') {
                // OpenAI-like APIs send a [DONE] message to signal the end.
                continue;
              }
              try {
                const parsed = JSON.parse(jsonStr);
                const text = parsed?.choices?.[0]?.delta?.content;
                if (text) {
                  controller.enqueue(text);
                }
              } catch (e) {
                // Ignore parsing errors for incomplete JSON objects in a chunk
              }
            }
          }
        }
      },
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('OpenAI-Compatible API request was cancelled by the user.');
    } else {
      console.error('Failed to fetch from OpenAI-Compatible API:', error);
    }
    throw error;
  }
}