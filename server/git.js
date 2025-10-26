const http = require('http');
const https = require('https');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const url = require('url');
const path = require('path');

const REPOS_PATH = path.join(__dirname, '..', 'src', 'gardens');

function findGitHttpBackend() {
  const paths = [
    'git-http-backend',
    '/usr/libexec/git-core/git-http-backend',
    '/usr/lib/git-core/git-http-backend',
    '/usr/share/git-core/git-http-backend'
  ];
  for (const p of paths) {
    try {
      if (p === 'git-http-backend') {
        require('child_process').execSync('which git-http-backend', { stdio: 'ignore' });
        return p;
      } else if (fs.existsSync(p)) {
        return p;
      }
    } catch (e) { continue; }
  }
  throw new Error('git-http-backend not found');
}

const GIT_HTTP_BACKEND = findGitHttpBackend();

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, accept-encoding, content-encoding');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const repoUrl = parsedUrl.query.repo;

  // --- REVISED PROXY LOGIC ---
  if (repoUrl) {
    console.log(`[GitServer] Acting as CORS Proxy for: ${repoUrl}`);
    
    let targetUrl;
    try {
      targetUrl = new URL(repoUrl);
    } catch (e) {
      res.writeHead(400).end('Invalid "repo" URL parameter.');
      return;
    }

    const transport = targetUrl.protocol === 'https:' ? https : http;
    const options = {
      hostname: targetUrl.hostname,
      port: targetUrl.port,
      path: targetUrl.pathname + targetUrl.search,
      method: req.method,
      headers: { ...req.headers, host: targetUrl.host },
    };

    const proxyReq = transport.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (e) => {
      console.error(`[GitServer] Proxy request error: ${e.message}`);
      res.writeHead(502).end('Bad Gateway');
    });

    req.pipe(proxyReq, { end: true });
    return; // End execution here for proxy requests
  }
  // --- END REVISED PROXY LOGIC ---

  // --- EXISTING LOCAL REPO LOGIC ---
  const repoName = parsedUrl.pathname.split('/')[1];

  if (!repoName) {
    res.writeHead(404, { 'Content-Type': 'text-plain' }).end('Not Found: Repository name not specified.');
    return;
  }

  const repoPath = path.join(REPOS_PATH, repoName);

  if (!fs.existsSync(repoPath) || !repoPath.startsWith(REPOS_PATH)) {
    res.writeHead(404, { 'Content-Type': 'text-plain' }).end(`Not Found: Repository "${repoName}" does not exist.`);
    return;
  }
  
  const isPush = parsedUrl.pathname.includes('git-receive-pack');
  
  const env = {
    ...process.env,
    GIT_PROJECT_ROOT: repoPath,
    GIT_HTTP_EXPORT_ALL: '1',
    PATH_INFO: parsedUrl.pathname.substring(`/${repoName}`.length),
    REQUEST_METHOD: req.method,
    QUERY_STRING: parsedUrl.query || '',
    CONTENT_TYPE: req.headers['content-type'] || '',
    CONTENT_LENGTH: req.headers['content-length'] || '',
  };

  const gitProcess = spawn(GIT_HTTP_BACKEND, [], { env });

  req.pipe(gitProcess.stdin);
  gitProcess.stderr.pipe(process.stderr);

  const chunks = [];
  gitProcess.stdout.on('data', (chunk) => {
    chunks.push(chunk);
  });

  gitProcess.on('close', (code) => {
    if (code === 0 && isPush) {
      console.log(`[GitServer] Push to '${repoName}' successful. Updating working directory...`);
      exec('git reset --hard', { cwd: repoPath }, (err, stdout, stderr) => {
        if (err) {
          console.error(`[GitServer] FAILED to update working directory for '${repoName}':`, stderr);
        } else {
          console.log(`[GitServer] Working directory for '${repoName}' updated successfully.`);
        }
      });
    }

    const buffer = Buffer.concat(chunks);
    const responseString = buffer.toString('utf8');
    
    const separatorIndex = responseString.indexOf('\r\n\r\n');
    if (separatorIndex === -1) {
      if (!res.headersSent) {
        res.writeHead(500).end('Internal Server Error: Malformed response from git-http-backend.');
      }
      return;
    }

    const headersPart = responseString.substring(0, separatorIndex);
    const bodyPart = buffer.slice(separatorIndex + 4);

    const headers = headersPart.split('\r\n');
    const statusLine = headers.shift();
    
    let statusCode = 200;
    if (statusLine && statusLine.startsWith('Status: ')) {
      statusCode = parseInt(statusLine.substring(8, 11), 10);
    }
    
    headers.forEach(header => {
      const [key, value] = header.split(': ', 2);
      if (key && value) {
        res.setHeader(key, value);
      }
    });

    res.writeHead(statusCode);
    res.end(bodyPart);
  });
});

server.listen(8081, () => {
  console.log(`Git server running on http://localhost:8081, serving from NON-BARE repositories in ${REPOS_PATH}`);
  console.log(`Proxy mode is active. Use ?repo=<REMOTE_URL> to proxy requests.`);
});