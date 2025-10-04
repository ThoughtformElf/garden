const http = require('http');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const url = require('url');
const axios = require('axios');
const puppeteer = require('puppeteer');

// A simple in-memory cache to avoid re-fetching the same URL multiple times in a short period.
const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function fetchAndParse(targetUrl) {
  if (cache.has(targetUrl)) {
    const entry = cache.get(targetUrl);
    if (Date.now() - entry.timestamp < CACHE_TTL) {
      console.log(`[Proxy] Cache HIT for: ${targetUrl}`);
      return entry.content;
    }
    cache.delete(targetUrl);
  }

  // --- Attempt 1: Lightweight Fetch with Axios ---
  try {
    console.log(`[Proxy] Attempting lightweight fetch: ${targetUrl}`);
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });
    const html = response.data;

    const dom = new JSDOM(html, { url: targetUrl });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.textContent) {
      throw new Error('Readability could not extract content via lightweight fetch.');
    }
    
    const cleanedText = article.textContent.replace(/\s{2,}/g, ' ').trim();
    const content = `Title: ${article.title}\nBy: ${article.byline || 'Unknown'}\n\n${cleanedText}`;
    
    cache.set(targetUrl, { content, timestamp: Date.now() });
    console.log(`[Proxy] Lightweight fetch successful for: ${targetUrl}`);
    return content;

  } catch (error) {
    // Check if the error is a signal that we're being blocked by a bot detector
    if (error.response && (error.response.status === 429 || error.response.status === 403)) {
      console.warn(`[Proxy] Lightweight fetch failed with status ${error.response.status}. Escalating to headless browser.`);
      // If it's a block, we don't return; we proceed to the heavyweight method.
    } else {
      // If it's a different error (404, 500, network timeout, etc.), it's a "hard fail".
      // Puppeteer won't help, so we fail fast.
      let errorMessage = error.message;
      if (error.response && error.response.status) {
          errorMessage = `Request failed with status ${error.response.status}`;
      }
      console.error(`[Proxy] Lightweight fetch failed permanently for "${targetUrl}":`, errorMessage);
      return `Error: Could not retrieve content from ${targetUrl}. Reason: ${errorMessage}`;
    }
  }

  // --- Attempt 2: Heavyweight Fetch with Puppeteer (Fallback) ---
  console.log(`[Proxy] Fetching with headless browser: ${targetUrl}`);
  let browser = null;
  try {
    browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36');
    
    await page.goto(targetUrl, { waitUntil: 'networkidle2' });

    const html = await page.content();

    const dom = new JSDOM(html, { url: targetUrl });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.textContent) {
      throw new Error('Readability could not extract content after browser load.');
    }

    const cleanedText = article.textContent.replace(/\s{2,}/g, ' ').trim();
    const content = `Title: ${article.title}\nBy: ${article.byline || 'Unknown'}\n\n${cleanedText}`;
    
    cache.set(targetUrl, { content, timestamp: Date.now() });
    console.log(`[Proxy] Headless browser fetch successful for: ${targetUrl}`);
    return content;

  } catch (error) {
    let errorMessage = error.message;
    console.error(`[Proxy] Headless browser fetch failed for "${targetUrl}":`, errorMessage);
    return `Error: Could not retrieve content from ${targetUrl}. Reason: ${errorMessage}`;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

const server = http.createServer(async (req, res) => {
  // --- CORS Headers ---
  res.setHeader('Access-Control-Allow-Origin', '*'); // Allow any origin
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  
  if (parsedUrl.pathname === '/') {
    const targetUrl = parsedUrl.query.url;

    if (!targetUrl) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing "url" query parameter.' }));
      return;
    }

    try {
      const content = await fetchAndParse(targetUrl);
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(content);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to process the request.', details: e.message }));
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

const PORT = 8082; // Using a different port to avoid conflicts
server.listen(PORT, () => {
  console.log(`[Proxy] Local proxy server running on http://localhost:${PORT}`);
  console.log('[Proxy] This server has NO allowlist and will fetch from ANY URL.');
});