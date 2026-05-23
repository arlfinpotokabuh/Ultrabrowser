import React, { useState, useEffect, useRef } from 'react';
import { Shield, ShieldAlert, Lock, Search, X, Copy, Check, Star, RefreshCw, AlertTriangle, Camera, FileText } from 'lucide-react';
import { useBrowser } from '../context/BrowserContext';

export default function TopBar({ inputUrl, setInputUrl, onNavigate }: any) {
    const { vpnActive, bookmarks, addBookmark, removeBookmark, currentUrl, setCurrentUrl, triggerRefresh, videoDetected, setTriggerVideoDownload, blockedPopups, clearBlockedPopups, isCapturing, setIsCapturing } = useBrowser();
    const [copied, setCopied] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleCopy = () => {
        if (!inputUrl) return;
        navigator.clipboard.writeText(inputUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleClear = () => {
        setInputUrl('');
        inputRef.current?.focus();
    };

    const isBookmarked = currentUrl ? bookmarks.some(b => b.url === currentUrl) : false;

    const toggleBookmark = () => {
        if (!currentUrl) return;
        if (isBookmarked) {
            removeBookmark(currentUrl);
        } else {
            addBookmark(currentUrl);
        }
    };

    const isReaderMode = currentUrl?.includes('/api/reader?url=');

    const toggleReaderMode = () => {
        if (!currentUrl) return;
        if (isReaderMode) {
            const originalUrl = decodeURIComponent(currentUrl.split('url=')[1]);
            setCurrentUrl(originalUrl);
            setInputUrl(originalUrl);
        } else {
            const baseUrl = window.location.origin;
            const readerUrl = `${baseUrl}/api/reader?url=${encodeURIComponent(currentUrl)}`;
            setCurrentUrl(readerUrl);
            setInputUrl(readerUrl);
        }
    };

    return (
        <div id="browser-topbar" className="w-full bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-3 py-2 flex flex-col z-10 shrink-0">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold transition-colors duration-300 ${vpnActive ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>
                    {vpnActive ? <Shield className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                    {vpnActive ? 'Protected (V2Ray)' : 'Unprotected'}
                </div>
                <div className="flex items-center gap-2">
                    {videoDetected && (
                         <button 
                             type="button"
                             onClick={() => setTriggerVideoDownload(true)}
                             className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-sm shadow-orange-500/20 active:scale-95 transition-all animate-pulse"
                             title="Video Terdeteksi! Ketuk untuk mengunduh"
                         >
                             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                                 <path d="M23 7a2 2 0 0 0-2.45-1.45L16 7V5a2 2 0 0 0-2-2H2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2l4.55 1.45A2 2 0 0 0 23 17V7Z" />
                             </svg>
                             <span>Ambil Video</span>
                         </button>
                    )}
                    {blockedPopups.length > 0 && (
                         <button 
                             type="button"
                             onClick={clearBlockedPopups}
                             className="flex items-center gap-1 bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 font-extrabold px-2.5 py-1 rounded-full text-[10px] hover:bg-red-100 dark:hover:bg-red-900/45 transition duration-200"
                             title="Ketuk untuk membersihkan riwayat popup"
                         >
                             <AlertTriangle className="w-3 h-3 text-red-500 animate-pulse shrink-0" />
                             <span>{blockedPopups.length} Blok</span>
                         </button>
                    )}
                    {currentUrl && (
                         <div className="flex items-center gap-1 bg-gray-100 dark:bg-zinc-800 rounded-lg p-0.5 border border-gray-200/50 dark:border-zinc-700/50">
                             <button 
                                 type="button"
                                 onClick={toggleReaderMode}
                                 className={`p-1 px-2 flex items-center gap-1 font-bold transition-colors rounded-md shrink-0 cursor-pointer ${isReaderMode ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-zinc-700'}`}
                                 title="Reader Mode"
                             >
                                 <FileText className="w-3.5 h-3.5" />
                                 <span>{isReaderMode ? 'Tutup Reader' : 'Reader'}</span>
                             </button>
                             <div className="w-px h-3.5 bg-gray-200 dark:bg-zinc-700 self-center" />
                             <button 
                                 type="button"
                                 onClick={() => setIsCapturing(true)}
                                 className="p-1 px-2 flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-bold transition-colors rounded-md hover:bg-white dark:hover:bg-zinc-700 shrink-0 cursor-pointer"
                                 title="Tangkapan Layar"
                             >
                                 <Camera className="w-3.5 h-3.5" />
                                 <span>Screenshot</span>
                             </button>
                             <div className="w-px h-3.5 bg-gray-200 dark:bg-zinc-700 self-center" />
                             <button 
                                 type="button"
                                 onClick={triggerRefresh}
                                 className="p-1 px-2 flex items-center gap-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors rounded-md hover:bg-white dark:hover:bg-zinc-700 shrink-0 cursor-pointer"
                             >
                                 <RefreshCw className="w-3.5 h-3.5" />
                                 <span>Muat Ulang</span>
                             </button>
                         </div>
                    )}
                </div>
            </div>
            <form onSubmit={onNavigate} className="flex relative items-center gap-2">
                <div className="relative flex-1 flex items-center">
                    <div className="absolute left-3 text-gray-400">
                        {vpnActive ? <Lock className="w-4 h-4 text-green-500" /> : <Search className="w-4 h-4" />}
                    </div>
                    <input 
                        ref={inputRef}
                        type="text" 
                        value={inputUrl}
                        onChange={(e) => setInputUrl(e.target.value)}
                        className="w-full bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white rounded-full py-2 pl-9 pr-[120px] text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all border border-transparent dark:border-zinc-700 truncate"
                        placeholder="Cari atau masukkan URL web..."
                    />
                    
                    {inputUrl && (
                        <div className="absolute right-2 flex items-center gap-1">
                            <button 
                                type="button" 
                                onClick={toggleBookmark}
                                className={`p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors ${isBookmarked ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                title={isBookmarked ? "Hapus Markah" : "Tambah Markah"}
                            >
                                <Star className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
                            </button>
                            <button 
                                type="button" 
                                onClick={handleCopy}
                                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                                title="Salin URL"
                            >
                                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <button 
                                type="button" 
                                onClick={handleClear}
                                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                                title="Hapus / Beranda"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>

                {inputUrl && (
                    <button 
                        type="submit" 
                        className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-full shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-1 shrink-0"
                        title="Buka atau Cari"
                    >
                        <span>Buka</span>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                            <path d="M5 12h14" />
                            <path d="m12 5 7 7-7 7" />
                        </svg>
                    </button>
                )}
            </form>
        </div>
    );
}
