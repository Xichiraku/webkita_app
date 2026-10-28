cat > README.md << 'EOF'
# WebKita

## Deskripsi Umum Project

WebKita adalah aplikasi web dengan arsitektur **decoupled / REST API**, memisahkan backend dan frontend secara independen:

- **Backend**: REST API dibangun dengan [Hono](https://hono.dev/) dan berjalan di [Cloudflare Workers](https://workers.cloudflare.com/), menggunakan [Supabase](https://supabase.com/) sebagai database & autentikasi.
- **Frontend**: Single Page Application dibangun dengan [React](https://react.dev/) + [Vite](https://vitejs.dev/) dan [Tailwind CSS](https://tailwindcss.com/).

> WebKita adalah platform marketplace yang menghubungkan pemilik bisnis dengan developer profesional untuk pengerjaan proyek website. Target pengguna utama meliputi pelaku bisnis yang membutuhkan jasa pengembangan website serta developer/freelancer yang ingin menawarkan jasanya secara terpercaya. Fitur utama platform ini mencakup sistem pencocokan (matching) klien dengan developer, manajemen proyek pihak ketiga yang aman, serta jaminan keamanan transaksi untuk memastikan proyek berjalan lancar dari awal hingga selesai.

---

## Tech Stack

| Layer     | Teknologi                              |
|-----------|-----------------------------------------|
| Backend   | Hono, Cloudflare Workers, Wrangler      |
| Database  | Supabase (PostgreSQL)                   |
| Frontend  | React, Vite, Tailwind CSS               |
| Auth      | JWT                                      |
| Dev Tools | Docker, Docker Compose                  |

---

## Struktur Folder

-WEBKITA-APPLICATION/
├── backend/ # REST API (Hono + Cloudflare Workers)
│ ├── src/
│ │ ├── routes/
│ │ ├── services/
│ │ ├── middleware/
│ │ └── lib/
│ ├── .dev.vars # environment variable lokal (JANGAN commit)
│ └── wrangler.jsonc
├── frontend/ # Client app (React + Vite)
│ └── src/
├── docker-compose.yml
└── README.md

---

## Installation & Setup Guide

### Prasyarat

- Node.js v22 atau lebih baru
- Docker & Docker Compose (opsional, untuk menjalankan via container)
- Akun Supabase (untuk kredensial database)
- Wrangler CLI (untuk deploy ke Cloudflare Workers)

### 1. Clone Repository
git clone https://github.com/RikardoAnju/webkita_App.git
cd webkita_App

### 2. Menjalankan lokal dengan data demo

Perlu Node.js 22+ dan Docker Desktop aktif. Jalankan dari root project:

```powershell
npx supabase start
npx supabase db reset
```

`db reset` membuat schema lokal, paket harga demo, bucket lampiran, dan akun demo:

- Email: `demo@webkita.local`
- Password: `Demo1234!`

Backend terminal pertama (`backend`): ambil `SERVICE_ROLE_KEY` dari output `npx supabase status -o env`, lalu jalankan:

```powershell
npx wrangler dev --ip 0.0.0.0 --port 8787 --var "SUPABASE_URL:http://127.0.0.1:54321" --var "SUPABASE_SERVICE_ROLE_KEY:<SERVICE_ROLE_KEY>" --var "JWT_SECRET:webkita-local-dev-secret-change-before-deploy-2026" --var "RESEND_API_KEY:local-demo-no-email" --var "MAIL_FROM_EMAIL:noreply@webkita.local" --var "MAIL_FROM_NAME:WebKita" --var "APP_URL:http://localhost:5173" --var "MIDTRANS_SERVER_KEY:local-demo-no-payments" --var "MIDTRANS_IS_PRODUCTION:false"
```

Frontend terminal kedua (`frontend`):

```powershell
npm run dev -- --host 0.0.0.0 --port 5173
```

Buka `http://localhost:5173`. Email dan Midtrans hanya placeholder lokal; registrasi email dan pembayaran eksternal tidak aktif. Jangan gunakan JWT secret demo di production. Hentikan Supabase dengan `npx supabase stop`.

### 3. Menjalankan dengan Docker Compose

Jalankan Supabase lokal terlebih dahulu seperti langkah sebelumnya. Salin
`backend/.dev.vars.example` menjadi `backend/.dev.vars`, lalu isi
`SUPABASE_SERVICE_ROLE_KEY` dengan nilai dari `npx supabase status -o env`.
Untuk Docker, `SUPABASE_URL` harus tetap menggunakan
`http://host.docker.internal:54321` agar container backend bisa mengakses
Supabase yang berjalan di host Windows.

```powershell
docker compose up --build
```

Backend akan tersedia di `http://localhost:8787` dan frontend di `http://localhost:5173`.
Frontend mengakses API di `http://localhost:8787/api`. Email dan Midtrans pada
file contoh hanya placeholder lokal; registrasi email dan pembayaran eksternal
tidak aktif. Jangan gunakan secret demo di production.

### 4. Deploy ke Cloudflare Workers (Backend)
cd backend
npx wrangler deploy

---


## Daftar Kontributor / Pengembang Project

| Nama | Peran | Kontak |
|------|-------|--------|
| Rikardo Anju Sinaga | Full Stack | anjo24696@gmail.com|
