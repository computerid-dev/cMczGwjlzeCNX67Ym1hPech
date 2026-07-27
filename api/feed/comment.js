// api/feed/comment.js
// POST { postId, text } - butuh cookie sesi.
const { db } = require('../../lib/firebaseAdmin');
const { getUserFromSession, newId } = require('../../lib/helpers');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getUserFromSession(req);
  if (!session) return res.status(401).json({ error: 'Belum masuk. Silakan login ulang.' });
  if (session.userData.banned) return res.status(403).json({ error: 'Akun ini diblokir.' });

  const { postId, text } = req.body || {};
  if (!postId || !text || !text.trim()) {
    return res.status(400).json({ error: 'Komentar tidak boleh kosong.' });
  }
  if (text.length > 500) {
    return res.status(400).json({ error: 'Komentar maksimal 500 karakter.' });
  }

  try {
    const postRef = db().collection('posts').doc(postId);
    const postDoc = await postRef.get();
    if (!postDoc.exists) return res.status(404).json({ error: 'Post tidak ditemukan.' });

    const id = newId();
    const now = Date.now();
    await postRef.collection('comments').doc(id).set({
      id,
      authorId: session.userId,
      text: text.trim(),
      createdAt: now,
    });
    await postRef.update({
      commentCount: (postDoc.data().commentCount || 0) + 1,
      score: (postDoc.data().likeCount || 0) + ((postDoc.data().commentCount || 0) + 1) * 2,
    });

    return res.status(200).json({
      ok: true,
      comment: {
        id,
        text: text.trim(),
        createdAt: now,
        author: {
          username: session.userData.username,
          displayName: session.userData.displayName || session.userData.username,
          avatarUrl: session.userData.avatarUrl || '',
        },
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Gagal mengirim komentar.' });
  }
};
