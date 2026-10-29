// Shine UE School — Шинэ жилийн ханхүү, гүнж сонгох сервер.
// Нэмэлт сан шаардлагагүй (зөвхөн GSAP-ийг node_modules-оос үйлчилнэ).
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'shine2027';
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const GSAP_DIR = path.join(ROOT, 'node_modules', 'gsap', 'dist');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const SAMPLE_CANDIDATES = [
  { role: 'prince', department: 'Математикийн тэнхим', lastName: 'Батболд', firstName: 'Тэмүүлэн' },
  { role: 'prince', department: 'Физикийн тэнхим', lastName: 'Ганзориг', firstName: 'Билгүүн' },
  { role: 'prince', department: 'Англи хэлний тэнхим', lastName: 'Мөнхбат', firstName: 'Анхбаяр' },
  { role: 'princess', department: 'Математикийн тэнхим', lastName: 'Энхтөр', firstName: 'Номин' },
  { role: 'princess', department: 'Химийн тэнхим', lastName: 'Сүхбаатар', firstName: 'Ану' },
  { role: 'princess', department: 'Монгол хэлний тэнхим', lastName: 'Цэрэндорж', firstName: 'Үүрцайх' },
].map((c) => ({ id: newId(), photo: '', ...c }));

function newId() {
  return crypto.randomBytes(6).toString('hex');
}

function loadDb() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    return {
      candidates: SAMPLE_CANDIDATES,
      votes: [],
      settings: { votingOpen: true, revealed: false, onePerIp: false },
    };
  }
}

// Шат (round): 1-р шатанд бүх нэр дэвшигч өрсөлдөнө. Санал тэнцвэл зөвхөн тэнцсэн
// нэр дэвшигчдийн дунд дахин санал хураах шинэ шат нээгдэнэ.
// roles[role] === null бол тухайн төрлийн бүх нэр дэвшигч, массив бол зөвхөн тэдгээр id.
const FIRST_ROUND = () => ({ n: 1, id: newId(), roles: { prince: null, princess: null } });

const db = loadDb();
if (!Array.isArray(db.rounds) || !db.rounds.length) db.rounds = [FIRST_ROUND()];
db.rounds.forEach((r) => { if (!r.id) r.id = newId(); });
db.votes.forEach((v) => { if (!v.round) v.round = 1; });
// Тэнхимийн жагсаалт: админ dropdown-оос сонгоно. Анх удаа нэр дэвшигчдийн тэнхимээс бүрдүүлнэ.
if (!Array.isArray(db.departments)) {
  db.departments = [...new Set(db.candidates.map((c) => c.department).filter(Boolean))];
}
// Тоолуур: revealAt цаг болоход санал хураалт хаагдаж, ялагчид автоматаар тодорно
if (!Number.isFinite(db.settings.countdownSeconds)) db.settings.countdownSeconds = 120;
if (!('revealAt' in db.settings)) db.settings.revealAt = null;

function saveDb() {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}
saveDb();

function startCountdown(seconds = db.settings.countdownSeconds) {
  db.settings.revealAt = new Date(Date.now() + seconds * 1000).toISOString();
  db.settings.votingOpen = true;
  db.settings.revealed = false;
}

// Хугацаа дууссан эсэхийг шалгаж, дууссан бол тодруулна (хуудас нээлттэй эсэхээс үл хамааран)
function checkDeadline() {
  if (db.settings.revealAt && Date.now() >= Date.parse(db.settings.revealAt)) {
    db.settings.revealAt = null;
    db.settings.votingOpen = false;
    db.settings.revealed = true;
    saveDb();
  }
}
checkDeadline();
setInterval(checkDeadline, 500);

// ---------- туслах функцууд ----------

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

function sendJson(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(body));
}

function sendFile(res, file) {
  fs.readFile(file, (err, buf) => {
    if (err) return sendJson(res, 404, { error: 'Файл олдсонгүй' });
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(buf);
  });
}

