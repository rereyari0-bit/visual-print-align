-- homelab_init.sql: struktur lengkap database Surat Perintah untuk Supabase self-hosted
-- Jalankan sekali di SQL Editor Supabase Studio homelab.

-- ===== 0000_create_personel_table.sql =====
CREATE TABLE public.personel (
  nrp text PRIMARY KEY,
  nama text NOT NULL,
  pangkat text NOT NULL,
  jabatan text NOT NULL
);

GRANT SELECT ON public.personel TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personel TO authenticated;
GRANT ALL ON public.personel TO service_role;

ALTER TABLE public.personel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Personel dapat dibaca siapa saja"
ON public.personel
FOR SELECT
TO anon, authenticated
USING (true);

INSERT INTO public.personel (nrp, nama, pangkat, jabatan) VALUES
  ('79120041', 'SURYANTO, SH.', 'AIPDA', 'Ps. KANIT I INTELKAM'),
  ('83040626', 'FAJRI WAHYUDIONO, SH.', 'BRIGADIR', 'ANGGOTA UNIT I INTELKAM');
-- ===== 0001_create_surat_perintah.sql =====
CREATE TABLE public.surat_perintah (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor text NOT NULL,
  tanggal date NOT NULL,
  tugas text NOT NULL DEFAULT '',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  penerima_nrp text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.surat_perintah TO anon, authenticated;
GRANT ALL ON public.surat_perintah TO service_role;
ALTER TABLE public.surat_perintah ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Surat dapat dibaca" ON public.surat_perintah FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Surat dapat dibuat" ON public.surat_perintah FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Surat dapat diubah" ON public.surat_perintah FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Surat dapat dihapus" ON public.surat_perintah FOR DELETE TO anon, authenticated USING (true);

GRANT SELECT, INSERT, UPDATE ON public.personel TO anon, authenticated;
GRANT ALL ON public.personel TO service_role;
CREATE POLICY "Personel dapat ditambah" ON public.personel FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Personel dapat diubah" ON public.personel FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
-- ===== 0002_create_profiles_and_roles.sql =====
create type public.app_role as enum ('admin', 'operator');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nama text not null default '',
  created_at timestamptz not null default now()
);

grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

alter table public.profiles enable row level security;

create policy "Pengguna membaca profil sendiri"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

create policy "Pengguna mengubah profil sendiri"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

create policy "Pengguna membaca peran sendiri"
  on public.user_roles for select to authenticated
  using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nama)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''));
  insert into public.user_roles (user_id, role) values (new.id, 'operator');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop policy if exists "Personel dapat dibaca siapa saja" on public.personel;
drop policy if exists "Personel dapat ditambah" on public.personel;
drop policy if exists "Personel dapat diubah" on public.personel;
drop policy if exists "Surat dapat dibaca" on public.surat_perintah;
drop policy if exists "Surat dapat dibuat" on public.surat_perintah;
drop policy if exists "Surat dapat dihapus" on public.surat_perintah;
drop policy if exists "Surat dapat diubah" on public.surat_perintah;

revoke all on public.personel from anon;
revoke all on public.surat_perintah from anon;

create policy "Personel dibaca pengguna login" on public.personel for select to authenticated using (true);
create policy "Personel ditambah pengguna login" on public.personel for insert to authenticated with check (true);
create policy "Personel diubah pengguna login" on public.personel for update to authenticated using (true) with check (true);

create policy "Surat dibaca pengguna login" on public.surat_perintah for select to authenticated using (true);
create policy "Surat dibuat pengguna login" on public.surat_perintah for insert to authenticated with check (true);
create policy "Surat diubah pengguna login" on public.surat_perintah for update to authenticated using (true) with check (true);
create policy "Surat dihapus pengguna login" on public.surat_perintah for delete to authenticated using (true);
-- ===== 0003_admin_role_policies.sql =====
DROP POLICY IF EXISTS "Personel ditambah pengguna login" ON public.personel;
DROP POLICY IF EXISTS "Personel diubah pengguna login" ON public.personel;
CREATE POLICY "Personel ditambah admin" ON public.personel FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Personel diubah admin" ON public.personel FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Personel dihapus admin" ON public.personel FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
GRANT DELETE ON public.personel TO authenticated;

DROP POLICY IF EXISTS "Surat dihapus pengguna login" ON public.surat_perintah;
CREATE POLICY "Surat dihapus admin" ON public.surat_perintah FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin membaca semua peran" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin menambah peran" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin menghapus peran" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') AND user_id <> auth.uid());
GRANT SELECT, INSERT, DELETE ON public.user_roles TO authenticated;

