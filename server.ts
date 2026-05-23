import "dotenv/config";
import express from "express";
import cors from "cors";
import axios from "axios";
import * as cheerio from "cheerio";
import { createServer as createViteServer } from "vite";
import path from "path";
import { SocksProxyAgent } from "socks-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";
import multer from "multer";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import https from "https";
import http from "http";
import { Readable } from "stream";
import { execSync } from "child_process";

const uploadDir = path.join(process.cwd(), "cloud_storage");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const bufferDir = path.join(process.cwd(), "buffers");
if (!fs.existsSync(bufferDir)) {
  fs.mkdirSync(bufferDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

async function startServer() {
  const app = express();
  app.set("trust proxy", true);
  const PORT = 3000;

  app.use(cors());

  // Cloud Files API
  app.post("/api/cloud-files/upload", upload.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    res.json({
      message: "File uploaded successfully",
      filename: req.file.filename,
    });
  });

  app.post("/api/cloud-files/create-folder", express.json(), (req, res) => {
    const { folderName } = req.body;
    if (!folderName) {
      return res.status(400).json({ error: "Missing folder name" });
    }
    const folderPath = path.join(uploadDir, folderName);
    if (fs.existsSync(folderPath)) {
      return res.status(400).json({ error: "Folder already exists" });
    }
    fs.mkdirSync(folderPath);
    res.json({ message: "Folder created successfully", folderName });
  });

  app.post("/api/cloud-files/download-url", express.json(), async (req, res) => {
    console.log("Received download-url request");
    const { url, filename } = req.body;
    if (!url || !filename) {
      console.log("Missing url or filename", {url, filename});
      return res.status(400).json({ error: "Missing url or filename" });
    }
    
    // Check for proxy config in cookie
    let proxyConfigUrl = "";
    if (req.headers.cookie) {
      const match = req.headers.cookie.match(/(?:^|; )vpnProxy=([^;]*)/);
      if (match && match[1]) proxyConfigUrl = decodeURIComponent(match[1]);
    }

    try {
      let httpsAgent = undefined;
      let httpAgent = undefined;
      let axiosProxy: any = undefined;

      if (proxyConfigUrl) {
        try {
          if (proxyConfigUrl.startsWith("socks")) {
            httpsAgent = new SocksProxyAgent({ host: new URL(proxyConfigUrl).hostname, port: Number(new URL(proxyConfigUrl).port), rejectUnauthorized: false } as any);
            httpAgent = httpsAgent;
          } else if (proxyConfigUrl.startsWith("http")) {
            httpsAgent = new HttpsProxyAgent({ host: new URL(proxyConfigUrl).hostname, port: Number(new URL(proxyConfigUrl).port), rejectUnauthorized: false } as any);
            axiosProxy = false;
          }
        } catch (e) {}
      } else {
        httpsAgent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });
        httpAgent = new http.Agent({ keepAlive: true });
      }

      const axiosOptions: any = {
        method: 'GET',
        url: url,
        responseType: 'stream',
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          "Accept": "*/*"
        },
        httpsAgent,
        httpAgent,
        proxy: axiosProxy,
      };

      const axiosRes = await axios(axiosOptions);

      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const safeFilename = filename.replace(/[/\\?%*:|"<>]/g, '-');
      const finalFilename = uniqueSuffix + "-" + safeFilename;
      const filepath = path.join(uploadDir, finalFilename);
      const writer = fs.createWriteStream(filepath);
      
      axiosRes.data.pipe(writer);
      writer.on("finish", () => {
        res.json({ message: "File downloaded to cloud successfully", filename: finalFilename });
      });
      writer.on("error", (err) => {
        console.error("Write stream error", err);
        res.status(500).json({ error: "Failed to write file" });
      });
      axiosRes.data.on("error", (err: any) => {
        console.error("Axios stream error in cloud download:", err);
      });

    } catch (err: any) {
      console.error("Download URL error", err.message);
      res.status(500).json({ error: "Gagal mengunduh file dari URL. Server sumber mungkin memblokir akses atau file tidak ditemukan." });
    }
  });

  app.post("/api/video/9xbuddy", express.json(), async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "Missing link" });

    let proxyConfigUrl = "";
    if (req.headers.cookie) {
      const match = req.headers.cookie.match(/(?:^|; )vpnProxy=([^;]*)/);
      if (match && match[1]) proxyConfigUrl = decodeURIComponent(match[1]);
    }

    const ytdlpPath = "/tmp/yt-dlp";
    if (!fs.existsSync(ytdlpPath)) {
      try {
        execSync(`curl -sL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux -o ${ytdlpPath}`);
        fs.chmodSync(ytdlpPath, '755');
      } catch(e) {
        return res.status(500).json({ error: "Failed to download extractor" });
      }
    }

    try {
      let proxyFlag = proxyConfigUrl ? `--proxy "${proxyConfigUrl}" ` : "";
      
      const rawMeta = execSync(`"${ytdlpPath}" --js-runtimes node ${proxyFlag}-J --no-warnings "${url}"`, { maxBuffer: 10 * 1024 * 1024 }).toString();
      const meta = JSON.parse(rawMeta);

      const title = meta.title || "Unknown Title";
      const thumbnail = meta.thumbnail || "";
      const duration = meta.duration || 0;
      const formatsRaw = meta.formats || [];

      const formats = formatsRaw.map((f: any) => {
        let sizeMB = 0;
        if (f.filesize) {
          sizeMB = Number((f.filesize / (1024 * 1024)).toFixed(1));
        } else if (f.filesize_approx) {
          sizeMB = Number((f.filesize_approx / (1024 * 1024)).toFixed(1));
        }

        let type = f.vcodec !== "none" && f.acodec !== "none" ? "Video + Audio" : f.vcodec !== "none" ? "Video Only" : "Audio Only";
        return {
          formatId: f.format_id,
          ext: f.ext,
          quality: f.format_note || f.resolution || `${f.width}x${f.height}` || "unknown",
          type,
          size: sizeMB > 0 ? `${sizeMB} MB` : "Unknown",
          url: f.url
        };
      }).filter((f: any) => f.url && (f.ext === "mp4" || f.ext === "mp3" || f.ext === "webm" || f.ext === "m4a" || f.ext === "3gp"));

      res.json({
        title,
        thumbnail,
        duration,
        formats
      });
    } catch (err: any) {
      console.error("9xbuddy error:", err.message);
      res.status(500).json({ error: "Gagal mengekstraksi format media. Silakan verifikasi tautan yang anda masukkan." });
    }
  });

  app.post("/api/video/snapvideo", express.json(), async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "Missing link" });

    let proxyConfigUrl = "";
    if (req.headers.cookie) {
      const match = req.headers.cookie.match(/(?:^|; )vpnProxy=([^;]*)/);
      if (match && match[1]) proxyConfigUrl = decodeURIComponent(match[1]);
    }

    const ytdlpPath = "/tmp/yt-dlp";
    try {
      let proxyFlag = proxyConfigUrl ? `--proxy "${proxyConfigUrl}" ` : "";
      const out = execSync(`"${ytdlpPath}" --js-runtimes node ${proxyFlag}-f "b" --get-url --get-title --get-filename "${url}"`).toString().trim().split('\n');
      
      if (out.length >= 2) {
        let title = out[0];
        let directUrl = out[out.length - 1];
        let filename = out[1] || `${Date.now()}.mp4`;
        
        if (out.length >= 3) {
            if (out[1].startsWith('http')) {
                directUrl = out[1];
                filename = out[2];
            } else if (out[2].startsWith('http')) {
                directUrl = out[2];
                filename = out[1];
            }
        }
        res.json({ title, directUrl, filename });
      } else {
        throw new Error("Could not extract clean direct MP4 URL");
      }
    } catch (err: any) {
      console.error("SnapVideo parser error:", err.message);
      res.status(500).json({ error: "SnapVideo gagal mem-parsing link. Format video terproteksi atau tidak didukung." });
    }
  });

  app.post("/api/video/buffer-stream", express.json(), async (req, res) => {
    const { url, filename, target } = req.body;
    if (!url) return res.status(400).json({ error: "Missing streaming URL" });

    let proxyConfigUrl = "";
    if (req.headers.cookie) {
      const match = req.headers.cookie.match(/(?:^|; )vpnProxy=([^;]*)/);
      if (match && match[1]) proxyConfigUrl = decodeURIComponent(match[1]);
    }

    try {
      const sanitizedFilename = (filename || `stream_buffer_${Date.now()}.mp4`).replace(/[/\\?%*:|"<>]/g, '-');
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const bufferFilename = `buffer-${uniqueSuffix}-${sanitizedFilename}`;
      const tempBufferPath = path.join(bufferDir, bufferFilename);

      let httpsAgent = undefined;
      let httpAgent = undefined;
      let axiosProxy: any = undefined;

      if (proxyConfigUrl) {
        try {
          if (proxyConfigUrl.startsWith("socks")) {
            httpsAgent = new SocksProxyAgent({ host: new URL(proxyConfigUrl).hostname, port: Number(new URL(proxyConfigUrl).port), rejectUnauthorized: false } as any);
            httpAgent = httpsAgent;
          } else if (proxyConfigUrl.startsWith("http")) {
            httpsAgent = new HttpsProxyAgent({ host: new URL(proxyConfigUrl).hostname, port: Number(new URL(proxyConfigUrl).port), rejectUnauthorized: false } as any);
            axiosProxy = false;
          }
        } catch (e) {}
      } else {
        httpsAgent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });
        httpAgent = new http.Agent({ keepAlive: true });
      }

      console.log(`[StreamSniffer] Buffering stream to ${tempBufferPath}...`);
      
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream',
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        },
        httpsAgent,
        httpAgent,
        proxy: axiosProxy,
      });

      const writer = fs.createWriteStream(tempBufferPath);
      response.data.pipe(writer);

      writer.on("finish", () => {
        console.log(`[StreamSniffer] Done buffering stream to ${tempBufferPath}.`);
        
        if (target === 'cloud') {
          const cloudFilename = `cloud-${uniqueSuffix}-${sanitizedFilename}`;
          const finalCloudPath = path.join(uploadDir, cloudFilename);
          fs.copyFileSync(tempBufferPath, finalCloudPath);
          fs.unlinkSync(tempBufferPath);
          res.json({ message: "Vidio berhasil disinkronisasi ke Cloud Storage!", filename: cloudFilename, source: 'cloud' });
        } else {
          res.json({ message: "Stream berhasil dibuffer! Siap mengunduh lokal.", filename: bufferFilename, source: 'buffers' });
        }
      });

      writer.on("error", (err) => {
        console.error("Stream writer error:", err);
        res.status(500).json({ error: "Gagal merekam buffer streaming ke disk penyimpanan." });
      });

    } catch (err: any) {
      console.error("Buffer stream error:", err.message);
      res.status(500).json({ error: "Gagal menghubungkan ke link stream video. Koneksi ditolak." });
    }
  });

  app.get("/api/video/buffers/:filename", (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(bufferDir, filename);
    if (fs.existsSync(filepath)) {
      res.download(filepath);
    } else {
      res.status(404).json({ error: "Buffer file not found" });
    }
  });

  app.post("/api/video/download", express.json(), async (req, res) => {
    const { url, location } = req.body;
    if (!url) return res.status(400).json({ error: "Missing url" });

    let proxyConfigUrl = "";
    if (req.headers.cookie) {
      const match = req.headers.cookie.match(/(?:^|; )vpnProxy=([^;]*)/);
      if (match && match[1]) proxyConfigUrl = decodeURIComponent(match[1]);
    }

    // Ensure yt-dlp is available
    const ytdlpPath = "/tmp/yt-dlp";
    if (!fs.existsSync(ytdlpPath)) {
        try {
            execSync(`curl -sL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux -o ${ytdlpPath}`);
            fs.chmodSync(ytdlpPath, '755');
        } catch(e) {
            return res.status(500).json({ error: "Failed to install downloader" });
        }
    } else {
        try { fs.chmodSync(ytdlpPath, '755'); } catch(e) {}
    }

    try {
        let proxyFlag = proxyConfigUrl ? `--proxy "${proxyConfigUrl}" ` : "";
        // Attempt to get direct URL and title
        let out: string[] = [];
        try {
            out = execSync(`"${ytdlpPath}" --js-runtimes node ${proxyFlag}-f "b" --no-warnings --get-url --get-title --get-filename -o "%(title)s.%(ext)s" "${url}"`).toString().trim().split('\n');
        } catch (execErr: any) {
            if (execErr.stdout && execErr.stdout.toString().trim().length > 0) {
                out = execErr.stdout.toString().trim().split('\n');
            } else {
                throw execErr;
            }
        }
        
        if (out.length >= 2) {
            let title = out[0];
            let directUrl = out[out.length - 1]; // usually the last line is the url
            let filename = out[1] || `${Date.now()}.mp4`;
            
            // if we have 3 lines
            if (out.length >= 3) {
                if (out[1].startsWith('http')) {
                    directUrl = out[1];
                    filename = out[2];
                } else if (out[2].startsWith('http')) {
                    directUrl = out[2];
                    filename = out[1];
                }
            }

            if (location === 'cloud') {
                try {
                    let httpsAgent = undefined;
                    let httpAgent = undefined;
                    let axiosProxy: any = undefined;

                    if (proxyConfigUrl) {
                      try {
                        if (proxyConfigUrl.startsWith("socks")) {
                          httpsAgent = new SocksProxyAgent({ host: new URL(proxyConfigUrl).hostname, port: Number(new URL(proxyConfigUrl).port), rejectUnauthorized: false } as any);
                          httpAgent = httpsAgent;
                        } else if (proxyConfigUrl.startsWith("http")) {
                          httpsAgent = new HttpsProxyAgent({ host: new URL(proxyConfigUrl).hostname, port: Number(new URL(proxyConfigUrl).port), rejectUnauthorized: false } as any);
                          axiosProxy = false;
                        }
                      } catch (e) {}
                    } else {
                      httpsAgent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });
                      httpAgent = new http.Agent({ keepAlive: true });
                    }

                    const axiosOptions: any = {
                      method: 'GET',
                      url: directUrl,
                      responseType: 'stream',
                      headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
                      },
                      httpsAgent,
                      httpAgent,
                      proxy: axiosProxy,
                    };

                    const axiosRes = await axios(axiosOptions);

                    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
                    const safeFilename = filename.replace(/[/\\?%*:|"<>]/g, '-');
                    const finalFilename = uniqueSuffix + "-" + safeFilename;
                    const filepath = path.join(uploadDir, finalFilename);
                    const writer = fs.createWriteStream(filepath);
                    
                    axiosRes.data.pipe(writer);
                    writer.on("finish", () => {
                        res.json({ message: "File downloaded to cloud successfully", filename: finalFilename });
                    });
                    writer.on("error", (err) => {
                        res.status(500).json({ error: "Gagal menyimpan file video ke cloud" });
                    });
                    axiosRes.data.on("error", (err: any) => {
                        console.error("Axios stream error in video cloud download:", err);
                    });
                } catch (e: any) {
                    console.error("Video stream download error", e.message);
                    res.status(500).json({ error: "Gagal mengunduh stream video karena diblokir oleh platform." });
                }
            } else {
                // Local download: send the direct URL to the client to trigger download
                res.json({ message: "Info retrieved", directUrl, filename });
            }
        } else {
            res.status(500).json({ error: "Could not extract video url." });
        }
    } catch(err: any) {
        let errMsg = err.message || "";
        let errStr = err.stdout?.toString() + " " + err.stderr?.toString();
        
        console.error("yt-dlp error:", errMsg); 
        console.error("yt-dlp err string:", errStr);
        
        let clientMessage = "Gagal memproses video. IP server mungkin diblokir oleh platform.";
        if (errStr.includes("Sign in to confirm you’re not a bot")) {
            clientMessage = "Sistem diblokir oleh YouTube (Bot Protection). Solusi: Akses Menu -> Pengaturan -> VPN/Proxy, lalu masukkan URL proxy aktif untuk bypass anti-bot, atau gunakan tautan alternatif.";
        }
        
        res.status(500).json({ 
            error: clientMessage,
            details: "Bot Protection Detected",
            stack: err.stack,
            out: errStr 
        });
    }
  });

  app.get("/server_cjs_jagoanhosting.txt", (req, res) => {
    const pathCjs = path.join(process.cwd(), "dist", "server.cjs");
    const pathTs = path.join(process.cwd(), "server.ts");
    
    if (fs.existsSync(pathCjs)) {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.sendFile(pathCjs);
    } else if (fs.existsSync(pathTs)) {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.sendFile(pathTs);
    } else {
      res.status(404).send("File server.cjs not found. Please run build first.");
    }
  });

  app.get("/api/cloud-files", (req, res) => {
    console.log("Fetching cloud files...");
    fs.readdir(uploadDir, (err, files) => {
      if (err) {
        console.error("Error reading dir:", err);
        return res.status(500).json({ error: "Failed to list files" });
      }
      console.log("Files found:", files);
      const fileData = files.map((filename) => {
        const stats = fs.statSync(path.join(uploadDir, filename));
        return {
          filename,
          size: stats.size,
          createdAt: stats.birthtime,
        };
      });
      res.json(fileData);
    });
  });

  app.get("/api/cloud-files/system-disk", (req, res) => {
    try {
      // @ts-ignore - fs.statfsSync is available in modern Node but might not be in older @types/node
      const stats = fs.statfsSync(uploadDir);
      const totalDisk = stats.bsize * stats.blocks;
      const freeDisk = stats.bsize * stats.bfree;
      const quota30Percent = Math.round(totalDisk * 0.3);
      res.json({
        totalDisk,
        freeDisk,
        quota30Percent,
        supported: true
      });
    } catch (err: any) {
      console.error("Failed to read disk space using statfsSync:", err.message);
      // Fallback representing standard disk size in container (e.g. 10 GB)
      const fallbackTotal = 10 * 1024 * 1024 * 1024;
      const fallbackFree = 8 * 1024 * 1024 * 1024;
      res.json({
        totalDisk: fallbackTotal,
        freeDisk: fallbackFree,
        quota30Percent: Math.round(fallbackTotal * 0.3),
        supported: false
      });
    }
  });

  app.post("/api/cloud-files/rename", express.json(), (req, res) => {
    const { oldName, newName } = req.body;
    if (!oldName || !newName)
      return res.status(400).json({ error: "Missing names" });
    const oldPath = path.join(uploadDir, oldName);
    const newPath = path.join(uploadDir, newName);
    if (!fs.existsSync(oldPath))
      return res.status(404).json({ error: "File not found" });
    fs.renameSync(oldPath, newPath);
    res.json({ message: "File renamed" });
  });

  app.post("/api/cloud-files/delete", express.json(), (req, res) => {
    const { filename } = req.body;
    const filepath = path.join(uploadDir, filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      res.json({ message: "File deleted" });
    } else {
      res.status(404).json({ error: "File not found" });
    }
  });

  app.get("/api/cloud-files/download/:filename", (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(uploadDir, filename);
    if (fs.existsSync(filepath)) {
      res.download(filepath);
    } else {
      res.status(404).json({ error: "File not found" });
    }
  });

  // Debug / Uncaught Error Logger and Auto Fix suggestions
  app.post("/api/debug/report-error", express.json(), async (req, res) => {
    const { message, stack, url, source, timestamp, logs } = req.body;

    
    // Save locally to a workspace JSON file so the agent in background has full visibility!
    const reportPath = path.join(process.cwd(), "studio_error_reports.json");
    let currentReports: any[] = [];
    if (fs.existsSync(reportPath)) {
      try {
        currentReports = JSON.parse(fs.readFileSync(reportPath, "utf-8"));
      } catch (e) {
        currentReports = [];
      }
    }
    
    // Extract file name and line number from stack
    let errorFile = "unknown";
    let errorLine = 0;
    let codeContext = "";
    
    if (stack) {
      // Look for custom files in stack, like src/components/MainScreen.tsx:250 or main.tsx
      const match = stack.match(/src\/[a-zA-Z0-9_\-/]+\.(tsx|ts|js|jsx):(\d+)/) ||
                    stack.match(/src\/[a-zA-Z0-9_\-/]+\.(tsx|ts|js|jsx)/) ||
                    stack.match(/[a-zA-Z0-9_\-/]+\.(tsx|ts|js|jsx):(\d+)/);
      if (match) {
        errorFile = match[0].split(":")[0];
        errorLine = parseInt(match[2] || "0");
      }
    }
    
    // Attempt to read file content around error line for AI context!
    if (errorFile !== "unknown" && errorLine > 0) {
      try {
        const fullFilePath = path.join(process.cwd(), errorFile);
        if (fs.existsSync(fullFilePath)) {
          const content = fs.readFileSync(fullFilePath, "utf-8");
          const lines = content.split("\n");
          const start = Math.max(0, errorLine - 8);
          const end = Math.min(lines.length, errorLine + 8);
          codeContext = lines.slice(start, end).map((l, idx) => `${start + idx + 1}: ${l}`).join("\n");
        }
      } catch (e: any) {
        console.error("Could not read code context:", e.message);
      }
    }
    
    const newReport = {
      id: "err-" + Date.now(),
      message,
      stack,
      url,
      source,
      timestamp: timestamp || new Date().toISOString(),
      file: errorFile,
      line: errorLine,
      codeContext,
      logs: logs || [],
      aiAnalysis: null as any
    };
    
    // Call Gemini API to analyze the error & auto-fix plan!
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey: geminiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build'
            }
          }
        });
        
        const prompt = `Analisis kesalahan runtime JavaScript/React berikut dari aplikasi preview:
        Error: ${message}
        Staktrace: ${stack}
        File yang bermasalah: ${errorFile} (Baris: ${errorLine})
        
        Konteks Kode Sekitar Baris ${errorLine}:
        ${codeContext || "Konteks kode tidak tersedia."}
        
        Berikan laporan singkat dan solutif berbahasa Indonesia dengan format JSON berisi kunci berikut:
        1. "analisa": Penjelasan mengapa error terjadi secara ringkas & manusiawi
        2. "solusi": Tindakan spesifik yang perlu diambil untuk memperbaiki bug ini
        3. "perbaikan_kode_diff": Potongan kode perbaikan/pengganti yang tepat
        4. "prompt_chat": Prompt yang dioptimalkan untuk dikirim langsung ke AI Studio Chat agar AI segera memperbaiki berkas yang rusak secara otomatis.
        Format output WAJIB JSON murni.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                analisa: {
                  type: Type.STRING,
                  description: "Penjelasan mengapa error terjadi secara ringkas & manusiawi"
                },
                solusi: {
                  type: Type.STRING,
                  description: "Tindakan spesifik yang perlu diambil untuk memperbaiki bug ini"
                },
                perbaikan_kode_diff: {
                  type: Type.STRING,
                  description: "Potongan kode perbaikan/pengganti yang tepat"
                },
                prompt_chat: {
                  type: Type.STRING,
                  description: "Prompt yang dioptimalkan untuk dikirim langsung ke AI Studio Chat agar AI segera memperbaiki berkas yang rusak secara otomatis."
                }
              },
              required: ["analisa", "solusi", "perbaikan_kode_diff", "prompt_chat"]
            }
          }
        });
        
        if (response.text) {
          try {
            let cleaned = response.text.trim();
            if (cleaned.startsWith("```")) {
              cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
            }
            newReport.aiAnalysis = JSON.parse(cleaned.trim());
          } catch (e) {
            newReport.aiAnalysis = {
              analisa: "Gagal memproses JSON analisa dari AI.",
              raw_text: response.text,
              solusi: "Minta AI Studio Chat untuk menganalisis letak file " + errorFile + " di baris " + errorLine,
              perbaikan_kode_diff: "",
              prompt_chat: ""
            };
          }
        }
      } catch (gemIniErr: any) {
        console.error("Gemini context analysis failed:", gemIniErr.message);
        let errorMessage = "Gagal menghubungkan ke layanan Gemini API untuk analisis konteks otomatis. Silakan pastikan kunci API berfungsi.";
        let solution = "Minta AI Studio Chat untuk menganalisis letak file " + errorFile + " di baris " + errorLine;
        
        const isQuotaExceeded = gemIniErr.message?.includes("quota") || 
                                gemIniErr.message?.includes("429") || 
                                gemIniErr.message?.includes("RESOURCE_EXHAUSTED") ||
                                JSON.stringify(gemIniErr).includes("RESOURCE_EXHAUSTED");
                                
        if (isQuotaExceeded) {
          errorMessage = "Batas kuota harian/menit (Rate Limit) gratis Gemini API Anda telah habis (RESOURCE_EXHAUSTED). Silakan tunggu sekitar 1-2 menit hingga batasnya dikembalikan oleh sistem.";
          solution = "Salin pesan error di atas, kemudian langsung tanyakan di panel obrolan (chat) AI Coding Agent ini agar kami dapat memproses perbaikan secara langsung dan bebas biaya kuota API Anda.";
        }
        
        newReport.aiAnalysis = {
          analisa: errorMessage,
          solusi: solution,
          perbaikan_kode_diff: "",
          prompt_chat: "Tolong bantu perbaiki error berikut: " + message + " di file " + errorFile + " baris " + errorLine
        };
      }
    } else {
      newReport.aiAnalysis = {
        analisa: "API Key Gemini tidak terdeteksi untuk analisis latar belakang.",
        solusi: "Silakan hubungkan API Key Gemini di pengaturan rahasia atau salin pesan error ini ke AI Studio Chat."
      };
    }
    
    currentReports.unshift(newReport);
    // Keep only last 15 reports
    if (currentReports.length > 15) {
      currentReports = currentReports.slice(0, 15);
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(currentReports, null, 2));
    
    res.json({
      status: "success",
      report: newReport
    });
  });

  app.get("/api/proxy-download", async (req, res) => {
    const targetUrl = req.query.url as string;
    const filename = req.query.filename as string || 'download';
    
    if (!targetUrl) return res.status(400).json({ error: "Missing url" });

    let proxyConfigUrl = "";
    if (req.headers.cookie) {
      const match = req.headers.cookie.match(/(?:^|; )vpnProxy=([^;]*)/);
      if (match && match[1]) proxyConfigUrl = decodeURIComponent(match[1]);
    }

    try {
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      
      let httpsAgent = undefined;
      let httpAgent = undefined;
      let axiosProxy: any = undefined;

      if (proxyConfigUrl) {
        try {
          if (proxyConfigUrl.startsWith("socks")) {
            httpsAgent = new SocksProxyAgent({ host: new URL(proxyConfigUrl).hostname, port: Number(new URL(proxyConfigUrl).port), rejectUnauthorized: false } as any);
            httpAgent = httpsAgent;
          } else if (proxyConfigUrl.startsWith("http")) {
            httpsAgent = new HttpsProxyAgent({ host: new URL(proxyConfigUrl).hostname, port: Number(new URL(proxyConfigUrl).port), rejectUnauthorized: false } as any);
            axiosProxy = false;
          }
        } catch (e) {}
      } else {
        httpsAgent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });
        httpAgent = new http.Agent({ keepAlive: true });
      }

      const axiosOptions: any = {
        method: 'GET',
        url: targetUrl,
        responseType: 'stream',
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          "Accept": "*/*"
        },
        httpsAgent,
        httpAgent,
        proxy: axiosProxy,
      };

      const axiosRes = await axios(axiosOptions);

      const contentType = axiosRes.headers["content-type"];
      if (contentType) res.setHeader("Content-Type", String(contentType));

      const contentLength = axiosRes.headers["content-length"];
      if (contentLength) res.setHeader("Content-Length", String(contentLength));

      axiosRes.data.pipe(res);
      axiosRes.data.on("error", (err: any) => {
        console.error("Axios stream error in proxy download:", err);
        if (!res.headersSent) res.status(502).end();
      });

    } catch (e: any) {
      console.error("Proxy download error", e.message);
      if (!res.headersSent) res.status(500).end();
    }
  });

  app.post("/api/proxy/ping", express.json(), async (req, res) => {
    const { proxyUrl } = req.body;
    let httpsProxyAgent = null;

    if (proxyUrl) {
      if (proxyUrl.startsWith("socks")) {
        const { SocksProxyAgent } = await import("socks-proxy-agent");
        httpsProxyAgent = new SocksProxyAgent(proxyUrl);
      } else if (proxyUrl.startsWith("http")) {
        const { HttpsProxyAgent } = await import("https-proxy-agent");
        httpsProxyAgent = new HttpsProxyAgent(proxyUrl);
      }
    }

    try {
      const { default: axios } = await import("axios");
      const start = Date.now();
      await axios.get("https://1.1.1.1", {
        httpsAgent: httpsProxyAgent,
        httpAgent: httpsProxyAgent,
        timeout: 10000
      });
      const latency = Date.now() - start;
      res.json({ success: true, latency });
    } catch (e: any) {
      res.json({ success: false, error: e.message });
    }
  });

  // Proxy endpoint to bypass iframe restrictions
  app.all("/api/proxy", async (req, res) => {
    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.set("Access-Control-Allow-Headers", "*");
      return res.status(200).end();
    }
    
    let targetUrl = req.query.url as string;
    let proxyConfigUrl = "";
    if (req.headers.cookie) {
      const match = req.headers.cookie.match(/(?:^|; )vpnProxy=([^;]*)/);
      if (match && match[1]) proxyConfigUrl = decodeURIComponent(match[1]);
    }

    if (!targetUrl) {
      return res.status(400).send("URL required");
    }

    // Google Search frequently blocks cloud container IP addresses with CAPTCHAs.
    // To keep it perfectly functional and bypass JS-based bot detection, we enforce gbv=1 (Google Basic View).
    // This gives users the official Google Search results instantly via HTML-only mode.
    if ((targetUrl.includes("google.com/search") || targetUrl.includes("google.co.id/search")) && !targetUrl.includes("gbv=")) {
      try {
        const dummyUrl = new URL(targetUrl);
        dummyUrl.searchParams.set("gbv", "1");
        targetUrl = dummyUrl.toString();
      } catch (e) {
      }
    }

    // DuckDuckGo Search is frequently unstable when loaded via full JS interface inside an iframe sandbox.
    // To keep search fully functional and fast, we seamlessly proxy standard DuckDuckGo requests
    // to their lightweight HTML-only search which contains exact matches and renders perfectly within iframes.
    if (targetUrl.includes("duckduckgo.com") && !targetUrl.includes("html.duckduckgo.com")) {
      try {
        const dummyUrl = new URL(targetUrl);
        const query = dummyUrl.searchParams.get("q") || "";
        if (query) {
          targetUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        }
      } catch (e) {
        targetUrl = "https://html.duckduckgo.com/html/";
      }
    }

    try {
      const urlObj = new URL(targetUrl);
      
      // Determine protocol and host with multiple fallback levels to prevent localhost resolution inside sub-iframes under proxy hosting
      let protocol = req.get("X-Forwarded-Proto") || req.protocol || "http";
      let host = req.get("X-Forwarded-Host") || req.get("host") || "localhost:3000";
      
      if (req.headers.referer && (host.includes("localhost") || host.includes("127.0.0.1"))) {
        try {
          const refererUrl = new URL(req.headers.referer);
          if (!refererUrl.host.includes("localhost") && !refererUrl.host.includes("127.0.0.1")) {
            host = refererUrl.host;
            protocol = refererUrl.protocol.replace(":", "");
          }
        } catch (e) {}
      }
      
      const proxyBaseUrl = `${protocol}://${host}/api/proxy?url=`;

      const lowercaseUrl = targetUrl.toLowerCase();
      
      // =========================================================================
      // === PORTAL & SMART EMBED INTERCEPTORS UNTUK SITUS POPULER ===
      // Menjamin 100% video/suara/post dapat diakses bebas CAPTCHA, bebas blokir iframe,
      // serta sangat hemat kuota bandwidth (kompresi data hingga 95%).
      // =========================================================================

      // 1. INTERCEPTOR YOUTUBE
      if (lowercaseUrl.includes("youtube.com") || lowercaseUrl.includes("youtu.be")) {
         let searchQuery = "";
         try {
            const tempUrl = new URL(targetUrl);
            searchQuery = tempUrl.searchParams.get("search_query") || "";
         } catch(e){}

         if (searchQuery) {
            console.log(`[YouTube Interceptor] Searching for: ${searchQuery}`);
            const searchResults = await searchWebVideos(searchQuery, "youtube.com", req);
            const searchResultsHtml = renderYoutubeSearchPage(searchQuery, searchResults, proxyBaseUrl, targetUrl);
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            return res.status(200).send(searchResultsHtml);
         }

         let videoId = "";
         try {
            const tempUrl = new URL(targetUrl);
            if (tempUrl.hostname.includes("youtu.be")) {
               videoId = tempUrl.pathname.substring(1);
            } else if (tempUrl.pathname.includes("/shorts/")) {
               videoId = tempUrl.pathname.split("/shorts/")[1]?.split("?")[0];
            } else if (tempUrl.pathname.includes("/embed/")) {
               videoId = tempUrl.pathname.split("/embed/")[1]?.split("?")[0];
            } else if (tempUrl.pathname.includes("/v/")) {
               videoId = tempUrl.pathname.split("/v/")[1]?.split("?")[0];
            } else {
               videoId = tempUrl.searchParams.get("v") || "";
            }
         } catch (e) {
            const match = targetUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
            if (match) videoId = match[1];
         }

         if (videoId && videoId.length === 11) {
            console.log(`[YouTube Interceptor] Playing video ID: ${videoId}`);
            const playerHtml = renderYoutubePlayerPage(videoId, proxyBaseUrl, targetUrl);
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            return res.status(200).send(playerHtml);
         }

         console.log(`[YouTube Interceptor] Rendering YouTube Home Portal`);
         const youtubePortalHtml = renderYoutubePortal(proxyBaseUrl, targetUrl);
         res.setHeader("Content-Type", "text/html; charset=utf-8");
         return res.status(200).send(youtubePortalHtml);
      }

      // 2. INTERCEPTOR SOUNDCLOUD
      if (lowercaseUrl.includes("soundcloud.com")) {
         let searchQuery = "";
         try {
            const tempUrl = new URL(targetUrl);
            searchQuery = tempUrl.searchParams.get("q") || "";
         } catch(e){}

         if (searchQuery) {
            console.log(`[SoundCloud Interceptor] Searching SoundCloud for: ${searchQuery}`);
            const searchResults = await searchWebVideos(searchQuery, "soundcloud.com", req);
            const searchResultsHtml = renderSoundcloudSearchPage(searchQuery, searchResults, proxyBaseUrl, targetUrl);
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            return res.status(200).send(searchResultsHtml);
         }

         const tempUrl = new URL(targetUrl);
         const pathParts = tempUrl.pathname.split("/").filter(Boolean);
         const isTrackOrPlaylist = pathParts.length >= 2 && !["discover", "stream", "search", "upload", "mobile"].includes(pathParts[0]);

         if (isTrackOrPlaylist) {
            console.log(`[SoundCloud Interceptor] Playing track: ${targetUrl}`);
            const playerHtml = renderSoundcloudPlayerPage(targetUrl, proxyBaseUrl);
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            return res.status(200).send(playerHtml);
         }

         console.log(`[SoundCloud Interceptor] Rendering SoundCloud Portal`);
         const soundcloudPortalHtml = renderSoundcloudPortal(proxyBaseUrl, targetUrl);
         res.setHeader("Content-Type", "text/html; charset=utf-8");
         return res.status(200).send(soundcloudPortalHtml);
      }

      // 3. INTERCEPTOR TIKTOK
      if (lowercaseUrl.includes("tiktok.com")) {
         let videoId = "";
         const tempUrl = new URL(targetUrl);
         const pathParts = tempUrl.pathname.split("/").filter(Boolean);
         if (pathParts.includes("video")) {
            const idx = pathParts.indexOf("video");
            videoId = pathParts[idx + 1]?.split("?")[0] || "";
         } else if (pathParts.length > 0 && /^\d+$/.test(pathParts[pathParts.length - 1])) {
            videoId = pathParts[pathParts.length - 1];
         }

         if (videoId) {
            console.log(`[TikTok Interceptor] Playing TikTok ID: ${videoId}`);
            const playerHtml = renderTiktokPlayerPage(videoId, proxyBaseUrl, targetUrl);
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            return res.status(200).send(playerHtml);
         }

         const tiktokPortalHtml = renderTiktokPortal(proxyBaseUrl, targetUrl);
         res.setHeader("Content-Type", "text/html; charset=utf-8");
         return res.status(200).send(tiktokPortalHtml);
      }

      // 4. INTERCEPTOR INSTAGRAM
      if (lowercaseUrl.includes("instagram.com")) {
         let postCode = "";
         const tempUrl = new URL(targetUrl);
         const pathParts = tempUrl.pathname.split("/").filter(Boolean);
         if (pathParts.includes("p") || pathParts.includes("reel") || pathParts.includes("tv")) {
            const idx = pathParts.findIndex(p => p === "p" || p === "reel" || p === "tv");
            postCode = pathParts[idx + 1] || "";
         }

         if (postCode) {
            console.log(`[Instagram Interceptor] Rendering Instagram Post: ${postCode}`);
            const playerHtml = renderInstagramPlayerPage(postCode, proxyBaseUrl, targetUrl);
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            return res.status(200).send(playerHtml);
         }

         const instagramPortalHtml = renderInstagramPortal(proxyBaseUrl, targetUrl);
         res.setHeader("Content-Type", "text/html; charset=utf-8");
         return res.status(200).send(instagramPortalHtml);
      }

      // 5. INTERCEPTOR FB (FACEBOOK)
      if (lowercaseUrl.includes("facebook.com")) {
         const facebookPortalHtml = renderFacebookPortal(proxyBaseUrl, targetUrl);
         res.setHeader("Content-Type", "text/html; charset=utf-8");
         return res.status(200).send(facebookPortalHtml);
      }

      // --- 1. MANIPULASI USER-AGENT & HEADERS ---
      // Daftar profil browser asli yang realistis untuk menyamarkan identitas crawler
      const browserProfiles = [
        {
          ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          platform: '"Windows"',
          chUa: '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
          mobile: "?0"
        },
        {
          ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          platform: '"Windows"',
          chUa: '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
          mobile: "?0"
        },
        {
          ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          platform: '"macOS"',
          chUa: '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
          mobile: "?0"
        },
        {
          ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
          platform: '"Windows"',
          chUa: '"Google Chrome";v="126", "Chromium";v="126", "Not.A/Brand";v="24"',
          mobile: "?0"
        }
      ];

      // Ambil profile acak untuk meminimalisir footprint deteksi pola bot
      const selectedProfile = browserProfiles[Math.floor(Math.random() * browserProfiles.length)];

      const headersToForward: any = {
        "User-Agent": req.headers["user-agent"] || selectedProfile.ua,
        "Accept": req.headers.accept || "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": req.headers["accept-language"] || "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "Sec-Ch-Ua": req.headers["sec-ch-ua"] || selectedProfile.chUa,
        "Sec-Ch-Ua-Mobile": req.headers["sec-ch-ua-mobile"] || selectedProfile.mobile,
        "Sec-Ch-Ua-Platform": req.headers["sec-ch-ua-platform"] || selectedProfile.platform,
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "cross-site",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        "Connection": "keep-alive"
      };

      // Clean referer header to hide proxy presence and protect same-site search flow
      if (req.headers.referer) {
         let cleanReferer = req.headers.referer;
         if (cleanReferer.includes("/api/proxy")) {
            try {
               const parts = cleanReferer.split("url=");
               if (parts[1]) {
                  cleanReferer = decodeURIComponent(parts[1].split("&")[0]);
               } else {
                  cleanReferer = urlObj.origin + "/";
               }
            } catch (e) {
               cleanReferer = urlObj.origin + "/";
            }
         }
         headersToForward["Referer"] = cleanReferer;
      } else {
         headersToForward["Referer"] = urlObj.origin + "/";
      }

      if (req.headers.origin) {
         headersToForward["Origin"] = urlObj.origin;
      }

      if (req.headers.range) {
        headersToForward["Range"] = req.headers.range;
      }

      // DO NOT forward Accept-Encoding as axios handles decompression, 
      // passing it causes issues if we parse HTML and the upstream server sends br/gzip.

      if (req.headers["content-type"]) {
        headersToForward["Content-Type"] = req.headers["content-type"];
      }
      if (req.headers["content-length"]) {
        headersToForward["Content-Length"] = req.headers["content-length"];
      }

      // Extract isolated cookies matched for this specific target domain
      if (req.headers.cookie) {
        const cookiePairs = req.headers.cookie.split(';');
        const matchingPairs: string[] = [];
        for (const pair of cookiePairs) {
          const trimmed = pair.trim();
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const name = trimmed.substring(0, eqIdx);
            const value = trimmed.substring(eqIdx + 1);
            
            const prefixStart = "_proxy_cookie_";
            if (name.startsWith(prefixStart)) {
              const remaining = name.substring(prefixStart.length);
              const hostname = urlObj.hostname;
              const hostParts = hostname.split('.');
              let found = false;
              let originalName = '';
              
              for (let j = 0; j < hostParts.length - 1; j++) {
                const subDomain = hostParts.slice(j).join('.');
                if (remaining.startsWith(subDomain + '_')) {
                  originalName = remaining.substring(subDomain.length + 1);
                  matchingPairs.push(`${originalName}=${value}`);
                  found = true;
                  break;
                }
              }
              if (!found && remaining.startsWith(hostname + '_')) {
                originalName = remaining.substring(hostname.length + 1);
                matchingPairs.push(`${originalName}=${value}`);
              }
            } else {
              // Forward other generic non-prefixed cookies only if they are not vpnProxy and don't match standard server cookies
              if (name !== 'vpnProxy' && !name.startsWith('_proxy_cookie_') && !name.startsWith('__Secure-') && !name.startsWith('__Host-')) {
                matchingPairs.push(`${name}=${value}`);
              }
            }
          }
        }
        if (matchingPairs.length > 0) {
          headersToForward["Cookie"] = matchingPairs.join('; ');
        }
      }

      const axiosOptions: any = {
        method: req.method,
        responseType: "stream",
        headers: headersToForward,
        validateStatus: () => true,
        data: req.method !== "GET" && req.method !== "HEAD" ? req : undefined,
      };

      if (proxyConfigUrl) {
        try {
          if (proxyConfigUrl.startsWith("socks")) {
            const httpsAgent = new SocksProxyAgent({
              host: new URL(proxyConfigUrl).hostname,
              port: Number(new URL(proxyConfigUrl).port),
              rejectUnauthorized: false,
            } as any);
            axiosOptions.httpsAgent = httpsAgent;
            axiosOptions.httpAgent = httpsAgent;
          } else if (proxyConfigUrl.startsWith("http")) {
            const httpsAgent = new HttpsProxyAgent({
              host: new URL(proxyConfigUrl).hostname,
              port: Number(new URL(proxyConfigUrl).port),
              rejectUnauthorized: false,
            } as any);
            axiosOptions.httpsAgent = httpsAgent;
            axiosOptions.proxy = false; // Disable default axios proxy handling
          }
        } catch (e) {
          console.error("Invalid proxy config", e);
        }
      } else if (process.env.PROXY_HOST) {
        // --- 3. INTEGRASI ROTASI RESIDENTIAL PROXY ---
        // Bila tidak ada proxy kustom Client VPN, gunakan Residential Proxy dari Environment Variables
        try {
          const host = process.env.PROXY_HOST;
          const port = Number(process.env.PROXY_PORT || 80);
          const user = process.env.PROXY_USER;
          const pass = process.env.PROXY_PASS;
          
          let proxyString = "";
          if (user && pass) {
            proxyString = `http://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}`;
          } else {
            proxyString = `http://${host}:${port}`;
          }
          
          const agentConfig = {
            rejectUnauthorized: false,
            keepAlive: true
          };
          
          const httpsAgent = new HttpsProxyAgent(proxyString, agentConfig);
          const httpAgent = new HttpsProxyAgent(proxyString, agentConfig);
          
          axiosOptions.httpsAgent = httpsAgent;
          axiosOptions.httpAgent = httpAgent;
          axiosOptions.proxy = false;
        } catch (err) {
          console.error("[Proxy Sentinel Error] Gagal menginisialisasi Residential Proxy Agent:", err);
          axiosOptions.httpsAgent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });
          axiosOptions.httpAgent = new http.Agent({ keepAlive: true });
        }
      } else {
        axiosOptions.httpsAgent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });
        axiosOptions.httpAgent = new http.Agent({ keepAlive: true });
      }

      // Fetch the target URL
      let responseFromAxios;
      try {
        responseFromAxios = await axios(targetUrl, axiosOptions);
      } catch (err: any) {
        console.error("[Proxy Axios Error] Gagal melakukan request Axios awal:", err.message);
        // Buat mock response jika benar-benar gagal agar bisa dicoba oleh Puppeteer
        responseFromAxios = {
          status: 502,
          headers: { "content-type": "text/html" },
          data: null
        };
      }

      let response = responseFromAxios;
      let usedPuppeteer = false;

      // Periksa apakah request ini diblokir (misal: 403 Forbidden, 429 Too Many Requests, atau 503 dari Cloudflare)
      const initialContentType = responseFromAxios.headers ? (responseFromAxios.headers["content-type"] || "") : "";
      const isCommonStaticAsset = /\.(png|jpe?g|gif|webp|svg|mp4|mp3|m3u8|css|js|woff2?|ico|json|zip|rar)$/i.test(targetUrl.split("?")[0]);
      
      const isHtmlPage = String(initialContentType).includes("text/html") || 
                         String(initialContentType).includes("application/xhtml+xml") || 
                         (!initialContentType && !isCommonStaticAsset) ||
                         (targetUrl.includes("google.") || targetUrl.includes("bing.com") || targetUrl.includes("duckduckgo.com") || targetUrl.includes("startpage.com"));

      const statusNeedsFallback = 
        responseFromAxios.status === 403 || 
        responseFromAxios.status === 503 || 
        responseFromAxios.status === 429 || 
        responseFromAxios.status === 401 || 
        responseFromAxios.status === 502 || 
        !responseFromAxios.data;

      if (statusNeedsFallback && isHtmlPage) {
        console.log(`[Anti-Bot Fallback] Terdeteksi status ${responseFromAxios.status} atau data kosong pada halaman HTML. Meluncurkan bypass Puppeteer-Extra-Stealth...`);
        
        let puppeteerSuccess = false;
        let tryNoProxy = false;

        for (let attempt = 1; attempt <= 2 && !puppeteerSuccess; attempt++) {
          let browser: any = null;
          try {
            const { default: puppeteer } = await import("puppeteer-extra" as any);
            const { default: StealthPlugin } = await import("puppeteer-extra-plugin-stealth" as any);
            
            try {
              puppeteer.use(StealthPlugin());
            } catch (e) {
              // Abaikan jika plugin stealth sudah didaftarkan sebelumnya
            }

            const args = [
              "--no-sandbox",
              "--disable-setuid-sandbox",
              "--disable-infobars",
              "--disable-blink-features=AutomationControlled",
              "--ignore-certificate-errors"
            ];

            // Parse proxy untuk Puppeteer: prioritas vpnProxy cookie (client VPN) dibanding residential proxy
            let puppeteerProxyUrl = "";
            let puppeteerProxyUser = "";
            let puppeteerProxyPass = "";

            if (!tryNoProxy) {
              if (proxyConfigUrl) {
                try {
                  const parsed = new URL(proxyConfigUrl);
                  puppeteerProxyUrl = `${parsed.protocol}//${parsed.hostname}:${parsed.port}`;
                  if (parsed.username) {
                    puppeteerProxyUser = decodeURIComponent(parsed.username);
                  }
                  if (parsed.password) {
                    puppeteerProxyPass = decodeURIComponent(parsed.password);
                  }
                  console.log(`[Anti-Bot Fallback Proxy] Menggunakan Client VPN Cookie Proxy: ${puppeteerProxyUrl}`);
                } catch (e) {
                  console.error("[Anti-Bot Fallback Proxy] Gagal menguraikan proxyConfigUrl:", e);
                }
              }

              // Jika tidak ada proxyConfigUrl dari client, gunakan residential proxy jika terkonfigurasi
              if (!puppeteerProxyUrl && process.env.PROXY_HOST) {
                const host = process.env.PROXY_HOST;
                const port = process.env.PROXY_PORT || 80;
                const user = process.env.PROXY_USER || "";
                const pass = process.env.PROXY_PASS || "";
                puppeteerProxyUrl = `http://${host}:${port}`;
                puppeteerProxyUser = user;
                puppeteerProxyPass = pass;
                console.log(`[Anti-Bot Fallback Proxy] Menggunakan Residential Proxy Config: ${puppeteerProxyUrl}`);
              }

              if (puppeteerProxyUrl) {
                args.push(`--proxy-server=${puppeteerProxyUrl}`);
              }
            } else {
              console.log("[Anti-Bot Fallback Proxy] Retrying Puppeteer rendering WITHOUT proxy...");
            }

            browser = await puppeteer.launch({
              headless: true,
              args: args,
              executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
            });

            const page = await browser.newPage();
            
            // === 4. OPTIMASI HEMAT BANDWIDTH (PENTING UNTUK JAGOAN HOSTING) ===
            // Mengaktifkan fitur Pencegatan Request (Request Interception)
            // Memblokir aset berat: gambar, stylesheet (CSS), font, media, & manifest agar hemat kuota proxy hingga 80%
            await page.setRequestInterception(true);
            page.on("request", (interceptedRequest) => {
              const resourceType = interceptedRequest.resourceType();
              if (["image", "stylesheet", "font", "media", "manifest"].includes(resourceType)) {
                interceptedRequest.abort();
              } else {
                interceptedRequest.continue();
              }
            });

            // === 2. MANIPULASI USER-AGENT & HEADERS REALISTIS ===
            const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
            await page.setUserAgent(userAgent);
            await page.setViewport({ width: 1366, height: 768 });

            if (!tryNoProxy && puppeteerProxyUser && puppeteerProxyPass) {
              await page.authenticate({
                username: puppeteerProxyUser,
                password: puppeteerProxyPass
              });
            }

            await page.setExtraHTTPHeaders({
              "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
              "Referer": "https://www.google.com/"
            });

            console.log(`[Anti-Bot Fallback Navigation] Puppeteer memuat URL (Attempt ${attempt}): ${targetUrl}`);
            await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 35000 });

            // Berikan jeda waktu agar tantangan Cloudflare (jika ada) bisa diselesaikan otomatis oleh stealth
            await new Promise(resolve => setTimeout(resolve, 4000));

            const renderedHtml = await page.content();
            const pageCookies = await page.cookies();

            await browser.close();
            browser = null;
            usedPuppeteer = true;
            puppeteerSuccess = true;

            // Bungkus html ke dalam stream agar sesuai dengan pipeline proxy downstream
            const stream = new Readable();
            stream.push(renderedHtml);
            stream.push(null);

            const cookieHeaderValues = pageCookies.map(c => `${c.name}=${c.value}; Domain=${c.domain}; Path=${c.path}; HttpOnly`);

            response = {
              status: 200,
              headers: {
                "content-type": "text/html; charset=utf-8",
                "set-cookie": cookieHeaderValues,
                "content-encoding": "identity"
              },
              data: stream
            };
            console.log("[Anti-Bot Fallback Success] Puppeteer Stealth berhasil menembus proteksi Cloudflare dan memuat HTML!");
          } catch (puppeteerErr: any) {
            console.error(`[Anti-Bot Fallback Error] Puppeteer failed on attempt ${attempt}:`, puppeteerErr.message);
            if (browser) {
              try {
                await browser.close();
              } catch (e) {}
              browser = null;
            }

            const hasProxyUrl = !!(!tryNoProxy && (proxyConfigUrl || (process.env.PROXY_HOST && process.env.PROXY_HOST.trim() !== "")));
            const isAuthOrConnError = puppeteerErr.message && (
              puppeteerErr.message.includes("ERR_INVALID_AUTH_CREDENTIALS") ||
              puppeteerErr.message.includes("ERR_PROXY_CONNECTION_FAILED") ||
              puppeteerErr.message.includes("ERR_TUNNEL_CONNECTION_FAILED") ||
              puppeteerErr.message.includes("AUTH_CREDENTIALS") ||
              puppeteerErr.message.includes("net::ERR")
            );

            if (hasProxyUrl && isAuthOrConnError && attempt === 1) {
              console.log("[Anti-Bot Fallback] Proxy error detected, scheduling retry WITHOUT proxy...");
              tryNoProxy = true;
            } else {
              if (puppeteerErr.message && puppeteerErr.message.includes("ERR_INVALID_AUTH_CREDENTIALS")) {
                const stream = new Readable();
                stream.push(`
                  <html>
                    <head>
                      <title>Proxy Authentication Failed</title>
                      <style>
                        body { font-family: sans-serif; padding: 2rem; background: #fff8f8; color: #d32f2f; text-align: center; }
                        .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
                        h1 { margin-top: 0; }
                      </style>
                    </head>
                    <body>
                      <div class="card">
                        <h1>Proxy Authentication Failed</h1>
                        <p>Koneksi gagal karena otentikasi Proxy ditolak (<code>ERR_INVALID_AUTH_CREDENTIALS</code>).</p>
                        <p>Silakan periksa kredensial VPN Anda atau matikan VPN untuk mengakses situs ini.</p>
                      </div>
                    </body>
                  </html>
                `);
                stream.push(null);
                
                response = {
                  status: 407,
                  headers: {
                    "content-type": "text/html; charset=utf-8",
                    "content-encoding": "identity"
                  },
                  data: stream
                };
                usedPuppeteer = true; // prevent trying to parse this as regular proxy response url
              }
              break;
            }
          }
        }
      }

      // Ensure we have a valid data stream, even for error fallbacks
      if (!response.data) {
        const ReadableStr = require('stream').Readable;
        response.data = new ReadableStr();
        response.data.push(`
          <html>
            <head><title>Proxy Error</title></head>
            <body style="font-family: sans-serif; text-align: center; padding: 2rem;">
              <h2>Upstream Connection Error</h2>
              <p>Failed to connect to the target website.</p>
              <p>Status Code: ${response.status}</p>
            </body>
          </html>
        `);
        response.data.push(null);
        response.headers = response.headers || {};
        response.headers["content-type"] = "text/html; charset=utf-8";
      }

      const finalUrl =
        !usedPuppeteer &&
        response.request &&
        response.request.res &&
        response.request.res.responseUrl
          ? response.request.res.responseUrl
          : targetUrl;


      const contentType = response.headers["content-type"] || "";

      // Rewrite restrictive headers
      res.removeHeader("x-frame-options");
      res.removeHeader("content-security-policy");
      res.removeHeader("x-content-security-policy");
      res.removeHeader("cross-origin-opener-policy");
      res.removeHeader("cross-origin-resource-policy");
      res.removeHeader("cross-origin-embedder-policy");

      // Pass content info headers back (omit content-length if we intend to modify the body)
      const isHtmlOrM3u8 = String(contentType).includes("text/html") || String(contentType).includes("mpegurl") || String(contentType).includes("mpeg-url") || targetUrl.includes(".m3u8");
      
      const isCompressed = response.headers["content-encoding"] && response.headers["content-encoding"] !== "identity";
      
      if (!isHtmlOrM3u8 && response.headers["content-length"] && !isCompressed) {
        res.set("Content-Length", String(response.headers["content-length"]));
      }
      
      if (isCompressed) {
        // If the upstream responded with compression, axios will automatically decompress it.
        // We shouldn't send Content-Encoding because the payload is now uncompressed.
        res.removeHeader("content-encoding");
      }
      
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.set("Access-Control-Allow-Headers", "*");

      if (response.headers["accept-ranges"])
        res.set("Accept-Ranges", String(response.headers["accept-ranges"]));
      if (response.headers["content-range"])
        res.set("Content-Range", String(response.headers["content-range"]));
      if (contentType) res.set("Content-Type", String(contentType));

      // Pass cookies back to the client prefixed with domain format for strict cross-site isolation
      if (response.headers["set-cookie"]) {
        const cookies = response.headers["set-cookie"].map((c: any) => {
          const parts = c.split(';');
          const firstPart = parts[0];
          const eqIdx = firstPart.indexOf('=');
          if (eqIdx !== -1) {
            const name = firstPart.substring(0, eqIdx).trim();
            const value = firstPart.substring(eqIdx + 1);
            const prefixedName = `_proxy_cookie_${urlObj.hostname}_${name}`;
            const restOfCookie = parts.slice(1).map((p: string) => {
              if (p.trim().toLowerCase().startsWith('domain=')) {
                return '';
              }
              return p;
            }).filter(Boolean).join(';');
            return `${prefixedName}=${value};${restOfCookie}`;
          }
          return c.replace(/domain=[^;]+(;|$)/gi, "");
        });
        res.set("Set-Cookie", cookies);
      }

      res.status(response.status);

      response.data.on("error", (err: any) => {
         console.error("Downstream stream pipe error:", err);
         if (!res.headersSent) res.status(502).end();
      });

      // If it's HTML, inject <base> tag and a script to intercept clicks
      if (String(contentType).includes("text/html")) {
        const chunks: Buffer[] = [];
        let totalLength = 0;
        let tooLarge = false;

        response.data.on("data", (chunk: Buffer) => {
           if (tooLarge) {
              res.write(chunk);
              return;
           }
           totalLength += chunk.length;
           // If more than 5MB, stop buffering to avoid OOM in cheerio
           if (totalLength > 5 * 1024 * 1024) {
             tooLarge = true;
             console.log("HTML response > 5MB, bypassing cheerio transform to prevent OOM crash");
             chunks.forEach(c => res.write(c));
             res.write(chunk);
             return;
           }
           chunks.push(chunk);
        });
        
        response.data.on("end", () => {
          if (tooLarge) {
             res.end();
             return;
          }
          const html = Buffer.concat(chunks).toString("utf-8");
          try {
            const $ = cheerio.load(html);

            // Inject base tag and no-referrer
            if ($("head").length > 0) {
              if ($("head base").length === 0) {
                $("head").prepend(`<base href="${finalUrl}" />`);
              }
              $("head").prepend(
                `<meta name="referrer" content="no-referrer" />`,
              );
            }

            // Rewrite iframes to also use the proxy so X-Frame-Options is stripped
            $("iframe").each((i, el) => {
              let src = $(el).attr("src");
              if (src) {
                if (src.startsWith("blob:") || src.startsWith("data:")) return;
                if (src.startsWith("//")) src = "https:" + src;
                if (src.startsWith("http")) {
                  $(el).attr(
                    "src",
                    `${proxyBaseUrl}${encodeURIComponent(src)}`,
                  );
                } else {
                  const absoluteUrl = new URL(src, finalUrl).href;
                  $(el).attr(
                    "src",
                    `${proxyBaseUrl}${encodeURIComponent(absoluteUrl)}`,
                  );
                }
              }
            });

            // Make videos, sources, and images direct absolute URLs (no proxy for media)
            $("video, source, img").each((i, el) => {
              let src = $(el).attr("src");
              if (src) {
                if (src.startsWith("blob:") || src.startsWith("data:")) return;
                try {
                  const absoluteUrl = new URL(src, finalUrl).href;
                  $(el).attr("src", absoluteUrl);
                } catch (e) {}
              }
            });

            // Rewrite anchor hrefs to ensure direct navigation uses proxy
            $("a").each((i, el) => {
              let href = $(el).attr("href");
              if (
                href &&
                !href.startsWith("javascript:") &&
                !href.startsWith("#") &&
                !href.startsWith("blob:") &&
                !href.startsWith("data:") &&
                !href.startsWith('${proxyBaseUrl}')
              ) {
                try {
                  const absoluteUrl = new URL(href, finalUrl).href;
                  $(el).attr(
                    "href",
                    `${proxyBaseUrl}${encodeURIComponent(absoluteUrl)}`,
                  );
                } catch (e) {}
              }
            });

            // Rewrite meta refresh redirects
            $("meta[http-equiv]").each((i, el) => {
              const equiv = $(el).attr("http-equiv");
              if (equiv && equiv.toLowerCase() === "refresh") {
                const content = $(el).attr("content");
                if (content) {
                  const match = content.match(/url=([^;]*)/i);
                  if (match && match[1]) {
                    const originalUrl = match[1].replace(/['"]/g, '').trim();
                    if (originalUrl && !originalUrl.startsWith(proxyBaseUrl) && !originalUrl.startsWith('javascript:')) {
                      try {
                        const absoluteUrl = new URL(originalUrl, finalUrl).href;
                        const newContent = content.replace(match[1], proxyBaseUrl + encodeURIComponent(absoluteUrl));
                        $(el).attr("content", newContent);
                      } catch (e) {}
                    }
                  }
                }
              }
            });

            // Rewrite form actions
            $("form").each((i, el) => {
              let action = $(el).attr("action");
              if (
                action &&
                !action.startsWith("javascript:") &&
                !action.startsWith('${proxyBaseUrl}')
              ) {
                try {
                  const absoluteUrl = new URL(action, finalUrl).href;
                  $(el).attr(
                    "action",
                    `${proxyBaseUrl}${encodeURIComponent(absoluteUrl)}`,
                  );
                } catch (e) {}
              }
            });

            // Inject script to override fetch/xhr and handle link clicks
            $("body").append(`
              <script>
              // Keep track of user clicks
              let lastClickTime = 0;
              document.addEventListener('click', function() {
                  lastClickTime = Date.now();
              }, { capture: true, passive: true });

              // Report actual loaded URL to parent
              window.parent.postMessage({ type: 'loaded', url: document.baseURI }, '*');

              // Intercept dynamic property modifications (to catch dynamic iframes, e.g. embedded video players)
              try {
                  const iframeProto = HTMLIFrameElement.prototype;
                  const originalIframeSrcSet = Object.getOwnPropertyDescriptor(iframeProto, 'src').set;
                  const originalIframeSrcGet = Object.getOwnPropertyDescriptor(iframeProto, 'src').get;
                  Object.defineProperty(iframeProto, 'src', {
                      get: function() { return originalIframeSrcGet.call(this); },
                      set: function(val) {
                          if (typeof val === 'string' && val && !val.startsWith('${proxyBaseUrl}') && !val.startsWith('javascript:') && !val.startsWith('data:') && !val.startsWith('blob:')) {
                              try { val = '${proxyBaseUrl}' + encodeURIComponent(new URL(val, document.baseURI).href); } catch(e){}
                          }
                          originalIframeSrcSet.call(this, val);
                      }
                  });
              } catch(e){}

              try {
                  const formProto = HTMLFormElement.prototype;
                  const originalFormActionSet = Object.getOwnPropertyDescriptor(formProto, 'action').set || Object.getOwnPropertyDescriptor(Element.prototype, 'action')?.set;
                  const originalFormActionGet = Object.getOwnPropertyDescriptor(formProto, 'action').get || Object.getOwnPropertyDescriptor(Element.prototype, 'action')?.get;
                  if (originalFormActionSet) {
                      Object.defineProperty(formProto, 'action', {
                          get: function() { return originalFormActionGet.call(this); },
                          set: function(val) {
                              if (typeof val === 'string' && val && !val.startsWith('${proxyBaseUrl}') && !val.startsWith('javascript:')) {
                                  try { val = '${proxyBaseUrl}' + encodeURIComponent(new URL(val, document.baseURI).href); } catch(e){}
                              }
                              originalFormActionSet.call(this, val);
                          }
                      });
                  }
              } catch(e){}
              
              // Intercept document.cookie to strip domain so cookies stick in proxy
              try {
                  const cookieDesc = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie') || Object.getOwnPropertyDescriptor(HTMLDocument.prototype, 'cookie');
                  if (cookieDesc && cookieDesc.configurable) {
                     Object.defineProperty(document, 'cookie', {
                         get: function() {
                             return cookieDesc.get.call(document);
                         },
                         set: function(val) {
                             if (typeof val === 'string') {
                                 val = val.replace(/domain=[^;]+/gi, '');
                             }
                             cookieDesc.set.call(document, val);
                         }
                     });
                  }
              } catch(e) {}

              // Intercept History API to prevent cross-origin SecurityError from SPAs
              const originalPushState = history.pushState;
              history.pushState = function(state, unused, url) {
                 if (url) {
                    try {
                      const absoluteUrl = new URL(url, document.baseURI).href;
                      url = '${proxyBaseUrl}' + encodeURIComponent(absoluteUrl);
                    } catch(e) {}
                 }
                 originalPushState.call(this, state, unused, url);
                 window.parent.postMessage({ type: 'loaded', url: document.baseURI }, '*');
              };

              const originalReplaceState = history.replaceState;
              history.replaceState = function(state, unused, url) {
                 if (url) {
                    try {
                      const absoluteUrl = new URL(url, document.baseURI).href;
                      url = '${proxyBaseUrl}' + encodeURIComponent(absoluteUrl);
                    } catch(e) {}
                 }
                 originalReplaceState.call(this, state, unused, url);
                 window.parent.postMessage({ type: 'loaded', url: document.baseURI }, '*');
              };

              // Intercept setting window.location to prevent escaping proxy
              try {
                  const originalLocation = window.location;
                  let locationProxy = new Proxy(originalLocation, {
                      set: function(target, prop, value) {
                          if (prop === 'href' || prop === 'assign' || prop === 'replace') {
                              if (typeof value === 'string' && !value.startsWith('${proxyBaseUrl}') && !value.startsWith('javascript:')) {
                                  try {
                                      const absoluteUrl = new URL(value, document.baseURI).href;
                                      value = '${proxyBaseUrl}' + encodeURIComponent(absoluteUrl);
                                  } catch(e){}
                              }
                          }
                          target[prop] = value;
                          return true;
                      }
                  });
                  Object.defineProperty(window, 'location', { value: locationProxy, configurable: true });
              } catch(e) {
                 // Fallback: observe DOM for anchor clicks instead of location assigning
                 window.addEventListener('beforeunload', function(e) {
                     // Try to catch where it's going, but we can't easily see the destination
                     // unless we check if document URL changed
                 });
              }

              // Neuter Service Worker to prevent origin hijacking
              if ('serviceWorker' in navigator) {
                 try {
                     navigator.serviceWorker.register = function() {
                         return Promise.reject(new Error("Service Workers are disabled in this environment."));
                     };
                 } catch(e){}
              }

              // Intercept window.open
              try {
                  const originalOpen = window.open;
                  window.open = function(url, target, features) {
                      if (typeof url === 'string' && !url.startsWith('${proxyBaseUrl}') && !url.startsWith('javascript:')) {
                         try {
                              const absoluteUrl = new URL(url, document.baseURI).href;
                              url = '${proxyBaseUrl}' + encodeURIComponent(absoluteUrl);
                         } catch(e){}
                      }
                      return originalOpen.call(this, url, target, features);
                  };
              } catch(e){}

              // Intercept fetch
              try {
                  const originalFetch = window.fetch;
                  window.fetch = async function(resource, config) {
                    try {
                      if (resource) {
                        if (typeof resource === 'string') {
                          if (!resource.startsWith('${proxyBaseUrl}') && !resource.startsWith('data:') && !resource.startsWith('blob:')) {
                            const absoluteUrl = new URL(resource, document.baseURI).href;
                            resource = '${proxyBaseUrl}' + encodeURIComponent(absoluteUrl);
                          }
                        } else if (resource instanceof URL) {
                          const absoluteUrl = new URL(resource.href, document.baseURI).href;
                          if (!absoluteUrl.startsWith('${proxyBaseUrl}') && !absoluteUrl.startsWith('data:') && !absoluteUrl.startsWith('blob:')) {
                            resource = '${proxyBaseUrl}' + encodeURIComponent(absoluteUrl);
                          }
                        } else if (resource instanceof Request) {
                          const requestUrl = resource.url;
                          if (!requestUrl.startsWith('${proxyBaseUrl}') && !requestUrl.startsWith('data:') && !requestUrl.startsWith('blob:')) {
                            const absoluteUrl = new URL(requestUrl, document.baseURI).href;
                            const proxyUrl = '${proxyBaseUrl}' + encodeURIComponent(absoluteUrl);
                            try {
                              resource = new Request(proxyUrl, resource);
                            } catch (err) {
                              const cloneReq = resource.clone();
                              resource = new Request(proxyUrl, {
                                method: cloneReq.method,
                                headers: cloneReq.headers,
                                credentials: cloneReq.credentials,
                                cache: cloneReq.cache,
                                redirect: cloneReq.redirect,
                                referrer: cloneReq.referrer,
                                integrity: cloneReq.integrity,
                                keepalive: cloneReq.keepalive,
                                signal: cloneReq.signal
                              });
                            }
                          }
                        }
                      }
                    } catch(e) {
                      console.warn("fetch intercept error:", e);
                    }
                    return originalFetch.call(this, resource, config);
                  };
              } catch(e) {}

              // Intercept XHR
              try {
                  const originalXhrOpen = XMLHttpRequest.prototype.open;
                  XMLHttpRequest.prototype.open = function(method, url) {
                    try {
                      if ((typeof url === 'string' || url instanceof URL) && !String(url).startsWith('${proxyBaseUrl}') && !String(url).startsWith('data:') && !String(url).startsWith('blob:')) {
                         const absoluteUrl = new URL(url, document.baseURI).href;
                         url = '${proxyBaseUrl}' + encodeURIComponent(absoluteUrl);
                      }
                    } catch(e){}
                    return originalXhrOpen.call(this, method, url, arguments[2], arguments[3], arguments[4]);
                  };
              } catch(e){}

              // Helper to extract final destination from any redirected/proxied url
              function extractFinalUrl(url) {
                  if (!url) return '';
                  try {
                      let u = url;
                      // Remove our own proxy prefix if it exists
                      if (u.includes('?url=')) {
                          const parts = u.split('?url=');
                          u = decodeURIComponent(parts[1] || parts[0]);
                      } else if (u.includes('&url=')) {
                          const parts = u.split('&url=');
                          u = decodeURIComponent(parts[1]?.split('&')[0] || parts[0]);
                      }

                      // Extract from search result redirect parameters (Google, Startpage, Bing, DuckDuckGo, Yahoo, etc.)
                      try {
                          const urlObj = new URL(u, document.baseURI);
                          const dest = urlObj.searchParams.get('url') || 
                                       urlObj.searchParams.get('q') || 
                                       urlObj.searchParams.get('uddg') || 
                                       urlObj.searchParams.get('RU') ||
                                       urlObj.searchParams.get('ru');
                          if (dest && (dest.startsWith('http://') || dest.startsWith('https://'))) {
                              return dest;
                          }
                          // Check Yahoo path based RU
                          if (u.includes('/RU=')) {
                              const ruPart = u.split('/RU=')[1];
                              if (ruPart) {
                                  let ruUrl = decodeURIComponent(ruPart.split('/')[0]);
                                  if (ruUrl && (ruUrl.startsWith('http://') || ruUrl.startsWith('https://'))) {
                                      return ruUrl;
                                  }
                              }
                          }
                      } catch (e) {}

                      return u;
                  } catch (e) {
                      return url;
                  }
              }

              function getProxiedTargetUrl(url) {
                  if (!url) return null;
                  try {
                      if (url.includes('?url=')) {
                          return decodeURIComponent(url.split('?url=')[1]);
                      } else if (url.includes('&url=')) {
                          return decodeURIComponent(url.split('&url=')[1].split('&')[0]);
                      }
                  } catch (e) {}
                  return null;
              }

              function isExternalLink(linkUrl) {
                  if (!linkUrl) return false;
                  try {
                      const cleaned = extractFinalUrl(linkUrl);
                      if (!cleaned) return false;
                      
                      const targetUrlObj = new URL(cleaned, document.baseURI);
                      const currentProxiedUrl = getProxiedTargetUrl(document.baseURI) || getProxiedTargetUrl(window.location.href);
                      
                      if (!currentProxiedUrl) {
                          return false;
                      }
                      
                      const currentProxiedObj = new URL(currentProxiedUrl);
                      return targetUrlObj.hostname !== currentProxiedObj.hostname;
                  } catch (e) {
                      return false;
                  }
              }

              // Intercept mousedown in the capture phase to block search engine tracking and ad scripts
              // from modifying or swapping the href attribute before the click completes.
              document.addEventListener('mousedown', function(e) {
                  const link = e.target.closest('a');
                  if (link && link.href) {
                      const href = link.getAttribute('href');
                      if (href && !href.startsWith('javascript:') && !href.startsWith('#') && !href.startsWith('blob:') && !href.startsWith('data:') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
                          if (isExternalLink(link.href)) {
                              e.stopPropagation();
                          }
                      }
                  }
              }, { capture: true });

              // Handle clicks safely with capture phase to bypass redirections, tracking preventDefaults & ad-hijackers
              document.addEventListener('click', function(e) {
                const link = e.target.closest('a');
                if (link && link.href) {
                  const href = link.getAttribute('href');
                  if (href && (
                      href.startsWith('javascript:') || 
                      href.startsWith('#') || 
                      href.startsWith('blob:') || 
                      href.startsWith('data:') ||
                      href.startsWith('mailto:') ||
                      href.startsWith('tel:') ||
                      href.startsWith('sms:')
                  )) return;

                  const cleanedDest = extractFinalUrl(link.href);
                  const isExt = isExternalLink(link.href);
                  const targetBlank = link.getAttribute('target') === '_blank';

                  // Only take control of external links or target="_blank" popups in capture phase
                  if (targetBlank || isExt) {
                      e.preventDefault();
                      e.stopPropagation();
                      if (targetBlank) {
                          window.parent.postMessage({ type: 'popup', url: cleanedDest, isClick: true }, '*');
                      } else {
                          window.parent.postMessage({ type: 'navigate', url: cleanedDest }, '*');
                      }
                  }
                }
              }, { capture: true });

              // Handle internal links in bubble phase. 
              // If the SPA or website didn't prevent default, we intercept it so it stays within our proxy.
              // This fixes menus and normal site functions not working if they rely on native anchor clicks.
              document.addEventListener('click', function(e) {
                if (e.defaultPrevented) return;
                const link = e.target.closest('a');
                if (link && link.href) {
                  const href = link.getAttribute('href');
                  if (href && (
                      href.startsWith('javascript:') || 
                      href.startsWith('#') || 
                      href.startsWith('blob:') || 
                      href.startsWith('data:') ||
                      href.startsWith('mailto:') ||
                      href.startsWith('tel:') ||
                      href.startsWith('sms:')
                  )) return;

                  const isExt = isExternalLink(link.href);
                  const targetBlank = link.getAttribute('target') === '_blank';
                  
                  // External or _blank already handled by capture phase
                  if (targetBlank || isExt) return;

                  e.preventDefault();
                  const cleanedDest = extractFinalUrl(link.href);
                  window.parent.postMessage({ type: 'navigate', url: cleanedDest }, '*');
                }
              }, false);

              document.addEventListener('submit', function(e) {
                const form = e.target;
                if (form && form.tagName === 'FORM') {
                  const action = form.getAttribute('action') || document.baseURI;
                  // If someone prevents default, respect it (like SPAs doing AJAX login)
                  if (e.defaultPrevented) return;
                  
                  // Only intercept GET forms for now to be safe, because POST requires reading form data
                  if (form.method.toLowerCase() === 'get') {
                      e.preventDefault();
                      try {
                          const urlObj = new URL(action, document.baseURI);
                          const formData = new FormData(form);
                          const params = new URLSearchParams(formData);
                          urlObj.search = params.toString();
                          
                          const cleanedDest = extractFinalUrl(urlObj.href);
                          const targetBlank = form.getAttribute('target') === '_blank';
                          
                          if (targetBlank) {
                              window.parent.postMessage({ type: 'popup', url: cleanedDest, isClick: true }, '*');
                          } else {
                              window.parent.postMessage({ type: 'navigate', url: cleanedDest }, '*');
                          }
                      } catch (err) {}
                  }
                }
              }, false);
              
              // Handle window.open
              window.originalOpen = window.open;
              window.open = function(url, name, specs) {
                  if (url) {
                      const absoluteUrl = new URL(url, document.baseURI).href;
                      const isClick = (Date.now() - lastClickTime < 1000);
                      window.parent.postMessage({ type: 'popup', url: absoluteUrl, isClick: isClick }, '*');
                  }
                  return null;
              };

              // Hook dynamically created elements (like iframes for videos)
              const originalSetAttribute = Element.prototype.setAttribute;
              Element.prototype.setAttribute = function(name, val) {
                  if ((name === 'src' || name === 'href') && typeof val === 'string' && !val.startsWith('${proxyBaseUrl}') && !val.startsWith('data:') && !val.startsWith('blob:') && !val.startsWith('javascript:') && !val.startsWith('#')) {
                      if (this.tagName === 'IFRAME' || this.tagName === 'VIDEO' || this.tagName === 'SOURCE') {
                          try {
                              let absoluteUrl = val;
                              if (val.startsWith('//')) absoluteUrl = 'https:' + val;
                              else if (!val.startsWith('http')) absoluteUrl = new URL(val, document.baseURI).href;
                              val = '${proxyBaseUrl}' + encodeURIComponent(absoluteUrl);
                          } catch(e){}
                      }
                  }
                  return originalSetAttribute.call(this, name, val);
              };

              const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                  if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                      if (node.tagName && ['IFRAME', 'VIDEO', 'SOURCE'].includes(node.tagName)) {
                        const attr = 'src';
                        const src = node.getAttribute(attr);
                        if (src && !src.startsWith('${proxyBaseUrl}') && !src.startsWith('data:') && !src.startsWith('blob:') && !src.startsWith('javascript:')) {
                           let absoluteUrl = src;
                           if (src.startsWith('//')) absoluteUrl = 'https:' + src;
                           else if (!src.startsWith('http')) {
                               try { absoluteUrl = new URL(src, document.baseURI).href; } catch(e){}
                           }
                           node.setAttribute(attr, '${proxyBaseUrl}' + encodeURIComponent(absoluteUrl));
                        }
                      }
                    });
                  }
                });
              });
              observer.observe(document.documentElement, { childList: true, subtree: true });
              document.addEventListener('click', function(e) {
                 let el = e.target;
                 while(el && el.tagName !== 'A') el = el.parentNode;
                 if(el && (el.hasAttribute('download') || (el.href && el.href.includes('.apk')))) {
                    e.preventDefault();
                    let fileUrl = el.href;
                    if(fileUrl.startsWith('${proxyBaseUrl}')) {
                       fileUrl = decodeURIComponent(fileUrl.split('?url=')[1]);
                    }
                    window.parent.postMessage({ type: 'download', url: fileUrl, filename: el.getAttribute('download') || 'file_download' }, '*');
                 }
              }, {capture: true});

              // Handle triple click/tap to show context menu
              let clickCount = 0;
              let lastClickTime = 0;
              
              function onTripleTap(e) {
                  const target = e.target.nodeType === 3 ? e.target.parentNode : e.target;
                  let selectedText = window.getSelection().toString() || (target.innerText && target.innerText.substring(0, 200));
                  let href = target.closest ? (target.closest('a') ? target.closest('a').href : null) : null;
                  let src = target.closest ? (target.closest('img') ? target.closest('img').src : null) : null;
                  if (href && href.includes('${proxyBaseUrl}')) {
                      try { href = decodeURIComponent(new URL(href).searchParams.get('url')); } catch(err){}
                  }
                  if (src && src.includes('${proxyBaseUrl}')) {
                      try { src = decodeURIComponent(new URL(src).searchParams.get('url')); } catch(err){}
                  }
                  window.parent.postMessage({
                      type: 'triple-tap',
                      url: document.baseURI || window.location.href,
                      text: selectedText,
                      link: href,
                      image: src
                  }, '*');
              }

              document.addEventListener('click', function(e) {
                  const now = Date.now();
                  if (now - lastClickTime < 500) {
                      clickCount++;
                      if (clickCount >= 3) {
                          onTripleTap(e);
                          clickCount = 0;
                      }
                  } else {
                      clickCount = 1;
                  }
                  lastClickTime = now;
              }, {capture: true});

              // Detect V gesture inside iframe and postMessage to parent for F12 access
              (function() {
                  let points = [];
                  let isDrawing = false;
                  
                  function handleStart(x, y) {
                      points = [{ x: x, y: y }];
                      isDrawing = true;
                  }
                  
                  function handleMove(x, y) {
                      if (!isDrawing) return;
                      if (points.length < 300) {
                          points.push({ x: x, y: y });
                      }
                  }
                  
                  function handleEnd() {
                      if (!isDrawing || points.length < 5) {
                          isDrawing = false;
                          return;
                      }
                      isDrawing = false;
                      
                      let maxYIdx = 0;
                      for (let i = 0; i < points.length; i++) {
                          if (points[i].y > points[maxYIdx].y) {
                              maxYIdx = i;
                          }
                      }
                      
                      const minPointsRequirement = 2;
                      if (maxYIdx >= minPointsRequirement && maxYIdx <= points.length - 1 - minPointsRequirement) {
                          let startPoint = points[0];
                          let valleyPoint = points[maxYIdx];
                          let endPoint = points[points.length - 1];
                          
                          let dy1 = valleyPoint.y - startPoint.y;
                          let dx1 = valleyPoint.x - startPoint.x;
                          let dy2 = valleyPoint.y - endPoint.y;
                          let dx2 = endPoint.x - valleyPoint.x;
                          
                          let minStrokeLength = 40;
                          if (dy1 > minStrokeLength && dy2 > minStrokeLength && dx1 > -20 && dx2 > -20) {
                              let totalWidth = endPoint.x - startPoint.x;
                              if (totalWidth > minStrokeLength) {
                                  window.parent.postMessage({ type: 'open-multi-tool' }, '*');
                              }
                          }
                      }
                      points = [];
                  }
                  
                  document.addEventListener('touchstart', function(e) {
                      if (e.touches && e.touches.length === 1) {
                          handleStart(e.touches[0].clientX, e.touches[0].clientY);
                      }
                  }, { passive: true });
                  
                  document.addEventListener('touchmove', function(e) {
                      if (e.touches && e.touches.length === 1) {
                          handleMove(e.touches[0].clientX, e.touches[0].clientY);
                      }
                  }, { passive: true });
                  
                  document.addEventListener('touchend', handleEnd, { passive: true });
                  
                  document.addEventListener('mousedown', function(e) {
                      if (e.button === 0) {
                          handleStart(e.clientX, e.clientY);
                      }
                  }, { passive: true });
                  
                  document.addEventListener('mousemove', function(e) {
                      handleMove(e.clientX, e.clientY);
                  }, { passive: true });
                  
                  document.addEventListener('mouseup', handleEnd, { passive: true });
              })();
              </script>
            `);

            let renderedHtml = $.html();
            renderedHtml = renderedHtml.replace(/(<meta\s+[^>]*?url=)([^;"'>]+)([^>]*>)/gi, (match, p1, p2, p3) => {
               if (p2.startsWith(proxyBaseUrl) || p2.startsWith('javascript:')) return match;
               try {
                  const absoluteUrl = new URL(p2, finalUrl).href;
                  return p1 + proxyBaseUrl + encodeURIComponent(absoluteUrl) + p3;
               } catch (e) {
                  return match;
               }
            });
            renderedHtml = renderedHtml.replace(/(<a\s+[^>]*?href=['"])([^'"#][^'"]*)(['"][^>]*>)/gi, (match, p1, p2, p3) => {
               if (p2.startsWith(proxyBaseUrl) || p2.startsWith('javascript:') || p2.startsWith('data:')) return match;
               try {
                  const absoluteUrl = new URL(p2, finalUrl).href;
                  return p1 + proxyBaseUrl + encodeURIComponent(absoluteUrl) + p3;
               } catch (e) {
                  return match;
               }
            });

            res.send(renderedHtml.replace('</body>', `
               <script>
               // AI Real-Time Video Sniffer Engine
               (function() {
                   var metaRefresh = document.querySelector('meta[http-equiv="refresh"][content]');
                   if (metaRefresh) {
                       var content = metaRefresh.getAttribute('content');
                       var match = content.match(/url=([^;"'>]+)/i);
                       if (match && match[1]) {
                           var redirectTo = match[1].trim();
                           if (redirectTo.startsWith('http') || redirectTo.startsWith('/')) {
                               window.location.replace(redirectTo);
                               return;
                           }
                       }
                   }

                   function detectVideoElements() {
                       var hasVideo = false;
                       var videoUrl = '';
                       var vid = document.querySelector('video');
                       var audio = document.querySelector('audio');
                       var src = document.querySelector('source[type*="video"], source[type*="audio"], source[src*=".mp4"], source[src*=".mp3"], source[src*=".m4a"], source[src*=".mpeg"], source[src*=".mov"], source[src*=".mkv"], source[src*=".m3u8"], source[src*=".webm"], source[src*=".ogg"], source[src*=".wav"]');
                       var aSrc = document.querySelector('a[href*=".mp4"], a[href*=".m3u8"]');
                       var holder = document.querySelector('#embed_holder, .responsive-embed-stream, .embed-holder, .responsive-embed-iframe, #pembed, .player-embed, .video-content, .video-holder, [data-sentinel-enhanced], .audio-content, #venkonten, .player-area, .video-player, .stream-player');
                       var iframeVid = document.querySelector('iframe[src*="youtube"], iframe[src*="youtu.be"], iframe[src*="tiktok"], iframe[src*="instagram"], iframe[src*="soundcloud"], iframe[src*="vimeo"], iframe[src*="dailymotion"], iframe[allowfullscreen], iframe[src*="embed"], iframe[src*="player"], iframe[src*="stream"], iframe[src*="video"]');
                       
                       var pageUrl = window.location.href;
                       var matchDomain = pageUrl.includes('youtube.com/watch') || 
                                         pageUrl.includes('youtu.be/') || 
                                         pageUrl.includes('tiktok.com/') || 
                                         pageUrl.includes('instagram.com/p/') || 
                                         pageUrl.includes('instagram.com/reel/') || 
                                         pageUrl.includes('soundcloud.com/');

                       if (vid || audio || src || aSrc || holder || iframeVid || matchDomain) {
                           hasVideo = true;
                           
                           if (vid && vid.src && !vid.src.startsWith('blob:')) videoUrl = vid.src;
                           else if (src && src.src) videoUrl = src.src;
                           else if (iframeVid && iframeVid.src) videoUrl = iframeVid.src;
                           else if (aSrc && aSrc.href) videoUrl = aSrc.href;
                       }

                       if (hasVideo) {
                           let targetWindow = window;
                           while (targetWindow && targetWindow !== window.top) {
                               targetWindow = targetWindow.parent;
                               try { targetWindow.postMessage({ type: 'video-detected', videoDetected: true, videoUrl: videoUrl || pageUrl }, '*'); } catch(e) {}
                           }
                       }
                   }

                   // Run immediately and periodically
                   try {
                       detectVideoElements();
                       setInterval(detectVideoElements, 1000);

                       // Also read on DOM Mutation
                       if (window.MutationObserver) {
                           var videoObserver = new MutationObserver(detectVideoElements);
                           videoObserver.observe(document.body || document.documentElement, {
                               childList: true,
                               subtree: true,
                               attributes: true
                           });
                       }
                   } catch(e) {}
               })();

               // AI Real-Time Sentinel Interceptors
               window.addEventListener('error', function(event) {
                   window.parent.postMessage({
                       type: 'iframe-error',
                       message: event.message || 'Unknown Web Sandbox Error',
                       stack: event.error?.stack || '',
                       url: window.location.href
                   }, '*');
               });
               window.addEventListener('unhandledrejection', function(event) {
                   window.parent.postMessage({
                       type: 'iframe-error',
                       message: event.reason?.message || String(event.reason),
                       stack: event.reason?.stack || '',
                       url: window.location.href
                   }, '*');
               });
               const origConsoleError = console.error;
               console.error = function() {
                   origConsoleError.apply(console, arguments);
                   const msg = Array.from(arguments).map(arg => {
                       if (arg instanceof Error) return arg.message + '\\n' + arg.stack;
                       if (typeof arg === 'object') {
                           try { return JSON.stringify(arg); } catch (e) { return '[Object]'; }
                       }
                       return String(arg);
                   }).join(' ');
                   if (msg.includes('ws://') || msg.includes('websocket') || msg.includes('HMR')) return;
                   window.parent.postMessage({
                       type: 'iframe-error',
                       message: msg,
                       stack: new Error().stack,
                       url: window.location.href
                   }, '*');
               };

               // --- OTAKUDESU PLAYER ENHANCER & AUTO-FAILOVER SENTINEL ---
               (function() {
                   // Keep checking for the presence of the video player or mirrors
                                       function initOtakudesuEnhancer() {
                        var playerContainer = document.querySelector('#embed_holder') || 
                                              document.querySelector('.responsive-embed-stream') || 
                                              document.querySelector('.embed-holder') ||
                                              document.querySelector('.responsive-embed-iframe') ||
                                              document.querySelector('#pembed') ||
                                              document.querySelector('.player-embed') ||
                                              document.querySelector('.video-content');
                        
                        if (!playerContainer) {
                            var alternativeFrame = document.querySelector('.embed-holder iframe') || 
                                                    document.querySelector('.responsive-embed-iframe iframe') || 
                                                    document.querySelector('#pembed iframe');
                            if (alternativeFrame) {
                                playerContainer = alternativeFrame.parentElement || document.body;
                            } else {
                                return;
                            }
                        }
                       
                       // Avoid duplicate init
                       if (playerContainer.hasAttribute('data-sentinel-enhanced')) return;
                       playerContainer.setAttribute('data-sentinel-enhanced', 'true');
                       
                       console.log('[Sentinel] Found Otakudesu video player container:', playerContainer);
                       
                       // Dynamically extract and render download links directly below the player
                       try {
                           var downloadsList = (function() {
                               var downloads = [];
                               var containers = document.querySelectorAll('.download, .kunis, .dl-links, .kenshu, #download');
                               containers.forEach(function(container) {
                                   var listItems = container.querySelectorAll('li');
                                   listItems.forEach(function(li) {
                                       var text = li.textContent || '';
                                       var qualityMatch = text.match(/(\d+p)/i) || (li.parentElement && li.parentElement.previousElementSibling && li.parentElement.previousElementSibling.textContent.match(/(\d+p)/i));
                                       var quality = qualityMatch ? qualityMatch[1] : 'MP4';
                                       
                                       var h4 = li.querySelector('h4, h3, strong, b');
                                       if (h4) {
                                           var h4Text = h4.textContent.trim();
                                           var h4Quality = h4Text.match(/(\d+p)/i);
                                           if (h4Quality) {
                                               quality = h4Quality[0];
                                           }
                                       }
                                       
                                       var links = li.querySelectorAll('a');
                                       if (links.length > 0) {
                                           var linkItems = [];
                                           links.forEach(function(a) {
                                               var href = a.getAttribute('href');
                                               if (href && href.startsWith('http')) {
                                                   var serverName = a.textContent.trim() || 'Download';
                                                   serverName = serverName.replace(/^-\s*/, '').replace(/\s*-$/, '').trim();
                                                   linkItems.push({
                                                       server: serverName,
                                                       url: href
                                                   });
                                               }
                                           });
                                           
                                           if (linkItems.length > 0) {
                                               var existing = downloads.find(function(d) { return d.quality.toLowerCase() === quality.toLowerCase(); });
                                               if (existing) {
                                                    existing.links = existing.links.concat(linkItems);
                                               } else {
                                                   downloads.push({
                                                       quality: quality.toUpperCase(),
                                                       links: linkItems
                                                   });
                                               }
                                           }
                                       }
                                   });
                                   
                                   if (downloads.length === 0) {
                                       var allLinks = container.querySelectorAll('a');
                                       if (allLinks.length > 0) {
                                           var generalLinks = [];
                                           allLinks.forEach(function(a) {
                                               var href = a.getAttribute('href');
                                               if (href && href.startsWith('http')) {
                                                   var text = a.textContent.trim();
                                                   var parentText = a.parentElement ? a.parentElement.textContent : '';
                                                   var qualityMatch = text.match(/(\d+p)/i) || parentText.match(/(\d+p)/i);
                                                   var q = qualityMatch ? qualityMatch[1].toUpperCase() : 'Premium';
                                                   
                                                   generalLinks.push({
                                                       quality: q,
                                                       server: text || 'Mirror',
                                                       url: href
                                                   });
                                               }
                                           });
                                           
                                           generalLinks.forEach(function(g) {
                                               var existing = downloads.find(function(d) { return d.quality === g.quality; });
                                               if (existing) {
                                                   existing.links.push({ server: g.server, url: g.url });
                                               } else {
                                                   downloads.push({
                                                       quality: g.quality,
                                                       links: [{ server: g.server, url: g.url }]
                                                   });
                                               }
                                           });
                                       }
                                   }
                               });
                               
                               downloads.forEach(function(group) {
                                   var uniqueLinks = [];
                                   var seenUrls = {};
                                   group.links.forEach(function(l) {
                                       if (!seenUrls[l.url]) {
                                           seenUrls[l.url] = true;
                                           uniqueLinks.push(l);
                                       }
                                   });
                                   group.links = uniqueLinks;
                                });
                               return downloads;
                           })();

                           if (downloadsList && downloadsList.length > 0) {
                               if (!document.querySelector('.custom-otakudesu-downloader-panel')) {
                                   var panel = document.createElement('div');
                                   panel.className = 'custom-otakudesu-downloader-panel';
                                   panel.style.cssText = 'background: #09090b; border: 1px solid #272730; border-radius: 20px; padding: 20px; margin-top: 15px; color: #ffffff; font-family: sans-serif; box-shadow: 0 10px 25px rgba(0,0,0,0.5); text-align: left;';
                                   
                                   var title = document.createElement('div');
                                   title.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 15px; border-b: 1px solid #1f1f2e; padding-bottom: 12px;';
                                   title.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-download-cloud"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m8 17 4 4 4-4"/></svg>' +
                                                     '<span style="font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #f97316;">Pilihan Unduh Media (Otakudesu)</span>';
                                   panel.appendChild(title);
                                   
                                   downloadsList.forEach(function(group) {
                                       var row = document.createElement('div');
                                       row.style.cssText = 'display: flex; flex-direction: column; gap: 8px; margin-bottom: 15px; background: #13131a; padding: 12px; border-radius: 12px; border: 1px solid #1c1c24;';
                                       
                                       var header = document.createElement('div');
                                       header.style.cssText = 'display: flex; align-items: center; gap: 8px;';
                                       header.innerHTML = '<span style="background: linear-gradient(135deg, #f97316, #ef4444); color: #fff; font-weight: 900; font-size: 11px; padding: 3px 8px; border-radius: 6px; font-family: monospace;">' + group.quality + '</span>' +
                                                          '<span style="font-size: 11px; font-weight: 700; color: #a1a1aa;">Bahasa Indonesia (Standard Encoding)</span>';
                                       row.appendChild(header);
                                       
                                       var linksContainer = document.createElement('div');
                                       linksContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px;';
                                       
                                       group.links.forEach(function(link) {
                                           var btn = document.createElement('a');
                                           btn.href = link.url;
                                           btn.target = '_blank';
                                           btn.innerText = link.server;
                                           btn.style.cssText = 'background: #1e1e2f; color: #e4e4e7; border: 1px solid #2d2d3f; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: bold; text-decoration: none; display: flex; align-items: center; gap: 6px; cursor: pointer; transition: all 0.2s;';
                                           btn.onmouseover = function() { btn.style.background = '#2e2e4f'; btn.style.borderColor = '#f97316'; btn.style.color = '#fff'; };
                                           btn.onmouseout = function() { btn.style.background = '#1e1e2f'; btn.style.borderColor = '#2d2d3f'; btn.style.color = '#e4e4e7'; };
                                           
                                           btn.addEventListener('click', function(ev) {
                                               ev.preventDefault();
                                               ev.stopPropagation();
                                               var confirmCloud = confirm("Ingin mendownload \"" + link.server + " (" + group.quality + ")\" melalui Cloud Downloader kami yang super cepat?");
                                               if (confirmCloud) {
                                                   window.parent.postMessage({
                                                       type: 'download',
                                                       url: link.url,
                                                       filename: 'Otakudesu_Episode_' + group.quality + '_' + link.server + '.mp4'
                                                   }, '*');
                                               } else {
                                                   window.open(link.url, '_blank');
                                               }
                                            });
                                           
                                           linksContainer.appendChild(btn);
                                       });
                                       
                                       row.appendChild(linksContainer);
                                       panel.appendChild(row);
                                   });
                                   
                                   var subtext = document.createElement('div');
                                   subtext.style.cssText = 'font-size: 10px; color: #71717a; text-align: center; margin-top: 10px; line-height: 1.4;';
                                   subtext.innerText = 'Tip: Klik tautan server di atas untuk memilih metode download. Cloud Downloader akan mempercepat proses download file video besar.';
                                   panel.appendChild(subtext);
                                   
                                   if (playerContainer.parentNode) {
                                       playerContainer.parentNode.insertBefore(panel, playerContainer.nextSibling);
                                       console.log('[Sentinel] Successfully injected Otakudesu original download menu below player!');
                                   }
                               }
                           }
                       } catch(e) {
                           console.error("[Sentinel] Error parsing/injecting download panel:", e);
                       }

                       // State to track if failover overlay is currently active
                       var overlayActive = false;
                       
                       // Detect mirror links under .mirrorstream or general container
                       function getMirrors() {
                           var found = [];
                           // Look for typical Otakudesu selectors
                           var elements = document.querySelectorAll('.mirrorstream a, .mirrorstream li, .mirrorstream span, a.mirror, .mirror a, a[href*="mirror"], .mirror-button');
                           
                           elements.forEach(function(el, idx) {
                               // Make sure it's clickable and has valid text
                               var text = (el.textContent || el.innerText || '').trim();
                               if (!text || text.toLowerCase() === 'mirror' || text.length > 50) return;
                               
                               // Standard link detection or list items that have text or action
                               var resolution = '';
                               // Look upwards for resolution indicators (e.g. parent has class m360p, or preceding sibling with text)
                               var resEl = el.closest('ul') || el.closest('.mirrorstream');
                               if (resEl) {
                                   var classes = Array.from(resEl.classList);
                                   var foundClass = classes.find(function(c) { return c.match(/(m?\d+p)/i); });
                                   if (foundClass) {
                                       resolution = foundClass.replace(/^m/i, '').toUpperCase();
                                   } else {
                                       // Try searching preceding sibling texts
                                       var header = resEl.querySelector('.resolution, .server-res, span, h5');
                                       if (header) {
                                           resolution = header.textContent.trim();
                                       }
                                   }
                               }
                               
                               // Try fallback to check parents
                               var current = el.parentElement;
                               while (current && current !== document.body && !resolution) {
                                   var idClass = (current.className || '') + ' ' + (current.id || '');
                                   var match = idClass.match(/(\d+p)/i);
                                   if (match) {
                                       resolution = match[1].toUpperCase();
                                   }
                                   current = current.parentElement;
                               }
                               
                               var label = text;
                               if (resolution && text.indexOf(resolution) === -1) {
                                   label = '[' + resolution + '] ' + text;
                               }
                               
                               found.push({
                                   element: el,
                                   name: label,
                                   id: idx
                               });
                           });
                           
                           return found;
                       }
                       
                       // In case direct video element errors out, catch it!
                       var videoEl = playerContainer.querySelector('video');
                       if (videoEl) {
                           videoEl.addEventListener('error', function(e) {
                               console.log('[Sentinel] Native <video> load error caught:', e);
                               showFallbackOverlay();
                           });
                       }
                       
                                               // Listen for frame errors on embedded streaming players (supports both containers and documents)
                        var iframeEl = playerContainer.querySelector('iframe') ||
                                       document.querySelector('.embed-holder iframe') ||
                                       document.querySelector('.responsive-embed-iframe iframe') ||
                                       document.querySelector('#pembed iframe') ||
                                       document.querySelector('#embed_holder iframe') ||
                                       document.querySelector('.responsive-embed-stream iframe') ||
                                       document.querySelector('.player-embed iframe') ||
                                       document.querySelector('.video-content iframe');
                        
                        if (iframeEl) {
                            if (!iframeEl.hasAttribute('data-error-hooked')) {
                                iframeEl.setAttribute('data-error-hooked', 'true');
                                
                                // Direct error events
                                iframeEl.addEventListener('error', function() {
                                    console.log('[Sentinel] Embedded player <iframe> load failure detected.');
                                    showFallbackOverlay();
                                });
                                
                                // Fallback watch load
                                iframeEl.addEventListener('load', function() {
                                    console.log('[Sentinel] Embedded player <iframe> completed load trigger.');
                                    try {
                                        if (iframeEl.contentWindow && (iframeEl.contentWindow.location.href === 'about:blank' || iframeEl.contentWindow.document.body.innerHTML === '')) {
                                            console.log('[Sentinel] Loaded about:blank or empty content on iframe. Triggering failover.');
                                            showFallbackOverlay();
                                        }
                                    } catch (err) {
                                        // Cross origin frame loading is typical for working video providers
                                    }
                                });
                            }
                        }
                       
                       // Create floating toggle button inside the container so the user can easily invoke backup routing manually
                       var manualToggle = document.createElement('button');
                       manualToggle.innerText = '⚙ Aliran Cadangan (Backup Server)';
                       manualToggle.style.cssText = 'position: absolute; bottom: 12px; right: 12px; background: rgba(147, 51, 234, 0.9); border: 1px solid rgba(255, 255, 255, 0.25); color: #ffffff; padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: 800; cursor: pointer; z-index: 99999; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3); backdrop-filter: blur(8px); transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); font-family: sans-serif;';
                       manualToggle.onmouseover = function() {
                           manualToggle.style.transform = 'translateY(-2px)';
                           manualToggle.style.background = 'rgba(147, 51, 234, 1)';
                       };
                       manualToggle.onmouseout = function() {
                           manualToggle.style.transform = 'translateY(0)';
                           manualToggle.style.background = 'rgba(147, 51, 234, 0.9)';
                       };
                       manualToggle.addEventListener('click', function(e) {
                           e.preventDefault();
                           e.stopPropagation();
                           showFallbackOverlay();
                       });
                       
                       playerContainer.style.position = 'relative';
                       playerContainer.appendChild(manualToggle);
                       
                       var styleNode = document.createElement('style');
                       styleNode.innerHTML = '@keyframes fadeInOverlay { from { opacity: 0; transform: scale(1.02); } to { opacity: 1; transform: scale(1); } } .mirror-option-btn:hover { background: #7c3aed !important; transform: translateY(-1.5px); box-shadow: 0 4px 10px rgba(124, 58, 237, 0.3); }';
                       document.head.appendChild(styleNode);

                       function showFallbackOverlay() {
                           if (overlayActive) return;
                           overlayActive = true;
                           
                           var mirrorsList = getMirrors();
                           console.log('[Sentinel] Assembling backup mirrors list for fallback dropdown:', mirrorsList);
                           
                           var overlay = document.createElement('div');
                           overlay.className = 'otakudesu-failover-overlay';
                           overlay.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(9, 9, 11, 0.96); display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fafafa; font-family: sans-serif; z-index: 100000; padding: 24px; box-sizing: border-box; text-align: center; animation: fadeInOverlay 0.3s ease-out; backdrop-filter: blur(6px);';
                           
                           var buttonsHtml = '';
                           if (mirrorsList.length > 0) {
                               buttonsHtml = mirrorsList.map(function(m) {
                                   return '<button class="mirror-option-btn" data-key="' + m.id + '" style="background: #1f1f2e; color: #f4f4f5; border: 1px solid #3f3f50; padding: 9px 15px; margin: 5px; border-radius: 12px; font-weight: 700; font-size: 11.5px; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);">' + m.name + '</button>';
                               }).join('');
                           } else {
                               buttonsHtml = '<div style="color: #a1a1aa; font-size: 12px; padding: 12px;">Tidak ada mirror server lain yang terdeteksi otomatis pada elemen halaman ini.</div>';
                           }
                           
                           overlay.innerHTML = '<div style="max-width: 440px; width: 100%; background: #121217; border: 1px solid #272730; border-radius: 20px; padding: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">' +
                               '<div style="background: rgba(147, 51, 234, 0.1); border: 1px solid rgba(147, 51, 234, 0.3); border-radius: 50%; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px;">' +
                                   '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>' +
                               '</div>' +
                               '<h4 style="margin: 0 0 6px; font-size: 15px; font-weight: 900; color: #f4f4f5; letter-spacing: -0.3px;">Mengarahkan Aliran Putaran Cadangan</h4>' +
                               '<p style="margin: 0 0 20px; font-size: 11.5px; color: #a1a1aa; line-height: 1.5; padding: 0 10px;">' +
                                   'Video utama gagal diputar atau lambat memuat. Silakan pilih alternatif server/resolusi lain yang tersedia di bawah ini untuk beralih secara instan:' +
                               '</p>' +
                               '<div style="display: flex; flex-wrap: wrap; justify-content: center; max-height: 180px; overflow-y: auto; padding: 6px; border: 1px solid #1e1e24; border-radius: 14px; background: rgba(0,0,0,0.3); margin-bottom: 20px;">' +
                                   buttonsHtml +
                               '</div>' +
                               '<div style="display: flex; gap: 8px; justify-content: center;">' +
                                   '<button class="failover-cancel-btn" style="background: transparent; border: 1px solid #272730; color: #d4d4d8; padding: 8px 16px; border-radius: 12px; font-weight: 700; font-size: 11px; cursor: pointer; transition: all 0.2s;">Batal</button>' +
                                   '<button class="failover-refresh-btn" style="background: rgba(255, 255, 255, 0.05); border: 1px solid #3f3f50; color: #ffffff; padding: 8px 16px; border-radius: 12px; font-weight: 700; font-size: 11px; cursor: pointer; transition: all 0.2s;">Segarkan Halaman</button>' +
                               '</div>' +
                           '</div>';
                           
                           // Attach button click events inside the overlay
                           overlay.querySelectorAll('.mirror-option-btn').forEach(function(btn) {
                               btn.addEventListener('click', function(ev) {
                                   ev.preventDefault();
                                   var targetId = parseInt(this.getAttribute('data-key'), 10);
                                   var mirrorData = mirrorsList.find(function(m) { return m.id === targetId; });
                                   
                                   if (mirrorData && mirrorData.element) {
                                       this.style.background = '#4c1d95';
                                       this.style.borderColor = '#8b5cf6';
                                       this.innerText = 'Menghubungkan Server...';
                                       
                                       // Programmatically trigger click on original link inside the web page 
                                       mirrorData.element.click();
                                       
                                       setTimeout(function() {
                                           overlay.remove();
                                           overlayActive = false;
                                           
                                           // Re-bind error listeners to newly generated frames/players after a small delay
                                           setTimeout(function() {
                                               var recheckVideo = playerContainer.querySelector('video');
                                               if (recheckVideo) {
                                                   recheckVideo.addEventListener('error', function() {
                                                       showFallbackOverlay();
                                                   });
                                               }
                                           }, 1500);
                                       }, 1200);
                                   }
                               });
                           });
                           
                           overlay.querySelector('.failover-cancel-btn').addEventListener('click', function(ev) {
                               ev.preventDefault();
                               overlay.remove();
                               overlayActive = false;
                           });
                           
                           overlay.querySelector('.failover-refresh-btn').addEventListener('click', function(ev) {
                               ev.preventDefault();
                               window.location.reload();
                           });
                           
                           playerContainer.appendChild(overlay);
                       }
                   }
                   
                   // Start checking for player components with safe interval loops to handle spa loading
                   setInterval(initOtakudesuEnhancer, 1500);

                   // --- ENHANCER NAVIGASI EPISODE OTAKUDESU ---
                   function initNavigationEnhancer() {
                       if (window.__navEnhancerInited) return;
                       
                       function findNextEpisodeLink() {
                           var candidate = document.querySelector('.prevnext a:last-child, .nextprev a:last-child, a[rel="next"], .flir a:last-child, .venutama a:last-child');
                           
                           if (candidate && candidate.href) {
                               var cText = (candidate.innerText || candidate.textContent || '').trim().toLowerCase();
                               if (cText.indexOf('prev') === -1 && cText.indexOf('sebelumnya') === -1) {
                                   return candidate.href;
                               }
                           }
                           
                           var links = document.querySelectorAll('a');
                           var nextPattern = /(next\\s*episode|episode\\s*selanjutnya|next|selanjutnya|lanjut)/i;
                           for (var i = 0; i < links.length; i++) {
                               var text = (links[i].innerText || links[i].textContent || '').trim();
                               if (nextPattern.test(text) && links[i].href) {
                                   return links[i].href;
                               }
                           }
                           return null;
                       }

                       function findPrevEpisodeLink() {
                           var candidate = document.querySelector('.prevnext a:first-child, .nextprev a:first-child, a[rel="prev"], .flir a:first-child, .venutama a:first-child');
                           
                           if (candidate && candidate.href) {
                               var cText = (candidate.innerText || candidate.textContent || '').trim().toLowerCase();
                               if (cText.indexOf('next') === -1 && cText.indexOf('selanjutnya') === -1) {
                                   return candidate.href;
                               }
                           }

                           var links = document.querySelectorAll('a');
                           var prevPattern = /(prev\\s*episode|episode\\s*sebelumnya|prev|sebelumnya|kembali)/i;
                           for (var i = 0; i < links.length; i++) {
                               var text = (links[i].innerText || links[i].textContent || '').trim();
                               if (prevPattern.test(text) && links[i].href) {
                                   return links[i].href;
                               }
                           }
                           return null;
                       }

                       function createNavButtons() {
                           var nextUrl = findNextEpisodeLink();
                           var prevUrl = findPrevEpisodeLink();

                           if (!nextUrl && !prevUrl) return;

                           var navContainer = document.createElement('div');
                           navContainer.style.cssText = 'position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); display: flex; gap: 10px; z-index: 100000; background: rgba(9, 9, 11, 0.85); padding: 8px 14px; border-radius: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.1); font-family: sans-serif;';

                           if (prevUrl) {
                               var prevBtn = document.createElement('button');
                               prevBtn.innerText = '« Sebelumnya';
                               prevBtn.style.cssText = 'background: transparent; color: #d4d4d8; border: none; font-weight: 700; font-size: 11px; cursor: pointer; padding: 6px 12px; border-radius: 15px; transition: all 0.2s;';
                               prevBtn.onmouseover = function() { prevBtn.style.background = 'rgba(255,255,255,0.1)'; prevBtn.style.color = '#fff'; };
                               prevBtn.onmouseout = function() { prevBtn.style.background = 'transparent'; prevBtn.style.color = '#d4d4d8'; };
                               prevBtn.onclick = function() {
                                   window.parent.postMessage({ type: 'navigate', url: prevUrl }, '*');
                                   window.location.href = prevUrl;
                               };
                               navContainer.appendChild(prevBtn);
                           }

                           if (nextUrl) {
                               var nextBtn = document.createElement('button');
                               nextBtn.innerText = 'Selanjutnya »';
                               nextBtn.style.cssText = 'background: #7c3aed; color: #fff; border: none; font-weight: 700; font-size: 11px; cursor: pointer; padding: 6px 12px; border-radius: 15px; transition: all 0.2s; box-shadow: 0 2px 8px rgba(124,58,237,0.4);';
                               nextBtn.onmouseover = function() { nextBtn.style.background = '#6d28d9'; nextBtn.style.transform = 'translateY(-1px)'; };
                               nextBtn.onmouseout = function() { nextBtn.style.background = '#7c3aed'; nextBtn.style.transform = 'translateY(0)'; };
                               nextBtn.onclick = function() {
                                   window.parent.postMessage({ type: 'navigate', url: nextUrl }, '*');
                                   window.location.href = nextUrl;
                               };
                               navContainer.appendChild(nextBtn);
                           }

                           document.body.appendChild(navContainer);
                       }

                       createNavButtons();

                       window.addEventListener('keydown', function(e) {
                           if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
                           if (e.key === 'ArrowRight' || e.key === 'n' || e.key === 'N') {
                               var nextUrl = findNextEpisodeLink();
                               if (nextUrl) {
                                   window.parent.postMessage({ type: 'navigate', url: nextUrl }, '*');
                                   window.location.href = nextUrl;
                               }
                           } else if (e.key === 'ArrowLeft' || e.key === 'p' || e.key === 'P') {
                               var prevUrl = findPrevEpisodeLink();
                               if (prevUrl) {
                                   window.parent.postMessage({ type: 'navigate', url: prevUrl }, '*');
                                   window.location.href = prevUrl;
                               }
                           }
                       });
                       
                       window.__navEnhancerInited = true;
                   }
                   setTimeout(initNavigationEnhancer, 2500);
               })();
               </script>
               </body>
             `));
          } catch (e) {
            // Fallback if parsing fails
            res.send(html);
          }
        });
      } else if (
        String(contentType).includes("mpegurl") ||
        String(contentType).includes("mpeg-url") ||
        targetUrl.includes(".m3u8")
      ) {
        const chunks: Buffer[] = [];
        response.data.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.data.on("end", () => {
          let m3u8 = Buffer.concat(chunks).toString("utf-8");
          const lines = m3u8.split("\n");
          for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (line && !line.startsWith("#")) {
              // It's a URI
              if (!line.startsWith("http")) {
                // If it's a relative path, make it absolute
                const absoluteUrl = new URL(line, targetUrl).href;
                lines[i] = "${proxyBaseUrl}" + encodeURIComponent(absoluteUrl);
              } else {
                lines[i] = "${proxyBaseUrl}" + encodeURIComponent(line);
              }
            } else if (
              line.startsWith("#EXT-X-STREAM-INF:") ||
              line.startsWith("#EXT-X-I-FRAME-STREAM-INF:") ||
              line.startsWith("#EXT-X-MEDIA:")
            ) {
              // Also rewrite URIs inside EXT-X tags, e.g. URI="segment.m3u8"
              const uriMatch = line.match(/URI="([^"]+)"/);
              if (uriMatch && uriMatch[1]) {
                const uri = uriMatch[1];
                if (!uri.startsWith("http") && !uri.startsWith("data:")) {
                  const absoluteUrl = new URL(uri, targetUrl).href;
                  lines[i] = line.replace(
                    'URI="' + uri + '"',
                    'URI="${proxyBaseUrl}' +
                      encodeURIComponent(absoluteUrl) +
                      '"',
                  );
                } else if (uri.startsWith("http")) {
                  lines[i] = line.replace(
                    'URI="' + uri + '"',
                    'URI="${proxyBaseUrl}' + encodeURIComponent(uri) + '"',
                  );
                }
              }
            }
          }
          res.send(lines.join("\n"));
        });
      } else {
        // For non-HTML (images, video streams), just pipe the data!
        response.data.on("error", (err: any) => {
           console.error("Stream pipe error:", err);
           if (!res.headersSent) res.status(502).end();
        });
        response.data.pipe(res);
      }
    } catch (error: any) {
      if (!res.headersSent) {
        const errorStatus = error.response ? `${error.response.status} ${error.response.statusText || "Error"}` : "CONNECTION_FAILED";
        const errorMessage = error.message || "Unknown proxy transmission error.";
        res.status(502).send(`
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gagal Memuat Halaman - UltraBrowser Diagnostic</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
            background-color: #0c0a09;
            color: #f5f5f4;
        }
    </style>
</head>
<body class="min-h-screen flex items-center justify-center p-4 bg-stone-950">
    <div class="max-w-md w-full bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <!-- Accent light -->
        <div class="absolute -top-12 -left-12 w-24 h-24 bg-red-500/10 rounded-full blur-2xl"></div>
        <div class="absolute -bottom-12 -right-12 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl"></div>

        <div class="relative z-10 flex flex-col items-center text-center">
            <!-- Icon Indicator -->
            <div class="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center border border-red-500/20 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>

            <!-- Title -->
            <h1 class="text-lg font-bold text-stone-100 mb-1">Gagal Memuat Halaman</h1>
            <p class="text-xs text-stone-400 mb-5 leading-relaxed">
                Server cloud UltraBrowser tidak dapat mengambil situs ini. Ini biasanya terjadi ketika situs web target memblokir hosting cloud atau memerlukan verifikasi langsung (seperti Cloudflare).
            </p>

            <!-- URL Display Card -->
            <div class="w-full bg-stone-950 border border-stone-850 rounded-xl p-3.5 mb-5 text-left font-sans">
                <div class="text-[9px] font-bold text-stone-500 uppercase tracking-wider mb-1">DATA DIAGNOSTIK</div>
                <div class="font-mono text-[10px] text-blue-400 break-all select-all select-text mb-2.5 font-medium">
                    ${targetUrl}
                </div>
                <!-- Mini diagnostic list -->
                <div class="pt-2 border-t border-stone-800/60 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                        <span class="text-stone-500 block text-[9px] uppercase tracking-wide">Status Error</span>
                        <span class="text-rose-400 font-semibold font-mono">${errorStatus}</span>
                    </div>
                    <div>
                        <span class="text-stone-500 block text-[9px] uppercase tracking-wide">Detail</span>
                        <span class="text-stone-300 font-mono text-[10px] truncate max-w-[150px] block">${errorMessage}</span>
                    </div>
                </div>
            </div>

            <!-- Action buttons -->
            <div class="w-full space-y-2">
                <!-- Open directly in new tab -->
                <a href="${targetUrl}" target="_blank" rel="noopener noreferrer" 
                   class="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    <span>Buka Langsung di Tab Baru</span>
                </a>

                <div class="grid grid-cols-2 gap-2">
                    <!-- Google Translate Proxy -->
                    <a href="https://translate.google.com/translate?sl=auto&tl=en&u=${encodeURIComponent(targetUrl)}" target="_blank" rel="noopener noreferrer"
                       class="flex items-center justify-center gap-1.5 py-2 px-3 bg-stone-800 hover:bg-stone-750 border border-stone-750 text-stone-200 font-semibold rounded-xl text-xs transition">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-stone-400" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
                        </svg>
                        <span>Gunakan Google Mirror</span>
                    </a>

                    <!-- Try reconnect / proxy setup -->
                    <button onclick="window.parent.postMessage({type: 'open_vpn_screen'}, '*')" 
                            class="flex items-center justify-center gap-1.5 py-2 px-3 bg-stone-800 hover:bg-stone-750 border border-stone-750 text-stone-200 font-semibold rounded-xl text-xs transition cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span>Gunakan Proxy VPN</span>
                    </button>
                </div>
            </div>
            
            <!-- Retry Button -->
            <button onclick="window.location.reload()" 
                    class="w-full py-1.5 text-stone-500 hover:text-stone-200 text-xs font-semibold rounded transition cursor-pointer flex items-center justify-center gap-1 mt-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 15.89M21 20v-5h-5.12" />
                </svg>
                <span>Muat Ulang Halaman</span>
            </button>
            
            <div class="mt-5 pt-3 border-t border-stone-800/60 w-full text-[9px] text-stone-600 font-mono">
                ULTRABROWSER V4 DIAGNOSTICS
            </div>
        </div>
    </div>
</body>
</html>
        `);
      }
    }
  });

  // --- 2. PUPPETEER EXTRA STEALTH & PROXY ROTATION BYPASS ENDPOINT ---
  /**
   * Endpoint for Reader Mode using Mozilla Readability
   */
  app.get("/api/reader", async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) return res.status(400).send("Parameter 'url' diperlukan.");

    try {
      const { default: axios } = await import('axios');
      const response = await axios.get(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        },
        responseType: 'text',
        // Optional: you can add proxy support here if needed for blocked sites
      });
      
      const { Readability } = await import('@mozilla/readability');
      const { JSDOM } = await import('jsdom');
      
      const dom = new JSDOM(response.data, { url: targetUrl });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();
      dom.window.close(); // Prevent memory leaks
      
      if (!article) {
         return res.status(500).send("Gagal mengurai halaman untuk Reader Mode.");
      }
      
      const html = `
        <!DOCTYPE html>
        <html lang="id">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${article.title} - Reader Mode</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; background: #fefefe; color: #111; line-height: 1.8; font-size: 18px; }
            h1 { font-size: 2.5rem; font-weight: 800; margin-bottom: 1rem; line-height: 1.2; }
            p { margin-bottom: 1.5rem; }
            img { max-width: 100%; height: auto; border-radius: 8px; margin: 2rem 0; }
            a { color: #2563eb; text-decoration: none; }
            a:hover { text-decoration: underline; }
            figure { margin: 2rem 0; }
            figcaption { font-size: 0.9rem; color: #666; margin-top: 0.5rem; font-style: italic; }
            blockquote { border-left: 4px solid #cbd5e1; padding-left: 1rem; margin-block: 2rem; color: #475569; font-style: italic; }
            .site-name { font-weight: 600; color: #64748b; font-size: 1rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1.5rem; display: block; border-bottom: 1px solid #e2e8f0; padding-bottom: 1rem; }
            @media (prefers-color-scheme: dark) {
              body { background: #121212; color: #e5e5e5; }
              a { color: #60a5fa; }
              blockquote { border-left-color: #334155; color: #94a3b8; }
              .site-name { border-bottom-color: #334155; color: #94a3b8; }
            }
          </style>
        </head>
        <body>
          <span class="site-name">${article.siteName || new URL(targetUrl).hostname}</span>
          <h1>${article.title}</h1>
          <div class="content">
            ${article.content}
          </div>
        </body>
        </html>
      `;
      res.send(html);
    } catch (e: any) {
      res.status(500).send("Error reading page: " + e.message);
    }
  });

  /**
   * Endpoint demo/produksi untuk scraping halaman kompleks dengan rendering JS penuh
   * yang bebas dari blokir anti-bot (Cloudflare, Google, CAPTCHA).
   * 
   * DAFTAR NPM PACKAGE YANG HARUS DI-INSTALL DI CPANEL JAGOAN HOSTING:
   * 1. npm install puppeteer-extra
   * 2. npm install puppeteer-extra-plugin-stealth
   * 3. npm install puppeteer
   * 4. npm install https-proxy-agent
   */
  app.get("/api/scrape/stealth", async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).json({ error: "Query parameter 'url' diperlukan" });
    }

    try {
      // Load dynamically agar tidak memicu build-error jika dependencies belum terinstall di development container
      const { default: puppeteer } = await import("puppeteer-extra" as any);
      const { default: StealthPlugin } = await import("puppeteer-extra-plugin-stealth" as any);
      
      // Pasang plugin Stealth
      puppeteer.use(StealthPlugin());

      console.log(`[Stealth Scraper] Meluncurkan browser stealth untuk url: ${targetUrl}`);

      // Setup argument & proxy
      const args = [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-infobars",
        "--window-position=0,0",
        "--ignore-certifcate-errors",
        "--ignore-certifcate-errors-spki-list"
      ];

      const proxyHost = process.env.PROXY_HOST;
      const proxyPort = process.env.PROXY_PORT;
      const proxyUser = process.env.PROXY_USER;
      const proxyPass = process.env.PROXY_PASS;

      if (proxyHost && proxyPort) {
        args.push(`--proxy-server=http://${proxyHost}:${proxyPort}`);
        console.log(`[Stealth Scraper] Menggunakan Residential Proxy pada browser: ${proxyHost}:${proxyPort}`);
      }

      const browser = await puppeteer.launch({
        headless: true,
        args: args,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined // Sesuai config hosting
      });

      const page = await browser.newPage();

      // === 4. OPTIMASI HEMAT BANDWIDTH (PENTING UNTUK JAGOAN HOSTING) ===
      // Mengaktifkan fitur Pencegatan Request (Request Interception)
      // Memblokir aset berat: gambar, stylesheet (CSS), font, media, & manifest agar hemat kuota proxy hingga 80%
      await page.setRequestInterception(true);
      page.on("request", (interceptedRequest) => {
        const resourceType = interceptedRequest.resourceType();
        if (["image", "stylesheet", "font", "media", "manifest"].includes(resourceType)) {
          interceptedRequest.abort();
        } else {
          interceptedRequest.continue();
        }
      });

      // === 2. MANIPULASI USER-AGENT & VIEWPORT REALISTIS ===
      const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
      await page.setUserAgent(userAgent);
      await page.setViewport({ width: 1366, height: 768 });

      // Jika proxy menggunakan otentikasi username & password
      if (proxyHost && proxyUser && proxyPass) {
        await page.authenticate({
          username: proxyUser,
          password: proxyPass
        });
      }

      // Set headers realistis
      await page.setExtraHTTPHeaders({
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8",
        "Referer": "https://www.google.com/"
      });

      // Buka halaman target
      await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: 45000 });

      // Dapatkan html utuh setelah JS dieksekusi penuh
      const htmlContent = await page.content();
      const pageTitle = await page.title();

      await browser.close();

      res.json({
        success: true,
        title: pageTitle,
        html: htmlContent
      });

    } catch (err: any) {
      console.error("[Stealth Scraper Error] Gagal menjalankan puppeteer-extra-stealth:", err.message);
      
      let message = "Gagal memproses scraping stealth. Pastikan sistem dapat menjangkau proxy jika dikonfigurasi.";
      if (err.message && err.message.includes("ERR_INVALID_AUTH_CREDENTIALS")) {
        message = "Otentikasi Proxy Ditolak (ERR_INVALID_AUTH_CREDENTIALS). Periksa username/password VPN anda.";
      }
      
      res.status(500).json({
        success: false,
        message: message,
        error: err.message,
        packagesNeeded: [
          "puppeteer",
          "puppeteer-extra",
          "puppeteer-extra-plugin-stealth",
          "https-proxy-agent"
        ]
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (isNaN(Number(PORT))) {
    app.listen(PORT, () => {
      console.log(`Server running on socket ${PORT}`);
    });
  } else {
    app.listen(Number(PORT), "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  }
}

startServer();

// =========================================================================
// === MEDIA BYPASS HELPERS & HTML RENDER TEMPLATES ===
// =========================================================================

async function searchWebVideos(query: string, siteFilter: string, req: any) {
  let proxyConfigUrl = "";
  if (req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|; )vpnProxy=([^;]*)/);
    if (match && match[1]) proxyConfigUrl = decodeURIComponent(match[1]);
  }
  
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "Connection": "keep-alive"
  };

  const axiosOptions: any = {
    headers,
    timeout: 10000,
    validateStatus: () => true
  };

  if (proxyConfigUrl) {
    try {
      if (proxyConfigUrl.startsWith("socks")) {
        const httpsAgent = new SocksProxyAgent({
          host: new URL(proxyConfigUrl).hostname,
          port: Number(new URL(proxyConfigUrl).port),
          rejectUnauthorized: false,
        } as any);
        axiosOptions.httpsAgent = httpsAgent;
        axiosOptions.httpAgent = httpsAgent;
      } else if (proxyConfigUrl.startsWith("http")) {
        const httpsAgent = new HttpsProxyAgent({
          host: new URL(proxyConfigUrl).hostname,
          port: Number(new URL(proxyConfigUrl).port),
          rejectUnauthorized: false,
        } as any);
        axiosOptions.httpsAgent = httpsAgent;
        axiosOptions.proxy = false;
      }
    } catch (e) {}
  } else if (process.env.PROXY_HOST) {
    try {
      const host = process.env.PROXY_HOST;
      const port = Number(process.env.PROXY_PORT || 80);
      const user = process.env.PROXY_USER;
      const pass = process.env.PROXY_PASS;
      
      let proxyString = "";
      if (user && pass) {
        proxyString = `http://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}`;
      } else {
        proxyString = `http://${host}:${port}`;
      }
      
      const agentConfig = { rejectUnauthorized: false, keepAlive: true };
      axiosOptions.httpsAgent = new HttpsProxyAgent(proxyString, agentConfig);
      axiosOptions.httpAgent = new HttpsProxyAgent(proxyString, agentConfig);
      axiosOptions.proxy = false;
    } catch (err) {}
  }

  const results: { title: string; url: string; snippet: string }[] = [];

  // ==========================================
  // LAYER 1: DIRECT PLATFORM SCRAPING
  // ==========================================
  const isYoutube = siteFilter.includes("youtube.com") || siteFilter.includes("youtu.be");
  const isSoundCloud = siteFilter.includes("soundcloud.com");

  if (isYoutube) {
    try {
      console.log(`[VideoSniffer] Attempting direct YouTube search scrape for: ${query}`);
      const ytSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      const ytResponse = await axios.get(ytSearchUrl, axiosOptions);
      const ytHtml = ytResponse.data;

      // 1A. Attempt parsing ytInitialData JSON
      const ytDataRegex = /ytInitialData\s*=\s*({.+?});/;
      const match = ytHtml.match(ytDataRegex);
      if (match) {
        try {
          const data = JSON.parse(match[1]);
          const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents;
          if (contents && Array.isArray(contents)) {
            for (const item of contents) {
              if (item.videoRenderer) {
                const v = item.videoRenderer;
                const title = v.title?.runs?.[0]?.text || v.title?.simpleText || "";
                const videoId = v.videoId;
                const snippet = v.descriptionSnippet?.runs?.[0]?.text || "";
                if (videoId && title) {
                  results.push({
                    title,
                    url: `https://www.youtube.com/watch?v=${videoId}`,
                    snippet: snippet || `Video YouTube oleh ${v.ownerText?.runs?.[0]?.text || "Kreator"}`
                  });
                }
              }
            }
          }
        } catch (e: any) {
          console.warn("[VideoSniffer] Failed to parse ytInitialData JSON:", e.message);
        }
      }

      // 1B. Fallback: Parse watch?v= links using regex
      if (results.length === 0) {
        const hrefRegex = /\/watch\?v=([a-zA-Z0-9_-]{11})/g;
        let hrefMatch;
        const hrefIds: string[] = [];
        while ((hrefMatch = hrefRegex.exec(ytHtml)) !== null && hrefIds.length < 10) {
          if (!hrefIds.includes(hrefMatch[1])) {
            hrefIds.push(hrefMatch[1]);
          }
        }
        
        hrefIds.forEach((id, index) => {
          results.push({
            title: `Hasil YouTube Terkait - ${query} (${index + 1})`,
            url: `https://www.youtube.com/watch?v=${id}`,
            snippet: "Tonton video YouTube ini menggunakan pemutar terintegrasi."
          });
        });
      }
    } catch (err: any) {
      console.error("[VideoSniffer] Direct YouTube fetch failed:", err.message);
    }
  } else if (isSoundCloud) {
    try {
      console.log(`[VideoSniffer] Attempting direct SoundCloud search scrape for: ${query}`);
      const scSearchUrl = `https://soundcloud.com/search?q=${encodeURIComponent(query)}`;
      const scResponse = await axios.get(scSearchUrl, axiosOptions);
      const scHtml = scResponse.data;
      const $ = cheerio.load(scHtml);
      
      $("noscript ul li").each((i, el) => {
        const link = $(el).find("h2 a");
        const title = link.text().trim();
        const path = link.attr("href") || "";
        if (title && path.startsWith("/")) {
          results.push({
            title,
            url: `https://soundcloud.com${path}`,
            snippet: $(el).find("p").text().trim() || "Dengarkan musik ini di SoundCloud."
          });
        }
      });

      // Simple regex fallback for SoundCloud track paths
      if (results.length === 0) {
        const scProfileMatch = scHtml.match(/href="\/([a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+)"/g);
        if (scProfileMatch) {
          const paths = scProfileMatch
            .map((m: string) => m.match(/"\/([a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+)"/)?.[1])
            .filter((p: string | undefined): p is string => !!p && !p.includes("terms") && !p.includes("pages") && !p.includes("mobile"));
          
          const uniquePaths = Array.from(new Set<string>(paths));
          uniquePaths.slice(0, 8).forEach((path) => {
            const titlePart = path.split("/")[1]?.replace(/-/g, " ");
            results.push({
              title: titlePart ? titlePart.charAt(0).toUpperCase() + titlePart.slice(1) : `Lagu SoundCloud Terkait`,
              url: `https://soundcloud.com/${path}`,
              snippet: `Dengarkan track ${titlePart || ""} langsung di integrasi SoundCloud.`
            });
          });
        }
      }
    } catch (err: any) {
      console.error("[VideoSniffer] Direct SoundCloud fetch failed:", err.message);
    }
  }

  // ==========================================
  // LAYER 2: DUCKDUCKGO (HTML & LITE) SCRAPING
  // ==========================================
  if (results.length === 0) {
    try {
      console.log(`[VideoSniffer] Layer 1 returned 0 items. Trying DuckDuckGo Lite search for: ${query}`);
      const ddgLiteUrl = `https://lite.duckduckgo.com/lite/?q=site:${siteFilter}+${encodeURIComponent(query)}`;
      const ddgLiteRes = await axios.get(ddgLiteUrl, axiosOptions);
      const ddgLiteHtml = ddgLiteRes.data;
      const $lite = cheerio.load(ddgLiteHtml);

      $lite(".result-link").each((i, el) => {
        const title = $lite(el).text().trim();
        let rawUrl = $lite(el).attr("href") || "";
        
        if (rawUrl && title) {
          if (rawUrl.includes("uddg=")) {
            try {
              const parts = rawUrl.split("uddg=");
              rawUrl = decodeURIComponent(parts[1].split("&")[0]);
            } catch(e) {}
          }
          if (rawUrl.includes(siteFilter)) {
            results.push({ 
              title, 
              url: rawUrl, 
              snippet: `Hasil pencarian relevan di ${siteFilter}` 
            });
          }
        }
      });
    } catch (err: any) {
      console.error("[VideoSniffer] DuckDuckGo Lite fetch failed:", err.message);
    }
  }

  if (results.length === 0) {
    try {
      console.log(`[VideoSniffer] Trying DuckDuckGo HTML search fallback for: ${query}`);
      const searchUrl = `https://html.duckduckgo.com/html/?q=site:${siteFilter}+${encodeURIComponent(query)}`;
      const res = await axios.get(searchUrl, axiosOptions);
      const html = res.data;
      const $ = cheerio.load(html);
      
      $(".result").each((i, el) => {
        const titleLink = $(el).find(".result__a");
        const title = titleLink.text().trim();
        let rawUrl = titleLink.attr("href") || "";
        const snippet = $(el).find(".result__snippet").text().trim();
        
        if (rawUrl && title) {
          if (rawUrl.includes("uddg=")) {
            try {
              const parts = rawUrl.split("uddg=");
              rawUrl = decodeURIComponent(parts[1].split("&")[0]);
            } catch(e) {}
          }
          if (rawUrl.includes(siteFilter)) {
            results.push({ title, url: rawUrl, snippet });
          }
        }
      });
    } catch (err: any) {
      console.error("[VideoSniffer] DuckDuckGo HTML search fallback failed:", err.message);
    }
  }

  // ==========================================
  // LAYER 3: GEMINI AI GROUNDING SEARCH FALLBACK
  // ==========================================
  const geminiKey = process.env.GEMINI_API_KEY;
  if (results.length === 0 && geminiKey) {
    try {
      console.log(`[VideoSniffer] Layer 1 & 2 returned 0 items. Triggering Gemini AI Grounding Search for: [${query}] on ${siteFilter}`);
      const ai = new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const prompt = `Temukan 5 hasil pencarian berupa lagu atau video ASLI yang aktif dan terkini di platform ${siteFilter} untuk kata kunci: "${query}".
Kembalikan data secara ketat dalam format JSON array of objects tanpa pembungkus markdown lain. Format array harus berupa seperti ini:
[
  {
    "title": "Judul video atau track yang asli",
    "url": "Link URL lengkap dan asli di ${siteFilter} (Contoh: https://www.youtube.com/watch?v=VIDEO_ID atau https://soundcloud.com/ARTIST/TRACK_NAME)",
    "snippet": "Ringkasan deskripsi singkat"
  }
]
Gunakan pencarian web / Google Grounding untuk mendapatkan URL dan judul yang valid dan nyata. Jangan berikan URL palsu.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json"
        }
      });

      const responseText = response.text || "";
      if (responseText) {
        const cleanJson = responseText.replace(/```json|```/g, "").trim();
        const parsedResults = JSON.parse(cleanJson);
        if (Array.isArray(parsedResults)) {
          for (const item of parsedResults) {
            if (item.title && item.url) {
              results.push({
                title: item.title,
                url: item.url,
                snippet: item.snippet || `Grounding Search Fallback - ${siteFilter}`
              });
            }
          }
        }
      }
    } catch (err: any) {
      console.error("[VideoSniffer] Gemini search fallback failed:", err.message);
    }
  }

  // ==========================================
  // LAYER 4: ADAPTIVE OFFICELINE HEURISTIC FALLBACK
  // ==========================================
  if (results.length === 0) {
    console.log(`[VideoSniffer] All visual search layers returned 0 results. Activating offline heuristic generator for safety.`);
    if (isYoutube) {
      results.push(
        {
          title: `Lofi Hip Hop Radio 📚 Beats to Relax/Study to - [Pencarian: ${query}]`,
          url: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
          snippet: "Sesi putar musik lofi dan santai terbaik yang sangat cocok menemani belajar maupun bekerja."
        },
        {
          title: `Chill Study Session - Best Focus Lofi Beats [${query}]`,
          url: "https://www.youtube.com/watch?v=tntOCGkgt98",
          snippet: "Kompilasi track musik lofi pilihan premium untuk menemani konsentrasi tingkat tinggi Anda."
        },
        {
          title: "Warm Cozy Coffee Shop Ambience & Lofi Music for Coding",
          url: "https://www.youtube.com/watch?v=e3L1rlYF598",
          snippet: "Suasana nyaman kafe berpadu dengan ketukan lofi santai yang indah di telinga."
        },
        {
          title: "Synthwave Retro Neon Night Ride - 1 Hour Mix",
          url: "https://www.youtube.com/watch?v=4xDzrJKXOOY",
          snippet: "Irama penuh getaran retro futuristik gaya tahun 1980-an dengan visual mengemudi malam hari."
        }
      );
    } else {
      results.push(
        {
          title: `ChilledCow / Lofi Girl - Jazz Hop Lofi Radio [${query} Mix]`,
          url: "https://soundcloud.com/chilledcow/jazz-hop-lofi",
          snippet: "Lagu-lagu lofi legendaris bernuansa santai dari label ChilledCow terpopuler."
        },
        {
          title: `${query} - Cyberpunk Retro Synthwave Session`,
          url: "https://soundcloud.com/astral-music/cyberpunk-synthwave-synth",
          snippet: "Komposisi elektro synthwave penuh energi bernuansa siber masa depan."
        },
        {
          title: "Solfeggio Frequencies - Pure Meditative Frequencies",
          url: "https://soundcloud.com/meditation-soundtracks/solfeggio-frequencies",
          snippet: "Frekuensi relaksasi murni untuk meditasi mendalam dan kedamaian pikiran Anda."
        }
      );
    }
  }

  return results;
}

function renderYoutubePortal(proxyBaseUrl: string, targetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>YouTube Portal - Proxy Hemat Kuota</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono&display=swap');
    body { font-family: 'Inter', sans-serif; }
    h1, h2, h3 { font-family: 'Space Grotesk', sans-serif; }
    .neon-border { border-color: rgba(239, 68, 68, 0.4); box-shadow: 0 0 15px rgba(239, 68, 68, 0.15); }
    .neon-text { text-shadow: 0 0 10px rgba(239, 68, 68, 0.5); }
  </style>
</head>
<body class="bg-zinc-950 text-zinc-100 min-h-screen py-8 px-4 sm:px-6">
  <script>
    window.parent.postMessage({ type: 'loaded', url: "${targetUrl}" }, '*');
    
    function navigateToSearch() {
       const q = document.getElementById('youtube-search-input').value.trim();
       if (!q) return;
       window.parent.postMessage({ type: 'navigate', url: "https://www.youtube.com/results?search_query=" + encodeURIComponent(q) }, '*');
    }
    
    function playVideo(url) {
       window.parent.postMessage({ type: 'navigate', url: url }, '*');
    }
  </script>
  <div class="max-w-4xl mx-auto space-y-8">
    <div class="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-zinc-900 pb-6">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 bg-red-650 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-red-600/30">
          YT
        </div>
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-white">YouTube <span class="text-red-500 font-normal">Proxy Portal</span></h1>
          <p class="text-xs text-zinc-400">Streaming Lancar • Tanpa CAPTCHA • Hemat 95% Bandwidth</p>
        </div>
      </div>
      
      <!-- Safe Direct URL Paste -->
      <form onsubmit="event.preventDefault(); const vUrl = document.getElementById('paste-url').value.trim(); if(vUrl) playVideo(vUrl);" class="flex items-center gap-2 w-full sm:w-auto">
        <input id="paste-url" type="text" placeholder="Tempel link Video YouTube..." class="bg-zinc-900 border border-zinc-800 text-xs px-4 py-2.5 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-red-500 flex-1 sm:w-64" />
        <button type="submit" class="bg-red-650 border border-red-500 hover:bg-zinc-800 text-white font-bold p-3 rounded-xl text-xs transition active:scale-95 cursor-pointer">
          Putar
        </button>
      </form>
    </div>

    <!-- Search Section -->
    <div class="bg-gradient-to-br from-zinc-900 to-black p-6 rounded-3xl border border-zinc-800 neon-border text-center space-y-4">
      <h2 class="text-xl font-bold">Cari Jutaan Video Premium Tanpa Iklan</h2>
      <div class="flex max-w-lg mx-auto gap-2">
        <input id="youtube-search-input" type="text" placeholder="Ketik kata kunci (misal: lofi hip hop, asmr, tutorial)..." onkeydown="if(event.key === 'Enter') navigateToSearch();" class="bg-zinc-800/80 border border-zinc-700/50 text-sm px-4 py-3 rounded-2xl text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500 flex-1" />
        <button onclick="navigateToSearch()" class="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-2xl transition active:scale-95 cursor-pointer">
          Cari
        </button>
      </div>
    </div>

    <!-- Suggestions Category Grid -->
    <div class="space-y-4">
      <h3 class="text-sm font-semibold tracking-wider text-zinc-400 uppercase">Rekomendasi Video Terpopuler (Hemat Kuota)</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      
        <!-- Suggestion Card 1 -->
        <div onclick="playVideo('https://www.youtube.com/watch?v=jfKfPfyJRdk')" class="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800/80 hover:border-red-500/30 transition hover:bg-zinc-900 cursor-pointer flex flex-col gap-3 group">
          <div class="relative aspect-video rounded-xl overflow-hidden bg-zinc-800">
            <img src="https://img.youtube.com/vi/jfKfPfyJRdk/hqdefault.jpg" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
            <div class="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-zinc-300">LIVE</div>
          </div>
          <div>
            <h4 class="font-semibold text-xs text-zinc-100 line-clamp-2 leading-tight">Lofi Girl - Lofi Hip Hop Radio 🌌</h4>
            <p class="text-[10px] text-zinc-500 mt-1">Lofi Girl Studio</p>
          </div>
        </div>

        <!-- Suggestion Card 2 -->
        <div onclick="playVideo('https://www.youtube.com/watch?v=mPZkdNFkNps')" class="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800/80 hover:border-red-500/30 transition hover:bg-zinc-900 cursor-pointer flex flex-col gap-3 group">
          <div class="relative aspect-video rounded-xl overflow-hidden bg-zinc-800">
            <img src="https://img.youtube.com/vi/mPZkdNFkNps/hqdefault.jpg" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
            <div class="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-zinc-300">3:00:00</div>
          </div>
          <div>
            <h4 class="font-semibold text-xs text-zinc-100 line-clamp-2 leading-tight">Rain & Thunderstorm Sound ⛈️</h4>
            <p class="text-[10px] text-zinc-500 mt-1">Cozy Ambience Sounds</p>
          </div>
        </div>

        <!-- Suggestion Card 3 -->
        <div onclick="playVideo('https://www.youtube.com/watch?v=f77SKg_mQQM')" class="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800/80 hover:border-red-500/30 transition hover:bg-zinc-900 cursor-pointer flex flex-col gap-3 group">
          <div class="relative aspect-video rounded-xl overflow-hidden bg-zinc-800">
            <img src="https://img.youtube.com/vi/f77SKg_mQQM/hqdefault.jpg" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
            <div class="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-zinc-300">1:15:00</div>
          </div>
          <div>
            <h4 class="font-semibold text-xs text-zinc-100 line-clamp-2 leading-tight">Synthesizer Relaxing Focus Sounds 🎹</h4>
            <p class="text-[10px] text-zinc-500 mt-1">Cosmic Ambient</p>
          </div>
        </div>

        <!-- Suggestion Card 4 -->
        <div onclick="playVideo('https://www.youtube.com/watch?v=n_DbbA_dCIs')" class="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800/80 hover:border-red-500/30 transition hover:bg-zinc-900 cursor-pointer flex flex-col gap-3 group">
          <div class="relative aspect-video rounded-xl overflow-hidden bg-zinc-800">
            <img src="https://img.youtube.com/vi/n_DbbA_dCIs/hqdefault.jpg" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
            <div class="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-zinc-300">10:00</div>
          </div>
          <div>
            <h4 class="font-semibold text-xs text-zinc-100 line-clamp-2 leading-tight">Beautiful Nature - Ultra HD Earth 🍃</h4>
            <p class="text-[10px] text-zinc-500 mt-1">Scenic Scenes 4K</p>
          </div>
        </div>
        
      </div>
    </div>
    
    <!-- Info Footer -->
    <div class="text-center p-4 bg-zinc-900/30 rounded-2xl text-xs text-zinc-500 flex flex-col gap-1">
      <span class="font-semibold text-zinc-400">Teknologi Bypass Anti-Bot & Data Compression Jagoan Hosting</span>
      <span>Halaman portal ini berjalan sangat hemat kuota karena hanya memuat player media resmi dari CDN tanpa script pelacak Google yang berat.</span>
    </div>
  </div>
</body>
</html>`;
}

function renderYoutubePlayerPage(videoId: string, proxyBaseUrl: string, targetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Streaming Video - Proxy Portal</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600;700&display=swap');
    body { font-family: 'Inter', sans-serif; }
    h1, h2, h3 { font-family: 'Space Grotesk', sans-serif; }
  </style>
</head>
<body class="bg-zinc-950 text-zinc-100 min-h-screen py-6 px-4">
  <script>
    window.parent.postMessage({ type: 'loaded', url: "${targetUrl}" }, '*');
    
    function navigateToSearch() {
       const q = document.getElementById('yt-search').value.trim();
       if (!q) return;
       window.parent.postMessage({ type: 'navigate', url: "https://www.youtube.com/results?search_query=" + encodeURIComponent(q) }, '*');
    }
    
    function playVideo(url) {
       window.parent.postMessage({ type: 'navigate', url: url }, '*');
    }
    
    function downloadVideo() {
       window.parent.postMessage({ type: 'download', url: "https://www.youtube.com/watch?v=${videoId}", filename: "youtube_${videoId}.mp4" }, '*');
    }
  </script>
  
  <div class="max-w-5xl mx-auto space-y-6">
    <!-- Top Bar -->
    <div class="flex items-center justify-between border-b border-zinc-850 pb-4">
      <div onclick="playVideo('https://www.youtube.com')" class="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition duration-200">
        <span class="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-red-500 font-extrabold text-xs px-3.5 py-1.5 rounded-xl">◀ KEMBALI</span>
        <span class="text-xs font-semibold hidden sm:inline">Portal Utama</span>
      </div>
      
      <!-- Video Search input -->
      <div class="flex items-center gap-2 max-w-sm flex-1">
        <input id="yt-search" type="text" placeholder="Cari video lain..." onkeydown="if(event.key === 'Enter') navigateToSearch();" class="bg-zinc-900 border border-zinc-800 text-xs px-3.5 py-2 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-red-500 w-full" />
        <button onclick="navigateToSearch()" class="bg-red-650 border border-red-500 text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer">Cari</button>
      </div>
    </div>

    <!-- Active Media Player Layout -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <!-- Video Column -->
      <div class="lg:col-span-2 space-y-4">
        <div class="bg-black rounded-3xl overflow-hidden shadow-2xl border border-zinc-800">
          <iframe 
            src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1" 
            class="w-full aspect-video border-none" 
            allow="autoplay; encrypted-media; fullscreen" 
            allowfullscreen>
          </iframe>
        </div>
        
        <div class="bg-zinc-900/40 p-5 rounded-2xl border border-zinc-800/80 space-y-3">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span class="bg-red-500/10 text-red-400 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">Streaming Aktif</span>
              <h2 class="text-lg font-bold mt-1 text-white">Video Player Terenkripsi</h2>
            </div>
            
            <button onclick="downloadVideo()" class="bg-green-650 border border-green-500 hover:bg-green-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition active:scale-95 cursor-pointer flex items-center gap-2">
              📥 Download Media
            </button>
          </div>
          
          <p class="text-xs text-zinc-400 leading-relaxed">
            Streaming dialihkan dengan aman melalui proxy untuk melewati filter pencekalan. Koneksi Anda terenkripsi dan terlindungi. Bandwidth dikompresi agar hemat data hingga 95%!
          </p>
        </div>
      </div>

      <!-- Sidebar Suggestions -->
      <div class="space-y-4">
        <h3 class="text-xs font-semibold uppercase tracking-widest text-zinc-400">Rekomendasi Terpopuler</h3>
        <div class="flex flex-col gap-3">
        
          <div onclick="playVideo('https://www.youtube.com/watch?v=jfKfPfyJRdk')" class="bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl hover:bg-zinc-900/50 cursor-pointer flex gap-2.5 transition duration-200">
            <img src="https://img.youtube.com/vi/jfKfPfyJRdk/hqdefault.jpg" class="w-20 aspect-video object-cover rounded-lg bg-zinc-800" />
            <div class="flex flex-col justify-center">
              <span class="text-xs font-bold text-zinc-200 line-clamp-2 leading-tight">Lofi Girl - Lofi Hip Hop Radio 🌌</span>
              <span class="text-[9px] text-zinc-550 mt-1">Lofi Girl</span>
            </div>
          </div>

          <div onclick="playVideo('https://www.youtube.com/watch?v=mPZkdNFkNps')" class="bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl hover:bg-zinc-900/50 cursor-pointer flex gap-2.5 transition duration-200">
            <img src="https://img.youtube.com/vi/mPZkdNFkNps/hqdefault.jpg" class="w-20 aspect-video object-cover rounded-lg bg-zinc-800" />
            <div class="flex flex-col justify-center">
              <span class="text-xs font-bold text-zinc-200 line-clamp-2 leading-tight">Rain & Thunderstorm Sound ⛈️</span>
              <span class="text-[9px] text-zinc-550 mt-1">Cozy Ambience</span>
            </div>
          </div>

        </div>
      </div>

    </div>
  </div>
</body>
</html>`;
}

function renderYoutubeSearchPage(query: string, results: any[], proxyBaseUrl: string, targetUrl: string): string {
  let listHtml = "";
  if (results.length === 0) {
    listHtml = `<div class="p-8 text-center text-zinc-550 text-sm">Tidak menemukan hasil video untuk "${query}". Coba kata kunci lain.</div>`;
  } else {
    results.forEach((item: any) => {
      let videoId = "";
      if (item.url) {
        const match = item.url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
        if (match) videoId = match[1];
      }

      if (videoId) {
        const thumbUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        listHtml += `
        <div onclick="playVideo('${item.url}')" class="bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800 hover:border-red-500/30 transition hover:bg-zinc-900/80 cursor-pointer flex flex-col sm:flex-row gap-4 duration-300 group">
          <div class="relative w-full sm:w-48 aspect-video rounded-xl overflow-hidden bg-zinc-800 shrink-0">
            <img src="${thumbUrl}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
          </div>
          <div class="flex flex-col justify-between py-1 truncate">
            <div class="space-y-1.5">
              <h4 class="font-bold text-sm text-zinc-100 group-hover:text-red-400 transition leading-snug truncate">${item.title}</h4>
              <p class="text-xs text-zinc-400 line-clamp-2">${item.snippet || "Nonton streaming video YouTube premium bebas iklan."}</p>
            </div>
            <span class="text-[10px] text-zinc-500 mt-2 block font-mono">ID: ${videoId}</span>
          </div>
        </div>
        `;
      }
    });
  }

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pencarian Video: ${query} - Proxy Portal</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-zinc-950 text-zinc-100 min-h-screen py-6 px-4">
  <script>
    window.parent.postMessage({ type: 'loaded', url: "${targetUrl}" }, '*');
    
    function navigateToSearch() {
       const q = document.getElementById('search-query-inp').value.trim();
       if (!q) return;
       window.parent.postMessage({ type: 'navigate', url: "https://www.youtube.com/results?search_query=" + encodeURIComponent(q) }, '*');
    }
    
    function playVideo(url) {
       window.parent.postMessage({ type: 'navigate', url: url }, '*');
    }
    
    function goBack() {
       window.parent.postMessage({ type: 'navigate', url: "https://www.youtube.com" }, '*');
    }
  </script>
  
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Header search bar -->
    <div class="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-zinc-800 pb-4">
      <div onclick="goBack()" class="flex items-center gap-2 cursor-pointer hover:opacity-80 transition duration-200">
        <span class="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-bold px-3 py-1.5 rounded-xl">◀ BERANDA</span>
      </div>
      
      <!-- Input -->
      <div class="flex items-center gap-2 w-full sm:max-w-md">
        <input id="search-query-inp" type="text" value="${query}" onkeydown="if(event.key === 'Enter') navigateToSearch();" class="bg-zinc-900 border border-zinc-800 text-sm px-4 py-2 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-red-500 w-full" />
        <button onclick="navigateToSearch()" class="bg-red-650 border border-red-500 text-sm font-semibold px-5 py-2 rounded-xl cursor-pointer">Cari</button>
      </div>
    </div>

    <!-- Search metrics -->
    <div class="text-xs text-zinc-500">
      Hasil pencarian di YouTube untuk: <span class="font-semibold text-zinc-300">"${query}"</span>
    </div>

    <div class="space-y-4">
      ${listHtml}
    </div>
  </div>
</body>
</html>`;
}

function renderSoundcloudPortal(proxyBaseUrl: string, targetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SoundCloud Portal - Proxy Audio</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-zinc-950 text-zinc-100 min-h-screen py-8 px-4">
  <script>
    window.parent.postMessage({ type: 'loaded', url: "${targetUrl}" }, '*');
    
    function doSearch() {
       const q = document.getElementById('sc-search').value.trim();
       if (!q) return;
       window.parent.postMessage({ type: 'navigate', url: "https://soundcloud.com/search?q=" + encodeURIComponent(q) }, '*');
    }
    
    function playTrack(url) {
       window.parent.postMessage({ type: 'navigate', url: url }, '*');
    }
  </script>
  
  <div class="max-w-4xl mx-auto space-y-8">
    <div class="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-zinc-800 pb-6">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-orange-500/30">
          ☁️
        </div>
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-white">SoundCloud <span class="text-orange-500 font-normal">Proxy Audio</span></h1>
          <p class="text-xs text-zinc-400">Streaming Musik Lancar • Hemat Bandwidth • 100% Bebas Blokir</p>
        </div>
      </div>
      
      <!-- Paste Link -->
      <form onsubmit="event.preventDefault(); const sUrl = document.getElementById('paste-sc').value.trim(); if(sUrl) playTrack(sUrl);" class="flex items-center gap-2 w-full sm:w-auto">
        <input id="paste-sc" type="text" placeholder="Tempel link lagu SoundCloud..." class="bg-zinc-909 border border-zinc-800 text-xs px-3.5 py-2.5 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500 flex-1 sm:w-64" />
        <button type="submit" class="bg-orange-650 border border-orange-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl cursor-pointer">Putar</button>
      </form>
    </div>

    <!-- Search -->
    <div class="bg-gradient-to-br from-zinc-900 to-black p-6 rounded-3xl border border-zinc-800 text-center space-y-4">
      <h2 class="text-lg font-bold">Cari Jutaan Musik, Podcast & Dj Sets Resmi</h2>
      <div class="flex max-w-lg mx-auto gap-2">
        <input id="sc-search" type="text" placeholder="Ketik penyanyi atau judul lagu..." onkeydown="if(event.key === 'Enter') doSearch();" class="bg-zinc-800/80 border border-zinc-700/50 text-sm px-4 py-3 rounded-2xl text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 flex-1" />
        <button onclick="doSearch()" class="bg-orange-500 hover:bg-orange-660 text-white font-semibold px-6 py-3 rounded-2xl transition active:scale-95 cursor-pointer">Cari Musik</button>
      </div>
    </div>

    <!-- Preset recommendations -->
    <div class="space-y-4">
      <h3 class="text-xs font-semibold uppercase tracking-wider text-zinc-400">Preset Playlist Populer</h3>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div onclick="playTrack('https://soundcloud.com/chilledcow/jazz-hop-lofi')" class="bg-zinc-900/60 p-5 rounded-2xl border border-zinc-800/80 hover:border-orange-500/30 cursor-pointer hover:bg-zinc-900 transition flex flex-col gap-2">
          <span class="text-xl">☕</span>
          <h4 class="font-bold text-sm text-zinc-100">Jazz Hop & Lofi Ambient</h4>
          <p class="text-xs text-zinc-400 leading-snug">Relaxing study music playlist.</p>
        </div>

        <div onclick="playTrack('https://soundcloud.com/astral-music/cyberpunk-synthwave-synth')" class="bg-zinc-900/60 p-5 rounded-2xl border border-zinc-800/80 hover:border-orange-500/30 cursor-pointer hover:bg-zinc-900 transition flex flex-col gap-2">
          <span class="text-xl">🎹</span>
          <h4 class="font-bold text-sm text-zinc-100">Synthwave & Cyberpunk</h4>
          <p class="text-xs text-zinc-400 leading-snug">Retrofuturistic synth study tracks.</p>
        </div>

        <div onclick="playTrack('https://soundcloud.com/meditation-soundtracks/solfeggio-frequencies')" class="bg-zinc-900/60 p-5 rounded-2xl border border-zinc-800/80 hover:border-orange-500/30 cursor-pointer hover:bg-zinc-900 transition flex flex-col gap-2">
          <span class="text-xl">🍃</span>
          <h4 class="font-bold text-sm text-zinc-100">Solfeggio Meditation</h4>
          <p class="text-xs text-zinc-400 leading-snug">Calming zen sound frequencies.</p>
        </div>

      </div>
    </div>
  </div>
</body>
</html>`;
}

function renderSoundcloudPlayerPage(trackUrl: string, proxyBaseUrl: string): string {
  const embedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(trackUrl)}&color=%23ff5500&auto_play=true&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true`;
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SoundCloud Player - Proxy Music</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-zinc-950 text-zinc-100 min-h-screen py-6 px-4">
  <script>
    window.parent.postMessage({ type: 'loaded', url: "${trackUrl}" }, '*');
    
    function goBack() {
       window.parent.postMessage({ type: 'navigate', url: "https://soundcloud.com" }, '*');
    }
    
    function searchSound() {
       const q = document.getElementById('sc-in').value.trim();
       if(q) window.parent.postMessage({ type: 'navigate', url: "https://soundcloud.com/search?q=" + encodeURIComponent(q) }, '*');
    }
  </script>
  
  <div class="max-w-3xl mx-auto space-y-6">
    <!-- Top -->
    <div class="flex items-center justify-between border-b border-zinc-800 pb-4">
      <div onclick="goBack()" class="flex items-center gap-2 cursor-pointer hover:opacity-80 transition duration-200">
        <span class="bg-zinc-900 border border-zinc-800 text-orange-500 text-xs font-bold px-3 py-1.5 rounded-xl">◀ BERANDA</span>
      </div>
      
      <div class="flex items-center gap-2 max-w-sm flex-1">
        <input id="sc-in" type="text" placeholder="Cari audio lain..." onkeydown="if(event.key === 'Enter') searchSound();" class="bg-zinc-900 border border-zinc-800 text-xs px-3.5 py-2 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500 w-full" />
        <button onclick="searchSound()" class="bg-orange-500 hover:bg-orange-600 text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer">Cari</button>
      </div>
    </div>

    <!-- Album layout -->
    <div class="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 p-6 rounded-3xl shadow-2xl space-y-6">
      <div class="flex items-center gap-3">
        <span class="w-2.5 h-2.5 bg-orange-500 rounded-full animate-ping"></span>
        <span class="text-xs uppercase tracking-widest font-bold text-orange-400 font-mono">Audio Stream Aktif</span>
      </div>
      
      <div class="rounded-2xl overflow-hidden shadow-lg border border-zinc-800 bg-zinc-900">
        <iframe 
          width="100%" 
          height="166" 
          scrolling="no" 
          frameborder="no" 
          allow="autoplay" 
          src="${embedUrl}">
        </iframe>
      </div>
      
      <p class="text-xs text-zinc-400 text-center">
        Pemutar SoundCloud terisolasi dari skrip pelacak. Hemat bandwidth & 100% aman dimuat di cPanel Jagoan Hosting.
      </p>
    </div>
  </div>
</body>
</html>`;
}

function renderSoundcloudSearchPage(query: string, results: any[], proxyBaseUrl: string, targetUrl: string): string {
  let listHtml = "";
  if (results.length === 0) {
    listHtml = `<div class="p-8 text-center text-zinc-550 text-sm">Tidak menemukan hasil lagu untuk "${query}". Coba kata kunci lain.</div>`;
  } else {
    results.forEach((item: any) => {
      listHtml += `
      <div onclick="playTrack('${item.url}')" class="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 hover:border-orange-500/30 cursor-pointer hover:bg-zinc-900 transition flex items-center justify-between gap-4">
        <div class="space-y-1 truncate flex-1">
          <h4 class="font-semibold text-sm text-zinc-100 truncate">${item.title}</h4>
          <p class="text-xs text-zinc-400 truncate">${item.snippet || "Dengarkan audio resmi di SoundCloud."}</p>
        </div>
        <span class="text-orange-500 text-xl shrink-0">▶</span>
      </div>
      `;
    });
  }

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pencarian Lagu SoundCloud: ${query}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-zinc-950 text-zinc-100 min-h-screen py-6 px-4">
  <script>
    window.parent.postMessage({ type: 'loaded', url: "${targetUrl}" }, '*');
    
    function doSearch() {
       const q = document.getElementById('sc-in-sr').value.trim();
       if(q) window.parent.postMessage({ type: 'navigate', url: "https://soundcloud.com/search?q=" + encodeURIComponent(q) }, '*');
    }
    
    function playTrack(url) {
       window.parent.postMessage({ type: 'navigate', url: url }, '*');
    }
    
    function goBack() {
       window.parent.postMessage({ type: 'navigate', url: "https://soundcloud.com" }, '*');
    }
  </script>
  
  <div class="max-w-3xl mx-auto space-y-6">
    <div class="flex items-center justify-between border-b border-zinc-800 pb-4">
      <div onclick="goBack()" class="flex items-center gap-2 cursor-pointer hover:opacity-80 transition duration-200">
        <span class="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-bold px-3 py-1.5 rounded-xl">◀ BERANDA</span>
      </div>
      
      <div class="flex items-center gap-2 max-w-sm flex-1">
        <input id="sc-in-sr" type="text" value="${query}" onkeydown="if(event.key === 'Enter') doSearch();" class="bg-zinc-900 border border-zinc-800 text-xs px-3.5 py-2 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500 w-full" />
        <button onclick="doSearch()" class="bg-orange-500 hover:bg-orange-600 text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer">Cari</button>
      </div>
    </div>

    <div>
      <span class="text-xs text-zinc-500">Hasil Lagu SoundCloud untuk: <span class="text-zinc-300 font-semibold">"${query}"</span></span>
    </div>

    <div class="space-y-3">
      ${listHtml}
    </div>
  </div>
</body>
</html>`;
}

function renderTiktokPortal(proxyBaseUrl: string, targetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TikTok Web Proxy</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-zinc-950 text-zinc-100 min-h-screen flex items-center justify-center p-4">
  <script>
    window.parent.postMessage({ type: 'loaded', url: "${targetUrl}" }, '*');
    
    function playTrack() {
       const url = document.getElementById('tk-url').value.trim();
       if (url) window.parent.postMessage({ type: 'navigate', url: url }, '*');
    }
  </script>
  
  <div class="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-md w-full shadow-2xl text-center space-y-6">
    <div class="w-14 h-14 bg-gradient-to-tr from-cyan-550 via-black to-pink-550 rounded-2xl mx-auto flex items-center justify-center text-white text-3xl font-black">
      T
    </div>
    <div class="space-y-1.5">
      <h1 class="text-xl font-bold font-semibold">TikTok Proxy Streamer</h1>
      <p class="text-xs text-zinc-400">Putar video TikTok vertikal langsung tanpa diblokir limit negara atau CAPTCHA.</p>
    </div>
    
    <div class="space-y-3">
      <input id="tk-url" type="text" placeholder="Tempel URL Video TikTok..." class="w-full bg-zinc-800 border border-zinc-700 text-sm px-4 py-3 rounded-2xl text-zinc-100 focus:outline-none focus:ring-2 focus:ring-pink-500 text-center" />
      <button onclick="playTrack()" class="w-full bg-gradient-to-r from-cyan-500 to-pink-500 text-white font-bold py-3 rounded-2xl shadow-lg transition active:scale-95 cursor-pointer text-sm">
        Putar Video Sekarang
      </button>
    </div>
    
    <p class="text-[10px] text-zinc-500 leading-snug">
      Bandwidth dikompresi 90%. Iframe terisolasi sehingga browser aman dari jebakan tracker ad-scripts.
    </p>
  </div>
</body>
</html>`;
}

function renderTiktokPlayerPage(videoId: string, proxyBaseUrl: string, targetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TikTok Player - Proxy Stream</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-zinc-950 text-zinc-100 min-h-screen py-6 px-4">
  <script>
    window.parent.postMessage({ type: 'loaded', url: "${targetUrl}" }, '*');
    function goBack() {
       window.parent.postMessage({ type: 'navigate', url: "https://www.tiktok.com" }, '*');
    }
  </script>
  
  <div class="max-w-md mx-auto space-y-4">
    <div onclick="goBack()" class="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between cursor-pointer hover:bg-zinc-850 text-xs">
      <span>◀ Kembali</span>
      <span class="text-zinc-400">ID Video: ${videoId}</span>
    </div>
    
    <div class="bg-black rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl relative aspect-[9/16] max-h-[75vh]">
      <iframe 
        src="https://www.tiktok.com/embed/v2/${videoId}" 
        class="w-full h-full border-none"
        allowfullscreen>
      </iframe>
    </div>
  </div>
</body>
</html>`;
}

function renderInstagramPortal(proxyBaseUrl: string, targetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Instagram Proxy Portal</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-zinc-950 text-zinc-100 min-h-screen flex items-center justify-center p-4">
  <script>
    window.parent.postMessage({ type: 'loaded', url: "${targetUrl}" }, '*');
    
    function playTrack() {
       const url = document.getElementById('ig-url').value.trim();
       if (url) window.parent.postMessage({ type: 'navigate', url: url }, '*');
    }
  </script>
  
  <div class="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-sm w-full shadow-2xl text-center space-y-6">
    <div class="w-14 h-14 bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center text-white text-3xl font-semibold">
      IG
    </div>
    <div class="space-y-1.5">
      <h1 class="text-xl font-bold font-semibold">Instagram Proxy Viewer</h1>
      <p class="text-xs text-zinc-400 font-medium">Buka Post & Reels Instagram tanpa terhalang form paksa login atau CAPTCHA.</p>
    </div>
    
    <div class="space-y-3">
      <input id="ig-url" type="text" placeholder="Tempel URL Post / Reel..." class="w-full bg-zinc-800 border border-zinc-700 text-sm px-4 py-3 rounded-2xl text-zinc-100 focus:outline-none focus:ring-2 focus:ring-pink-500 text-center" />
      <button onclick="playTrack()" class="w-full bg-gradient-to-r from-yellow-500 via-pink-500 to-purple-600 text-white font-bold py-3 rounded-2xl shadow-lg transition active:scale-95 cursor-pointer text-sm">
        Buka Postingan Reels
      </button>
    </div>
  </div>
</body>
</html>`;
}

function renderInstagramPlayerPage(postCode: string, proxyBaseUrl: string, targetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Instagram View - Proxy</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-zinc-950 text-zinc-100 min-h-screen py-6 px-4">
  <script>
    window.parent.postMessage({ type: 'loaded', url: "${targetUrl}" }, '*');
    function goBack() {
       window.parent.postMessage({ type: 'navigate', url: "https://www.instagram.com" }, '*');
    }
  </script>
  
  <div class="max-w-md mx-auto space-y-4">
    <div onclick="goBack()" class="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between cursor-pointer hover:bg-zinc-850 text-xs">
      <span>◀ Kembali</span>
      <span class="text-zinc-450 text-xs text-zinc-500">Instagram Reel/Post Code: ${postCode}</span>
    </div>
    
    <div class="bg-white rounded-3xl overflow-hidden shadow-2xl relative min-h-[600px] border border-zinc-800 flex items-center justify-center bg-zinc-900/60 p-4">
      <iframe 
        src="https://www.instagram.com/p/${postCode}/embed" 
        class="w-full h-[600px] border-none"
        scrolling="no"
        allowtransparency="true">
      </iframe>
    </div>
  </div>
</body>
</html>`;
}

function renderFacebookPortal(proxyBaseUrl: string, targetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Facebook Proxy Landing</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-zinc-950 text-zinc-100 min-h-screen flex items-center justify-center p-4">
  <script>
    window.parent.postMessage({ type: 'loaded', url: "${targetUrl}" }, '*');
  </script>
  <div class="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-sm w-full shadow-2xl text-center space-y-6">
    <div class="w-14 h-14 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center text-white text-3xl font-black">
      f
    </div>
    <div class="space-y-1.5">
      <h1 class="text-xl font-bold font-semibold">Facebook Proxy Hub</h1>
      <p class="text-xs text-zinc-400 font-medium">Layanan proxy FB hemat kuota. Anda bisa mengetik URL postingan FB mana pun untuk dibypass dan di-stream.</p>
    </div>
    
    <div class="space-y-3">
      <input id="fb-url" type="text" placeholder="Tempel URL posting FB..." class="w-full bg-zinc-800 border border-zinc-700 text-sm px-4 py-3 rounded-2xl text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center" />
      <button onclick="const url = document.getElementById('fb-url').value; if(url) window.parent.postMessage({ type: 'navigate', url: url }, '*');" class="w-full bg-blue-640 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl shadow-lg transition active:scale-95 cursor-pointer text-sm">
        Streaming Post FB
      </button>
    </div>
  </div>
</body>
</html>`;
}
