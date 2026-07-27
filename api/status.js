// api/status.js
// GET /api/status?type=daftar|login&id=xxxx
// Dipanggil saat user pencet tombol "Refresh" di halaman pending.
const { db } = require('../lib/firebaseAdmin');
const { createSession, setCookie } = require('../lib/helpers');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { type, id } = req.query;
    if (!type || !id || !['daftar', 'login'].includes(type)) {
      return res.status(400).json({ error: 'Parameter type/id tidak valid.' });
    }

    const collection = type === 'daftar' ? 'pending_daftar' : 'pending_login';
    const doc = await db().collection(collection).doc(id).get();

    if (!doc.exists) {
      // Dokumen dihapus saat admin reject -> anggap statusnya 'rejected'.
      return res.status(200).json({ status: 'rejected' });
    }
    const data = doc.data();

    if (data.status === 'pending') {
      return res.status(200).json({ status: 'pending' });
    }

    if (data.status === 'rejected') {
      return res.status(200).json({ status: 'rejected' });
    }

    // status === 'accepted'
    let userId = null;
    if (type === 'daftar') {
      userId = id; // dokumen users dibuat pakai id yang sama saat admin accept
    } else {
      userId = data.matchedUserId;
    }

    if (userId) {
      const token = await createSession(userId);
      setCookie(res, 'echonote_session', token, 60 * 60 * 24 * 30);
    }

    const redirect = type === 'daftar' ? '/set-up_account/' : '/echonote-home/';
    return res.status(200).json({ status: 'accepted', redirect });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Terjadi kesalahan server saat cek status.' });
  }
};