// baseDir-ээс гадагш гарах замыг хориглоно
function safeJoin(baseDir, rel) {
  const full = path.normalize(path.join(baseDir, decodeURIComponent(rel)));
  return full.startsWith(baseDir) ? full : null;
}

function readBody(req, limit = 8 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('Хэт том хүсэлт'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch {
        reject(new Error('JSON буруу байна'));
      }
    });
    req.on('error', reject);
  });
}

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

function clientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';
}

function isAdmin(req) {
  const key = req.headers['x-admin-key'] || '';
  const a = Buffer.from(String(key));
  const b = Buffer.from(ADMIN_PASSWORD);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function publicCandidate(c) {
  return { id: c.id, role: c.role, department: c.department, lastName: c.lastName, firstName: c.firstName, photo: c.photo };
}

const ROLE_ACC = { prince: 'Ханхүүгээ', princess: 'Гүнжээ' };
const ROLE_GEN = { prince: 'Ханхүүгийн', princess: 'Гүнжийн' };

const currentRound = () => db.rounds[db.rounds.length - 1];

// Тухайн шатанд өрсөлдөж буй нэр дэвшигчид
function contenders(round, role) {
  const ids = round.roles[role];
  return db.candidates.filter((c) => c.role === role && (!ids || ids.includes(c.id)));
}

// Тухайн төрлийг хамгийн сүүлд санал хураасан шат
function lastRoundFor(role) {
  for (let i = db.rounds.length - 1; i >= 0; i--) if (role in db.rounds[i].roles) return db.rounds[i];
  return db.rounds[0];
}

function tallyRound(n) {
  const counts = {};
  for (const v of db.votes) {
    if (v.round !== n) continue;
    if (v.princeId) counts[v.princeId] = (counts[v.princeId] || 0) + 1;
    if (v.princessId) counts[v.princessId] = (counts[v.princessId] || 0) + 1;
  }
  return counts;
}

// Төрөл бүрийн дүн: хамгийн сүүлийн шатных. Тэнцсэн бол tied массивт 2+ id байна.
function roleResult(role) {
  const round = lastRoundFor(role);
  const counts = tallyRound(round.n);
  const list = contenders(round, role).map((c) => ({ ...publicCandidate(c), votes: counts[c.id] || 0 }));
  const max = Math.max(0, ...list.map((c) => c.votes));
  const top = max > 0 ? list.filter((c) => c.votes === max) : [];
  return { round: round.n, list, top, tied: top.length > 1 ? top.map((c) => c.id) : [] };
}

function votersInRound(n) {
  return db.votes.filter((v) => v.round === n).length;
}

function winners() {
  const prince = roleResult('prince');
  const princess = roleResult('princess');
  return {
    prince: prince.top,
    princess: princess.top,
    tie: { prince: prince.tied.length > 0, princess: princess.tied.length > 0 },
    round: currentRound().n,
    totalVoters: votersInRound(currentRound().n),
  };
}

function status(voterId) {
  const round = currentRound();
  const mine = db.votes.find((v) => v.voterId === voterId && v.round === round.n);
  return {
    votingOpen: db.settings.votingOpen,
    revealed: db.settings.revealed,
    round: { n: round.n, id: round.id, roles: round.roles },
    totalVoters: votersInRound(round.n),
    myVote: mine ? { princeId: mine.princeId || null, princessId: mine.princessId || null } : null,
    // тоолуур: үйлчлүүлэгч өөрийн цагийн зөрүүг now-оор засна
    revealAt: db.settings.revealAt,
    now: Date.now(),
  };
}

function overview() {
  return {
    candidates: db.candidates,
    departments: db.departments,
    settings: db.settings,
    round: currentRound(),
    totalVoters: votersInRound(currentRound().n),
    results: { prince: roleResult('prince'), princess: roleResult('princess') },
    now: Date.now(),
  };
}

// ---------- API ----------

async function handleApi(req, res, url) {
  const route = `${req.method} ${url.pathname}`;
  checkDeadline();
  const cookies = parseCookies(req);
  let voterId = cookies.voter;
  const setCookie = {};
  if (!voterId || !/^[a-f0-9]{32}$/.test(voterId)) {
    voterId = crypto.randomBytes(16).toString('hex');
    setCookie['Set-Cookie'] = `voter=${voterId}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax`;
  }

  if (route === 'GET /api/departments') {
    return sendJson(res, 200, db.departments, setCookie);
  }

  if (route === 'GET /api/candidates') {
    return sendJson(res, 200, db.candidates.map(publicCandidate), setCookie);
  }

  if (route === 'GET /api/status') {
    return sendJson(res, 200, status(voterId), setCookie);
  }

  if (route === 'GET /api/winners') {
    if (!db.settings.revealed && !isAdmin(req)) return sendJson(res, 403, { error: 'Ялагчийг хараахан зарлаагүй байна' });
    return sendJson(res, 200, winners());
  }

  if (route === 'POST /api/vote') {
    if (!db.settings.votingOpen) return sendJson(res, 409, { error: 'Санал хураалт хаагдсан байна' }, setCookie);
    if (setCookie['Set-Cookie']) {
      return sendJson(res, 400, { error: 'Хуудсаа шинэчлээд дахин оролдоно уу' }, setCookie);
    }
    const round = currentRound();
    if (db.votes.some((v) => v.voterId === voterId && v.round === round.n)) {
      return sendJson(res, 409, { error: 'Та аль хэдийн санал өгсөн байна' });
    }
    const ip = clientIp(req);
    if (db.settings.onePerIp && db.votes.some((v) => v.ip === ip && v.round === round.n)) {
      return sendJson(res, 409, { error: 'Энэ төхөөрөмжөөс аль хэдийн санал өгсөн байна' });
    }
    const body = await readBody(req);
    const vote = { voterId, round: round.n, ip, at: new Date().toISOString() };
    for (const role of Object.keys(round.roles)) {
      const id = body[role + 'Id'];
      if (!contenders(round, role).some((c) => c.id === id)) {
        return sendJson(res, 400, { error: `${ROLE_ACC[role]} сонгоно уу` });
      }
      vote[role + 'Id'] = id;
    }
    db.votes.push(vote);
    saveDb();
    return sendJson(res, 200, status(voterId));
  }

  // --- админ ---
  if (url.pathname.startsWith('/api/admin/')) {
    if (!isAdmin(req)) return sendJson(res, 401, { error: 'Нууц үг буруу байна' });

    if (route === 'GET /api/admin/overview') {
      return sendJson(res, 200, overview());
    }

    if (route === 'PUT /api/admin/candidates') {
      const body = await readBody(req);
      if (!Array.isArray(body.candidates)) return sendJson(res, 400, { error: 'Жагсаалт буруу байна' });
      const clean = [];
      for (const c of body.candidates) {
        const role = c.role === 'princess' ? 'princess' : c.role === 'prince' ? 'prince' : null;
        const firstName = String(c.firstName || '').trim();
        if (!role || !firstName) continue;
        clean.push({
          id: typeof c.id === 'string' && /^[a-f0-9]{12}$/.test(c.id) ? c.id : newId(),
          role,
          department: String(c.department || '').trim(),
          lastName: String(c.lastName || '').trim(),
          firstName,
          photo: typeof c.photo === 'string' && c.photo.startsWith('/uploads/') ? c.photo : '',
        });
      }
      const depts = Array.isArray(body.departments) ? body.departments : db.departments;
      const cleanDepts = [];
      for (const d of depts.map((x) => String(x || '').trim()).filter(Boolean)) {
        if (!cleanDepts.includes(d)) cleanDepts.push(d);
      }
      for (const c of clean) if (c.department && !cleanDepts.includes(c.department)) cleanDepts.push(c.department);
      db.departments = cleanDepts;
      db.candidates = clean;
      saveDb();
      return sendJson(res, 200, overview());
    }

    if (route === 'POST /api/admin/upload') {
      const body = await readBody(req);
      const m = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(body.dataUrl || '');
      if (!m) return sendJson(res, 400, { error: 'Зөвхөн JPG, PNG, WEBP зураг оруулна' });
      const name = `${newId()}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`;
      fs.writeFileSync(path.join(UPLOAD_DIR, name), Buffer.from(m[2], 'base64'));
      return sendJson(res, 200, { url: `/uploads/${name}` });
    }

    if (route === 'POST /api/admin/settings') {
      const body = await readBody(req);
      for (const k of ['votingOpen', 'revealed', 'onePerIp']) {
        if (typeof body[k] === 'boolean') db.settings[k] = body[k];
      }
      // гараар тодруулсан/хаасан бол тоолуур зогсоно
      if (body.revealed === true || body.votingOpen === false) db.settings.revealAt = null;
      if (Number.isFinite(body.countdownSeconds)) {
        db.settings.countdownSeconds = Math.min(3600, Math.max(10, Math.round(body.countdownSeconds)));
      }
      saveDb();
      return sendJson(res, 200, { settings: db.settings });
    }

    if (route === 'POST /api/admin/countdown') {
      startCountdown();
      saveDb();
      return sendJson(res, 200, overview());
    }

    if (route === 'POST /api/admin/countdown-cancel') {
      db.settings.revealAt = null;
      saveDb();
      return sendJson(res, 200, overview());
    }

    if (route === 'POST /api/admin/runoff') {
      const body = await readBody(req);
      const roles = (Array.isArray(body.roles) ? body.roles : []).filter((r) => r === 'prince' || r === 'princess');
      if (!roles.length) return sendJson(res, 400, { error: 'Аль төрлөөр дахин санал хураахаа сонгоно уу' });
      const next = { n: currentRound().n + 1, id: newId(), roles: {} };
      for (const role of roles) {
        const { tied } = roleResult(role);
        if (!tied.length) return sendJson(res, 409, { error: `${ROLE_GEN[role]} санал тэнцээгүй байна` });
        next.roles[role] = tied;
      }
      db.rounds.push(next);
      startCountdown(); // дахин санал хураалт ч мөн тоолуураар дуусна
      saveDb();
      return sendJson(res, 200, overview());
    }

    if (route === 'POST /api/admin/runoff-cancel') {
      if (db.rounds.length < 2) return sendJson(res, 409, { error: 'Цуцлах дахин санал хураалт алга' });
      const { n } = db.rounds.pop();
      db.votes = db.votes.filter((v) => v.round !== n);
      db.settings.revealAt = null;
      saveDb();
      return sendJson(res, 200, overview());
    }

    if (route === 'POST /api/admin/reset-votes') {
      db.rounds = [FIRST_ROUND()];
      db.votes = [];
      db.settings.revealed = false;
      db.settings.votingOpen = true;
      db.settings.revealAt = null;
      saveDb();
      return sendJson(res, 200, { ok: true });
    }
  }

  return sendJson(res, 404, { error: 'Олдсонгүй' });
}

// ---------- сервер ----------

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);

    if (url.pathname.startsWith('/vendor/gsap/')) {
      const f = safeJoin(GSAP_DIR, url.pathname.slice('/vendor/gsap/'.length));
      return f ? sendFile(res, f) : sendJson(res, 404, { error: 'Олдсонгүй' });
    }
    if (url.pathname.startsWith('/uploads/')) {
      const f = safeJoin(UPLOAD_DIR, url.pathname.slice('/uploads/'.length));
      return f ? sendFile(res, f) : sendJson(res, 404, { error: 'Олдсонгүй' });
    }

    let rel = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    if (rel === 'admin' || rel === 'reveal') rel += '.html';
    const f = safeJoin(PUBLIC_DIR, rel);
    return f ? sendFile(res, f) : sendJson(res, 404, { error: 'Олдсонгүй' });
  } catch (err) {
    return sendJson(res, 400, { error: err.message || 'Алдаа гарлаа' });
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
