// api/feed/create.js
// POST { type: "text"|"photo"|"video", text, mediaUrl } - butuh cookie sesi.
// Untuk foto/video: file-nya diupload LANGSUNG dari browser ke Firebase Storage (lihat feed/index.html),
// endpoint ini cuma nyimpen metadata + URL hasil upload itu. Ini supaya video besar tidak
// kena limit ukuran request Vercel (~4.5MB) kalau lewat server.
const { db } = require('../../lib/firebaseAdmin');
const { getUserFromSession, newId } = require('../../lib/helpers');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getUserFromSession(req);
  if (!session) return res.status(401).json({ error: 'Belum masuk. Silakan login ulang.' });
  if (session.userData.banned) return res.status(403).json({ error: 'Akun ini diblokir.' });

  const { type, text, mediaUrl } = req.body || {};
  if (!['text', 'photo', 'video'].includes(type)) {
    return res.status(400).json({ error: 'Tipe post tidak valid.' });
  }
  if (type === 'text' && (!text || !text.trim())) {
    return res.status(400).json({ error: 'Teks tidak boleh kosong.' });
  }
  if (type !== 'text' && !mediaUrl) {
    return res.status(400).json({ error: 'Media belum selesai diunggah.' });
  }
  if (text && text.length > 1000) {
    return res.status(400).json({ error: 'Teks maksimal 1000 karakter.' });
  }

  try {
    const id = newId();
    const now = Date.now();
    await db().collection('posts').doc(id).set({
      id,
      authorId: session.userId,
      type,
      text: (text || '').trim(),
      mediaUrl: mediaUrl || '',
      createdAt: now,
      likeCount: 0,
      commentCount: 0,
      score: 0,
    });

    await db().collection('users').doc(session.userId).update({
      postCount: (session.userData.postCount || 0) + 1,
    });

    return res.status(200).json({ ok: true, id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Gagal membuat post.' });
  }
};
