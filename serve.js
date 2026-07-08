// Static server for the Sentinel landing page.
// - Strips query strings before resolving files
// - Emulates the /_next/image optimizer path used by the page's images
// - Sets correct MIME types (woff2/webp/svg/etc. that Windows registry omits)
// Usage: node serve.js [port]   (default 8080), serves ./site
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, 'site');
const PORT = parseInt(process.argv[2], 10) || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
};

const server = http.createServer((req, res) => {
  try {
    let pathname = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
    // Emulate Next.js image optimizer: /_next/image?url=<src>&w=..&q=.. -> serve original local file
    if (pathname === '/_next/image') {
      const qs = new URLSearchParams(req.url.split('?')[1] || '');
      const src = qs.get('url');
      if (src) pathname = decodeURIComponent(src).split('?')[0].split('#')[0];
    }
    if (pathname.endsWith('/')) pathname += 'index.html';
    let file = path.join(ROOT, pathname);
    // prevent path traversal
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      // SPA-ish fallback: try .html, else 404
      if (fs.existsSync(file + '.html')) file = file + '.html';
      else { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('404 Not Found: ' + pathname); }
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('500: ' + e.message);
  }
});

server.listen(PORT, () => console.log(`Sentinel landing serving http://localhost:${PORT}  (root: ${ROOT})`));
