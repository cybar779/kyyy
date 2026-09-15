const crypto = require('crypto');
const { db } = require('../lib/firebase');
const { requireAuth } = require('../lib/auth');

function generateKey(prefix) {
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
  const rand2 = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${rand}-${rand2}`;
}

module.exports = requireAuth(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { product, prefix, maxDevices, expiresAt } = req.body || {};
  if (!product || !prefix || !maxDevices || !expiresAt) {
    return res.status(400).json({ error: 'Semua field wajib diisi.' });
  }
  if (!/^[A-Z0-9_-]{2,12}$/i.test(prefix)) {
    return res.status(400).json({ error: 'Prefix tidak valid.' });
  }
  const max = parseInt(maxDevices, 10);
  if (!Number.isInteger(max) || max < 1 || max > 100000) {
    return res.status(400).json({ error: 'Max device tidak valid.' });
  }
  const expiry = new Date(expiresAt);
  if (isNaN(expiry.getTime()) || expiry <= new Date()) {
    return res.status(400).json({ error: 'Tanggal expired tidak valid.' });
  }

  try {
    // Credit check enforced server-side — client-sent credit values are never trusted.
    if (req.user.role !== 'admin') {
      const userSnap = await db.ref(`users/${req.user.username}`).once('value');
      const userData = userSnap.val();
      const credits = userData?.credits ?? 0;
      if (credits < 1) {
        return res.status(403).json({ error: 'Credit tidak cukup untuk membuat lisensi baru.' });
      }
      await db.ref(`users/${req.user.username}/credits`).set(credits - 1);
    }

    const key = generateKey(prefix.toUpperCase());
    const license = {
      product,
      maxDevices: max,
      usedDevices: 0,
      devices: {},
      status: 'active',
      expiresAt: expiry.toISOString(),
      createdBy: req.user.username,
      createdAt: new Date().toISOString()
    };

    await db.ref(`licenses/${key}`).set(license);
    return res.status(201).json({ ok: true, key, license });
  } catch (err) {
    console.error('Create license error:', err);
    return res.status(500).json({ error: 'Gagal membuat lisensi.' });
  }
});
