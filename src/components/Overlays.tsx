import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useBrowser } from "../context/BrowserContext";
import {
  ChevronLeft,
  Cloud,
  Download,
  Folder,
  File,
  Video,
  Music,
  X,
  Search,
  Clock,
  Trash2,
  Pause,
  Play,
  CheckCircle2,
  SquareStack,
  Plus,
  QrCode,
  Calculator,
  Compass,
  Wrench,
  Archive,
  FileText,
  Globe,
  Edit2,
  ExternalLink,
  Camera,
  Eye,
  RefreshCw,
} from "lucide-react";
import CalculatorComponent from "./tools/Calculator";
import CompassComponent from "./tools/Compass";
import QrScannerComponent from "./tools/QrScanner";
import MediaPlayerComponent from "./tools/MediaPlayer";
import OfficeViewerComponent from "./tools/OfficeViewer";
import ArchiveViewerComponent from "./tools/ArchiveViewer";
import FileManagerComponent from "./tools/FileManager";
import { initAuth, googleSignIn, logout, getAccessToken } from '../lib/auth';
import type { User } from 'firebase/auth';

export const getFileTypeCategory = (filename: string): string => {
  const ext = filename.toLowerCase().split('.').pop() || '';
  if (['mp4', 'webm', 'ogg', 'mkv', 'mov', '3gp'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'aac', 'flac', 'm4a', 'wma'].includes(ext)) return 'audio';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) return 'image';
  if (['docx', 'doc', 'odt'].includes(ext)) return 'document';
  if (ext === 'pdf') return 'pdf';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
  if (['txt', 'csv', 'md'].includes(ext)) return 'text';
  if (['js', 'jsx', 'ts', 'tsx', 'json', 'html', 'css', 'py', 'java', 'c', 'cpp', 'go', 'rs', 'php', 'sh', 'xml', 'yaml', 'yml'].includes(ext)) return 'code';
  return 'other';
};

