// api/chat/send.js
// POST { targetUsername, text } - butuh cookie sesi.
// Pesan ditulis ke Realtime Database (biar client yang lagi "dengar" langsung dapat update instan).
// Metadata percakapan (buat daftar kotak masuk) tetap di Firestore.
const { db, rtdb } = require('../../lib/firebaseAdmin');
const { getUserFromSession } = require('../../lib/helpers');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getUserFromSession(req);
  if (!session) return res.status(401).json({ error: 'Belum masuk. Silakan login ulang.' });

  const { targetUsername, text } = req.body || {};
  if (!targetUsername || !text || !text.trim()) {
    return res.status(400).json({ error: 'Pesan tidak boleh kosong.' });
  }
  if (text.length > 2000) {
    return res.status(400).json({ error: 'Pesan maksimal 2000 karakter.' });
  }
  if (targetUsername === session.userData.username) {
    return res.status(400).json({ error: 'Tidak bisa mengirim pesan ke diri sendiri.' });
  }

  try {
    const targetSnap = await db().collection('users').where('username', '==', targetUsername).limit(1).get();
    if (targetSnap.empty) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    const targetId = targetSnap.docs[0].id;

    const chatId = [session.userId, targetId].sort().join('_');
    const now = Date.now();

    // Metadata percakapan (untuk daftar kotak masuk) - Firestore, seperti sebelumnya.
    await db().collection('chats').doc(chatId).set({
      participants: [session.userId, targetId],
      lastMessage: text.trim(),
      lastMessageAt: now,
      updatedAt: now,
    }, { merge: true });

    // Pesan sesungguhnya - Realtime Database, biar listener client dapat update instan.
    const msgRef = rtdb().ref(`chats/${chatId}/messages`).push();
    await msgRef.set({
      senderId: session.userId,
      text: text.trim(),
      createdAt: now,
    });

    return res.status(200).json({ ok: true, chatId, messageId: msgRef.key, createdAt: now });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Gagal mengirim pesan.' });
  }
};
