#!/usr/bin/env bun
/**
 * generate-jwt-keys.mjs
 * Generate JWT_SECRET, ANON_KEY, dan SERVICE_ROLE_KEY untuk Supabase self-hosted.
 *
 * Jalankan dari root proyek:
 *   bun docker/generate-jwt-keys.mjs
 *
 * Atau dari folder docker/:
 *   bun generate-jwt-keys.mjs
 *
 * Output:
 *   - Ditampilkan di terminal
 *   - Disimpan ke docker/.env.homelab.keys  (JANGAN di-commit ke git!)
 */

import { createHmac, randomBytes } from "crypto";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function base64url(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signJWT(payload, secret) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const sig = createHmac("sha256", secret).update(data).digest();
  return `${data}.${base64url(sig)}`;
}

// ─── Generate ─────────────────────────────────────────────────────────────────

// 48 random bytes → hex = 96 karakter (jauh di atas minimum 32 karakter Supabase)
const jwtSecret = randomBytes(48).toString("hex");

const iat = Math.floor(Date.now() / 1000);
const exp = iat + 10 * 365 * 24 * 60 * 60; // berlaku 10 tahun

const anonKey = signJWT(
  { role: "anon", iss: "supabase", iat, exp },
  jwtSecret
);
const serviceRoleKey = signJWT(
  { role: "service_role", iss: "supabase", iat, exp },
  jwtSecret
);

// ─── Output ───────────────────────────────────────────────────────────────────

const divider = "─".repeat(64);
const timestamp = new Date().toISOString();

const keysBlock = `
${divider}
  Supabase JWT Keys  —  dibuat: ${timestamp}
${divider}

[1] Untuk file .env Supabase docker (supabase/docker/.env)
    Tambahkan / ganti baris berikut:

POSTGRES_PASSWORD=ganti_dengan_password_postgres_kuat
JWT_SECRET=${jwtSecret}
ANON_KEY=${anonKey}
SERVICE_ROLE_KEY=${serviceRoleKey}
DASHBOARD_USERNAME=supabase
DASHBOARD_PASSWORD=ganti_dengan_password_dashboard
API_EXTERNAL_URL=http://10.10.30.32:8000
SUPABASE_PUBLIC_URL=http://10.10.30.32:8000

${divider}

[2] Untuk file .env aplikasi web (di sebelah docker-compose.yml)
    Buat file .env dengan isi:

SUPABASE_ANON_KEY=${anonKey}
SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}

${divider}
`;

console.log(keysBlock);

// Simpan ke file
const outPath = join(__dirname, ".env.homelab.keys");
const fileContent = `# Supabase JWT Keys — dibuat: ${timestamp}
# JANGAN commit file ini ke git!
# Salin nilai-nilai di bawah ke file .env yang sesuai.

# ── Untuk supabase/docker/.env ──────────────────────────────────────────────
JWT_SECRET=${jwtSecret}
ANON_KEY=${anonKey}
SERVICE_ROLE_KEY=${serviceRoleKey}
API_EXTERNAL_URL=http://10.10.30.32:8000
SUPABASE_PUBLIC_URL=http://10.10.30.32:8000

# ── Untuk .env aplikasi web (di sebelah docker-compose.yml) ─────────────────
SUPABASE_ANON_KEY=${anonKey}
SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}
`;

writeFileSync(outPath, fileContent, "utf8");

console.log(`✅  Keys disimpan ke:  docker/.env.homelab.keys`);
console.log(`⚠️   File ini sudah ada di .gitignore — JANGAN dibagikan!\n`);

