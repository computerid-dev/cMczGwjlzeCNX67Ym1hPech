// api/feed/like.js
// POST { postId, action: "like" | "unlike" } - butuh cookie sesi.
const { db } = require('../../lib/firebaseAdmin');
const { getUserFromSession } = require('../../lib/helpers');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getUserFromSession(req);
  if (!session) return res.status(401).json({ error: 'Belum masuk. Silakan login ulang.' });

  const { postId, action } = req.body || {};
  if (!postId || !['like', 'unlike'].includes(action)) {
    return res.status(400).json({ error: 'Parameter tidak valid.' });
  }

  try {
    const postRef = db().collection('posts').doc(postId);
    const likeRef = db().collection('likes').doc(`${postId}_${session.userId}`);

    const result = await db().runTransaction(async (tx) => {
      const [postDoc, likeDoc] = await Promise.all([tx.get(postRef), tx.get(likeRef)]);
      if (!postDoc.exists) throw new Error('NOT_FOUND');

      const alreadyLiked = likeDoc.exists;
      const currentCount = postDoc.data().likeCount || 0;
      const commentCount = postDoc.data().commentCount || 0;

      if (action === 'like' && !alreadyLiked) {
        tx.set(likeRef, { postId, userId: session.userId, createdAt: Date.now() });
        const newCount = currentCount + 1;
        tx.update(postRef, { likeCount: newCount, score: newCount + commentCount * 2 });
        return newCount;
      }
      if (action === 'unlike' && alreadyLiked) {
        tx.delete(likeRef);
        const newCount = Math.max(0, currentCount - 1);
        tx.update(postRef, { likeCount: newCount, score: newCount + commentCount * 2 });
        return newCount;
      }
      return currentCount;
    });

    return res.status(200).json({ ok: true, likeCount: result, likedByMe: action === 'like' });
  } catch (err) {
    if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Post tidak ditemukan.' });
    console.error(err);
    return res.status(500).json({ error: 'Gagal memproses like.' });
  }
};
