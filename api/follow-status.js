// api/follow-status.js
// GET ?target=username - butuh cookie sesi. Balikin { isFollowing }.
const { db } = require('../lib/firebaseAdmin');
const { getUserFromSession } = require('../lib/helpers');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getUserFromSession(req);
  if (!session) return res.status(401).json({ error: 'Belum masuk.' });

  const { target } = req.query;
  if (!target) return res.status(400).json({ error: 'Parameter target wajib diisi.' });

  try {
    const targetSnap = await db().collection('users').where('username', '==', target).limit(1).get();
    if (targetSnap.empty) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });

    const relDoc = await db().collection('follows').doc(`${session.userId}_${targetSnap.docs[0].id}`).get();
    return res.status(200).json({ isFollowing: relDoc.exists });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Gagal cek status follow.' });
  }
};
