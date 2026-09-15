const { db } = require('../lib/firebase');
const { requireAuth, hashPassword } = require('../lib/auth');

module.exports = requireAuth(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, password, role, credits } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password wajib diisi.' });
  }
  const safeUsername = username.trim();
  if (!/^[a-zA-Z0-9_-]{3,32}$/.test(safeUsername)) {
    return res.status(400).json({ error: 'Username hanya boleh huruf, angka, - dan _ (3-32 karakter).' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password minimal 8 karakter.' });
  }
  const finalRole = role === 'admin' ? 'admin' : 'user';

  try {
    const existing = await db.ref(`users/${safeUsername}`).once('value');
    if (existing.exists()) {
      return res.status(409).json({ error: 'Username sudah digunakan.' });
    }

    const passwordHash = await hashPassword(password);
    await db.ref(`users/${safeUsername}`).set({
      passwordHash,
      role: finalRole,
      credits: finalRole === 'admin' ? null : (parseInt(credits, 10) || 0),
      disabled: false,
      createdAt: new Date().toISOString(),
      createdBy: req.user.username
    });

    return res.status(201).json({ ok: true, username: safeUsername });
  } catch (err) {
    console.error('Create user error:', err);
    return res.status(500).json({ error: 'Gagal membuat user.' });
  }
}, { role: 'admin' });
