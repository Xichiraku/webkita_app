# Panduan Menjalankan WEBKITA dari Awal

Panduan ini mengikuti urutan: **install tools → clone → Supabase lokal → backend → frontend → tes**.
Semua perintah memakai **PowerShell** (Windows). Kerjakan berurutan, satu langkah selesai baru lanjut.

---

## 1. Tools yang Dibutuhkan

| Tools | Versi | Fungsi | Cek dengan |
|---|---|---|---|
| Git | terbaru | clone repo | `git --version` |
| Node.js | **22 atau lebih baru** | backend, frontend, Supabase CLI | `node -v` |
| npm | ikut Node.js | install dependency | `npm -v` |
| Docker Desktop | terbaru, **harus aktif** | menjalankan Supabase lokal (dan opsional backend + frontend) | `docker --version` |

Tidak perlu install global: `supabase` dan `wrangler` dipanggil lewat `npx`.

Untuk deploy production (opsional, bukan untuk lokal):
- Akun Cloudflare (Workers)
- Akun Supabase (cloud)
- Akun Midtrans (Snap) dan Resend (email)

> Docker Desktop di Windows butuh WSL2/virtualisasi aktif. Pastikan ikon Docker sudah hijau ("Engine running") sebelum lanjut.

---

## 2. Clone Repository

```powershell
git clone https://github.com/RikardoAnju/webkita_App.git
cd webkita_App
```

Struktur penting:

```
webkita_App/
├── backend/            # Hono + Cloudflare Workers (port 8787)
│   ├── src/
│   ├── tests/          # tes backend
│   ├── .dev.vars.example
│   └── wrangler.jsonc
├── frontend/           # React + Vite + Tailwind (port 5173)
├── supabase/
│   ├── config.toml
│   ├── seed.sql                 # schema + data demo
│   └── update_2026_10_28.sql    # migrasi untuk database yang sudah ada
└── docker-compose.yml
```

---

## 3. Install Dependency

Dari root project:

```powershell
cd backend
npm install
cd ..\frontend
npm install
cd ..
```

---

## 4. Jalankan Supabase Lokal

Dari **root project** (`webkita_App`), pastikan Docker Desktop aktif:

```powershell
npx supabase start
npx supabase db reset
```

- `start` pertama kali mengunduh beberapa image Docker, jadi bisa beberapa menit.
- `db reset` membuat ulang database dari `supabase/seed.sql`: tabel, paket harga, bucket lampiran, dan akun demo.
- **Perhatian:** `db reset` menghapus semua data di database lokal.

Akun demo setelah reset:

| Peran | Email | Password |
|---|---|---|
| User | `demo@webkita.local` | `Demo1234!` |
| Admin | `admin@webkita.local` | `Admin1234!` |

Ambil **service role key** (dipakai backend):

```powershell
npx supabase status -o env
```

Salin nilai `SERVICE_ROLE_KEY`. Jangan dibagikan atau di-commit.

Port Supabase lokal: API `54321`, database `54322`, Studio `54323` (buka `http://127.0.0.1:54323` untuk melihat tabel).

---

## 5. Jalankan Backend dan Frontend

Pilih **salah satu**: cara A (Docker Compose) atau cara B (manual dua terminal).

### Cara A: Docker Compose

1. Salin file environment:

   ```powershell
   copy backend\.dev.vars.example backend\.dev.vars
   ```

2. Buka `backend\.dev.vars`, ganti `SUPABASE_SERVICE_ROLE_KEY` dengan nilai dari langkah 4. Nilai lain boleh dibiarkan untuk lokal:

   ```ini
   SUPABASE_URL=http://host.docker.internal:54321
   SUPABASE_SERVICE_ROLE_KEY=<isi dari supabase status>
   JWT_SECRET=<minimal 32 karakter, bebas untuk lokal>
   RESEND_API_KEY=local-demo-no-email
   MAIL_FROM_EMAIL=noreply@webkita.local
   MAIL_FROM_NAME=WebKita
   APP_URL=http://localhost:5173
   MIDTRANS_SERVER_KEY=local-demo-no-payments
   MIDTRANS_IS_PRODUCTION=false
   ```

   `SUPABASE_URL` harus tetap `host.docker.internal`, supaya container backend bisa menjangkau Supabase di Windows.

3. Jalankan dari root project:

   ```powershell
   docker compose up --build
   ```

4. Setelah mengubah kode backend, restart dengan `docker compose restart backend`.

### Cara B: Manual (tanpa Docker untuk app)

**Terminal 1: backend** (folder `backend`). Ganti `<SERVICE_ROLE_KEY>`:

```powershell
cd backend
npx wrangler dev --ip 0.0.0.0 --port 8787 `
  --var "SUPABASE_URL:http://127.0.0.1:54321" `
  --var "SUPABASE_SERVICE_ROLE_KEY:<SERVICE_ROLE_KEY>" `
  --var "JWT_SECRET:webkita-local-dev-secret-change-before-deploy-2026" `
  --var "RESEND_API_KEY:local-demo-no-email" `
  --var "MAIL_FROM_EMAIL:noreply@webkita.local" `
  --var "MAIL_FROM_NAME:WebKita" `
  --var "APP_URL:http://localhost:5173" `
  --var "MIDTRANS_SERVER_KEY:local-demo-no-payments" `
  --var "MIDTRANS_IS_PRODUCTION:false"
