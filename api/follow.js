// api/follow.js
// POST { targetUsername, action: "follow" | "unfollow" } - butuh cookie sesi.
const { db } = require('../lib/firebaseAdmin');
const { getUserFromSession } = require('../lib/helpers');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getUserFromSession(req);
  if (!session) return res.status(401).json({ error: 'Belum masuk. Silakan login ulang.' });

  const { targetUsername, action } = req.body || {};
  if (!targetUsername || !['follow', 'unfollow'].includes(action)) {
    return res.status(400).json({ error: 'Parameter tidak valid.' });
  }

  if (targetUsername === session.userData.username) {
    return res.status(400).json({ error: 'Tidak bisa follow diri sendiri.' });
  }

  try {
    const targetSnap = await db().collection('users').where('username', '==', targetUsername).limit(1).get();
    if (targetSnap.empty) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    const targetId = targetSnap.docs[0].id;

    const relId = `${session.userId}_${targetId}`;
    const relRef = db().collection('follows').doc(relId);
    const meRef = db().collection('users').doc(session.userId);
    const targetRef = db().collection('users').doc(targetId);

    await db().runTransaction(async (tx) => {
      const relDoc = await tx.get(relRef);
      const alreadyFollowing = relDoc.exists;

      if (action === 'follow' && !alreadyFollowing) {
        tx.set(relRef, { followerId: session.userId, followingId: targetId, createdAt: Date.now() });
        tx.update(meRef, { followingCount: (session.userData.followingCount || 0) + 1 });
        tx.update(targetRef, { followerCount: (targetSnap.docs[0].data().followerCount || 0) + 1 });
      } else if (action === 'unfollow' && alreadyFollowing) {
        tx.delete(relRef);
        tx.update(meRef, { followingCount: Math.max(0, (session.userData.followingCount || 0) - 1) });
        tx.update(targetRef, { followerCount: Math.max(0, (targetSnap.docs[0].data().followerCount || 0) - 1) });
      }
    });

    return res.status(200).json({ ok: true, isFollowing: action === 'follow' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Gagal memproses follow.' });
  }
};
