// Ханхүү, гүнж сонгох API. Компьютер дээр server.js, Vercel дээр api/index.js үүнийг дуудна.
const path = require('path');
const crypto = require('crypto');
const { createStore } = require('./store');

// Vercel дээр нууц үгийг заавал ADMIN_PASSWORD орчны хувьсагчаар өгнө (код нийтэд ил тул)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || (process.env.VERCEL ? '' : 'shine2027');
const store = createStore(path.join(__dirname, '..', 'data'));

const SAMPLE_CANDIDATES = () => [
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

// Шат (round): 1-р шатанд бүх нэр дэвшигч өрсөлдөнө. Санал тэнцвэл зөвхөн тэнцсэн
// нэр дэвшигчдийн дунд дахин санал хураах шинэ шат нээгдэнэ.
// roles[role] === null бол тухайн төрлийн бүх нэр дэвшигч, массив бол зөвхөн тэдгээр id.
const FIRST_ROUND = () => ({ n: 1, id: newId(), roles: { prince: null, princess: null } });

function normalize(s) {
  if (!Array.isArray(s.candidates)) s.candidates = [];
  if (!s.settings) s.settings = { votingOpen: true, revealed: false, onePerIp: false };
  if (!Array.isArray(s.rounds) || !s.rounds.length) s.rounds = [FIRST_ROUND()];
  s.rounds.forEach((r) => { if (!r.id) r.id = newId(); });
  // Тэнхимийн жагсаалт: админ dropdown-оос сонгоно. Анх удаа нэр дэвшигчдийн тэнхимээс бүрдүүлнэ.
  if (!Array.isArray(s.departments)) {
    s.departments = [...new Set(s.candidates.map((c) => c.department).filter(Boolean))];
  }
  // Тоолуур: revealAt цаг болоход санал хураалт хаагдаж, ялагчид автоматаар тодорно
  if (!Number.isFinite(s.settings.countdownSeconds)) s.settings.countdownSeconds = 120;
  if (!('revealAt' in s.settings)) s.settings.revealAt = null;
  return s;
}

// Хугацаа дууссан бол тодорсон гэж үзнэ. Хадгалахгүй — дараагийн админ үйлдэл хадгална,
// тэр болтол хүсэлт бүр ингэж тооцоолно (Vercel дээр байнга ажиллах таймер байхгүй).
function applyDeadline(s) {
  if (s.settings.revealAt && Date.now() >= Date.parse(s.settings.revealAt)) {
    s.settings.revealAt = null;
    s.settings.votingOpen = false;
    s.settings.revealed = true;
  }
  return s;
}

// Санал өгөгчид 4 секунд тутам status асууна — уншихад богино хугацаанд санах ойгоос өгнө
let cache = null;
const CACHE_MS = 1000;

async function loadState({ fresh = false } = {}) {
  if (!fresh && cache && Date.now() - cache.at < CACHE_MS) return applyDeadline(cache.state);
  let s = await store.getState();
  if (!s) {
    s = normalize({ candidates: SAMPLE_CANDIDATES() });
    await store.setState(s);
  }
  normalize(s);
  cache = { state: s, at: Date.now() };
  return applyDeadline(s);
}

async function saveState(s) {
  await store.setState(s);
  cache = { state: s, at: Date.now() };
}

function startCountdown(s, seconds = s.settings.countdownSeconds) {
  s.settings.revealAt = new Date(Date.now() + seconds * 1000).toISOString();
  s.settings.votingOpen = true;
  s.settings.revealed = false;
}

// ---------- туслах функцууд ----------

const MIME = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg' };

function sendJson(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(body));
}

