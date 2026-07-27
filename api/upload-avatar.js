// api/upload-avatar.js
// POST { imageBase64 } - dataURL (mis. "data:image/jpeg;base64,...."). Butuh cookie sesi.
// Batas ukuran ~2MB sebelum base64 (payload request Vercel dibatasi ~4.5MB).
const { db, bucket } = require('../lib/firebaseAdmin');
const { getUserFromSession } = require('../lib/helpers');

const ALLOWED_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_BYTES = 2 * 1024 * 1024; // 2MB

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getUserFromSession(req);
  if (!session) return res.status(401).json({ error: 'Belum masuk. Silakan login ulang.' });

  try {
    const { imageBase64 } = req.body || {};
    const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(imageBase64 || '');
    if (!match) {
      return res.status(400).json({ error: 'Format gambar tidak didukung. Pakai JPG, PNG, atau WEBP.' });
    }

    const mimeType = match[1];
    const ext = ALLOWED_TYPES[mimeType];
    const buffer = Buffer.from(match[2], 'base64');

    if (buffer.length > MAX_BYTES) {
      return res.status(400).json({ error: 'Ukuran gambar maksimal 2MB.' });
    }

    const filePath = `avatars/${session.userId}.${ext}`;
    const file = bucket().file(filePath);

    await file.save(buffer, {
      metadata: { contentType: mimeType, cacheControl: 'public, max-age=3600' },
    });
    await file.makePublic();

    const avatarUrl = `https://storage.googleapis.com/${bucket().name}/${filePath}?v=${Date.now()}`;

    await db().collection('users').doc(session.userId).update({ avatarUrl });

    return res.status(200).json({ ok: true, avatarUrl });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Gagal mengunggah avatar.' });
  }
};
