const { db } = require('../lib/firebase');
const { requireAuth } = require('../lib/auth');

module.exports = requireAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const snap = await db.ref('licenses').once('value');
    const all = snap.val() || {};

    // Regular users only see licenses they created.
    const isAdmin = req.user.role === 'admin';
    const list = Object.entries(all)
      .filter(([, v]) => isAdmin || v.createdBy === req.user.username)
      .map(([key, v]) => ({ key, ...v }));

    return res.status(200).json({ licenses: list });
  } catch (err) {
    console.error('List licenses error:', err);
    return res.status(500).json({ error: 'Gagal mengambil data lisensi.' });
  }
});
