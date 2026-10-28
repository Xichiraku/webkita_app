-- =====================================================================
-- Pembaruan skema WebKita (28 Okt 2026) — aman dijalankan berulang.
-- Dipakai untuk database yang SUDAH ada (Supabase cloud / lokal lama).
-- Database baru cukup `npx supabase db reset` (isinya sudah ada di seed.sql).
-- =====================================================================

-- 1) Alasan penolakan orderan + invoice yang diterbitkan saat harga ditetapkan
alter table public.projects add column if not exists reject_reason text;
alter table public.projects add column if not exists invoice_number text;
alter table public.projects add column if not exists invoice_issued_at timestamptz;

-- 2) Detail pembayaran (tanggal bayar, referensi Midtrans)
alter table public.payments add column if not exists paid_at timestamptz;
alter table public.payments add column if not exists transaction_id text;
alter table public.payments add column if not exists payment_type text;

-- 3) Batas percobaan OTP reset password
alter table public.users add column if not exists reset_otp_attempts integer not null default 0;

-- 4) Paket tanpa batas atas: max_price boleh NULL
alter table public.pricing_plans alter column max_price drop not null;

-- 5) Status orderan hanya boleh salah satu nilai yang dikenal backend
do $$
begin
  alter table public.projects
    add constraint projects_status_check
    check (status in ('pending', 'approved', 'process', 'done', 'rejected'));
exception when duplicate_object then null;
end $$;

-- 6) Isi data lama
--    a. Orderan yang harganya sudah ditetapkan tetapi belum punya invoice
update public.projects
set invoice_issued_at = coalesce(updated_at, created_at),
    invoice_number = 'INV-' || lpad(id::text, 4, '0') || '-' || extract(year from coalesce(updated_at, created_at))::int
where plan_price_range is not null
  and plan_price_range <> ''
  and invoice_issued_at is null;

--    b. Pembayaran lunas lama: tanggal bayar = waktu terakhir diubah
update public.payments
set paid_at = updated_at
where status = 'paid' and paid_at is null;

--    c. Paket "Mulai Rp …" (tanpa batas atas) yang dulu disimpan dengan max_price 100 juta → NULL
update public.pricing_plans
set max_price = null
where price_range ilike 'mulai%' and max_price is not null;
