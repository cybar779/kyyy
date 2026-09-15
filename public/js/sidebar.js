function renderSidebar() {
  return `
    <button class="menu-toggle" aria-label="Buka menu">☰</button>
    <div class="sidebar-backdrop"></div>
    <aside class="sidebar">
      <div class="brand">Xem<span class="brand-accent">Modz</span></div>
      <nav>
        <a class="nav-item" href="/dashboard">🏠 Dasbor</a>
        <a class="nav-item" href="/licenses">📄 Manajer Lisensi</a>
        <a class="nav-item" href="/users" data-admin-only>➕ Tambahkan User</a>
        <a class="nav-item" href="/account">👤 Akun</a>
      </nav>
      <div class="sidebar-footer">
        <button class="btn-ghost" data-logout style="width:100%;">Keluar</button>
      </div>
    </aside>
  `;
}
