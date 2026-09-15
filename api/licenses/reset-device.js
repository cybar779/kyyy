const { db } = require('../lib/firebase');
const { requireAuth } = require('../lib/auth');

module.exports = requireAuth(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { key } = req.body || {};
  if (!key) return res.status(400).json({ error: 'Key wajib diisi.' });

  try {
    const ref = db.ref(`licenses/${key}`);
    const snap = await ref.once('value');
    const license = snap.val();
    if (!license) return res.status(404).json({ error: 'Lisensi tidak ditemukan.' });
    if (req.user.role !== 'admin' && license.createdBy !== req.user.username) {
      return res.status(403).json({ error: 'Akses ditolak.' });
    }

    await ref.update({ devices: {}, usedDevices: 0 });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Reset device error:', err);
    return res.status(500).json({ error: 'Gagal reset device.' });
  }
});
