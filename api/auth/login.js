const { db } = require('../lib/firebase');
const { signSession, setSessionCookie, verifyPassword, rateLimit } = require('../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for'] || 'unknown';
  if (!rateLimit(`login:${ip}`, { max: 8, windowMs: 60_000 })) {
    return res.status(429).json({ error: 'Terlalu banyak percobaan. Coba lagi sebentar.' });
  }

  const { username, password } = req.body || {};
  if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Username dan password wajib diisi.' });
  }

  // Basic input sanitation — Firebase RTDB keys can't contain . $ # [ ] /
  const safeUsername = username.trim();
  if (!/^[a-zA-Z0-9_-]{3,32}$/.test(safeUsername)) {
    return res.status(400).json({ error: 'Format username tidak valid.' });
  }

  try {
    const snap = await db.ref(`users/${safeUsername}`).once('value');
    const user = snap.val();

    // Always compare against something to avoid timing leaks about user existence.
    const dummyHash = '$2a$12$CwTycUXWue0Thq9StjUM0uJ8vGkGpJTFEy0AJm0/UGm.YZ5tOLxLm';
    const ok = user
      ? await verifyPassword(password, user.passwordHash)
      : await verifyPassword(password, dummyHash);

    if (!user || !ok) {
      return res.status(401).json({ error: 'Username atau password salah.' });
    }
    if (user.disabled) {
      return res.status(403).json({ error: 'Akun dinonaktifkan. Hubungi administrator.' });
    }

    const token = signSession({ uid: safeUsername, username: safeUsername, role: user.role || 'user' });
    setSessionCookie(res, token);

    return res.status(200).json({
      ok: true,
      user: { username: safeUsername, role: user.role || 'user', credits: user.credits ?? 0 }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
};
