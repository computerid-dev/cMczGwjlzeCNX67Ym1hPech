// api/chat/list.js
// GET - butuh cookie sesi. Balikin daftar percakapan milik user, diurutkan dari yang terbaru.
const { db } = require('../../lib/firebaseAdmin');
const { getUserFromSession } = require('../../lib/helpers');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getUserFromSession(req);
  if (!session) return res.status(401).json({ error: 'Belum masuk. Silakan login ulang.' });

  try {
    const snap = await db().collection('chats')
      .where('participants', 'array-contains', session.userId)
      .get();

    const chats = snap.docs.map(d => ({ chatId: d.id, ...d.data() }));
    chats.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    // Ambil profil lawan bicara untuk tiap chat (username, nama, avatar).
    const enriched = await Promise.all(chats.map(async (chat) => {
      const otherId = chat.participants.find(id => id !== session.userId);
      const otherDoc = await db().collection('users').doc(otherId).get();
      const other = otherDoc.exists ? otherDoc.data() : null;
      return {
        chatId: chat.chatId,
        lastMessage: chat.lastMessage || '',
        lastMessageAt: chat.lastMessageAt || null,
        otherUser: other ? {
          username: other.username,
          displayName: other.displayName || other.username,
          avatarUrl: other.avatarUrl || '',
        } : null,
      };
    }));

    return res.status(200).json({ chats: enriched.filter(c => c.otherUser) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Gagal memuat percakapan.' });
  }
};
