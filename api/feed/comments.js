// api/feed/comments.js
// GET ?postId=xxx - publik, tidak butuh sesi.
const { db } = require('../../lib/firebaseAdmin');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { postId } = req.query;
  if (!postId) return res.status(400).json({ error: 'Parameter postId wajib diisi.' });

  try {
    const snap = await db().collection('posts').doc(postId).collection('comments')
      .orderBy('createdAt', 'asc').limit(100).get();
    const comments = snap.docs.map(d => d.data());

    const authorIds = [...new Set(comments.map(c => c.authorId))];
    const authorDocs = await Promise.all(authorIds.map(id => db().collection('users').doc(id).get()));
    const authorMap = {};
    authorDocs.forEach(doc => {
      if (doc.exists) {
        const d = doc.data();
        authorMap[doc.id] = { username: d.username, displayName: d.displayName || d.username, avatarUrl: d.avatarUrl || '' };
      }
    });

    const enriched = comments.map(c => ({ ...c, author: authorMap[c.authorId] || null })).filter(c => c.author);
    return res.status(200).json({ comments: enriched });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Gagal memuat komentar.' });
  }
};
