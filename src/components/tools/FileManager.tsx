import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useBrowser } from "../../context/BrowserContext";
import {
  Cloud,
  Folder,
  File,
  Download,
  Upload,
  HardDrive,
  Search,
  MoreVertical,
  CheckCircle2,
  X,
  Plus,
  Trash2,
  Share2,
  ExternalLink,
  Edit2,
  Move,
  FolderPlus,
  ArrowDownToLine,
  Eye,
  RefreshCw,
} from "lucide-react";
import { getFileTypeCategory } from "../Overlays";
import { initAuth, googleSignIn, logout as googleLogout } from "../../lib/auth";
import type { User } from "firebase/auth";

interface ActionFile {
  id?: string;
  filename: string;
  name?: string; // GDrive uses name
  size: number | string;
  createdAt?: string;
  createdTime?: string; // GDrive uses createdTime
  type?: string;
  source: "cloud" | "gdrive" | "internal";
  webViewLink?: string;
}

export default function FileManager() {
  const { setActiveOverlay, setActivePreviewFile } = useBrowser();
  const [activeTab, setActiveTab] = useState<"cloud" | "gdrive" | "internal">(
    "cloud"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<ActionFile | null>(null);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);

  // Cloud Files State
  const [cloudFiles, setCloudFiles] = useState<any[]>([]);
  const [cloudLoading, setCloudLoading] = useState(false);

  // GDrive State
  const [gdriveFiles, setGdriveFiles] = useState<any[]>([]);
  const [gdriveLoading, setGdriveLoading] = useState(false);
  const [gdriveToken, setGdriveToken] = useState<string | null>(null);
  const [gdriveUser, setGdriveUser] = useState<User | null>(null);

  // Internal State
  const [internalFiles, setInternalFiles] = useState<any[]>(() => {
    const saved = localStorage.getItem("filemanager_internal_files");
    const files = saved ? JSON.parse(saved) : [];
    console.log("Initializing internal files from localStorage:", files);
    // Add default IDs if missing
    return files.map((f: any) => ({
      ...f,
      id: f.id || Math.random().toString(36).substr(2, 9)
    }));
  });

  useEffect(() => {
    localStorage.setItem(
      "filemanager_internal_files",
      JSON.stringify(internalFiles)
    );
  }, [internalFiles]);

  useEffect(() => {
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
    fetchCloudFiles();
  }, []);

  useEffect(() => {
    if (activeTab === "gdrive" && gdriveToken) {
      fetchGdriveFiles();
    }
  }, [activeTab, gdriveToken]);

  const fetchCloudFiles = async () => {
    setCloudLoading(true);
    try {
      const res = await fetch("/api/cloud-files");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setCloudFiles(data);
      }
    } catch (e) {
      console.error(e);
    }
    setCloudLoading(false);
  };

  const fetchGdriveFiles = async () => {
    if (!gdriveToken) return;
    setGdriveLoading(true);
    try {
      let query = "trashed = false";
      const url = `https://www.googleapis.com/drive/v3/files?fields=files(id,name,mimeType,size,createdTime,webViewLink)&q=${encodeURIComponent(
        query
      )}&pageSize=50`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${gdriveToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setGdriveFiles(data.files || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGdriveLoading(false);
    }
  };

  const handleInternalUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files).map((f) => ({
      id: Math.random().toString(36).substr(2, 9),
      filename: f.name,
      size: f.size,
      createdAt: new Date().toISOString(),
      type: getFileTypeCategory(f.name),
    }));
    setInternalFiles((prev) => [...newFiles, ...prev]);
  };

  const createNewFolder = async () => {
    const folderName = prompt("Masukkan nama folder baru:", "Folder Baru");
    if (!folderName) return;

    if (activeTab === "internal") {
        const newFolder = {
          id: Math.random().toString(36).substr(2, 9),
          filename: folderName,
          size: 0,
          createdAt: new Date().toISOString(),
          type: "folder",
        };
        setInternalFiles((prev) => [newFolder, ...prev]);
    } else if (activeTab === "cloud") {
      try {
        const res = await fetch("/api/cloud-files/create-folder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderName }),
        });
        if (res.ok) {
          alert("Folder berhasil dibuat");
          fetchCloudFiles();
        } else {
          const data = await res.json();
          alert("Gagal membuat folder: " + (data.error || "Unknown error"));
        }
      } catch (e) {
        console.error(e);
        alert("Gagal membuat folder");
      }
    } else {
      alert("Membuat folder di " + activeTab + " belum didukung.");
    }
  };

  const handleRefresh = () => {
    if (activeTab === "cloud") fetchCloudFiles();
    else if (activeTab === "gdrive") fetchGdriveFiles();
    else alert("Penyimpanan internal diperbarui.");
  };

  const formatBytes = (bytes: number | string) => {
    const num = typeof bytes === "string" ? parseInt(bytes) : bytes;
    if (isNaN(num)) return "N/A";
    if (num === 0) return "0 B";
    const k = 1024;
    const i = Math.floor(Math.log(num) / Math.log(k));
    const val = num / Math.pow(k, i);
    const precision = val >= 100 ? 0 : val >= 10 ? 1 : 2;
    return val.toFixed(precision) + " " + ["B", "KB", "MB", "GB", "TB"][i];
  };

  const handleFileAction = (file: ActionFile) => {
    setSelectedFile(file);
    setIsActionSheetOpen(true);
  };

  const downloadToInternal = (file: ActionFile) => {
    const newFile = {
      id: Math.random().toString(36).substr(2, 9),
      filename: file.filename || file.name || "Untitled",
      size: typeof file.size === "string" ? parseInt(file.size) || 0 : file.size,
      createdAt: new Date().toISOString(),
      type: getFileTypeCategory(file.filename || file.name || ""),
    };
    setInternalFiles((prev) => [newFile, ...prev]);
    alert("File berhasil didownload ke Internal Storage");
    setIsActionSheetOpen(false);
  };

  const deleteFile = async (file: ActionFile) => {
    console.log("Attempting to delete:", file);
    if (!confirm(`Hapus ${file.filename || file.name}?`)) return;

    if (file.source === "internal") {
      console.log("Deleting internal file:", file);
      setInternalFiles((prev) => {
        const updated = prev.filter((f) => String(f.id) !== String(file.id));
        console.log("Internal files after deletion:", updated);
        return updated;
      });
    } else if (file.source === "cloud") {
      try {
        const res = await fetch("/api/cloud-files/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.filename }),
        });
        if (res.ok) {
          console.log("Deleted successfully from cloud");
          fetchCloudFiles();
        } else {
          console.error("Failed to delete from cloud:", await res.text());
          alert("Gagal menghapus file dari cloud.");
        }
      } catch (e) {
        console.error("Delete error:", e);
        alert("Gagal menghapus file dari cloud.");
      }
    } else if (file.source === "gdrive") {
      // Not implementing GDrive deletion for now to keep scope focused
      alert("Hapus file GDrive belum didukung.");
      return;
    }
    setIsActionSheetOpen(false);
  };

  const renameFile = async (file: ActionFile) => {
    console.log("Attempting to rename:", file);
    const oldName = file.filename || file.name;
    const newName = prompt("Nama baru:", oldName);
    if (!newName || newName === oldName) return;

    if (file.source === "internal") {
      console.log("Renaming internal file from", oldName, "to", newName);
      setInternalFiles((prev) =>
        prev.map((f) => (String(f.id) === String(file.id) ? { ...f, filename: newName } : f))
      );
    } else if (file.source === "cloud") {
      try {
        const res = await fetch("/api/cloud-files/rename", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ oldName, newName }),
        });
        if (res.ok) {
          console.log("Renamed successfully in cloud");
          fetchCloudFiles();
        } else {
          console.error("Failed to rename in cloud:", await res.text());
          alert("Gagal merename file di cloud.");
        }
      } catch (e) {
        console.error("Rename error:", e);
        alert("Gagal merename file di cloud.");
      }
    } else if (file.source === "gdrive") {
      alert("Rename file GDrive belum didukung.");
      return;
    }
    setIsActionSheetOpen(false);
  };

  const openFile = (file: ActionFile) => {
    if (file.source === "gdrive" && file.webViewLink) {
      window.open(file.webViewLink, "_blank");
    } else {
      const fname = file.filename || file.name || "";
      const fileUrl = file.source === "cloud" 
        ? `/api/cloud-files/download/${encodeURIComponent(fname)}`
        : "#";
      const category = getFileTypeCategory(fname);
      setActivePreviewFile({ url: fileUrl, filename: fname, type: category });
      if (category === "video" || category === "audio" || category === "image") {
        setActiveOverlay("tool-mediaplayer");
      } else {
        setActiveOverlay("tool-officeviewer");
      }
    }
    setIsActionSheetOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 overflow-hidden relative">
      {/* Header with Tabs */}
      <div className="p-4 border-b border-gray-100 dark:border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Folder className="w-5 h-5 text-blue-500" />
            File Manager
          </h3>
          <div className="flex gap-2">
            <button 
              onClick={handleRefresh}
              className="p-2 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 rounded-xl hover:bg-gray-200 transition"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button 
              onClick={createNewFolder}
              className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl hover:bg-blue-100 transition"
            >
              <FolderPlus className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex bg-gray-100 dark:bg-zinc-800 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab("cloud")}
            className={`flex-1 py-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 ${
              activeTab === "cloud"
                ? "bg-white dark:bg-zinc-900 text-blue-600 shadow-sm"
                : "text-gray-500"
            }`}
          >
            <Cloud className="w-4 h-4" />
            Cloud
          </button>
          <button
            onClick={() => setActiveTab("gdrive")}
            className={`flex-1 py-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 ${
              activeTab === "gdrive"
                ? "bg-white dark:bg-zinc-900 text-blue-600 shadow-sm"
                : "text-gray-500"
            }`}
          >
            <svg viewBox="0 0 87.3 78" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
              <path fill="#FFC107" d="M26.1 76h35l26.2-45H52.4z" />
              <path fill="#1976D2" d="M61 76H26.1L0 31l17.4-30z" />
              <path fill="#4CAF50" d="M0 31l26.2 45h35L35 31z" />
            </svg>
            GDrive
          </button>
          <button
            onClick={() => setActiveTab("internal")}
            className={`flex-1 py-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 ${
              activeTab === "internal"
                ? "bg-white dark:bg-zinc-900 text-blue-600 shadow-sm"
                : "text-gray-500"
            }`}
          >
            <HardDrive className="w-4 h-4" />
            Internal
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari file..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-700/50 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-4">
        {activeTab === "cloud" && (
          <div className="space-y-3">
            {cloudLoading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : cloudFiles.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">Tidak ada file di Cloud.</div>
            ) : (
              cloudFiles
                .filter((f) => f.filename.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((file) => (
                  <FileItem
                    key={file.filename}
                    name={file.filename}
                    size={formatBytes(file.size)}
                    date={new Date(file.createdAt).toLocaleDateString()}
                    onMore={() => handleFileAction({ ...file, source: "cloud" })}
                    onOpen={() => openFile({ ...file, source: "cloud" })}
                  />
                ))
            )}
          </div>
        )}

        {activeTab === "gdrive" && (
          <div className="space-y-3">
            {!gdriveToken ? (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl text-center border border-blue-100 dark:border-blue-900/30">
                <svg viewBox="0 0 87.3 78" className="w-12 h-12 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#FFC107" d="M26.1 76h35l26.2-45H52.4z" />
                  <path fill="#1976D2" d="M61 76H26.1L0 31l17.4-30z" />
                  <path fill="#4CAF50" d="M0 31l26.2 45h35L35 31z" />
                </svg>
                <h4 className="font-bold mb-2">Google Drive Terdeteksi</h4>
                <p className="text-xs text-gray-500 mb-4 px-4">Hubungkan akun Google Anda untuk mengelola file drive Anda di sini.</p>
                <button
                  onClick={async () => {
                    const result = await googleSignIn();
                    if (result) {
                      setGdriveToken(result.accessToken);
                      setGdriveUser(result.user);
                    }
                  }}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20"
                >
                  Login ke Google Drive
                </button>
              </div>
            ) : gdriveLoading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              gdriveFiles
                .filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((file) => (
                  <FileItem
                    key={file.id}
                    name={file.name}
                    size={formatBytes(file.size)}
                    date={new Date(file.createdTime).toLocaleDateString()}
                    onMore={() => handleFileAction({ ...file, source: "gdrive" })}
                    onOpen={() => openFile({ ...file, source: "gdrive" })}
                  />
                ))
            )}
          </div>
        )}

        {activeTab === "internal" && (
          <div className="space-y-3">
            <label className="w-full bg-blue-50 dark:bg-blue-900/20 border border-dashed border-blue-300 dark:border-blue-900/50 p-6 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-blue-100 transition mb-4">
              <Plus className="w-8 h-8 text-blue-500 mb-2" />
              <span className="text-sm font-bold text-blue-600">Tambah File Internal</span>
              <span className="text-[10px] text-blue-400 mt-1">Buka dari memori perangkat</span>
              <input type="file" multiple className="hidden" onChange={handleInternalUpload} />
            </label>

            {internalFiles.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-xs italic">Belum ada file internal yang ditambahkan.</div>
            ) : (
              internalFiles
                .filter((f) => f.filename.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((file) => (
                  <FileItem
                    key={file.id}
                    name={file.filename}
                    size={formatBytes(file.size)}
                    date={new Date(file.createdAt).toLocaleDateString()}
                    onMore={() => handleFileAction({ ...file, source: "internal" })}
                    onOpen={() => openFile({ ...file, source: "internal" })}
                  />
                ))
            )}
          </div>
        )}
      </div>

      {/* Action Sheet */}
      <AnimatePresence>
        {isActionSheetOpen && selectedFile && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsActionSheetOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="absolute bottom-0 inset-x-0 bg-white dark:bg-zinc-900 rounded-t-[32px] p-6 z-[110] shadow-2xl border-t border-gray-100 dark:border-zinc-800"
            >
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-zinc-800 rounded-full mx-auto mb-6" />
              
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100 dark:border-zinc-800">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center shrink-0">
                  <File className="w-8 h-8 text-blue-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-lg truncate text-blue-600">
                    {selectedFile.filename || selectedFile.name}
                  </h4>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-blue-900 font-black">{formatBytes(selectedFile.size)}</p>
                    <p className="text-sm text-green-600 font-bold uppercase">
                      {(selectedFile.filename || selectedFile.name || "").split(".").pop()}
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsActionSheetOpen(false)} className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-full">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-4">
                <ActionButton icon={<Eye />} label="Buka" onClick={() => openFile(selectedFile)} />
                <ActionButton icon={<Edit2 />} label="Rename" onClick={() => renameFile(selectedFile)} />
                <ActionButton icon={<Share2 />} label="Bagi" onClick={async () => {
                  try {
                    if (navigator.share) {
                      await navigator.share({ title: selectedFile.filename || selectedFile.name, url: window.location.href });
                    } else {
                      alert("Sharing tidak didukung di browser ini");
                    }
                  } catch (err: any) {
                    if (err.name !== 'AbortError') {
                      console.error("Error sharing:", err);
                    } else {
                        // User likely canceled, ignore
                    }
                  }
                  setIsActionSheetOpen(false);
                }} />
                <ActionButton icon={<Move />} label="Pindah" onClick={() => {
                  const target = prompt("Pindah ke mana? (cloud/gdrive/internal)");
                  if (target && ["cloud", "gdrive", "internal"].includes(target)) {
                    alert(`Fitur pindah ke ${target} akan segera hadir.`);
                  } else {
                    alert("Destinasi tidak valid");
                  }
                  setIsActionSheetOpen(false); 
                }} />
                
                <ActionButton icon={<ExternalLink />} label="Open As" onClick={() => {
                  const app = prompt(`Buka ${selectedFile.filename || selectedFile.name} menggunakan aplikasi apa?`);
                  if (app) {
                    alert(`Membuka dengan ${app}...`);
                  }
                  setIsActionSheetOpen(false); 
                }} />
                
                {(selectedFile.source === "cloud" || selectedFile.source === "gdrive") && (
                  <ActionButton 
                    icon={<ArrowDownToLine />} 
                    label="Download" 
                    onClick={() => downloadToInternal(selectedFile)} 
                    highlight
                  />
                )}
                
                <ActionButton icon={<Trash2 />} label="Hapus" onClick={() => deleteFile(selectedFile)} color="text-red-500" />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActionButton({ icon, label, onClick, highlight, color }: { icon: React.ReactNode, label: string, onClick: () => void, highlight?: boolean, color?: string }) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-2 active:scale-90 transition"
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
        highlight ? "bg-blue-600 text-white" : "bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400"
      }`}>
        <div className="w-5 h-5 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <span className={`text-[10px] font-bold text-center truncate w-full ${color || "text-gray-500 dark:text-zinc-500"}`}>
        {label}
      </span>
    </button>
  );
}

function FileItem({
  name,
  size,
  date,
  onOpen,
  onMore,
}: {
  name: string;
  size: string;
  date: string;
  onOpen?: () => void;
  onMore?: () => void;
}) {
  const parts = name.split(".");
  const extension = parts.length > 1 ? `.${parts.pop()}` : "";
  const baseName = parts.join(".");

  return (
    <div className="bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-700/50 p-3 rounded-2xl flex items-center gap-3 active:scale-[0.98] transition">
      <div className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-xl flex items-center justify-center shrink-0 shadow-sm" onClick={onOpen}>
        <File className="w-6 h-6 text-gray-400" />
      </div>
      <div className="min-w-0 flex-1" onClick={onOpen}>
        <h4 className="text-sm font-bold truncate">
          <span className="text-blue-600">{baseName}</span>
        </h4>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-blue-900 font-black">{size}</span>
          {extension && (
            <span className="text-[10px] text-green-600 font-bold uppercase">{extension.replace(".", "")}</span>
          )}
          <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-zinc-700"></span>
          <span className="text-[10px] text-gray-400 dark:text-zinc-500">{date}</span>
        </div>
      </div>
      <button onClick={onMore} className="p-2 text-gray-400 hover:bg-white dark:hover:bg-zinc-800 rounded-full transition">
        <MoreVertical className="w-5 h-5" />
      </button>
    </div>
  );
}

