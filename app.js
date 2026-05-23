// File: app.js
// Ini adalah file startup utama untuk Node.js Selector di cPanel Jagoan Hosting.
// Silakan atur "Application startup file" di cPanel Anda ke: app.js

const fs = require('fs');
const path = require('path');

const compiledServerPath = path.join(__dirname, 'dist', 'server.cjs');

if (!fs.existsSync(compiledServerPath)) {
  console.error("=========================================================");
  console.error("ERROR: File kompilasi 'dist/server.cjs' tidak ditemukan.");
  console.error("Silakan jalankan 'npm run build' terlebih dahulu!");
  console.error("=========================================================");
  process.exit(1);
}

console.log("=========================================================");
console.log("Memulai Server Proxy Otakudesu / Antidraft di Jagoan Hosting...");
console.log("Memuat konfigurasi lingkungan dari .env...");
console.log("=========================================================");

// Jalankan server yang telah dikompilasi
require(compiledServerPath);
