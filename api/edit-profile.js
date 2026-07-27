// api/edit-profile.js
// POST { displayName, bio } - butuh cookie sesi. avatarUrl diubah lewat /api/upload-avatar, bukan di sini.
const { db } = require('../lib/firebaseAdmin');
const { getUserFromSession } = require('../lib/helpers');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getUserFromSession(req);
  if (!session) return res.status(401).json({ error: 'Belum masuk. Silakan login ulang.' });

  const { displayName, bio } = req.body || {};
  if (!displayName || !displayName.trim()) {
    return res.status(400).json({ error: 'Nama tampilan wajib diisi.' });
  }
  if (displayName.length > 50) {
    return res.status(400).json({ error: 'Nama tampilan maksimal 50 karakter.' });
  }
  if (bio && bio.length > 160) {
    return res.status(400).json({ error: 'Bio maksimal 160 karakter.' });
  }

  try {
    await db().collection('users').doc(session.userId).update({
      displayName: displayName.trim(),
      bio: (bio || '').trim(),
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Gagal menyimpan profil.' });
  }
};
