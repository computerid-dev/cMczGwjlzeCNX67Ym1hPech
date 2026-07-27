// api/chat/id.js
// GET ?with=username - butuh cookie sesi. Balikin chatId deterministik (dipakai client buat
// nge-listen RTDB dari awal, walau percakapannya belum pernah ada pesan sama sekali).
const { db } = require('../../lib/firebaseAdmin');
const { getUserFromSession } = require('../../lib/helpers');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getUserFromSession(req);
  if (!session) return res.status(401).json({ error: 'Belum masuk. Silakan login ulang.' });

  const { with: withUsername } = req.query;
  if (!withUsername) return res.status(400).json({ error: 'Parameter with wajib diisi.' });

  try {
    const targetSnap = await db().collection('users').where('username', '==', withUsername).limit(1).get();
    if (targetSnap.empty) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });

    const chatId = [session.userId, targetSnap.docs[0].id].sort().join('_');
    return res.status(200).json({ chatId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Gagal menghitung chatId.' });
  }
};
