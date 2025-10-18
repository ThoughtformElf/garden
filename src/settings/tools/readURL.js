/*
Description:
Reads the full text content from a single external URL. Use this tool when you have a specific webpage you need to investigate. It is simpler and more direct than `buildKnowledgeBase` for single pages.

Arguments:
- url: The full, valid URL of the webpage to read (e.g., "https://www.example.com").

Example Call (in JSON format):
{
  "url": "https://www.reddit.com/r/sometopic/comments/12345/some_post_title"
}
*/

if (!args.url || !args.url.startsWith('http')) {
  return "Error: A valid 'url' argument starting with http is required.";
}

const { onProgress } = context;
const { url } = args;

if (onProgress) onProgress(`Reading URL: ${url}`);

try {
    const baseUrl = localStorage.getItem('thoughtform_proxy_url')?.trim() || 'https://proxy.thoughtform.garden';
    const proxyUrl = `${baseUrl}?thoughtformgardenproxy=${encodeURIComponent(url)}`;
    
    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
        return `Error: Failed to fetch the URL. Status: ${response.status} ${response.statusText}`;
    }
    
    const content = await response.text();
    if (onProgress) onProgress('Successfully read URL content.');
    return content;

} catch (e) {
    if (onProgress) onProgress(`An error occurred while reading the URL.`);
    return `Error: An exception occurred while trying to fetch the URL: ${e.message}`;
}