// Vercel Function: /api/* болон /uploads/* хүсэлтийг vercel.json энд чиглүүлнэ.
const { handle } = require('../lib/app');

module.exports = async (req, res) => {
  if (!(await handle(req, res))) {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Олдсонгүй' }));
  }
};
