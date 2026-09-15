const { db } = require('../lib/firebase');
const { requireAuth } = require('../lib/auth');

module.exports = requireAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const snap = await db.ref('users').once('value');
    const all = snap.val() || {};
    const list = Object.entries(all).map(([username, v]) => ({
      username,
      role: v.role || 'user',
      credits: v.credits ?? 0,
      disabled: !!v.disabled,
      createdAt: v.createdAt
      // passwordHash intentionally never sent to the client
    }));
    return res.status(200).json({ users: list });
  } catch (err) {
    console.error('List users error:', err);
    return res.status(500).json({ error: 'Gagal mengambil data user.' });
  }
}, { role: 'admin' });
