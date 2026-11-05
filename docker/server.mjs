// Menjalankan hasil build (dist/server/index.mjs) dengan Bun di Docker.
import app from "../dist/server/index.mjs";

const port = Number(process.env.PORT || 3000);
const ctx = { waitUntil() {}, passThroughOnException() {} };

Bun.serve({
  port,
  hostname: "0.0.0.0",
  fetch(req) {
    return app.fetch(req, process.env, { context: ctx, waitUntil: ctx.waitUntil });
  },
});

console.log(`Aplikasi Surat Perintah aktif di port ${port}`);
