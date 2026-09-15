const crypto = require('crypto');
const { db } = require('./lib/firebase');
const { rateLimit } = require('./lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for'] || 'unknown';
  if (!rateLimit(`validate:${ip}`, { max: 30, windowMs: 60_000 })) {
    return res.status(429).json({ valid: false, error: 'Rate limit exceeded.' });
  }

  const { key, deviceId } = req.body || {};
  if (!key || !deviceId || typeof key !== 'string' || typeof deviceId !== 'string') {
    return res.status(400).json({ valid: false, error: 'key dan deviceId wajib diisi.' });
  }
  if (!/^[A-Z0-9_-]{5,64}$/i.test(key)) {
    return res.status(400).json({ valid: false, error: 'Format key tidak valid.' });
  }

  try {
    const ref = db.ref(`licenses/${key}`);
    const snap = await ref.once('value');
    const license = snap.val();

    if (!license) return res.status(404).json({ valid: false, error: 'Key tidak ditemukan.' });
    if (license.status !== 'active') return res.status(403).json({ valid: false, error: 'Key tidak aktif.' });
    if (new Date(license.expiresAt) < new Date()) {
      return res.status(403).json({ valid: false, error: 'Key sudah expired.' });
    }

    const deviceHash = crypto.createHash('sha256').update(deviceId).digest('hex');
    const devices = license.devices || {};
    const alreadyBound = !!devices[deviceHash];

    if (!alreadyBound) {
      const used = license.usedDevices || 0;
      if (used >= license.maxDevices) {
        return res.status(403).json({ valid: false, error: 'Batas device tercapai.' });
      }
      await ref.update({
        [`devices/${deviceHash}`]: { boundAt: new Date().toISOString() },
        usedDevices: used + 1
      });
    }

    return res.status(200).json({
      valid: true,
      product: license.product,
      expiresAt: license.expiresAt
    });
  } catch (err) {
    console.error('Validate error:', err);
    return res.status(500).json({ valid: false, error: 'Server error.' });
  }
};
