const { db } = require('../lib/firebase');
const { requireAuth } = require('../lib/auth');

module.exports = requireAuth(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, credits, disabled } = req.body || {};
  if (!username) return res.status(400).json({ error: 'Username wajib diisi.' });

  try {
    const ref = db.ref(`users/${username}`);
    const snap = await ref.once('value');
    if (!snap.exists()) return res.status(404).json({ error: 'User tidak ditemukan.' });

    const updates = {};
    if (credits !== undefined) {
      const c = parseInt(credits, 10);
      if (!Number.isInteger(c) || c < 0) return res.status(400).json({ error: 'Credit tidak valid.' });
      updates.credits = c;
    }
    if (disabled !== undefined) updates.disabled = !!disabled;

    await ref.update(updates);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Update user error:', err);
    return res.status(500).json({ error: 'Gagal update user.' });
  }
}, { role: 'admin' });
