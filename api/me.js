// api/me.js
// GET - butuh cookie sesi. Balikin data profil milik sendiri (tanpa password).
const { getUserFromSession } = require('../lib/helpers');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getUserFromSession(req);
  if (!session) return res.status(401).json({ error: 'Belum masuk. Silakan login ulang.' });

  const { userId, userData } = session;
  return res.status(200).json({
    username: userData.username,
    displayName: userData.displayName || '',
    bio: userData.bio || '',
    avatarUrl: userData.avatarUrl || '',
    followerCount: userData.followerCount || 0,
    followingCount: userData.followingCount || 0,
    postCount: userData.postCount || 0,
  });
};
