// Shine UE School — Шинэ жилийн ханхүү, гүнж сонгох сервер (компьютер дээр ажиллуулах).
// Нэмэлт сан шаардлагагүй (зөвхөн GSAP-ийг node_modules-оос үйлчилнэ).
// API нь lib/app.js-д байгаа — Vercel дээр api/index.js мөн түүнийг ашиглана.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { handle, ADMIN_PASSWORD } = require('./lib/app');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const GSAP_DIR = path.join(__dirname, 'node_modules', 'gsap', 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.map': 'application/json',
};

function notFound(res) {
  res.writeHead(404, { 'Content-Type': MIME['.json'] });
  res.end(JSON.stringify({ error: 'Олдсонгүй' }));
}

function sendFile(res, file) {
  fs.readFile(file, (err, buf) => {
    if (err) return notFound(res);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(buf);
  });
}

// baseDir-ээс гадагш гарах замыг хориглоно
function safeJoin(baseDir, rel) {
  const full = path.normalize(path.join(baseDir, decodeURIComponent(rel)));
  return full.startsWith(baseDir) ? full : null;
}

const server = http.createServer(async (req, res) => {
  if (await handle(req, res)) return;
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/vendor/gsap/')) {
      const f = safeJoin(GSAP_DIR, url.pathname.slice('/vendor/gsap/'.length));
      return f ? sendFile(res, f) : notFound(res);
    }
    let rel = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    if (rel === 'admin' || rel === 'reveal') rel += '.html';
    const f = safeJoin(PUBLIC_DIR, rel);
    return f ? sendFile(res, f) : notFound(res);
  } catch {
    return notFound(res);
  }
});

server.listen(PORT, () => {
  const nets = require('os').networkInterfaces();
  const lan = Object.values(nets).flat().filter((n) => n && n.family === 'IPv4' && !n.internal).map((n) => n.address);
  console.log(`\n  Шинэ жилийн ханхүү, гүнж — сервер ажиллаж байна`);
  console.log(`  Энэ компьютер:   http://localhost:${PORT}`);
  lan.forEach((ip) => console.log(`  Сүлжээнд:        http://${ip}:${PORT}`));
  console.log(`  Админ:           http://localhost:${PORT}/admin   (нууц үг: ${ADMIN_PASSWORD})`);
  console.log(`  Тодруулах дэлгэц: http://localhost:${PORT}/reveal\n`);
});
