/*
Description:
Performs a web search using the key-less HTML version of DuckDuckGo to find up-to-date information or answer general knowledge questions. This tool is ideal for discovering URLs and getting summaries of information on the internet.

**IMPORTANT**: Use this tool to *discover* information and URLs. After you have identified a promising URL from the search results, you MUST use the `readURL` tool in a subsequent step to read the full content of that specific page.

Arguments:
- query: The search query string. Be specific and concise.

Example Call (in JSON format):
{
  "query": "latest advancements in artificial intelligence"
}
*/

// Module-level variable to track the last request time for throttling.
let lastRequestTime = 0;

if (!args.query) {
  return "Error: A 'query' argument is required.";
}

const { onProgress } = context;
const { query } = args;

const proxyBaseUrl = localStorage.getItem('thoughtform_proxy_url')?.trim();
const cooldown = 1000; // Hardcode to 1 second (1000ms)

if (!proxyBaseUrl) {
  return "Error: The Content Proxy URL is not set. This is required to make web requests. Please configure it in the AI dev tools panel.";
}

if (onProgress) onProgress(`Searching the web for: "${query}"`);

try {
  // --- Throttling Logic ---
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < cooldown) {
    const waitTime = cooldown - timeSinceLastRequest;
    if (onProgress) onProgress(`Throttling request... waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  lastRequestTime = Date.now();
  // --- End Throttling ---

  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  // --- THIS IS THE FIX (Part 1) ---
  // Add `forceheadless=true` to ensure the proxy uses Puppeteer, which is less likely to be blocked.
  const proxyUrl = `${proxyBaseUrl}?thoughtformgardenproxy=${encodeURIComponent(searchUrl)}&forceheadless=true`;

  const response = await fetch(proxyUrl);
  const htmlText = await response.text();
  
  // --- THIS IS THE DEBUGGING IMPROVEMENT ---
  console.log('[webSearch Tool] Raw HTML received from proxy:', htmlText);

  if (!response.ok) {
    return `Error: Web search request via proxy failed with status ${response.status}. Details: ${htmlText}`;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, 'text/html');
  const results = doc.querySelectorAll('.result');
  
  if (results.length === 0) {
    // Check if the page is a "no results" page explicitly
    if (htmlText.includes("No results found")) {
        return "No search results found for that query.";
    }
    // If there are no results but it's not an explicit "no results" page, it's likely a block/error.
    return "Error: Failed to parse search results. The page structure may have changed or the request was blocked.";
  }

  let formattedResults = "Here are the top search results:\n\n";
  let count = 0;
  results.forEach((result) => {
    if (count >= 5) return; // Limit to top 5 results
    const titleEl = result.querySelector('.result__a');
    const snippetEl = result.querySelector('.result__snippet');
    
    if (titleEl && snippetEl) {
      const title = titleEl.textContent.trim();
      const rawUrl = titleEl.href;
      const snippet = snippetEl.textContent.trim();
      
      const urlParams = new URLSearchParams(new URL(rawUrl).search);
      const cleanUrl = urlParams.get('uddg');

      if (cleanUrl) {
        count++;
        formattedResults += `${count}. [${title}](${decodeURIComponent(cleanUrl)})\n`;
        formattedResults += `   - Snippet: ${snippet}\n\n`;
      }
    }
  });

  if (count === 0) {
      return "Error: Parsed search results but could not extract any valid links.";
  }

  if (onProgress) onProgress(`Found and parsed ${count} results.`);
  return formattedResults;

} catch (e) {
  if (onProgress) onProgress(`An error occurred while searching the web.`);
  // Also log the full error to the console for easier debugging
  console.error('[webSearch Tool] Exception caught:', e);
  return `Error: An exception occurred while trying to perform the web search: ${e.message}`;
}