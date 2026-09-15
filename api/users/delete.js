const { db } = require('../lib/firebase');
const { requireAuth } = require('../lib/auth');

module.exports = requireAuth(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username } = req.body || {};
  if (!username) return res.status(400).json({ error: 'Username wajib diisi.' });
  if (username === req.user.username) {
    return res.status(400).json({ error: 'Tidak bisa menghapus akun sendiri.' });
  }

  try {
    await db.ref(`users/${username}`).remove();
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Delete user error:', err);
    return res.status(500).json({ error: 'Gagal menghapus user.' });
  }
}, { role: 'admin' });
