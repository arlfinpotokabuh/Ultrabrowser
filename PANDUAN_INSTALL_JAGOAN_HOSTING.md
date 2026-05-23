# 🚀 PANDUAN DEPLOY & INSTALASI DI NODE.JS JAGOAN HOSTING

Panduan ini dirancang khusus untuk membantu Anda melakukan deploy aplikasi web full-stack (React + Express Server) ini di server Node.js **Jagoan Hosting** menggunakan fitur **Setup Node.js App** di cPanel secara mulus tanpa kendala.

---

## 📋 PERSYARATAN UTAMA

Sebelum memulai, pastikan hosting Anda memenuhi persyaratan minimum berikut:
1. **Node.js Selector** aktif di cPanel Jagoan Hosting Anda.
2. **Versi Node.js**: Sangat direkomendasikan menggunakan **Node.js v20.x** (atau minimum v18.x).
3. **Koneksi SSH** (Opsional, tapi sangat disarankan agar Anda bisa mengakses terminal dengan mudah jika panel cPanel lambat).

---

## 🛠️ LANGKAH-LANGKAH INSTALASI DAN DEPLOYMENT

### Langkah 1: Persiapan & Upload Source Code
1. Ekspor atau unduh source code aplikasi ini dari **AI Studio (Settings -> Export ZIP)**.
2. Unggah file ZIP tersebut ke hosting Anda melalui **cPanel File Manager** ke direktori tujuan (misalnya `/home/username/browser-app` atau `/home/username/public_html/browser`).
   - *Rekomendasi Keamanan: Letakkan file source-code di luar direktori utama `public_html` untuk menjaga keamanan file konfigurasi backend.*
3. Ekstrak file ZIP di direktori tersebut.
4. Pastikan file `.env` (atau salinan dari `.env.example`) sudah berisi konfigurasi yang tepat di folder tujuan Anda.

---

### Langkah 2: Konfigurasi "Setup Node.js App" di cPanel
1. Masuk ke halaman utama cPanel Jagoan Hosting Anda.
2. Pada kolom pencarian atau di bagian *Software*, cari dan pilih **Setup Node.js App**.
3. Klik tombol **Create Application** di sebelah kanan atas.
4. Isi data konfigurasi aplikasi Anda sebagai berikut:
   - **Node.js Version**: Pilih **20.x** atau **22.x** (Versi LTS terbaru yang stabil).
   - **Application Mode**: Pilih **production**.
   - **Application Root**: Jalur relatif folder tempat Anda mengekstrak source code tadi (misal: `browser-app`).
   - **Application URL**: Pilih domain atau subdomain Anda (misal: `https://browserku.com`).
   - **Application Startup File**: Masukkan **`app.js`** *(Catatan: File `app.js` ini telah kami sediakan di dalam folder root sebagai jembatan pembuka untuk mendeteksi runtime `dist/server.cjs` hasil kompilasi secara instan).*
5. Klik **Create** untuk mengaktifkan konfigurasi.

---

### Langkah 3: Mengunduh Dependensi & Melakukan Build (Terminal)
Setelah aplikasi dibuat, Anda wajib mengunduh dependensi (libraries) dan mengompilasi kode React frontend dan Express backend agar siap dijalankan ke mode production.

#### Cara A: Menggunakan Salinan Perintah Virtual Environment (Mudah)
1. Setelah mengklik **Create Application**, pada bagian atas halaman konfigurasi Node.js Anda akan melihat baris teks bertuliskan:
   `Enter to the virtual environment. To enter to the virtual environment, run the following command:`
2. **Salin perintah** yang ada di bawah teks tersebut (misal: `source /home/username/nodevenv/browser-app/20/bin/activate && cd /home/username/browser-app`).
3. Buka menu **Terminal** di cPanel Anda (atau gunakan koneksi SSH Anda).
4. Tempel perintah tersebut di terminal lalu tekan **Enter**. Anda sekarang berada di lingkungan virtual Node.js yang tepat.
5. Jalankan perintah instalasi dependensi:
   ```bash
   npm install
   ```
6. Jalankan perintah kompilasi produksi (build script):
   ```bash
   npm run build
   ```
   *Proses ini secara otomatis akan:*
   - Membangun aset-aset React frontend yang dioptimasi ke folder `dist/`.
   - Mengompilasi dan mengemas file server backend TypeScript Anda (`server.ts`) menjadi satu berkas JavaScript murni berperforma tinggi, yaitu `dist/server.cjs`.

#### Cara B: Menggunakan GUI di Node.js App Selector cPanel
Jika Anda tidak ingin membuka Terminal, Anda bisa melakukannya langsung lewat panel cPanel:
1. Gulir ke bawah pada konfigurasi aplikasi Node.js Anda.
2. Klik tombol **Run JS build** atau gunakan **npm install** lewat kolom command yang tersedia pada GUI. Namun, menjalankan perintah lewat **Terminal cPanel (Cara A)** jauh lebih disarankan karena progres instalasi dapat terlihat secara real-time dan mencegah browser timeout.

---

### Langkah 4: Menjalankan Aplikasi & Restart
Aplikasi Node.js membutuhkan pemuatan ulang agar dapat mendeteksi file build baru yang telah bersarang sempurna di folder `dist`.
1. Kembali ke halaman **Setup Node.js App** di cPanel Anda.
2. Cari nama aplikasi Anda dan klik tombol **Restart** (Ikon panah melingkar hijau/biru).
3. Selesai! Sambangi url domain atau subdomain Anda. Aplikasi browser portabel multiprososor Anda yang luar besar, aman, serta dilengkapi VPN cookie loader & media downloader cadangan kini siap digunakan seumur hidup.

---

## ⚠️ CATATAN KHUSUS & RECOVERY ERROR DI JAGOAN HOSTING

### 1. File Eksekusi `yt-dlp` Mengalami Error Permission
Jika pengunduh video media sosial memberikan pesan kesalahan permission, pastikan hak akses berkas eksekusi `yt-dlp` sudah disetel ke `755`.
- **Solusi**: Di terminal virtual environment, ketik:
  ```bash
  chmod 755 ./yt-dlp
  chmod 755 ./yt-dlp-nightly
  ```
- Atau ubah permission secara grafis dengan klik kanan file `yt-dlp` di **cPanel File Manager**, pilih **Change Permissions**, lalu centang seluruh kotak **Execute** sehingga nilainya menjadi `755`.

### 2. Error Out Of Memory (OOM) Selama Kueri `npm run build`
Beberapa paket hosting murah di Jagoan Hosting membatasi memori (RAM) hingga 512MB / 1GB. Jika build terhenti karena RAM penuh (heap memory out):
- **Solusi**: Sebelum meletakkannya di server hosting, jalankan `npm install` dan `npm run build` terlebih dahulu di **laptop/komputer lokal Anda**. Setelah itu, unggah folder `dist` dan folder `node_modules` Anda langsung ke server cPanel menggunakan File Manager Anda.

### 3. Masalah Cloud VPN / SOCKS Proxy Mati
Kami telah menambahkan fitur **CroxyProxy** di panel VPN Screen sebagai pintu gerbang server cadangan darurat jika SOCKS / VPN server Anda mengalami problem. Anda dapat mengklik tombol "Buka Proxy" untuk berpindah ke link bypass pihak ketiga secara mulus.

---

**Selamat Berkreasi! Aplikasi Anda siap Go-Live 🚀**