async function readBody(req, limit = 4 * 1024 * 1024) {
  // Vercel хүсэлтийн биеийг өөрөө уншиж req.body-д өгдөг
  if (req.body !== undefined) {
    if (Buffer.isBuffer(req.body) || typeof req.body === 'string') {
      try { return JSON.parse(String(req.body) || '{}'); } catch { throw new Error('JSON буруу байна'); }
    }
    return req.body || {};
  }
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
  if (!ADMIN_PASSWORD) return false;
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

const currentRound = (s) => s.rounds[s.rounds.length - 1];

// Тухайн шатанд өрсөлдөж буй нэр дэвшигчид
function contenders(s, round, role) {
  const ids = round.roles[role];
  return s.candidates.filter((c) => c.role === role && (!ids || ids.includes(c.id)));
}

// Тухайн төрлийг хамгийн сүүлд санал хураасан шат
function lastRoundFor(s, role) {
  for (let i = s.rounds.length - 1; i >= 0; i--) if (role in s.rounds[i].roles) return s.rounds[i];
  return s.rounds[0];
}

async function tallyRound(round) {
  const counts = {};
  for (const v of await store.allVotes(round.id)) {
    if (v.princeId) counts[v.princeId] = (counts[v.princeId] || 0) + 1;
    if (v.princessId) counts[v.princessId] = (counts[v.princessId] || 0) + 1;
  }
  return counts;
}

// Төрөл бүрийн дүн: хамгийн сүүлийн шатных. Тэнцсэн бол tied массивт 2+ id байна.
async function roleResult(s, role) {
  const round = lastRoundFor(s, role);
  const counts = await tallyRound(round);
  const list = contenders(s, round, role).map((c) => ({ ...publicCandidate(c), votes: counts[c.id] || 0 }));
  const max = Math.max(0, ...list.map((c) => c.votes));
  const top = max > 0 ? list.filter((c) => c.votes === max) : [];
  return { round: round.n, list, top, tied: top.length > 1 ? top.map((c) => c.id) : [] };
}

async function winners(s) {
  const [prince, princess, totalVoters] = await Promise.all([
    roleResult(s, 'prince'), roleResult(s, 'princess'), store.countVotes(currentRound(s).id),
  ]);
  return {
    prince: prince.top,
    princess: princess.top,
    tie: { prince: prince.tied.length > 0, princess: princess.tied.length > 0 },
    round: currentRound(s).n,
    totalVoters,
  };
}

async function status(s, voterId) {
  const round = currentRound(s);
  const [totalVoters, mine] = await Promise.all([store.countVotes(round.id), store.myVote(round.id, voterId)]);
  return {
    votingOpen: s.settings.votingOpen,
    revealed: s.settings.revealed,
    round: { n: round.n, id: round.id, roles: round.roles },
    totalVoters,
    myVote: mine ? { princeId: mine.princeId || null, princessId: mine.princessId || null } : null,
    // тоолуур: үйлчлүүлэгч өөрийн цагийн зөрүүг now-оор засна
    revealAt: s.settings.revealAt,
    now: Date.now(),
  };
}

async function overview(s) {
  const [prince, princess, totalVoters] = await Promise.all([
    roleResult(s, 'prince'), roleResult(s, 'princess'), store.countVotes(currentRound(s).id),
  ]);
  return {
    candidates: s.candidates,
    departments: s.departments,
    settings: s.settings,
    round: currentRound(s),
    totalVoters,
    results: { prince, princess },
    now: Date.now(),
  };
}

// ---------- API ----------

async function handleApi(req, res, url) {
  const route = `${req.method} ${url.pathname}`;
  const cookies = parseCookies(req);
  let voterId = cookies.voter;
  const setCookie = {};
  if (!voterId || !/^[a-f0-9]{32}$/.test(voterId)) {
    voterId = crypto.randomBytes(16).toString('hex');
    const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
    setCookie['Set-Cookie'] = `voter=${voterId}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${secure}`;
  }

  if (route === 'GET /api/departments') {
    return sendJson(res, 200, (await loadState()).departments, setCookie);
  }

  if (route === 'GET /api/candidates') {
    return sendJson(res, 200, (await loadState()).candidates.map(publicCandidate), setCookie);
  }

  if (route === 'GET /api/status') {
    return sendJson(res, 200, await status(await loadState(), voterId), setCookie);
  }

  if (route === 'GET /api/winners') {
    const s = await loadState();
    if (!s.settings.revealed && !isAdmin(req)) return sendJson(res, 403, { error: 'Ялагчийг хараахан зарлаагүй байна' });
    return sendJson(res, 200, await winners(s));
  }

  if (route === 'POST /api/vote') {
    const s = await loadState({ fresh: true });
    if (!s.settings.votingOpen) return sendJson(res, 409, { error: 'Санал хураалт хаагдсан байна' }, setCookie);
    if (setCookie['Set-Cookie']) {
      return sendJson(res, 400, { error: 'Хуудсаа шинэчлээд дахин оролдоно уу' }, setCookie);
    }
    const round = currentRound(s);
    const body = await readBody(req);
    const vote = { voterId, at: new Date().toISOString() };
    for (const role of Object.keys(round.roles)) {
      const id = body[role + 'Id'];
      if (!contenders(s, round, role).some((c) => c.id === id)) {
        return sendJson(res, 400, { error: `${ROLE_ACC[role]} сонгоно уу` });
      }
      vote[role + 'Id'] = id;
    }
    const result = await store.addVote(round.id, vote, clientIp(req), s.settings.onePerIp);
    if (result === 'voted') return sendJson(res, 409, { error: 'Та аль хэдийн санал өгсөн байна' });
    if (result === 'ip') return sendJson(res, 409, { error: 'Энэ төхөөрөмжөөс аль хэдийн санал өгсөн байна' });
    return sendJson(res, 200, await status(s, voterId));
  }

  // --- админ ---
  if (url.pathname.startsWith('/api/admin/')) {
    if (!ADMIN_PASSWORD) {
      return sendJson(res, 503, { error: 'Админы нууц үг тохируулаагүй байна. Vercel → Settings → Environment Variables хэсэгт ADMIN_PASSWORD нэмнэ үү' });
    }
    if (!isAdmin(req)) return sendJson(res, 401, { error: 'Нууц үг буруу байна' });
    const s = await loadState({ fresh: true });

    if (route === 'GET /api/admin/overview') {
      return sendJson(res, 200, await overview(s));
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
      const depts = Array.isArray(body.departments) ? body.departments : s.departments;
      const cleanDepts = [];
      for (const d of depts.map((x) => String(x || '').trim()).filter(Boolean)) {
        if (!cleanDepts.includes(d)) cleanDepts.push(d);
      }
      for (const c of clean) if (c.department && !cleanDepts.includes(c.department)) cleanDepts.push(c.department);
      s.departments = cleanDepts;
      s.candidates = clean;
      await saveState(s);
      return sendJson(res, 200, await overview(s));
    }

    if (route === 'POST /api/admin/upload') {
      const body = await readBody(req);
      const m = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(body.dataUrl || '');
      if (!m) return sendJson(res, 400, { error: 'Зөвхөн JPG, PNG, WEBP зураг оруулна' });
      const name = `${newId()}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`;
      await store.putPhoto(name, Buffer.from(m[2], 'base64'));
      return sendJson(res, 200, { url: `/uploads/${name}` });
    }

    if (route === 'POST /api/admin/settings') {
      const body = await readBody(req);
      for (const k of ['votingOpen', 'revealed', 'onePerIp']) {
        if (typeof body[k] === 'boolean') s.settings[k] = body[k];
      }
      // гараар тодруулсан/хаасан бол тоолуур зогсоно
      if (body.revealed === true || body.votingOpen === false) s.settings.revealAt = null;
      if (Number.isFinite(body.countdownSeconds)) {
        s.settings.countdownSeconds = Math.min(3600, Math.max(10, Math.round(body.countdownSeconds)));
      }
      await saveState(s);
      return sendJson(res, 200, { settings: s.settings });
    }

    if (route === 'POST /api/admin/countdown') {
      startCountdown(s);
      await saveState(s);
      return sendJson(res, 200, await overview(s));
    }

    if (route === 'POST /api/admin/countdown-cancel') {
      s.settings.revealAt = null;
      await saveState(s);
      return sendJson(res, 200, await overview(s));
    }

    if (route === 'POST /api/admin/runoff') {
      const body = await readBody(req);
      const roles = (Array.isArray(body.roles) ? body.roles : []).filter((r) => r === 'prince' || r === 'princess');
      if (!roles.length) return sendJson(res, 400, { error: 'Аль төрлөөр дахин санал хураахаа сонгоно уу' });
      const next = { n: currentRound(s).n + 1, id: newId(), roles: {} };
      for (const role of roles) {
        const { tied } = await roleResult(s, role);
        if (!tied.length) return sendJson(res, 409, { error: `${ROLE_GEN[role]} санал тэнцээгүй байна` });
        next.roles[role] = tied;
      }
      s.rounds.push(next);
      startCountdown(s); // дахин санал хураалт ч мөн тоолуураар дуусна
      await saveState(s);
      return sendJson(res, 200, await overview(s));
    }

    if (route === 'POST /api/admin/runoff-cancel') {
      if (s.rounds.length < 2) return sendJson(res, 409, { error: 'Цуцлах дахин санал хураалт алга' });
      const { id } = s.rounds.pop();
      s.settings.revealAt = null;
      await store.dropVotes([id]);
      await saveState(s);
      return sendJson(res, 200, await overview(s));
    }

    if (route === 'POST /api/admin/reset-votes') {
      await store.dropVotes(s.rounds.map((r) => r.id));
      s.rounds = [FIRST_ROUND()];
      s.settings.revealed = false;
      s.settings.votingOpen = true;
      s.settings.revealAt = null;
      await saveState(s);
      return sendJson(res, 200, { ok: true });
    }
  }

  return sendJson(res, 404, { error: 'Олдсонгүй' });
}

// /uploads/<нэр> — нэр дэвшигчийн зураг (нэр нь санамсаргүй тул удаан кэшлэнэ)
async function handleUpload(req, res, url) {
  const name = path.basename(decodeURIComponent(url.pathname.slice('/uploads/'.length)));
  const type = MIME[path.extname(name).toLowerCase()];
  const buf = type && /^[a-f0-9]{12}\.\w+$/.test(name) ? await store.getPhoto(name) : null;
  if (!buf) return sendJson(res, 404, { error: 'Файл олдсонгүй' });
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'public, max-age=31536000, immutable' });
  res.end(buf);
}

// /api/* болон /uploads/* хүсэлтийг боловсруулна. Бусад замд false буцаана.
async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) { await handleApi(req, res, url); return true; }
    if (url.pathname.startsWith('/uploads/')) { await handleUpload(req, res, url); return true; }
    return false;
  } catch (err) {
    const msg = err.message || 'Алдаа гарлаа';
    sendJson(res, /JSON|Хэт том/.test(msg) ? 400 : 500, { error: msg });
    return true;
  }
}

module.exports = { handle, ADMIN_PASSWORD, storeKind: store.kind };
