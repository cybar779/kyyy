// Shared helpers used across dashboard pages. No Firebase config lives here —
// all data access goes through /api/* endpoints which run server-side.

async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    credentials: 'same-origin'
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan.');
  return data;
}

async function requireSession() {
  try {
    const { user } = await apiFetch('/api/auth/me');
    return user;
  } catch {
    window.location.href = '/login';
    return null;
  }
}

function initSidebar(role) {
  const path = window.location.pathname.replace(/\/$/, '') || '/dashboard';
  document.querySelectorAll('.nav-item').forEach(el => {
    if (el.getAttribute('href') === path) el.classList.add('active');
  });
  if (role !== 'admin') {
    document.querySelectorAll('[data-admin-only]').forEach(el => el.remove());
  }

  const toggle = document.querySelector('.menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  const backdrop = document.querySelector('.sidebar-backdrop');
  if (toggle && sidebar && backdrop) {
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      backdrop.classList.toggle('show');
    });
    backdrop.addEventListener('click', () => {
      sidebar.classList.remove('open');
      backdrop.classList.remove('show');
    });
  }

  const logoutBtn = document.querySelector('[data-logout]');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await apiFetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    });
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}
