// Хадгалах газар. Компьютер дээр data/db.json файл, Vercel дээр Upstash Redis.
// Хоёулаа ижил функцуудтай:
//   getState / setState — нэр дэвшигч, тэнхим, тохиргоо, шатууд (нэг JSON)
//   countVotes / myVote / allVotes / addVote / dropVotes — шат бүрийн санал (roundId-аар)
//   putPhoto / getPhoto — нэр дэвшигчийн зураг
const fs = require('fs');
const path = require('path');

function fileStore(dataDir) {
  const DB_FILE = path.join(dataDir, 'db.json');
  const UPLOAD_DIR = path.join(dataDir, 'uploads');
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  // data = { state, votes: {roundId: {voterId: vote}}, ips: {roundId: {ip: voterId}} }
  let data = { state: null, votes: {}, ips: {} };
  try {
    const raw = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    if (raw.state) data = { votes: {}, ips: {}, ...raw };
    else data = migrate(raw);
  } catch { /* анх удаа — хоосон */ }

  // Хуучин хэлбэр: { candidates, votes: [{round: n, ...}], settings, rounds, departments }
  function migrate(raw) {
    const { votes = [], ...state } = raw;
    const out = { state, votes: {}, ips: {} };
    const rounds = Array.isArray(state.rounds) ? state.rounds : [];
    for (const v of votes) {
      const round = rounds.find((r) => r.n === (v.round || 1));
      if (!round || !round.id) continue;
      const { ip, round: _n, ...vote } = v;
      (out.votes[round.id] ||= {})[v.voterId] = vote;
      if (ip) (out.ips[round.id] ||= {})[ip] ||= v.voterId;
    }
    return out;
  }

  function persist() {
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, DB_FILE);
  }

  return {
    kind: 'file',
    async getState() { return data.state; },
    async setState(state) { data.state = state; persist(); },
    async countVotes(roundId) { return Object.keys(data.votes[roundId] || {}).length; },
    async myVote(roundId, voterId) { return (data.votes[roundId] || {})[voterId] || null; },
    async allVotes(roundId) { return Object.values(data.votes[roundId] || {}); },
    // 'ok' | 'voted' (энэ хүн өгсөн) | 'ip' (энэ IP-ээс өгсөн)
    async addVote(roundId, vote, ip, onePerIp) {
      const votes = (data.votes[roundId] ||= {});
      const ips = (data.ips[roundId] ||= {});
      if (votes[vote.voterId]) return 'voted';
      if (onePerIp && ips[ip] && ips[ip] !== vote.voterId) return 'ip';
      ips[ip] ||= vote.voterId;
      votes[vote.voterId] = vote;
      persist();
      return 'ok';
    },
    async dropVotes(roundIds) {
      for (const id of roundIds) { delete data.votes[id]; delete data.ips[id]; }
      persist();
    },
    async putPhoto(name, buf) { fs.writeFileSync(path.join(UPLOAD_DIR, name), buf); },
    async getPhoto(name) {
      try { return fs.readFileSync(path.join(UPLOAD_DIR, path.basename(name))); } catch { return null; }
    },
  };
}

// Upstash Redis-ийн REST API (нэмэлт сангүй, fetch ашиглана)
function redisStore(url, token) {
  const P = 'shine:';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  async function pipe(cmds) {
    const res = await fetch(`${url}/pipeline`, { method: 'POST', headers, body: JSON.stringify(cmds) });
    if (!res.ok) throw new Error(`Redis алдаа (${res.status})`);
    const out = await res.json();
    const bad = out.find((r) => r.error);
    if (bad) throw new Error(`Redis алдаа: ${bad.error}`);
    return out.map((r) => r.result);
  }
  const cmd = async (...args) => (await pipe([args]))[0];

  return {
    kind: 'redis',
    async getState() {
      const raw = await cmd('GET', P + 'state');
      return raw ? JSON.parse(raw) : null;
    },
    async setState(state) { await cmd('SET', P + 'state', JSON.stringify(state)); },
    async countVotes(roundId) { return Number(await cmd('HLEN', P + 'votes:' + roundId)) || 0; },
    async myVote(roundId, voterId) {
      const raw = await cmd('HGET', P + 'votes:' + roundId, voterId);
      return raw ? JSON.parse(raw) : null;
    },
    async allVotes(roundId) {
      const flat = (await cmd('HGETALL', P + 'votes:' + roundId)) || [];
      const out = [];
      for (let i = 1; i < flat.length; i += 2) out.push(JSON.parse(flat[i]));
      return out;
    },
    // HSETNX тул нэг хүн хоёр удаа зэрэг илгээсэн ч нэг л санал бүртгэгдэнэ
    async addVote(roundId, vote, ip, onePerIp) {
      const votesKey = P + 'votes:' + roundId;
      const ipsKey = P + 'ips:' + roundId;
      const [exists, , owner] = await pipe([
        ['HEXISTS', votesKey, vote.voterId],
        ['HSETNX', ipsKey, ip, vote.voterId],
        ['HGET', ipsKey, ip],
      ]);
      if (Number(exists)) return 'voted';
      if (onePerIp && owner && owner !== vote.voterId) return 'ip';
      const added = await cmd('HSETNX', votesKey, vote.voterId, JSON.stringify(vote));
      return Number(added) ? 'ok' : 'voted';
    },
    async dropVotes(roundIds) {
      if (!roundIds.length) return;
      await cmd('DEL', ...roundIds.flatMap((id) => [P + 'votes:' + id, P + 'ips:' + id]));
    },
    async putPhoto(name, buf) { await cmd('SET', P + 'photo:' + name, buf.toString('base64')); },
    async getPhoto(name) {
      const raw = await cmd('GET', P + 'photo:' + name);
      return raw ? Buffer.from(raw, 'base64') : null;
    },
  };
}

// Vercel дээр Redis заавал хэрэгтэй (файлын систем түр зуурынх тул санал алдагдана)
function missingStore() {
  const fail = async () => {
    throw new Error('Мэдээллийн сан холбогдоогүй байна. Vercel → Storage хэсгээс Upstash Redis нэмнэ үү');
  };
  return new Proxy({ kind: 'missing' }, { get: (t, k) => (k in t ? t[k] : fail) });
}

function createStore(dataDir) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return redisStore(url.replace(/\/$/, ''), token);
  if (process.env.VERCEL) return missingStore();
  return fileStore(dataDir);
}

module.exports = { createStore };
