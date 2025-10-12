const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const url = require('url');
const os = require('os');
const path = require('path');

const REPOS_PATH = path.join(os.homedir(), 'backups');

function findGitHttpBackend() {
  const paths = [
    'git-http-backend',
    '/usr/libexec/git-core/git-http-backend',
    '/usr/lib/git-core/git-http-backend',
    '/usr/share/git-core/git-http-backend'
  ];
  
  for (const p of paths) {
    if (p === 'git-http-backend') {
      try {
        require('child_process').execSync('which git-http-backend', { stdio: 'ignore' });
        return p;
      } catch (e) {
        continue;
      }
    } else if (fs.existsSync(p)) {
      return p;
    }
  }
  
  throw new Error(`git-http-backend not found`);
}

const GIT_HTTP_BACKEND = findGitHttpBackend();

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsed = url.parse(req.url);
  
  const env = {
    ...process.env,
    GIT_PROJECT_ROOT: REPOS_PATH,
    GIT_HTTP_EXPORT_ALL: '1',
    PATH_INFO: parsed.pathname,
    REQUEST_METHOD: req.method,
    QUERY_STRING: parsed.query || '',
    CONTENT_TYPE: req.headers['content-type'] || '',
    CONTENT_LENGTH: req.headers['content-length'] || '0',
    SERVER_NAME: 'localhost',
    SERVER_PORT: '8081',
    HTTP_HOST: req.headers.host || 'localhost:8081',
    REMOTE_ADDR: '127.0.0.1',
    REQUEST_URI: req.url
  };

  const backend = spawn(GIT_HTTP_BACKEND, [], { 
    env,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  let responseStarted = false;
  
  backend.stdout.on('data', (data) => {
    if (!responseStarted) {
      responseStarted = true;
      const output = data.toString();
      const headerEnd = output.indexOf('\r\n\r\n');
      
      if (headerEnd !== -1) {
        const headers = output.substring(0, headerEnd);
        const body = output.substring(headerEnd + 4);
        
        headers.split('\r\n').forEach(header => {
          if (header.includes(':')) {
            const [key, value] = header.split(': ', 2);
            res.setHeader(key, value);
          }
        });
        
        res.writeHead(200);
        if (body) res.write(body);
      }
    } else {
      res.write(data);
    }
  });
  
  backend.on('close', () => {
    res.end();
  });
  
  req.pipe(backend.stdin);
});

server.listen(8081, () => {
  console.log('Git server running on http://localhost:8081');
});