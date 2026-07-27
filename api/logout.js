// api/logout.js
// POST - hapus sesi (cookie + dokumen sessions di Firestore).
const { db } = require('../lib/firebaseAdmin');
const { getCookie } = require('../lib/helpers');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = getCookie(req, 'echonote_session');
  if (token) {
    await db().collection('sessions').doc(token).delete().catch(() => {});
  }
  res.setHeader('Set-Cookie', 'echonote_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  return res.status(200).json({ ok: true });
};