```

**Terminal 2: frontend** (folder `frontend`):

```powershell
cd frontend
npm run dev -- --host 0.0.0.0 --port 5173
```

---

## 6. Cek Hasilnya

| Yang dicek | Perintah / alamat | Hasil yang benar |
|---|---|---|
| Frontend | `http://localhost:5173` | halaman beranda tampil |
| Backend hidup | `curl http://localhost:8787/api/health` | respons sukses |
| Paket harga publik | `curl http://localhost:8787/api/pricing/public` | daftar paket; paket **Enterprise** punya `"max_price":null` |
| Login | buka `/login`, masuk dengan akun demo | masuk ke dashboard |

`/api/pricing` (tanpa `/public`) memang membalas `401`, karena khusus admin.

---

## 7. Database yang Sudah Ada (Bukan Reset)

Kalau kamu **tidak** menjalankan `db reset` (misal memakai Supabase cloud atau data yang mau dipertahankan), jalankan migrasi sekali:

1. Buka **SQL Editor** di dashboard Supabase (atau Studio lokal di `http://127.0.0.1:54323`).
2. Paste seluruh isi `supabase/update_2026_10_28.sql`, lalu **Run**.

File ini aman dijalankan berulang. Isinya: kolom alasan penolakan, nomor dan tanggal invoice, tanggal bayar dan referensi pembayaran, hitungan percobaan OTP, `max_price` boleh kosong, serta pembatasan nilai status proyek. Restart backend setelahnya.

---

## 8. Menjalankan Tes Backend

```powershell
cd backend
npx tsx tests/backend.test.ts
```

Hasil yang benar: `36 tes lolos`. Tes memakai database tiruan di memori, jadi **tidak butuh** Supabase atau Docker, dan tidak membuktikan integrasi dengan Supabase atau Midtrans asli.

Cek tipe TypeScript:

```powershell
npx tsc --noEmit -p .
```

---

## 9. Mengaktifkan Email dan Pembayaran (Opsional)

Di lokal, email dan Midtrans hanya placeholder, jadi **registrasi lewat email dan pembayaran tidak aktif**. Untuk mengaktifkannya, ganti nilai di `.dev.vars`:

| Variabel | Isi |
|---|---|
| `RESEND_API_KEY` | API key dari Resend (kirim email verifikasi dan OTP) |
| `MAIL_FROM_EMAIL` | alamat pengirim yang sudah diverifikasi di Resend |
| `MIDTRANS_SERVER_KEY` | Server Key **Sandbox** dari dashboard Midtrans |
| `MIDTRANS_IS_PRODUCTION` | `false` untuk sandbox |

Webhook Midtrans butuh URL publik. Untuk tes lokal pakai tunnel (misalnya `cloudflared`), lalu isi *Payment Notification URL* di dashboard Midtrans dengan `https://<url-tunnel>/api/payment/notification`. Backend menolak notifikasi dengan signature salah (HTTP 403).

---

## 10. Menghentikan dan Mengulang

```powershell
docker compose down      # hentikan backend + frontend (jika pakai Compose)
npx supabase stop        # hentikan Supabase lokal
```

Mulai ulang dari bersih: `npx supabase db reset`.

---

## 11. Masalah Umum

| Gejala | Penyebab | Solusi |
|---|---|---|
| `docker: command not found` / error koneksi daemon | Docker Desktop belum aktif | buka Docker Desktop, tunggu "Engine running" |
| Backend `401 Unauthorized` di semua endpoint | `JWT_SECRET` belum diisi atau token lama | login ulang; pastikan `.dev.vars` terisi |
| Backend tidak bisa konek database | `SUPABASE_URL` salah | Compose: `http://host.docker.internal:54321`; manual: `http://127.0.0.1:54321` |
| Error kolom `reject_reason` / `invoice_number` / `paid_at` tidak ada | migrasi belum dijalankan | jalankan `db reset` atau `update_2026_10_28.sql` (bagian 7) |
| Perubahan kode backend tidak terbaca | container memakai kode lama | `docker compose restart backend` |
| Port 8787 / 5173 / 54321 sudah dipakai | proses lain memakai port itu | hentikan prosesnya atau ganti port |
| Registrasi tidak mengirim email | `RESEND_API_KEY` masih placeholder | wajar di lokal; pakai akun demo, atau lihat bagian 9 |
| Tombol bayar gagal | `MIDTRANS_SERVER_KEY` masih placeholder | wajar di lokal; lihat bagian 9 |

---

## 12. Deploy Backend ke Cloudflare Workers (Production)

```powershell
cd backend
npx wrangler login
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put JWT_SECRET
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put MIDTRANS_SERVER_KEY
npx wrangler deploy
```

Variabel non-rahasia (`MAIL_FROM_EMAIL`, `MAIL_FROM_NAME`, `APP_URL`, `MIDTRANS_IS_PRODUCTION`) sudah ada di `wrangler.jsonc`; sesuaikan `APP_URL` dan `MIDTRANS_IS_PRODUCTION` untuk production. Jalankan `update_2026_10_28.sql` di database production **sebelum** deploy. Jangan pernah memakai JWT secret demo di production.