CREATE POLICY "Admin membaca semua profil" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
GRANT SELECT ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE(id uuid, email text, nama text, is_admin boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT u.id, u.email::text, coalesce(p.nama,''), public.has_role(u.id,'admin')
  FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY u.created_at
$$;
REVOKE ALL ON FUNCTION public.admin_list_users() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
-- ===== 0004_personel_auth_roles.sql =====
ALTER TABLE public.personel
  ADD COLUMN IF NOT EXISTS id uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS kriteria text NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'aktif',
  ADD COLUMN IF NOT EXISTS auth_user_id uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.personel ADD CONSTRAINT personel_id_key UNIQUE (id);
ALTER TABLE public.personel ADD CONSTRAINT personel_auth_user_id_key UNIQUE (auth_user_id);
ALTER TABLE public.personel ADD CONSTRAINT personel_kriteria_check CHECK (kriteria IN ('admin','maintenance','user'));
ALTER TABLE public.personel ADD CONSTRAINT personel_status_check CHECK (status IN ('aktif','nonaktif'));
ALTER TABLE public.personel ADD CONSTRAINT personel_nrp_format CHECK (nrp ~ '^[0-9A-Za-z.\-]{3,30}$');
ALTER TABLE public.personel ADD CONSTRAINT personel_email_format CHECK (email IS NULL OR email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');
CREATE UNIQUE INDEX personel_email_lower_key ON public.personel (lower(email));
CREATE INDEX personel_kriteria_status_idx ON public.personel (kriteria, status);

-- Identitas aktif pengguna yang login (tanpa rekursi RLS)
CREATE OR REPLACE FUNCTION public.current_kriteria()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT kriteria FROM public.personel
  WHERE auth_user_id = auth.uid() AND status = 'aktif' LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_active_personel(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.personel WHERE auth_user_id = _user_id AND status = 'aktif')
$$;

-- has_role kini bersumber dari data personil (admin = kriteria admin & aktif)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.personel
    WHERE auth_user_id = _user_id AND status = 'aktif'
      AND (_role::text = 'operator' OR kriteria = _role::text)
  )
$$;

-- Pengaitan akun: email diambil dari auth.users (terverifikasi), bukan dari frontend
CREATE OR REPLACE FUNCTION public.link_personel()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _email text; _k text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;
  SELECT lower(email::text) INTO _email FROM auth.users
   WHERE id = auth.uid() AND (email_confirmed_at IS NOT NULL OR last_sign_in_at IS NOT NULL);
  IF _email IS NULL THEN RETURN NULL; END IF;
  UPDATE public.personel SET auth_user_id = auth.uid()
   WHERE lower(email) = _email AND status = 'aktif' AND auth_user_id IS NULL;
  SELECT kriteria INTO _k FROM public.personel
   WHERE auth_user_id = auth.uid() AND status = 'aktif' AND lower(email) = _email;
  RETURN _k;
END $$;

REVOKE ALL ON FUNCTION public.link_personel() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_personel() TO authenticated;
REVOKE ALL ON FUNCTION public.current_kriteria() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_kriteria() TO authenticated;
REVOKE ALL ON FUNCTION public.is_active_personel(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_personel(uuid) TO authenticated;

-- Penjaga: auth_user_id tidak bisa diubah klien, ganti email memutus tautan, admin terakhir dilindungi
CREATE OR REPLACE FUNCTION public.personel_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.auth_user_id IS NOT NULL AND current_user IN ('authenticated','anon') THEN
      RAISE EXCEPTION 'auth_user_id tidak boleh diisi dari aplikasi';
    END IF;
    NEW.email := lower(NEW.email);
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id AND current_user IN ('authenticated','anon') THEN
      RAISE EXCEPTION 'auth_user_id tidak boleh diubah dari aplikasi';
    END IF;
    NEW.email := lower(NEW.email);
    IF NEW.email IS DISTINCT FROM OLD.email THEN NEW.auth_user_id := NULL; END IF;
    NEW.updated_at := now();
    IF OLD.kriteria = 'admin' AND OLD.status = 'aktif'
       AND (NEW.kriteria <> 'admin' OR NEW.status <> 'aktif')
       AND NOT EXISTS (SELECT 1 FROM public.personel WHERE nrp <> OLD.nrp AND kriteria='admin' AND status='aktif') THEN
      RAISE EXCEPTION 'Admin aktif terakhir tidak boleh diturunkan atau dinonaktifkan';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD.kriteria = 'admin' AND OLD.status = 'aktif'
     AND NOT EXISTS (SELECT 1 FROM public.personel WHERE nrp <> OLD.nrp AND kriteria='admin' AND status='aktif') THEN
    RAISE EXCEPTION 'Admin aktif terakhir tidak boleh dihapus';
  END IF;
  RETURN OLD;
END $$;

CREATE TRIGGER personel_guard_trg BEFORE INSERT OR UPDATE OR DELETE ON public.personel
FOR EACH ROW EXECUTE FUNCTION public.personel_guard();

-- RLS personel: hanya personil aktif yang membaca; admin terverifikasi yang menulis
DROP POLICY IF EXISTS "Personel dibaca pengguna login" ON public.personel;
CREATE POLICY "Personel dibaca personil aktif" ON public.personel FOR SELECT TO authenticated
  USING (public.is_active_personel(auth.uid()));

-- RLS surat: hanya personil aktif
DROP POLICY IF EXISTS "Surat dibaca pengguna login" ON public.surat_perintah;
DROP POLICY IF EXISTS "Surat dibuat pengguna login" ON public.surat_perintah;
DROP POLICY IF EXISTS "Surat diubah pengguna login" ON public.surat_perintah;
CREATE POLICY "Surat dibaca personil aktif" ON public.surat_perintah FOR SELECT TO authenticated
  USING (public.is_active_personel(auth.uid()));
CREATE POLICY "Surat dibuat personil aktif" ON public.surat_perintah FOR INSERT TO authenticated
  WITH CHECK (public.is_active_personel(auth.uid()));
CREATE POLICY "Surat diubah personil aktif" ON public.surat_perintah FOR UPDATE TO authenticated
  USING (public.is_active_personel(auth.uid())) WITH CHECK (public.is_active_personel(auth.uid()));

REVOKE ALL ON public.personel FROM anon;
REVOKE ALL ON public.surat_perintah FROM anon;