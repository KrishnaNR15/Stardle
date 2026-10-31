const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const puzzleInfoHandler = require('./api/puzzle-info');
const checkGuessHandler = require('./api/check-guess');

const PORT = process.env.PORT || 8000;
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon'
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Enhance res with Express-like helpers for the serverless functions
  res.status = function(code) {
    this.statusCode = code;
    return this;
  };
  res.json = function(data) {
    this.setHeader('Content-Type', 'application/json');
    this.end(JSON.stringify(data));
    return this;
  };

  // Route API requests
  if (pathname === '/api/puzzle-info') {
    return puzzleInfoHandler(req, res);
  }
  if (pathname === '/api/check-guess') {
    return checkGuessHandler(req, res);
  }

  // Security: Block direct access to protected files
  const normalized = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (
    normalized.includes('api/_data') ||
    normalized.includes('api/_lib') ||
    normalized.endsWith('.csv') ||
    normalized.endsWith('.md') ||
    normalized.startsWith('.git') ||
    normalized === '/package.json'
  ) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'text/plain');
    return res.end('Access Forbidden');
  }

  // Static file serving
  let filePath = path.join(ROOT, normalized === '/' ? 'index.html' : normalized);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain');
      return res.end('404 Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`[Stardle Backend Server] Listening at http://localhost:${PORT}`);
});

