const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = 'kyyy_session';

function signSession(user) {
  return jwt.sign(
    { uid: user.uid, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

function setSessionCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  res.setHeader('Set-Cookie',
    `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=43200; SameSite=Strict${isProd ? '; Secure' : ''}`
  );
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict`);
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return Object.fromEntries(
    header.split(';').filter(Boolean).map(c => {
      const [k, ...v] = c.trim().split('=');
      return [k, decodeURIComponent(v.join('='))];
    })
  );
}

// Verifies the session cookie and returns the decoded user, or null.
function getSession(req) {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// Wraps an API handler to require a valid session. Optionally restrict to a role.
function requireAuth(handler, { role } = {}) {
  return async (req, res) => {
    const session = getSession(req);
    if (!session) {
      return res.status(401).json({ error: 'Sesi tidak valid, silakan login ulang.' });
    }
    if (role && session.role !== role) {
      return res.status(403).json({ error: 'Akses ditolak.' });
    }
    req.user = session;
    return handler(req, res);
  };
}

async function hashPassword(plain) {
  return bcrypt.hash(plain, 12);
}

async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// Very simple in-memory rate limiter per serverless instance.
// Good enough as a speed bump; for real protection pair with Vercel Firewall / Upstash.
const attempts = new Map();
function rateLimit(key, { max = 5, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const entry = attempts.get(key) || { count: 0, reset: now + windowMs };
  if (now > entry.reset) {
    entry.count = 0;
    entry.reset = now + windowMs;
  }
  entry.count += 1;
  attempts.set(key, entry);
  return entry.count <= max;
}

module.exports = {
  signSession, setSessionCookie, clearSessionCookie,
  getSession, requireAuth, hashPassword, verifyPassword, rateLimit
};
