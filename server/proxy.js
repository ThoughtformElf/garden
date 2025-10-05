const http = require('http');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const url = require('url');
const axios = require('axios');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000;

// Change this to something obscure
const SECRET_PARAM = 'thoughtformgardenproxy';

const args = process.argv.slice(2);
const isLocalMode = args.includes('--local');

function loadAllowlist() {
  const allowlistPath = path.join(__dirname, 'allowlist.txt');
  
  if (!fs.existsSync(allowlistPath)) {
    console.log('[Proxy] No allowlist.txt found');
    return null;
  }
  
  try {
    const content = fs.readFileSync(allowlistPath, 'utf-8');
    const domains = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .filter(line => !line.startsWith('#'))
      .map(line => line.toLowerCase());
    
    console.log(`[Proxy] Loaded ${domains.length} domains from allowlist`);
    return new Set(domains);
  } catch (error) {
    console.error('[Proxy] Error loading allowlist:', error);
    return null;
  }
}

const allowlist = isLocalMode ? null : loadAllowlist();

function isAllowedDomain(targetUrl) {
  if (isLocalMode || !allowlist) return true;
  
  try {
    const parsed = new URL(targetUrl);
    const hostname = parsed.hostname.toLowerCase();
    
    if (allowlist.has(hostname)) return true;
    
    for (const domain of allowlist) {
      if (hostname.endsWith('.' + domain) || hostname === domain) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

async function fetchAndParse(targetUrl) {
  if (cache.has(targetUrl)) {
    const entry = cache.get(targetUrl);
    if (Date.now() - entry.timestamp < CACHE_TTL) {
      console.log(`[Proxy] Cache HIT for: ${targetUrl}`);
      return entry.content;
    }
    cache.delete(targetUrl);
  }

  try {
    console.log(`[Proxy] Attempting lightweight fetch: ${targetUrl}`);
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 15000
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
    if (error.response && (error.response.status === 429 || error.response.status === 403)) {
      console.warn(`[Proxy] Lightweight fetch failed with status ${error.response.status}. Escalating to headless browser.`);
    } else {
      let errorMessage = error.message;
      if (error.response && error.response.status) {
          errorMessage = `Request failed with status ${error.response.status}`;
      }
      console.error(`[Proxy] Lightweight fetch failed permanently for "${targetUrl}":`, errorMessage);
      return `Error: Could not retrieve content from ${targetUrl}. Reason: ${errorMessage}`;
    }
  }

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
    
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });

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

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;

function checkRateLimit(ip) {
  if (isLocalMode) return true;
  
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
  
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + RATE_LIMIT_WINDOW;
    rateLimitMap.set(ip, record);
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  record.count++;
  rateLimitMap.set(ip, record);
  return true;
}

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
         req.headers['fly-client-ip'] ||
         req.headers['cf-connecting-ip'] ||
         req.headers['x-real-ip'] ||
         req.socket.remoteAddress;
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  
  if (parsedUrl.pathname === '/') {
    const clientIp = getClientIp(req);

    if (!checkRateLimit(clientIp)) {
      console.warn(`[Proxy] Rate limit exceeded for ${clientIp}`);
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }));
      return;
    }

    const targetUrl = parsedUrl.query[SECRET_PARAM];

    if (!targetUrl) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing required parameter.' }));
      return;
    }

    try {
      const parsedTarget = new URL(targetUrl);
      if (!['http:', 'https:'].includes(parsedTarget.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid URL provided.' }));
      return;
    }

    if (!isAllowedDomain(targetUrl)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Domain not allowed.' }));
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

const PORT = 8082;
server.listen(PORT, () => {
  console.log(`[Proxy] Local proxy server running on http://localhost:${PORT}`);
  console.log(`[Proxy] Mode: ${isLocalMode ? 'LOCAL (no restrictions)' : 'PRODUCTION (allowlist + rate limiting)'}`);
  console.log(`[Proxy] Query parameter: ?${SECRET_PARAM}=<url>`);
  if (!isLocalMode) {
    console.log(`[Proxy] Rate limit: ${RATE_LIMIT_MAX_REQUESTS} requests per minute per IP`);
    console.log(`[Proxy] Allowlist: ${allowlist ? allowlist.size + ' domains' : 'DISABLED'}`);
  }
});
