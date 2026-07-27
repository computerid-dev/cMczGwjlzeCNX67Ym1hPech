// api/setup-profile.js
// POST { displayName, bio } - butuh cookie echonote_session (dibuat saat daftar/login diterima).
const { db } = require('../lib/firebaseAdmin');
const { getCookie } = require('../lib/helpers');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const token = getCookie(req, 'echonote_session');
    if (!token) return res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan masuk ulang.' });

    const sessionDoc = await db().collection('sessions').doc(token).get();
    if (!sessionDoc.exists) return res.status(401).json({ error: 'Sesi tidak valid.' });

    const { displayName, bio } = req.body || {};
    if (!displayName) return res.status(400).json({ error: 'Nama tampilan wajib diisi.' });

    const userId = sessionDoc.data().userId;
    await db().collection('users').doc(userId).update({
      displayName,
      bio: bio || '',
      profileComplete: true,
    });

    return res.status(200).json({ ok: true, redirect: '/echonote-home/' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Gagal menyimpan profil.' });
  }
};
