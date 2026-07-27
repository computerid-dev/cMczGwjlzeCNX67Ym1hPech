// api/login.js
// POST { identifier, password }   identifier = username / email / no. telepon
//
// Mode auto ON  -> cocokkan langsung ke data user tersimpan.
//                  Cocok  -> login berhasil.
//                  Tidak cocok -> ditolak langsung (tidak masuk antrean).
// Mode auto OFF -> SETIAP percobaan login masuk antrean pending_login untuk admin,
//                  admin bisa accept walau datanya tidak cocok setelah cek manual.
const { db } = require('../lib/firebaseAdmin');
const { newId, createSession, setCookie, getAutoMode } = require('../lib/helpers');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { identifier, password } = req.body || {};
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identifier dan password wajib diisi.' });
    }

    const usersRef = db().collection('users');
    const [byUsername, byEmail, byPhone] = await Promise.all([
      usersRef.where('username', '==', identifier).limit(1).get(),
      usersRef.where('email', '==', identifier).limit(1).get(),
      usersRef.where('phone', '==', identifier).limit(1).get(),
    ]);
    const match = [byUsername, byEmail, byPhone].find(snap => !snap.empty);
    const userDoc = match ? match.docs[0] : null;
    const userData = userDoc ? userDoc.data() : null;

    if (userData && userData.banned) {
      return res.status(403).json({ status: 'rejected', error: 'Akun ini diblokir.' });
    }

    const passwordMatches = !!userData && userData.password === password;
    const autoMode = await getAutoMode();

    if (autoMode) {
      if (passwordMatches) {
        const token = await createSession(userDoc.id);
        setCookie(res, 'echonote_session', token, 60 * 60 * 24 * 30);
        return res.status(200).json({ status: 'accepted', redirect: '/echonote-home/' });
      }
      return res.status(200).json({ status: 'rejected' });
    }

    // Mode manual: selalu masuk antrean, apapun hasil pencocokan, biar admin yang putuskan.
    const id = newId();
    await db().collection('pending_login').doc(id).set({
      id,
      identifier,
      passwordAttempt: password,
      matchedUserId: userDoc ? userDoc.id : null,
      matches: passwordMatches,
      status: 'pending',
      type: 'login',
      createdAt: Date.now(),
    });

    return res.status(200).json({
      status: 'pending',
      pendingId: id,
      redirect: `/pending/?type=login&id=${id}`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Terjadi kesalahan server saat login.' });
  }
};
