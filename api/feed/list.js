// api/feed/list.js
// GET ?before=timestamp(optional)&limit=10(optional) - boleh tanpa sesi (feed publik),
// tapi kalau ada sesi, tiap post disertai apakah user ini sudah like atau belum.
const { db } = require('../../lib/firebaseAdmin');
const { getUserFromSession } = require('../../lib/helpers');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { before, limit } = req.query;
  const take = Math.min(Number(limit) || 10, 30);

  try {
    let query = db().collection('posts').orderBy('createdAt', 'desc');
    if (before) query = query.where('createdAt', '<', Number(before));
    query = query.limit(take);

    const snap = await query.get();
    const posts = snap.docs.map(d => d.data());

    const session = await getUserFromSession(req).catch(() => null);

    const authorIds = [...new Set(posts.map(p => p.authorId))];
    const authorDocs = await Promise.all(authorIds.map(id => db().collection('users').doc(id).get()));
    const authorMap = {};
    authorDocs.forEach(doc => {
      if (doc.exists) {
        const d = doc.data();
        authorMap[doc.id] = { username: d.username, displayName: d.displayName || d.username, avatarUrl: d.avatarUrl || '' };
      }
    });

    let likedSet = new Set();
    if (session) {
      const likeChecks = await Promise.all(
        posts.map(p => db().collection('likes').doc(`${p.id}_${session.userId}`).get())
      );
      likeChecks.forEach((doc, i) => { if (doc.exists) likedSet.add(posts[i].id); });
    }

    const enriched = posts.map(p => ({
      ...p,
      author: authorMap[p.authorId] || null,
      likedByMe: likedSet.has(p.id),
    })).filter(p => p.author);

    return res.status(200).json({
      posts: enriched,
      nextBefore: posts.length === take ? posts[posts.length - 1].createdAt : null,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Gagal memuat feed.' });
  }
};
