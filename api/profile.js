// api/profile.js
// GET ?username=xxx  - profil publik, siapa saja boleh akses, tidak butuh sesi.
// Hanya mengembalikan field yang aman ditampilkan publik (tidak ada password/email/telepon).
const { db } = require('../lib/firebaseAdmin');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Parameter username wajib diisi.' });

  try {
    const snap = await db().collection('users').where('username', '==', username).limit(1).get();
    if (snap.empty) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });

    const data = snap.docs[0].data();
    return res.status(200).json({
      id: snap.docs[0].id,
      username: data.username,
      displayName: data.displayName || data.username,
      bio: data.bio || '',
      avatarUrl: data.avatarUrl || '',
      followerCount: data.followerCount || 0,
      followingCount: data.followingCount || 0,
      postCount: data.postCount || 0,
      banned: !!data.banned,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Gagal mengambil profil.' });
  }
};
