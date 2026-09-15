# KyyyMods — License Manager

Sistem manajemen lisensi key: generate, validasi, device-lock, dan credit
system per user. Dibangun dengan HTML/CSS/JS statis + Vercel Serverless
Functions + Firebase Realtime Database.

## Kenapa strukturnya begini (penting dibaca)

**Config Firebase yang lu kasih di prompt awal (`apiKey`, `databaseURL`, dst)
itu format Client SDK** — dipakai kalau browser langsung baca/tulis ke
Firebase. Itu **tidak dipakai di project ini sama sekali**, karena:

1. Untuk auth custom (bukan Firebase Auth), verifikasi password **wajib**
   terjadi di server — kalau di client, kode & password hash bisa dibaca
   siapa pun lewat DevTools.
2. Firebase RTDB Security Rules di project ini di-set **tolak semua akses
   client** (lihat `firebase-rtdb.rules.json`). Semua baca/tulis data hanya
   lewat `/api/*` (serverless functions) yang pakai **Firebase Admin SDK**
   dengan service account — ini yang perlu lu setup di environment
   variables, bukan config yang lu kirim tadi.

Ini bukan soal "lebih aman dikit" — kombinasi custom-auth + client-side yang
lu minta di awal itu secara teknis nyaris mustahil diamankan kalau tetap
pakai Client SDK, karena verifikasi password harus kebuka ke browser. Jadi
gw ubah pendekatannya sesuai yang udah kita sepakati: custom auth + Vercel
serverless function.

## Setup

### 1. Ambil kredensial Admin SDK
Firebase Console → Project Settings → Service Accounts → **Generate New
Private Key**. Ini download file JSON — isinya `project_id`, `client_email`,
`private_key`.

### 2. Set environment variables di Vercel
Project Settings → Environment Variables, isi sesuai `.env.example`:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (termasuk `\n` literal, biarkan apa adanya — kode
  di `api/lib/firebase.js` sudah handle konversinya)
- `FIREBASE_DATABASE_URL`
- `JWT_SECRET` (generate baru, jangan pakai contoh)

### 3. Deploy Firebase Security Rules
Firebase Console → Realtime Database → Rules, paste isi
`firebase-rtdb.rules.json`, lalu Publish.

### 4. Buat admin pertama
Karena tidak ada halaman "daftar user" (sesuai requirement), admin pertama
harus dibuat manual. Opsi termudah: buka Firebase Console → Realtime
Database → tambahkan manual:

```
users/
  admin/
    passwordHash: "<hasil bcrypt>"
    role: "admin"
    disabled: false
```

Untuk generate `passwordHash`, jalankan lokal:
```bash
node -e "require('bcryptjs').hash('password-lu', 12).then(console.log)"
```

Setelah itu, admin ini bisa membuat user lain lewat halaman **Manajemen
User** — jadi manual hanya sekali di awal.

### 5. Deploy ke Vercel
```bash
npm install
vercel --prod
```

## Struktur

```
/api
  /auth       → login, logout, me (session check)
  /licenses   → create, list, reset-device, delete
  /users      → create, list, update, delete (admin only)
  /lib        → firebase.js (Admin SDK), auth.js (JWT + hashing + rate limit)
  validate.js → endpoint publik untuk aplikasi/software lu validasi key + device
/public
  /login, /dashboard, /licenses, /users, /account → halaman
  /css, /js   → shared styling & helpers
vercel.json   → clean URLs (/login bukan /login.html)
```

## Endpoint untuk software/aplikasi yang pakai lisensi ini

Dari aplikasi klien lu (bukan dashboard), panggil:

```
POST https://domain-lu.vercel.app/api/validate
Content-Type: application/json

{ "key": "DIMZ-XXXX-XXXX", "deviceId": "<id unik device>" }
```

`deviceId` boleh apa saja yang unik per perangkat (hardware ID, machine
GUID, dll) — di server otomatis di-hash sebelum disimpan.

## Batasan keamanan yang perlu lu tahu

- Rate limiting di kode ini **in-memory per instance serverless** — cukup
  buat speed bump, tapi kalau butuh proteksi brute-force yang serius,
  tambahkan Vercel Firewall (WAF) atau layanan seperti Upstash Ratelimit.
- Tidak ada sistem "lupa password" — reset password user lain lewat
  Firebase Console manual atau tambahkan endpoint admin baru kalau perlu.
- Untuk credit yang dipotong saat create key: sudah dicek & dipotong di
  server (bukan di JS client), jadi tidak bisa dimanipulasi dari browser.