function CloudFileManager() {
  const { setActiveOverlay, setActivePreviewFile } = useBrowser();
  const [files, setFiles] = React.useState<
    { filename: string; size: number; createdAt: string }[]
  >([]);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [uploadSpeed, setUploadSpeed] = React.useState("");
  const [currentUploadFile, setCurrentUploadFile] = React.useState("");
  
  const [systemDisk, setSystemDisk] = React.useState<{
    totalDisk: number;
    freeDisk: number;
    quota30Percent: number;
    supported: boolean;
  } | null>(null);

  const [useMaxQuota, setUseMaxQuota] = React.useState(() => {
    return localStorage.getItem("browser_use_max_quota") === "true";
  });

  const [directUrl, setDirectUrl] = React.useState("");
  const [directName, setDirectName] = React.useState("");
  const [downloadingUrl, setDownloadingUrl] = React.useState(false);
  const [downloadingUrlToGdrive, setDownloadingUrlToGdrive] = React.useState(false);
  const [directDownloadProgress, setDirectDownloadProgress] = React.useState(0);
  const [downloadError, setDownloadError] = React.useState<string | null>(null);
  const [showDirectForm, setShowDirectForm] = React.useState(false);

  // Google Drive Auth State
  const [gdriveToken, setGdriveToken] = React.useState<string | null>(null);
  const [gdriveUser, setGdriveUser] = React.useState<User | null>(null);
  const [isLoggingInGdrive, setIsLoggingInGdrive] = React.useState(false);

  React.useEffect(() => {
    initAuth(
      (user, token) => {
        setGdriveUser(user);
        setGdriveToken(token);
      },
      () => {
        setGdriveUser(null);
        setGdriveToken(null);
      }
    );
  }, []);

  // Google Drive tab state and handlers
  const [activeTab, setActiveTab] = React.useState<'server' | 'gdrive'>('server');
  const [gdriveFiles, setGdriveFiles] = React.useState<any[]>([]);
  const [gdriveLoading, setGdriveLoading] = React.useState(false);
  const [gdriveSearchQuery, setGdriveSearchQuery] = React.useState("");
  const [gdriveError, setGdriveError] = React.useState<string | null>(null);
  const [importingFiles, setImportingFiles] = React.useState<Record<string, boolean>>({});
  const [gdriveQuota, setGdriveQuota] = React.useState<{ limit: number; usage: number } | null>(null);

  const fetchGdriveQuota = async () => {
    if (!gdriveToken) return;
    try {
      const response = await fetch("https://www.googleapis.com/drive/v3/about?fields=storageQuota", {
        headers: { Authorization: `Bearer ${gdriveToken}` }
      });
      if (!response.ok) {
        if (response.status === 401) {
          handleGdriveLogout();
        }
        return;
      }
      const data = await response.json();
      if (data.storageQuota) {
        const limit = Number(data.storageQuota.limit) || 0;
        const usage = Number(data.storageQuota.usage) || 0;
        setGdriveQuota({ limit, usage });
      }
    } catch (err) {
      console.error("Gagal mendapatkan quota Google Drive:", err);
    }
  };

  const fetchGdriveFiles = async () => {
    if (!gdriveToken) return;
    setGdriveLoading(true);
    try {
      let query = "trashed = false";
      if (gdriveSearchQuery.trim()) {
        const sanitizedQuery = gdriveSearchQuery.replace(/'/g, "\\'");
        query = `name contains '${sanitizedQuery}' and trashed = false`;
      }
      const url = `https://www.googleapis.com/drive/v3/files?fields=files(id,name,mimeType,size,createdTime,webViewLink)&q=${encodeURIComponent(query)}&pageSize=50`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${gdriveToken}` }
      });
      if (!response.ok) {
        if (response.status === 401) {
          handleGdriveLogout();
          throw new Error("Sesi Google Drive berakhir, silakan login kembali.");
        }
        throw new Error("Gagal mengambil file dari Google Drive.");
      }
      const data = await response.json();
      setGdriveFiles(data.files || []);
      setGdriveError(null);
      await fetchGdriveQuota();
    } catch (err: any) {
      console.error(err);
      setGdriveError(err.message || "Gagal memuat file Google Drive.");
    } finally {
      setGdriveLoading(false);
    }
  };

  React.useEffect(() => {
    if (gdriveToken && activeTab === 'gdrive') {
      fetchGdriveFiles();
      fetchGdriveQuota();
    }
  }, [gdriveToken, activeTab]);

  const importGdriveFileToServer = async (fileId: string, filename: string) => {
    try {
      const confirmImport = window.confirm(`Impor file "${filename}" dari Google Drive ke Server Cloud?`);
      if (!confirmImport) return;

      setImportingFiles(prev => ({ ...prev, [fileId]: true }));
      
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${gdriveToken}` }
      });
      if (!res.ok) throw new Error("Gagal mengunduh file media dari Google Drive.");

      const blob = await res.blob();
      const formData = new FormData();
      formData.append('file', blob, filename);

      const uploadRes = await fetch('/api/cloud-files/upload', {
        method: 'POST',
        body: formData
      });

      if (!uploadRes.ok) throw new Error("Gagal mengunggah file ke Server Cloud.");
      
      alert(`Berhasil mengimpor "${filename}" ke Server Cloud!`);
      await fetchFiles(); // Refresh Server Cloud list
    } catch (err: any) {
      alert(`Gagal impor: ${err.message}`);
    } finally {
      setImportingFiles(prev => ({ ...prev, [fileId]: false }));
    }
  };

  const downloadGdriveFileToLocal = async (fileId: string, filename: string) => {
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${gdriveToken}` }
      });
      if (!res.ok) throw new Error("Gagal mengunduh file.");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: any) {
      alert(`Gagal mengunduh: ${err.message}`);
    }
  };

  const deleteGdriveFile = async (fileId: string, filename: string) => {
    try {
      const confirmDelete = window.confirm(`HAPUS file "${filename}" dari Google Drive Anda secara permanen? Tindakan ini tidak dapat dibatalkan.`);
      if (!confirmDelete) return;

      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${gdriveToken}` }
      });
      if (!res.ok) throw new Error("Gagal menghapus file dari Google Drive.");

      alert(`File "${filename}" berhasil dihapus dari Google Drive.`);
      await fetchGdriveFiles(); // Refresh list
    } catch (err: any) {
      alert(`Gagal menghapus: ${err.message}`);
    }
  };

  const handleGdriveLogin = async () => {
    setIsLoggingInGdrive(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setGdriveToken(result.accessToken);
        setGdriveUser(result.user);
      }
    } catch (err) {
      console.error('GDrive Login failed:', err);
    } finally {
      setIsLoggingInGdrive(false);
    }
  };

  const handleGdriveLogout = async () => {
    await logout();
    setGdriveToken(null);
    setGdriveUser(null);
  };

  const syncToGdrive = async (filename: string) => {
    if (!gdriveToken) return;
    try {
      const confirm = window.confirm(`Upload "${filename}" ke Google Drive?`);
      if (!confirm) return;

      const res = await fetch(`/api/cloud-files/download/${encodeURIComponent(filename)}`);
      const blob = await res.blob();

      const metadata = {
        name: filename,
        mimeType: blob.type || 'application/octet-stream',
      };
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', blob);

      const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${gdriveToken}`,
        },
        body: form,
      });

      if (!uploadRes.ok) {
         throw new Error('Gagal sync ke Google Drive');
      }

      alert('Berhasil disimpan ke Google Drive!');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const extractFilename = (urlStr: string) => {
    try {
      const parsed = new URL(urlStr);
      const pathname = parsed.pathname;
      const lastPart = pathname.substring(pathname.lastIndexOf('/') + 1);
      if (lastPart && lastPart.includes('.')) {
        return decodeURIComponent(lastPart);
      }
    } catch(e) {}
    return "file_unduhan.bin";
  };

  const handleUrlChange = (val: string) => {
    setDirectUrl(val);
    if (val.trim()) {
      const extracted = extractFilename(val);
      if (extracted) {
        setDirectName(extracted);
      }
    } else {
      setDirectName("");
    }
  };

  const handleManualDownload = async () => {
    if (!directUrl.trim()) return;
    setDownloadingUrl(true);
    setDirectDownloadProgress(0);
    setDownloadError(null);
    try {
      setDirectDownloadProgress(50);
      const payloadName = directName.trim() || extractFilename(directUrl.trim()) || "unduhan_cloud";
      const res = await fetch("/api/cloud-files/download-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: directUrl.trim(), filename: payloadName })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengunduh file.");
      }
      setDirectDownloadProgress(100);
      await fetchFiles();
      setDirectUrl("");
      setDirectName("");
      setShowDirectForm(false);
    } catch (e: any) {
      console.error(e);
      setDownloadError(e.message || "Gagal mengunduh tautan tersebut.");
    } finally {
      setDownloadingUrl(false);
      setDirectDownloadProgress(0);
    }
  };

  const handleGdriveDirectDownload = async () => {
    if (!directUrl.trim()) return;
    if (!gdriveToken) {
      setDownloadError("Hubungkan akun Google Drive Anda terlebih dahulu untuk mengunduh langsung ke Drive.");
      return;
    }
    setDownloadingUrlToGdrive(true);
    setDownloadError(null);
    let tempFilename: string | null = null;
    try {
      const payloadName = directName.trim() || extractFilename(directUrl.trim()) || "unduhan_gdrive";
      
      // Step 1: Download from URL to cloud server temporarily
      const dlRes = await fetch("/api/cloud-files/download-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: directUrl.trim(), filename: payloadName })
      });
      const dlContentType = dlRes.headers.get("content-type");
      if (!dlContentType || !dlContentType.includes("application/json")) {
        throw new Error("Gagal menjangkau server penyimpanan sementara: Respons bukan JSON. Hubungan dengan server cloud gagal.");
      }
      const dlData = await dlRes.json();
      if (!dlRes.ok) {
        throw new Error(dlData.error || "Gagal mengunduh file ke server cloud.");
      }
      tempFilename = dlData.filename;

      // Step 2: Grab the blob from server
      const fileRes = await fetch(`/api/cloud-files/download/${encodeURIComponent(tempFilename)}`);
      if (!fileRes.ok) throw new Error("Gagal mengambil file unduhan dari server.");
      const blob = await fileRes.blob();

      // Step 3: Upload to Google Drive
      let originalName = payloadName;
      if (tempFilename && tempFilename.includes('-')) {
         const parts = tempFilename.split('-');
         if (parts.length >= 3) {
            // uniqueSuffix is: timestamp (parts[0]) + "-" + random (parts[1])
            originalName = parts.slice(2).join('-');
         }
      }

      const metadata = {
        name: originalName,
        mimeType: blob.type || 'application/octet-stream',
      };
      
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', blob);

      const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${gdriveToken}`,
        },
        body: form,
      });

      if (!uploadRes.ok) {
         throw new Error('Gagal mengunggah file ke Google Drive');
      }

      // Step 4: Clean up temporary file from cloud storage
      try {
        await fetch(`/api/cloud-files/${encodeURIComponent(tempFilename)}`, {
          method: "DELETE",
        });
      } catch (delErr) {
        console.warn("Failed to delete temp file:", delErr);
      }

      alert(`Berhasil mengunduh dan menyimpan "${originalName}" langsung ke Google Drive Anda!`);
      
      // Refresh Lists
      await fetchFiles();
      if (activeTab === 'gdrive') {
        await fetchGdriveFiles();
      }
      
      setDirectUrl("");
      setDirectName("");
      setShowDirectForm(false);
    } catch (e: any) {
      console.error(e);
      setDownloadError(e.message || "Gagal mengunduh tautan langsung ke Google Drive.");
      
      // Clean up on failure as well if temp file was created
      if (tempFilename) {
        try {
          await fetch(`/api/cloud-files/${encodeURIComponent(tempFilename)}`, {
            method: "DELETE",
          });
          await fetchFiles();
        } catch (delErr) {
          console.warn("Failed to delete temp file on error:", delErr);
        }
      }
    } finally {
      setDownloadingUrlToGdrive(false);
    }
  };

  React.useEffect(() => {
    fetchFiles();
    fetchSystemDisk();
  }, []);

  const fetchSystemDisk = async () => {
    try {
      const res = await fetch("/api/cloud-files/system-disk");
      if (res.ok) {
        const ct = res.headers.get("content-type");
        if (ct && ct.includes("application/json")) {
          const data = await res.json();
          if (data && typeof data.totalDisk === 'number') {
            setSystemDisk(data);
          }
        }
      }
    } catch (e) {
      console.warn("Could not retrieve system disk info:", e);
    }
  };

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cloud-files");
      if (res.ok) {
        const ct = res.headers.get("content-type");
        if (ct && ct.includes("application/json")) {
          const data = await res.json();
          if (Array.isArray(data)) setFiles(data);
        } else {
          console.warn("Expected JSON from /api/cloud-files, received:", ct);
        }
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);

    try {
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        setCurrentUploadFile(file.name);
        setUploadProgress(0);
        setUploadSpeed("");

        const formData = new FormData();
        formData.append("file", file);

        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/cloud-files/upload");
          
          let lastLoaded = 0;
          let lastTime = Date.now();

          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              const percentComplete = (event.loaded / event.total) * 100;
              setUploadProgress(percentComplete);
              
              const now = Date.now();
              const timeDiff = (now - lastTime) / 1000; // in seconds
              if (timeDiff > 0.5) {
                const bytesDiff = event.loaded - lastLoaded;
                const speedBps = bytesDiff / timeDiff;
                setUploadSpeed(formatBytes(speedBps) + "/s");
                lastLoaded = event.loaded;
                lastTime = now;
              }
            }
          });

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(xhr.response);
            } else {
              reject(new Error("Upload failed"));
            }
          };

          xhr.onerror = () => reject(new Error("Network error"));
          xhr.send(formData);
        });
      }
      await fetchFiles();
    } catch (err) {
      alert("Upload failed");
    }
    setUploading(false);
    setCurrentUploadFile("");
  };

  const [renamingFile, setRenamingFile] = React.useState<string | null>(null);
  const [newName, setNewName] = React.useState("");
  const [deletingFile, setDeletingFile] = React.useState<string | null>(null);

  const confirmDelete = async (filename: string) => {
    try {
      const res = await fetch(`/api/cloud-files/${encodeURIComponent(filename)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      await fetchFiles();
    } catch (e) {
      console.error(e);
      alert("Gagal menghapus file");
    } finally {
      setDeletingFile(null);
    }
  };

  const handleDelete = (filename: string) => {
     setDeletingFile(filename);
  };

  const submitRename = async () => {
    if (!renamingFile || !newName || newName === renamingFile) {
      setRenamingFile(null);
      return;
    }
    try {
      const res = await fetch("/api/cloud-files/rename", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldName: renamingFile, newName }),
      });
      if (!res.ok) throw new Error("Rename failed: " + await res.text());
      await fetchFiles();
      setRenamingFile(null);
    } catch (e) {
      console.error(e);
      alert("Gagal mengganti nama file");
    }
  };

  const startRename = (filename: string) => {
    setRenamingFile(filename);
    setNewName(filename);
  };

  const handleDownload = async (filename: string) => {
    try {
      let fileHandle;
      if ((window as any).localDownloadDirectoryHandle) {
         try {
             const dirHandle = (window as any).localDownloadDirectoryHandle;
             // Check permission and request if needed
             const permission = await dirHandle.queryPermission({ mode: 'readwrite' });
             if (permission !== 'granted') {
                 if (await dirHandle.requestPermission({ mode: 'readwrite' }) !== 'granted') {
                     throw new Error('Permission denied');
                 }
             }
             fileHandle = await dirHandle.getFileHandle(filename, { create: true });
         } catch (e) {
             console.log("Failed to get file handle from dir handle", e);
             fileHandle = null;
         }
      }

      if (!fileHandle && 'showSaveFilePicker' in window) {
        try {
          fileHandle = await (window as any).showSaveFilePicker({
            suggestedName: filename,
          });
        } catch (err: any) {
          if (err.name === 'AbortError') return; // User cancelled
          console.error('File System Access API failed', err);
        }
      }

      const res = await fetch(
        `/api/cloud-files/download/${encodeURIComponent(filename)}`,
      );

      if (fileHandle) {
        const writable = await fileHandle.createWritable();
        if (res.body) {
            await res.body.pipeTo(writable);
        } else {
            const blob = await res.blob();
            await writable.write(blob);
            await writable.close();
        }
      } else {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (e) {
      console.error("Download failed", e);
    }
  };

  const handleOpen = (filename: string) => {
    const fileUrl = `/api/cloud-files/download/${encodeURIComponent(filename)}`;
    const category = getFileTypeCategory(filename);
    
    setActivePreviewFile({
      url: fileUrl,
      filename: filename,
      type: category
    });

    if (category === 'video' || category === 'audio' || category === 'image') {
      setActiveOverlay('tool-mediaplayer');
    } else if (category === 'document' || category === 'pdf' || category === 'code' || category === 'text') {
      setActiveOverlay('tool-officeviewer');
    } else if (category === 'archive') {
      setActiveOverlay('tool-archiveviewer');
    } else {
      try {
        window.open(fileUrl, "_blank", "noopener,noreferrer");
      } catch (e) {
        console.error("Gagal membuka window", e);
        alert("Gagal membuka file! Pop-up diblokir.");
      }
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const val = bytes / Math.pow(k, i);
    // Ensure 3 significant digits
    const precision = val >= 100 ? 0 : val >= 10 ? 1 : 2;
    return val.toFixed(precision) + " " + sizes[i];
  };

  // Helper for MB storage specifically, to show in GB/TB if needed
  const formatStorageMB = (mb: number) => {
    if (mb < 1024) return mb.toFixed(1) + " MB";
    const gb = mb / 1024;
    if (gb < 1024) return gb.toFixed(gb >= 100 ? 0 : gb >= 10 ? 1 : 2) + " GB";
    const tb = gb / 1024;
    return tb.toFixed(tb >= 100 ? 0 : tb >= 10 ? 1 : 2) + " TB";
  };

  const defaultQuota = 512 * 1024 * 1024; // 512 MB virtual quota
  const maxQuota = systemDisk ? systemDisk.quota30Percent : Math.round(10 * 1024 * 1024 * 1024 * 0.3); // 30% of system disk
  const totalQuota = useMaxQuota ? maxQuota : defaultQuota;

  const usedSpace = files.reduce((acc, f) => acc + f.size, 0);
  const freeSpace = Math.max(0, totalQuota - usedSpace);
  const percentUsed = Math.min(100, (usedSpace / totalQuota) * 100);

  const handleToggleQuota = () => {
    const nextVal = !useMaxQuota;
    setUseMaxQuota(nextVal);
    localStorage.setItem("browser_use_max_quota", String(nextVal));
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 relative">
      <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl z-20">
        <h3 className="font-bold flex items-center gap-2">
          <Cloud className="w-5 h-5 text-blue-500" />
          Manajer File Cloud
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-32">
        {/* Tab Selection */}
        <div className="flex bg-zinc-105 dark:bg-zinc-800/80 p-1 rounded-xl border border-gray-100 dark:border-zinc-800/50">
          <button
            onClick={() => setActiveTab('server')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition hover:opacity-90 cursor-pointer ${
              activeTab === 'server'
                ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow"
                : "text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            Server Cloud
          </button>
          <button
            onClick={() => setActiveTab('gdrive')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition hover:opacity-90 flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'gdrive'
                ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow"
                : "text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 87.3 78"><path fill="#FFC107" d="M26.1 76h35l26.2-45H52.4z"/><path fill="#1976D2" d="M61 76H26.1L0 31l17.4-30z"/><path fill="#4CAF50" d="M0 31l26.2 45h35L35 31z"/></svg>
            Google Drive
          </button>
        </div>

        {activeTab === 'server' ? (
          <>
            {/* Storage Info Card */}
            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-gray-100 dark:border-zinc-850 shadow-sm flex flex-col gap-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-gray-500 dark:text-zinc-400 flex items-center gap-1.5 flex-wrap">
                  <span>Penyimpanan Cloud</span>
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold">
                    {useMaxQuota ? `Maksimal (${formatStorageMB(maxQuota / (1024 * 1024))})` : `Batas Default (${formatStorageMB(defaultQuota / (1024 * 1024))})`}
                  </span>
                </span>
                <span className="font-bold font-mono text-blue-500">
                  {formatStorageMB(freeSpace / (1024 * 1024))} Tersedia (Free)
                </span>
              </div>
              
              <div className="w-full h-2.5 bg-gray-200 dark:bg-zinc-700/50 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ease-out ${
                    percentUsed > 90 ? 'bg-red-500' : percentUsed > 75 ? 'bg-amber-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${percentUsed}%` }}
                />
              </div>
              
              <div className="flex justify-between items-center text-[11px] text-gray-400 dark:text-zinc-500 font-medium font-sans">
                <span>Terpakai: {formatBytes(usedSpace)} ({formatStorageMB(usedSpace / (1024 * 1024))})</span>
                <span>Total Kuota: {formatBytes(totalQuota)} ({formatStorageMB(totalQuota / (1024 * 1024))})</span>
              </div>

              <div className="border-t border-gray-200/60 dark:border-zinc-700/60 pt-3 flex flex-col gap-2">
                <div className="text-[10px] text-gray-400 dark:text-zinc-500 leading-relaxed font-sans">
                  <strong>Mengapa Penyimpanan Awal 512 MB (500 MB)?</strong> Batas virtual ringkas ini diaktifkan secara default demi melindungi performa hosting. Namun, Anda dapat meningkatkan batas penyimpanan secara aman hingga <strong>maksimal 30% dari total penyimpanan disk server asli Anda ({systemDisk ? formatBytes(systemDisk.totalDisk) : "10 GB"})</strong>.
                </div>
                
                <button
                  onClick={handleToggleQuota}
                  className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
                    useMaxQuota 
                      ? "bg-amber-550 hover:bg-amber-600 bg-amber-500 text-white shadow-sm shadow-amber-500/10" 
                      : "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/15"
                  }`}
                >
                  {useMaxQuota ? (
                    <>
                      <span>Kembalikan ke Batas Default ({formatStorageMB(defaultQuota / (1024 * 1024))})</span>
                    </>
                  ) : (
                    <>
                      <span>🚀 Atur ke Kuota Maksimal Server (+30% Disk / {formatStorageMB(maxQuota / (1024 * 1024))})</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Google Drive Status Link in Server Tab too */}
            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-gray-100 dark:border-zinc-850 shadow-sm flex flex-col gap-3">
                 <div className="flex items-center gap-3">
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 87.3 78"><path fill="#FFC107" d="M26.1 76h35l26.2-45H52.4z"/><path fill="#1976D2" d="M61 76H26.1L0 31l17.4-30z"/><path fill="#4CAF50" d="M0 31l26.2 45h35L35 31z"/></svg>
                   <h4 className="font-bold flex-1 text-sm text-gray-800 dark:text-zinc-200">Google Drive</h4>
                 </div>
                 {gdriveToken ? (
                   <div className="flex flex-col gap-2">
                     <div className="text-xs font-semibold text-green-600 dark:text-green-400">Tersambung ke Google Drive</div>
                     {gdriveUser && <div className="text-[11px] text-gray-500">{gdriveUser.email}</div>}
                     <button onClick={handleGdriveLogout} className="px-3 py-2 mt-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-100 dark:border-red-900/30 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition text-left shrink-0 max-w-fit cursor-pointer">
                        Putuskan (Logout)
                     </button>
                   </div>
                 ) : (
                    <div className="flex flex-col gap-2">
                     <div className="text-[11px] font-medium text-gray-500 dark:text-zinc-400">Hubungkan untuk mengaktifkan sinkronisasi dan impor file secara langsung.</div>
                     <button 
                       onClick={handleGdriveLogin} 
                       disabled={isLoggingInGdrive}
                       className="gsi-material-button flex items-center justify-center gap-2 w-full max-w-[240px] py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
                     >
                        {isLoggingInGdrive ? "Menghubungkan..." : "Login (Sign In Google)"}
                     </button>
                   </div>
                 )}
            </div>

            {/* Direct Link Cloud Downloader Card */}
            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-gray-100 dark:border-zinc-850 shadow-sm flex flex-col gap-3">
              <button 
                onClick={() => setShowDirectForm(!showDirectForm)}
                className="flex items-center justify-between w-full hover:opacity-85 text-left cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-blue-500 animate-pulse" />
                  <span className="font-bold text-xs text-gray-700 dark:text-zinc-200">Unduh Direkt Manual (ke Cloud)</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 font-extrabold select-none">
                  {showDirectForm ? "Sembunyikan" : "Buka Form"}
                </span>
              </button>

              {showDirectForm && (
                <div className="flex flex-col gap-3 mt-1 border-t border-gray-200/50 dark:border-zinc-700/50 pt-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500">ALAMAT DOWNLOAD URL (DIRECT LINK)</label>
                    <input
                      type="url"
                      placeholder="https://example.com/file.zip"
                      value={directUrl}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      disabled={downloadingUrl}
                      className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500">NAMA FILE AKHIR (OPSIONAL)</label>
                    <input
                      type="text"
                      placeholder="file_unduhan.zip"
                      value={directName}
                      onChange={(e) => setDirectName(e.target.value)}
                      disabled={downloadingUrl}
                      className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {downloadError && (
                    <div className="text-[10px] text-red-500 font-medium leading-relaxed bg-red-50 dark:bg-red-955/20 p-2.5 rounded-xl border border-red-100 dark:border-red-900/40">
                      {downloadError}
                    </div>
                  )}

                  {!gdriveToken && (
                    <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium leading-relaxed bg-amber-50/50 dark:bg-amber-950/10 p-2 text-center rounded-xl border border-amber-100/50 dark:border-amber-900/20">
                      💡 Hubungkan Google Drive Anda untuk mengunduh direct link langsung ke Drive.
                    </div>
                  )}

                  {(downloadingUrl || downloadingUrlToGdrive) && (
                    <div className="w-full h-1.5 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden mt-1 mb-2">
                      <div 
                        className={`h-full transition-all duration-300 ease-out ${downloadingUrl ? 'bg-blue-500' : 'bg-emerald-500'}`} 
                        style={{ width: `${directDownloadProgress}%` }}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={handleManualDownload}
                      disabled={downloadingUrl || downloadingUrlToGdrive || !directUrl.trim()}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0 ${
                        downloadingUrl
                          ? "bg-gray-300 dark:bg-zinc-800 text-gray-500 cursor-not-allowed"
                          : !directUrl.trim() || downloadingUrlToGdrive
                          ? "bg-gray-200/50 dark:bg-zinc-850/50 text-gray-400 dark:text-zinc-600 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/15 cursor-pointer"
                      }`}
                    >
                      {downloadingUrl ? (
                        <>
                          <span className="animate-spin rounded-full border-2 border-current border-t-transparent w-3.5 h-3.5 shrink-0" />
                          <span>Mengunduh ke Cloud ({directDownloadProgress}%)</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          <span>Kirim ke Cloud</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleGdriveDirectDownload}
                      disabled={downloadingUrl || downloadingUrlToGdrive || !directUrl.trim() || !gdriveToken}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0 ${
                        downloadingUrlToGdrive
                          ? "bg-gray-300 dark:bg-zinc-800 text-gray-500 cursor-not-allowed"
                          : !directUrl.trim() || !gdriveToken || downloadingUrl
                          ? "bg-gray-200/50 dark:bg-zinc-850/50 text-gray-400 dark:text-zinc-600 cursor-not-allowed"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/15 cursor-pointer"
                      }`}
                    >
                      {downloadingUrlToGdrive ? (
                        <>
                          <span className="animate-spin rounded-full border-2 border-current border-t-transparent w-3.5 h-3.5 shrink-0" />
                          <span>Mengirim ke Drive ({directDownloadProgress}%)</span>
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 87.3 78"><path fill="currentColor" d="M26.1 76h35l26.2-45H52.4z"/><path fill="currentColor" d="M61 76H26.1L0 31l17.4-30z" opacity="0.8"/><path fill="currentColor" d="M0 31l26.2 45h35L35 31z" opacity="0.6"/></svg>
                          <span>Kirim ke GDrive</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center p-8">
                <span className="animate-spin rounded-full border-3 border-blue-500 border-t-transparent w-8 h-8 shrink-0" />
              </div>
            ) : (
              <div className="text-center p-8 text-gray-400 text-xs text-zinc-500">
                Gunakan tab "Cloud" di File Manager untuk mengelola file server Anda.
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3">
            {!gdriveToken ? (
              <div className="flex flex-col items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-gray-100 dark:border-zinc-850 shadow-sm text-center gap-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 87.3 78" className="mb-1"><path fill="#FFC107" d="M26.1 76h35l26.2-45H52.4z"/><path fill="#1976D2" d="M61 76H26.1L0 31l17.4-30z"/><path fill="#4CAF50" d="M0 31l26.2 45h35L35 31z"/></svg>
                <div className="text-center">
                  <h4 className="font-extrabold text-sm text-gray-800 dark:text-zinc-200">Google Drive Belum Terhubung</h4>
                  <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-1.5 max-w-[260px] leading-relaxed">Hubungkan akun Google Anda untuk menjelajahi, mengunduh, dan mengelola file secara langsung.</p>
                </div>
                <button 
                  onClick={handleGdriveLogin} 
                  disabled={isLoggingInGdrive}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer shadow-md shadow-blue-500/10"
                >
                  {isLoggingInGdrive ? "Menghubungkan..." : "Login (Sign In Google)"}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {/* GDrive Header Connection Status */}
                <div className="flex items-center justify-between p-3 bg-green-50/50 dark:bg-green-950/15 border border-green-100/40 dark:border-green-900/30 rounded-xl">
                  <div className="flex flex-col overflow-hidden mr-2">
                    <span className="text-[10px] font-bold text-green-600 dark:text-green-400">AKUN GOOGLE TERHUBUNG</span>
                    <span className="text-xs truncate font-medium text-gray-750 dark:text-zinc-300">{gdriveUser?.email || "Google Account"}</span>
                  </div>
                  <button
                    onClick={handleGdriveLogout}
                    className="px-2.5 py-1 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/60 transition cursor-pointer"
                  >
                    Logout
                  </button>
                </div>

                {gdriveQuota && (
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-800/20 border border-gray-150/50 dark:border-zinc-750/70 rounded-xl font-sans">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400">PENYIMPANAN GOOGLE DRIVE</span>
                      <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400">
                        {gdriveQuota.limit > 0 ? `${Math.round((gdriveQuota.usage / gdriveQuota.limit) * 100)}%` : "0%"} Terpakai
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-gray-250 dark:bg-zinc-700/60 rounded-full overflow-hidden mb-2">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${gdriveQuota.limit > 0 ? Math.min(100, (gdriveQuota.usage / gdriveQuota.limit) * 100) : 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 dark:text-zinc-500 font-semibold">
                      <span>Sisa (Free Space): <strong className="text-gray-700 dark:text-zinc-300 font-bold">{formatBytes(Math.max(0, gdriveQuota.limit - gdriveQuota.usage))}</strong></span>
                      <span>Kapasitas (Total): <strong className="text-gray-700 dark:text-zinc-300 font-bold">{formatBytes(gdriveQuota.limit)}</strong></span>
                    </div>
                  </div>
                )}

                {/* GDrive Search & Refresh Row */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Cari file di Google Drive..."
                      value={gdriveSearchQuery}
                      onChange={(e) => setGdriveSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchGdriveFiles()}
                      className="w-full text-xs pl-8 pr-2.5 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3" />
                  </div>
                  <button
                    onClick={fetchGdriveFiles}
                    disabled={gdriveLoading}
                    className="p-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-blue-600 dark:text-zinc-200 border border-blue-100/30 dark:border-zinc-700 rounded-xl transition flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50"
                    title="Cari / Segarkan"
                  >
                    <RefreshCw className={`w-4 h-4 ${gdriveLoading ? "animate-spin" : ""}`} />
                  </button>
                </div>

                {/* GDrive Error Banner */}
                {gdriveError && (
                  <div className="text-[11px] text-red-500 font-medium leading-relaxed bg-red-50 dark:bg-red-950/20 p-3 rounded-xl border border-red-100 dark:border-red-900/40">
                    {gdriveError}
                  </div>
                )}

                {/* GDrive Files List */}
                {gdriveLoading ? (
                  <div className="flex items-center justify-center p-12">
                    <span className="animate-spin rounded-full border-3 border-blue-500 border-t-transparent w-8 h-8 shrink-0" />
                  </div>
                ) : gdriveFiles.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-xs bg-zinc-50 dark:bg-zinc-800/10 rounded-xl">
                    Tidak ada file ditemuakan di Google Drive.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {gdriveFiles.map((file) => {
                      const isImporting = !!importingFiles[file.id];
                      // Map icons
                      const ext = file.name.toLowerCase().split('.').pop() || '';
                      const isGdoc = file.mimeType?.startsWith('application/vnd.google-apps');
                      let iconNode = <File className="w-8 h-8 text-blue-500 shrink-0" />;
                      if (file.mimeType?.startsWith('image/')) iconNode = <Camera className="w-8 h-8 text-emerald-500 shrink-0" />;
                      else if (file.mimeType?.startsWith('video/')) iconNode = <Video className="w-8 h-8 text-indigo-500 shrink-0" />;
                      else if (file.mimeType?.startsWith('audio/')) iconNode = <Music className="w-8 h-8 text-pink-500 shrink-0" />;
                      else if (file.mimeType === 'application/pdf') iconNode = <FileText className="w-8 h-8 text-rose-500 shrink-0" />;
                      else if (isGdoc) iconNode = <FileText className="w-8 h-8 text-blue-500 shrink-0" />;
                      
                      return (
                        <div
                          key={file.id}
                          className="flex flex-col p-3 bg-zinc-50 dark:bg-zinc-805 rounded-xl border border-gray-150/50 dark:border-zinc-750"
                        >
                          <div className="flex items-center gap-3 overflow-hidden mb-2.5">
                            {iconNode}
                            <div className="truncate flex-1">
                              <div className="font-semibold text-xs truncate text-black dark:text-zinc-200" title={file.name}>
                                {file.name}
                              </div>
                              <div className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5 font-medium">
                                {file.size ? formatBytes(Number(file.size)) : "Dokumen Awan"} • {new Date(file.createdTime).toLocaleDateString()}
                              </div>
                            </div>
                          </div>

                          {/* Drive Actions Row */}
                          <div className="flex items-center gap-1.5 border-t border-gray-200/50 dark:border-zinc-700/50 pt-2.5">
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 p-1.5 flex items-center justify-center gap-1 text-[11px] font-bold bg-blue-100/40 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/15 dark:hover:bg-blue-900/30 rounded-lg transition"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> Buka
                            </a>

                            <button
                              onClick={() => downloadGdriveFileToLocal(file.id, file.name)}
                              className="flex-1 p-1.5 flex items-center justify-center gap-1 text-[11px] font-bold bg-green-100/40 text-green-600 hover:bg-green-100 dark:bg-green-900/15 dark:hover:bg-green-900/30 rounded-lg transition cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" /> Unduh
                            </button>

                            <button
                              onClick={() => importGdriveFileToServer(file.id, file.name)}
                              disabled={isImporting}
                              className="flex-1 p-1.5 flex items-center justify-center gap-1 text-[11px] font-bold bg-amber-100/40 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/15 dark:hover:bg-amber-900/30 rounded-lg transition disabled:opacity-50 cursor-pointer"
                            >
                              {isImporting ? <span className="animate-spin rounded-full border-2 border-amber-600 border-t-transparent w-3.5 h-3.5 shrink-0" /> : <Cloud className="w-3.5 h-3.5" />}
                              Impor
                            </button>

                            <button
                              onClick={() => deleteGdriveFile(file.id, file.name)}
                              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition shrink-0 cursor-pointer"
                              title="Hapus Permanen dari Google Drive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 absolute bottom-0 left-0 right-0 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
        <label
          className={`w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-semibold shadow-lg shadow-blue-600/30 transition cursor-pointer flex justify-center items-center gap-2 ${uploading ? "opacity-70 pointer-events-none" : ""}`}
        >
          {uploading ? (
            <span className="animate-spin rounded-full border-2 border-current border-t-transparent w-5 h-5 shrink-0" />
          ) : (
            <Cloud className="w-5 h-5" />
          )}
          {uploading ? "Mengunggah..." : "Unggah File"}
          <input
            type="file"
            className="hidden"
            multiple
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      </div>
    </div>
  );
}

export default function Overlays() {
  const {
    activeOverlay,
    setActiveOverlay,
    bookmarks,
    setCurrentUrl,
    fullHistory,
    clearHistory,
    removeHistoryItem,
    removeBookmark,
    downloads,
    pauseDownload,
    resumeDownload,
    removeDownload,
    updateDownloadPath,
    tabs,
    activeTabId,
    setActiveTab,
    addTab,
    removeTab,
    removeAllTabs,
    appSettings,
    updateSetting,
    addDownload,
    setIsCapturing,
    setActivePreviewFile,
  } = useBrowser();
  const [downloadOptionsId, setDownloadOptionsId] = useState<string | null>(
    null,
  );
  const [renameId, setRenameId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  // Advanced Download State
  const [showAdvancedDl, setShowAdvancedDl] = useState(false);
  const [dlUrl, setDlUrl] = useState("");
  const [dlFile, setDlFile] = useState("");
  const [dlThreads, setDlThreads] = useState(3);

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const getDlIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="w-6 h-6 text-orange-500" />;
      case "music":
        return <Music className="w-6 h-6 text-purple-500" />;
      case "document":
        return <File className="w-6 h-6 text-blue-500" />;
      default:
        return <Folder className="w-6 h-6 text-yellow-500" />;
    }
  };

  return (
    <>
      <AnimatePresence>
        {activeOverlay !== "none" && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute inset-0 z-50 bg-white dark:bg-[#121212] flex flex-col"
          >
            <div className="h-14 flex items-center px-4 border-b border-gray-200 dark:border-zinc-800 shrink-0">
              <button
                onClick={() => setActiveOverlay("none")}
                className="p-2 -ml-2 text-gray-600 dark:text-zinc-300 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h1 className="ml-2 font-medium text-lg capitalize">
                {activeOverlay === "uc-drive" ? "Cloud Drive" : activeOverlay === "file-manager" ? "File Manager" : activeOverlay.replace("-", " ")}
              </h1>

              {activeOverlay === "history" && fullHistory.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="ml-auto p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto w-full no-scrollbar">
              {activeOverlay === "bookmarks" && (
                <div className="p-2 space-y-1">
                  {bookmarks.map((b) => (
                    <div
                      key={b.url}
                      className="flex items-center justify-between p-3 py-4 border-b border-gray-100 dark:border-zinc-800 last:border-0 hover:bg-gray-50 dark:hover:bg-zinc-800/50"
                    >
                      <div
                        className="flex-1 cursor-pointer truncate mr-4"
                        onClick={() => {
                          setCurrentUrl(b.url);
                          setActiveOverlay("none");
                        }}
                      >
                        <h3 className="text-sm font-medium">{b.title}</h3>
                        <p className="text-xs text-blue-500 truncate mt-1">
                          {b.url}
                        </p>
                      </div>
                      <button
                        onClick={() => removeBookmark(b.url)}
                        className="p-2 text-gray-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {bookmarks.length === 0 && (
                    <EmptyState
                      icon={<StarEmpty />}
                      text="Belum ada bookmark."
                    />
                  )}
                </div>
              )}

              {activeOverlay === "history" && (
                <div className="p-2 space-y-1">
                  {fullHistory.map((h, i) => (
                    <div
                      key={i + "-" + h.url + "-" + h.time}
                      className="flex items-center p-3 py-4 border-b border-gray-100 dark:border-zinc-800 last:border-0 hover:bg-gray-50 dark:hover:bg-zinc-800/50 cursor-pointer group"
                      onClick={() => {
                        setCurrentUrl(h.url);
                        setActiveOverlay("none");
                      }}
                    >
                      <Clock className="w-5 h-5 text-gray-400 mr-4 shrink-0" />
                      <div className="flex-1 truncate pr-4">
                        <h3 className="text-sm font-medium truncate">
                          {h.title || h.url}
                        </h3>
                        <p className="text-xs text-gray-500 truncate mt-1">
                          {h.url}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs text-gray-400 shrink-0">
                          {h.time}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeHistoryItem(i);
                          }}
                          className="p-1 text-gray-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100 hidden sm:block"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      {/* Mobile view delete button always visible or visible on swipe, for brevity just making it a small button here */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeHistoryItem(i);
                        }}
                        className="p-2 ml-2 bg-gray-100 dark:bg-zinc-800 text-gray-400 hover:text-red-500 rounded-full sm:hidden"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {fullHistory.length === 0 && (
                    <EmptyState
                      icon={<Clock className="w-12 h-12" />}
                      text="Tidak ada riwayat. Mode Incognito mungkin aktif."
                    />
                  )}
                </div>
              )}

              {activeOverlay === "downloads" && (
                <div className="p-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50 mb-6 flex justify-between items-center">
                    <div className="flex-1 overflow-hidden mr-4">
                      <h4 className="font-medium text-sm text-blue-800 dark:text-blue-300">
                        Lokasi Unduhan
                      </h4>
                      <p className="text-xs text-blue-600/80 dark:text-blue-400/80 truncate mt-1">
                        {appSettings?.downloadLocation || "Default Perangkat"}
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          if (!('showDirectoryPicker' in window)) {
                              alert('Browser Anda tidak mendukung akses penyimpanan internal tingkat lanjut.');
                              return;
                          }
                          const dirHandle = await (window as any).showDirectoryPicker({
                              mode: 'readwrite'
                          });
                          (window as any).localDownloadDirectoryHandle = dirHandle;
                          updateSetting("downloadLocation", dirHandle.name);
                          alert(
                            `Folder penyimpanan berhasil diubah ke: ${dirHandle.name}. Browser sekarang memiliki akses untuk menyimpan langsung ke folder ini.`,
                          );
                        } catch (err) {
                          console.log(err);
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shrink-0 shadow-md transition"
                    >
                      Ubah Lokasi
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mb-6">
                    <button
                      onClick={() => {
                        setShowAdvancedDl(true);
                        setDlUrl("");
                        setDlFile("");
                        setDlThreads(appSettings?.maxDownloads || 3);
                      }}
                      className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 rounded-xl text-sm font-medium transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Plus className="w-5 h-5 text-blue-500" />
                      Unduhan Baru
                    </button>

                    {downloads.filter((d) => d.status === "completed").length >
                      0 && (
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              "Bersihkan semua riwayat unduhan yang sudah selesai?",
                            )
                          ) {
                            const completedIds = downloads
                              .filter((d) => d.status === "completed")
                              .map((d) => d.id);
                            completedIds.forEach((id) => removeDownload(id));
                          }
                        }}
                        className="px-4 py-3 bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium transition cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <DlCategory
                      icon={<Video className="w-6 h-6 text-orange-500" />}
                      label="Video"
                    />
                    <DlCategory
                      icon={<Music className="w-6 h-6 text-purple-500" />}
                      label="Musik"
                    />
                    <DlCategory
                      icon={<File className="w-6 h-6 text-blue-500" />}
                      label="Dokumen"
                    />
                    <DlCategory
                      icon={<Folder className="w-6 h-6 text-yellow-500" />}
                      label="Lainnya"
                    />
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-gray-800 dark:text-zinc-200">
                      Sedang Berjalan (
                      {downloads.filter((d) => d.status !== "completed").length}
                      )
                    </h3>
                    <div className="space-y-3">
                      {downloads
                        .filter((d) => d.status !== "completed")
                        .map((d) => (
                          <div
                            key={d.id}
                            className="bg-white dark:bg-zinc-800/50 p-4 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm flex flex-col"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                                  {getDlIcon(d.type)}
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                  <span className="font-medium text-sm truncate text-gray-800 dark:text-zinc-200">
                                    {d.filename}
                                  </span>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[11px] text-gray-500">
                                      {formatBytes(d.downloadedBytes)} /{" "}
                                      {formatBytes(d.size)}
                                    </span>
                                    {d.status === "downloading" && (
                                      <span className="text-[11px] text-orange-500 font-medium">
                                        {d.speed}
                                      </span>
                                    )}
                                    {d.status === "paused" && (
                                      <span className="text-[11px] text-orange-500 font-medium">
                                        Dijeda
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {d.status === "downloading" ? (
                                  <button
                                    onClick={() => pauseDownload(d.id)}
                                    className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-700 flex items-center justify-center text-gray-600 dark:text-gray-300"
                                  >
                                    <Pause className="w-4 h-4 fill-current" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => resumeDownload(d.id)}
                                    className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400"
                                  >
                                    <Play className="w-4 h-4 fill-current ml-0.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => removeDownload(d.id)}
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${d.status === "downloading" ? "bg-orange-500" : "bg-gray-400"}`}
                                style={{ width: `${d.progress}%` }}
                              />
                            </div>
                          </div>
                        ))}
                    </div>

                    <h3 className="font-semibold text-sm text-gray-800 dark:text-zinc-200 mt-6">
                      Selesai (
                      {downloads.filter((d) => d.status === "completed").length}
                      )
                    </h3>
                    <div className="space-y-3">
                      {downloads
                        .filter((d) => d.status === "completed")
                        .map((d) => (
                          <div
                            key={d.id}
                            className="bg-white dark:bg-zinc-800/50 p-4 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm flex items-center justify-between opacity-80 hover:opacity-100 transition cursor-pointer relative"
                            onClick={() => setDownloadOptionsId(d.id)}
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                                {getDlIcon(d.type)}
                              </div>
                              <div className="flex flex-col overflow-hidden">
                                <span className="font-medium text-sm truncate text-gray-800 dark:text-zinc-200">
                                  {d.filename}
                                </span>
                                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                  <span>Berhasil • {formatBytes(d.size)}</span>
                                  <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-zinc-600"></div>
                                  {d.location === "cloud" ? (
                                    <span className="flex items-center gap-1 text-blue-500">
                                      <Cloud className="w-3 h-3" /> Cloud
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">Lokal</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeDownload(d.id);
                              }}
                              className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                    </div>
                    {downloads.length === 0 && (
                      <EmptyState
                        icon={<Download className="w-12 h-12" />}
                        text="Tidak ada riwayat unduhan."
                      />
                    )}
                  </div>
                </div>
              )}

              {activeOverlay === "tabs" && (
                <div className="p-4 flex flex-col h-full bg-zinc-100 dark:bg-black/90">
                  <div className="grid grid-cols-2 gap-4 pb-24 overflow-y-auto">
                    <AnimatePresence>
                      {tabs.map((tab) => (
                        <motion.div
                          layout
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8, y: -20 }}
                          whileHover={{ y: -5 }}
                          whileTap={{ scale: 0.95 }}
                          key={tab.id}
                          className={`relative bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-sm transition-all cursor-pointer ring-offset-2 dark:ring-offset-black ${tab.id === activeTabId ? "ring-2 ring-blue-500 shadow-md" : "ring-1 ring-gray-200 dark:ring-zinc-800"}`}
                          onClick={() => {
                            setActiveTab(tab.id);
                            setActiveOverlay("none");
                          }}
                        >
                          <div className="h-40 p-4 flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${tab.id === activeTabId ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30" : "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300"}`}
                              >
                                {tab.url &&
                                tab.url !== "" &&
                                !tab.url.includes("google.com/search") &&
                                !tab.url.includes("bing.com/search") ? (
                                  <img
                                    src={`https://www.google.com/s2/favicons?domain=${new URL(tab.url).hostname}&sz=64`}
                                    alt=""
                                    className="w-6 h-6 rounded-md"
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                      e.currentTarget.nextElementSibling?.classList.remove(
                                        "hidden",
                                      );
                                    }}
                                  />
                                ) : null}
                                <Globe
                                  className={`w-5 h-5 ${tab.url && tab.url !== "" && !tab.url.includes("google.com/search") && !tab.url.includes("bing.com/search") ? "hidden" : ""}`}
                                />
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeTab(tab.id);
                                }}
                                className="p-1.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="mt-auto">
                              <h3
                                className={`font-semibold text-sm truncate w-full ${tab.id === activeTabId ? "text-blue-600 dark:text-blue-400" : "text-gray-800 dark:text-gray-200"}`}
                              >
                                {tab.title || "Tab Baru"}
                              </h3>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                                {tab.url || "Halaman Beranda"}
                              </p>
                            </div>
                          </div>
                          {/* Simulate miniature page wrapper */}
                          <div className="h-2 w-full bg-gray-100 dark:bg-zinc-800 absolute bottom-0">
                            {tab.id === activeTabId && (
                              <div className="h-full w-1/3 bg-blue-500 rounded-r-full" />
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-4">
                    <button
                      onClick={removeAllTabs}
                      className="h-14 px-6 bg-gray-800 dark:bg-zinc-800 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-gray-700 transition active:scale-95 text-sm font-medium whitespace-nowrap"
                    >
                      Tutup Semua
                    </button>
                    <button
                      onClick={() => {
                        addTab("");
                        setActiveOverlay("none");
                      }}
                      className="h-14 px-6 bg-blue-600 rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center text-white hover:bg-blue-700 transition active:scale-95 text-sm font-medium gap-2"
                    >
                      <Plus className="w-5 h-5" /> Tab Baru
                    </button>
                  </div>
                </div>
              )}

              {activeOverlay === "uc-drive" && (
                <div className="flex flex-col items-center justify-center p-8 h-full text-center">
                  <div className="w-32 h-32 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center mb-6 shadow-inner border-4 border-blue-50/50 dark:border-blue-900/20">
                    <Cloud className="w-16 h-16" />
                  </div>
                  <h2 className="text-xl font-bold mb-2">
                    ID Gen Cloud (Nextgen)
                  </h2>
                  <p className="text-sm text-gray-500 mb-6">
                    Nikmati penyimpanan sementara hingga{" "}
                    <strong className="text-blue-500">
                      {localStorage.getItem("browser_use_max_quota") === "true" ? "Maksimal Server (30% Disk)" : "512 MB"}
                    </strong> di cloud
                    hosting. Unduh file besar ke cloud tanpa menghabiskan memori
                    perangkat, lalu pindahkan nanti.
                  </p>

                  <div className="flex flex-col gap-3 w-full max-w-xs">
                    <button
                      onClick={() => setActiveOverlay("cloud-file-manager")}
                      className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-semibold shadow-lg shadow-blue-600/30 transition cursor-pointer flex justify-center items-center gap-2 border border-blue-500"
                    >
                      <Cloud className="w-5 h-5" />
                      Kelola File Cloud Server
                    </button>

                    <label className="w-full py-4 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 rounded-2xl font-semibold shadow transition cursor-pointer flex justify-center items-center gap-2 border border-gray-200 dark:border-zinc-700">
                      <Folder className="w-5 h-5 text-gray-500" />
                      Buka Penyimpanan Internal
                      <input
                        type="file"
                        id="localFiles"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            const fileNames = Array.from(e.target.files)
                              .map((f: any) => f.name)
                              .join(", ");
                            alert(
                              `Berhasil membaca ${e.target.files.length} file dari penyimpanan internal Anda:\n\n${fileNames}`,
                            );
                          }
                        }}
                      />
                    </label>

                    <button
                      onClick={() => setActiveOverlay("file-manager")}
                      className="w-full py-4 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 rounded-2xl font-semibold shadow transition cursor-pointer flex justify-center items-center gap-2 border border-gray-200 dark:border-zinc-700"
                    >
                      <SquareStack className="w-5 h-5 text-gray-500" />
                      File Manager
                    </button>
                  </div>
                </div>
              )}

              {activeOverlay === "tools" && (
                <div className="p-4 grid grid-cols-2 gap-4">
                  <div
                    className="bg-gray-50 dark:bg-zinc-800 p-6 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition shadow-sm border border-transparent dark:border-zinc-700 hover:border-blue-200"
                    onClick={() => { setIsCapturing(true); setActiveOverlay("none"); }}
                  >
                    <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                      <Camera className="w-8 h-8 text-blue-600" />
                    </div>
                    <span className="font-semibold text-sm text-center">
                      Tangkapan Layar
                    </span>
                  </div>
                  <div
                    className="bg-gray-50 dark:bg-zinc-800 p-6 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition shadow-sm border border-transparent dark:border-zinc-700 hover:border-blue-200"
                    onClick={() => setActiveOverlay("tool-qrcode")}
                  >
                    <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                      <QrCode className="w-8 h-8 text-blue-600" />
                    </div>
                    <span className="font-semibold text-sm text-center">
                      Scan QR Code
                    </span>
                  </div>
                  <div
                    className="bg-gray-50 dark:bg-zinc-800 p-6 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition shadow-sm border border-transparent dark:border-zinc-700 hover:border-orange-200"
                    onClick={() => setActiveOverlay("tool-calculator")}
                  >
                    <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-4">
                      <Calculator className="w-8 h-8 text-orange-600" />
                    </div>
                    <span className="font-semibold text-sm text-center">
                      Kalkulator
                    </span>
                  </div>
                  <div
                    className="bg-gray-50 dark:bg-zinc-800 p-6 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition shadow-sm border border-transparent dark:border-zinc-700 hover:border-purple-200"
                    onClick={() => setActiveOverlay("tool-compass")}
                  >
                    <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
                      <Compass className="w-8 h-8 text-purple-600" />
                    </div>
                    <span className="font-semibold text-sm text-center">
                      Kompas
                    </span>
                  </div>
                  <div
                    className="bg-gray-50 dark:bg-zinc-800 p-6 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition shadow-sm border border-transparent dark:border-zinc-700 hover:border-blue-300"
                    onClick={() => setActiveOverlay("tool-mediaplayer")}
                  >
                    <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                      <Video className="w-8 h-8 text-blue-500" />
                    </div>
                    <span className="font-semibold text-sm text-center">
                      Pemutar Media
                    </span>
                  </div>
                  <div
                    className="bg-gray-50 dark:bg-zinc-800 p-6 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition shadow-sm border border-transparent dark:border-zinc-700 hover:border-indigo-300"
                    onClick={() => setActiveOverlay("tool-officeviewer")}
                  >
                    <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-4">
                      <FileText className="w-8 h-8 text-indigo-500" />
                    </div>
                    <span className="font-semibold text-sm text-center">
                      Pembuka Office
                    </span>
                  </div>
                  <div
                    className="bg-gray-50 dark:bg-zinc-800 p-6 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition shadow-sm border border-transparent dark:border-zinc-700 hover:border-yellow-300"
                    onClick={() => setActiveOverlay("tool-archiveviewer")}
                  >
                    <div className="w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mb-4">
                      <Archive className="w-8 h-8 text-yellow-600" />
                    </div>
                    <span className="font-semibold text-sm text-center">
                      Pembuka Arsip
                    </span>
                  </div>
                </div>
              )}

              {activeOverlay === "tool-calculator" && <CalculatorComponent />}
              {activeOverlay === "tool-compass" && <CompassComponent />}
              {activeOverlay === "tool-qrcode" && <QrScannerComponent />}
              {activeOverlay === "tool-mediaplayer" && <MediaPlayerComponent />}
              {activeOverlay === "tool-officeviewer" && (
                <OfficeViewerComponent />
              )}
              {activeOverlay === "tool-archiveviewer" && (
                <ArchiveViewerComponent />
              )}
              {activeOverlay === "cloud-file-manager" && <CloudFileManager />}
              {activeOverlay === "file-manager" && <FileManagerComponent />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Download Action Menu Modal */}
      <AnimatePresence>
        {downloadOptionsId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] bg-black/50 flex flex-col justify-end"
            onClick={() => setDownloadOptionsId(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-900 rounded-t-3xl p-4 w-full flex flex-col space-y-2 border-t border-gray-200 dark:border-zinc-800 shadow-2xl"
              style={{
                paddingBottom: "max(env(safe-area-inset-bottom), 1rem)",
              }}
            >
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-zinc-700 rounded-full mx-auto mb-4" />
              <h3 className="text-center font-semibold mb-2 line-clamp-1 px-4 text-gray-800 dark:text-zinc-200">
                {downloads.find((d) => d.id === downloadOptionsId)?.filename}
              </h3>

              {downloads.find((d) => d.id === downloadOptionsId)?.location ===
                "cloud" && (
                <MenuOption
                  label="Unduh ke Perangkat Lokal"
                  onClick={async () => {
                    const item = downloads.find(
                      (d) => d.id === downloadOptionsId,
                    );
                    if (item) {
                       try {
                         const res = await fetch(`/api/cloud-files/download/${encodeURIComponent(item.filename)}`);
                         if (res.ok) {
                             const blob = await res.blob();
                             const url = URL.createObjectURL(blob);
                             const a = document.createElement("a");
                             a.href = url;
                             a.download = item.filename;
                             document.body.appendChild(a);
                             a.click();
                             document.body.removeChild(a);
                             setTimeout(() => URL.revokeObjectURL(url), 1000);
                         } else {
                             alert("File tidak ditemukan di Cloud.");
                         }
                       } catch(e) { console.error(e); }
                    }
                    setDownloadOptionsId(null);
                  }}
                />
              )}

              <MenuOption
                label="Unduh Ulang (Redownload)"
                onClick={() => {
                  const item = downloads.find((d) => d.id === downloadOptionsId);
                  if (item) {
                     addDownload({
                        filename: item.filename,
                        size: item.size,
                        type: item.type,
                        date: new Date().toLocaleDateString(),
                        location: 'local'
                     });
                  }
                  setDownloadOptionsId(null);
                }}
              />

              <MenuOption
                label="Buka / Putar File"
                onClick={() => {
                  const item = downloads.find((d) => d.id === downloadOptionsId);
                  if (item) {
                    let fileUrl = '';
                    if (item.location === 'cloud') {
                      fileUrl = `/api/cloud-files/download/${encodeURIComponent(item.filename)}`;
                    } else if (item.objectUrl) {
                      fileUrl = item.objectUrl;
                    } else {
                      fileUrl = `https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80`;
                    }

                    const category = item.type || getFileTypeCategory(item.filename);
                    setActivePreviewFile({
                      url: fileUrl,
                      filename: item.filename,
                      type: category
                    });

                    if (category === 'video' || category === 'audio' || category === 'image' || category === 'music') {
                      setActiveOverlay('tool-mediaplayer');
                    } else if (category === 'document' || category === 'pdf' || category === 'code' || category === 'text') {
                      setActiveOverlay('tool-officeviewer');
                    } else if (category === 'archive') {
                      setActiveOverlay('tool-archiveviewer');
                    } else {
                      try {
                        window.open(fileUrl, "_blank", "noopener,noreferrer");
                      } catch (e) {
                        console.error("Gagal membuka window", e);
                        alert("Gagal membuka file! Pop-up diblokir.");
                      }
                    }
                  }
                  setDownloadOptionsId(null);
                }}
              />
              <MenuOption
                label="Ganti Nama (Rename)"
                onClick={() => {
                  setRenameId(downloadOptionsId);
                  setNewName(
                    downloads.find((d) => d.id === downloadOptionsId)
                      ?.filename || "",
                  );
                  setDownloadOptionsId(null);
                }}
              />
              <MenuOption
                label="Kirim / Bagikan"
                onClick={() => {
                  alert("Membuka menu Berbagi... (Simulasi)");
                  setDownloadOptionsId(null);
                }}
              />
              <MenuOption
                label="Salin Tautan File"
                onClick={() => {
                  alert("Tautan disalin ke papan klip! (Simulasi)");
                  setDownloadOptionsId(null);
                }}
              />
              <MenuOption
                label="Hapus File"
                isDestructive
                onClick={() => {
                  removeDownload(downloadOptionsId);
                  setDownloadOptionsId(null);
                }}
              />
              <button
                className="w-full py-4 mt-2 bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 rounded-2xl font-medium"
                onClick={() => setDownloadOptionsId(null)}
              >
                Batal
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rename Dialog Modal */}
      <AnimatePresence>
        {renameId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[70] bg-black/60 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-[320px] p-6 shadow-2xl flex flex-col"
            >
              <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-zinc-200">
                Ganti Nama File
              </h3>
              <input
                type="text"
                className="bg-gray-100 dark:bg-zinc-800 w-full px-4 py-3 rounded-xl border border-transparent focus:border-blue-500 focus:outline-none dark:text-white mb-6"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  className="flex-1 py-3 bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 rounded-xl font-medium"
                  onClick={() => setRenameId(null)}
                >
                  Batal
                </button>
                <button
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium shadow-lg"
                  onClick={() => {
                    if (newName.trim()) {
                      updateDownloadPath(renameId, {
                        filename: newName.trim(),
                      });
                    }
                    setRenameId(null);
                  }}
                >
                  Simpan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Advanced Download Modal */}
      <AnimatePresence>
        {showAdvancedDl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[70] bg-black/60 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-[320px] p-6 shadow-2xl flex flex-col"
            >
              <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-zinc-200">
                Unduhan Lanjutan
              </h3>

              <label className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                URL Unduhan
              </label>
              <input
                type="text"
                className="bg-gray-100 dark:bg-zinc-800 w-full px-4 py-3 rounded-xl border border-transparent focus:border-blue-500 focus:outline-none dark:text-white mb-4 text-sm"
                value={dlUrl}
                onChange={(e) => {
                  setDlUrl(e.target.value);
                  if (!dlFile && e.target.value.includes("/")) {
                    setDlFile(e.target.value.split("/").pop() || "");
                  }
                }}
                placeholder="https://..."
                autoFocus
              />

              <label className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                Nama File
              </label>
              <input
                type="text"
                className="bg-gray-100 dark:bg-zinc-800 w-full px-4 py-3 rounded-xl border border-transparent focus:border-blue-500 focus:outline-none dark:text-white mb-4 text-sm"
                value={dlFile}
                onChange={(e) => setDlFile(e.target.value)}
                placeholder="namafile.zip"
              />

              <label className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                Jumlah Thread (Koneksi Maksimal)
              </label>
              <input
                type="number"
                min="1"
                max="16"
                className="bg-gray-100 dark:bg-zinc-800 w-full px-4 py-3 rounded-xl border border-transparent focus:border-blue-500 focus:outline-none dark:text-white mb-6 text-sm"
                value={dlThreads}
                onChange={(e) => setDlThreads(parseInt(e.target.value) || 1)}
              />

              <div className="flex gap-3">
                <button
                  className="flex-1 py-3 bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 rounded-xl font-medium"
                  onClick={() => setShowAdvancedDl(false)}
                >
                  Batal
                </button>
                <button
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium shadow-lg"
                  onClick={() => {
                    if (dlUrl.trim()) {
                      addDownload({
                        filename: dlFile.trim() || `Download_${Date.now()}`,
                        size: 0, // will be updated by fetch
                        type: "other",
                        date: new Date().toLocaleDateString(),
                        realUrl: dlUrl,
                      });
                    }
                    setShowAdvancedDl(false);
                  }}
                >
                  Unduh
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function MenuOption({
  label,
  onClick,
  isDestructive,
}: {
  label: string;
  onClick: () => void;
  isDestructive?: boolean;
}) {
  return (
    <button
      className={`w-full text-left px-5 py-4 font-medium transition active:bg-gray-100 dark:active:bg-zinc-800 rounded-xl ${isDestructive ? "text-red-500" : "text-gray-800 dark:text-zinc-200"}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function EmptyState({ icon, text }: any) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
      <div className="mb-4 opacity-50">{icon}</div>
      <p className="text-sm">{text}</p>
    </div>
  );
}

function StarEmpty() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>
  );
}

function DlCategory({ icon, label }: any) {
  return (
    <div className="flex flex-col items-center gap-2 p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800">
      {icon}
      <span className="text-[11px] font-medium">{label}</span>
    </div>
  );
}
