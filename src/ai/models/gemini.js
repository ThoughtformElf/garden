/**
 * Communicates with the Google Gemini API to get a streaming chat completion.
 * @param {string} apiKey - The Google Gemini API key.
 * @param {string} modelName - The name of the model to use.
 * @param {string} prompt - The user's prompt.
 * @param {AbortSignal} signal - An AbortSignal to allow cancelling the request.
 * @returns {ReadableStream} A stream of text chunks from the AI.
 */
export async function streamChatCompletion(apiKey, modelName, prompt, signal) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?key=${apiKey}&alt=sse`;

  const requestBody = {
    contents: [{
      parts: [{ text: prompt }]
    }]
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: signal, // Pass the signal to the fetch request
    });

    if (!response.ok) {
      const errorBody = await response.json();
      console.error('Gemini API Error:', errorBody);
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
          // Gemini's SSE format puts the JSON data after a "data: " prefix.
          // We split by lines and process each line that has this prefix.
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.substring(5).trim();
                const parsed = JSON.parse(jsonStr);
                const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  controller.enqueue(text);
                }
              } catch (e) {
                // Ignore parsing errors, might be an incomplete JSON object in a chunk
              }
            }
          }
        }
      },
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Gemini API request was cancelled by the user.');
    } else {
      console.error('Failed to fetch from Gemini API:', error);
    }
    throw error;
  }
}