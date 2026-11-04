import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT) || 8080;
const host = process.env.HOST || '127.0.0.1'; // só local; use HOST=0.0.0.0 para abrir na rede

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};
// Somente páginas .html da raiz e as pastas css/js/lib/img são servidas (nada de .git, node_modules, package.json…)
const allowed = p => /^[\w-]+\.html$/.test(p) || /^(css|js|lib|img)[\\/][\w.\-\\/]+$/.test(p);

http.createServer(async (req, res) => {
  let p;
  try {
    p = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^[\\/]+/, '') || 'index.html';
  } catch {
    res.writeHead(400).end('bad request');
    return;
  }
  if (p.split(sep).includes('..') || !allowed(p) || !types[extname(p)]) {
    res.writeHead(403).end('forbidden');
    return;
  }
  try {
    const data = await readFile(join(root, p));
    res.writeHead(200, { 'Content-Type': types[extname(p)], 'Cache-Control': 'no-cache' }).end(data);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(port, host, () => console.log(`Jogo em http://${host === '0.0.0.0' ? 'localhost' : host}:${port}/`));
