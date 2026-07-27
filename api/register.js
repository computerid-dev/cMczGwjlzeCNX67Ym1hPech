// api/register.js
// POST { username, email, phone, password }
//
// Mode auto ON  -> tidak ada data lama untuk dicocokkan, jadi pendaftaran baru langsung di-accept.
// Mode auto OFF -> masuk antrean pending_daftar, menunggu admin accept/reject manual.
const { db } = require('../lib/firebaseAdmin');
const { newId, createSession, setCookie, getAutoMode } = require('../lib/helpers');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { username, email, phone, password } = req.body || {};

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, dan password wajib diisi.' });
    }

    const usersRef = db().collection('users');
    const pendingRef = db().collection('pending_daftar');

    const [existingUser, existingPending] = await Promise.all([
      usersRef.where('username', '==', username).limit(1).get(),
      pendingRef.where('username', '==', username).where('status', '==', 'pending').limit(1).get(),
    ]);

    if (!existingUser.empty) {
      return res.status(409).json({ error: 'Username sudah terdaftar.' });
    }
    if (!existingPending.empty) {
      return res.status(409).json({ error: 'Username ini masih menunggu review admin.' });
    }

    const autoMode = await getAutoMode();
    const id = newId();
    const baseData = {
      id,
      username,
      email,
      phone: phone || '',
      password, // NOTE: disimpan apa adanya (plaintext) atas permintaan eksplisit pemilik produk,
                // supaya admin & sistem auto bisa mencocokkan data secara langsung.
      createdAt: Date.now(),
    };

    if (autoMode) {
      // Auto-accept: langsung jadi user resmi, tanpa profil (akan dilengkapi di set-up_account).
      await usersRef.doc(id).set({ ...baseData, profileComplete: false, banned: false });
      const token = await createSession(id);
      setCookie(res, 'echonote_session', token, 60 * 60 * 24 * 30);
      return res.status(200).json({ status: 'accepted', redirect: '/set-up_account/' });
    }

    // Manual: masuk antrean, admin yang putuskan.
    await pendingRef.doc(id).set({ ...baseData, status: 'pending', type: 'daftar' });
    return res.status(200).json({
      status: 'pending',
      pendingId: id,
      redirect: `/pending/?type=daftar&id=${id}`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Terjadi kesalahan server saat mendaftar.' });
  }
};
