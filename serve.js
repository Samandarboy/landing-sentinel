// Static server for the Sentinel landing page.
// - Strips query strings before resolving files
// - Emulates the /_next/image optimizer path used by the legacy page's images
// - Sets correct MIME types (woff2/webp/svg/etc. that Windows registry omits)
// - Redirects a directory named without its trailing slash (/v2 -> /v2/)
// - Streams files with stream.pipeline, so a request the browser aborts
//   (every page load aborts its first probe of the film) closes its file
// Usage: node serve.js [port]   (default 8123; 8080 is the product
// interface's port), serves ./site
const http = require('http');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');

const ROOT = path.join(__dirname, 'site');
const PORT = parseInt(process.argv[2], 10) || 8123;

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
    // A directory without its trailing slash (/v2): send the browser to /v2/ so
    // the page's relative references (media/...) resolve under it. The Location
    // is rebuilt from the resolved path under ROOT, never echoed from the
    // request, so /\v2 or //v2 cannot turn into a redirect to another host.
    if (fs.existsSync(file) && fs.statSync(file).isDirectory() && !pathname.endsWith('/')) {
      const rel = path.relative(ROOT, file).split(path.sep).filter(Boolean).map(encodeURIComponent).join('/');
      const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
      res.writeHead(301, { Location: (rel ? '/' + rel + '/' : '/') + query });
      return res.end();
    }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      // SPA-ish fallback: try .html, else 404
      if (fs.existsSync(file + '.html')) file = file + '.html';
      else { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('404 Not Found: ' + pathname); }
    }
    const ext = path.extname(file).toLowerCase();
    const size = fs.statSync(file).size;
    const headers = {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
      'Accept-Ranges': 'bytes',
    };
    // Range requests: the <video> elements seek, and a server that ignores
    // Range makes every seek re-download the file from byte 0.
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (range && (range[1] || range[2])) {
      const start = range[1] ? parseInt(range[1], 10) : Math.max(0, size - parseInt(range[2], 10));
      const end = range[1] && range[2] ? Math.min(parseInt(range[2], 10), size - 1) : size - 1;
      if (start >= size || start > end) { res.writeHead(416, { 'Content-Range': 'bytes */' + size }); return res.end(); }
      res.writeHead(206, Object.assign({}, headers, { 'Content-Range': 'bytes ' + start + '-' + end + '/' + size, 'Content-Length': end - start + 1 }));
      // pipeline, not .pipe(): when the client aborts, pipe() only unpipes and
      // the paused ReadStream keeps its file descriptor open for good (one per
      // aborted film request, until EMFILE). pipeline destroys the source and
      // hands the error to the callback instead of throwing it uncaught.
      pipeline(fs.createReadStream(file, { start, end }), res, () => {});
      return;
    }
    res.writeHead(200, Object.assign({}, headers, { 'Content-Length': size }));
    pipeline(fs.createReadStream(file), res, () => {});
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('500: ' + e.message);
  }
});

server.listen(PORT, () => console.log(`Sentinel landing serving http://localhost:${PORT}  (root: ${ROOT})`));
