import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Clock, Download, Cloud, RefreshCw, Moon, EyeOff, ShieldCheck, Settings, Share, Languages, Search, Save, Network, Camera, Terminal, Info } from 'lucide-react';
import { useBrowser } from '../context/BrowserContext';

function VideoSnifferIcon({ className }: { className?: string }) {
    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.25" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={className}
        >
            <path d="M20 15v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4" />
            <path d="M12 4v12" />
            <path d="M7.5 11.5 12 16l4.5-4.5" />
        </svg>
    );
}

export default function MainMenu() {
    const { isMenuOpen, setIsMenuOpen, isDark, setIsDark, textOnly, setTextOnly, setActiveScreen, currentUrl, setCurrentUrl, activeOverlay, setActiveOverlay, setIncognito, incognito, adBlock, vpnActive, triggerRefresh, addBookmark, videoDetected, setVideoDetected, setTriggerVideoDownload, isCapturing, setIsCapturing } = useBrowser();

    return (
        <AnimatePresence>
            {isMenuOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsMenuOpen(false)}
                        className="absolute inset-0 bg-black/60 z-30"
                    />

                    {/* Menu Panel */}
                    <motion.div 
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="absolute bottom-14 left-0 right-0 bg-[#222222] text-zinc-300 rounded-t-2xl z-40 max-h-[80vh] overflow-y-auto no-scrollbar shadow-2xl"
                    >
                        {/* Top Action Row */}
                        <div className="grid grid-cols-5 gap-2 px-4 py-6 border-b border-zinc-700/50">
                            <ActionBtn icon={<Star />} label="Bookmark" onClick={() => { setActiveOverlay('bookmarks'); setIsMenuOpen(false); }} />
                            <ActionBtn icon={<Clock />} label="Riwayat" onClick={() => { setActiveOverlay('history'); setIsMenuOpen(false); }} />
                            <ActionBtn icon={<Download />} label="Unduhan" onClick={() => { setActiveOverlay('downloads'); setIsMenuOpen(false); }} />
                            <ActionBtn icon={<Cloud />} label="Cloud Drive" onClick={() => { setActiveOverlay('uc-drive'); setIsMenuOpen(false); }} />
                            <ActionBtn 
                                icon={<Network />} 
                                label="VPN" 
                                onClick={() => { setActiveScreen('vpn'); setIsMenuOpen(false); }}
                            />
                        </div>

                        {/* List Actions */}
                        <div className="p-2 space-y-1">
                            <ListItem icon={<RefreshCw />} label="Refresh" onClick={() => {
                                triggerRefresh();
                                setIsMenuOpen(false);
                            }} />
                            <ListItem icon={<Camera />} label="Tangkapan Layar (Screenshot)" onClick={() => {
                                setIsCapturing(true);
                                setIsMenuOpen(false);
                            }} />
                            <ListItem icon={<Star />} label="Tambahkan ke Bookmark" onClick={() => { 
                                if (currentUrl) {
                                    addBookmark(currentUrl);
                                    alert('Situs berhasil ditambahkan ke Bookmark'); 
                                }
                                setIsMenuOpen(false); 
                            }} />
                            <ListItem 
                                icon={<Moon />} 
                                label="Mode Malam" 
                                hasToggle
                                toggleState={isDark}
                                onToggle={() => setIsDark(!isDark)}
                            />
                            <ListItem icon={<EyeOff />} label="Mode Privasi (Incognito)" hasToggle toggleState={incognito} onToggle={() => setIncognito(!incognito)} />
                            <ListItem 
                                icon={<Search className="uppercase" />} 
                                label="Tanpa Gambar (Text-Only)" 
                                hasToggle 
                                toggleState={textOnly}
                                onToggle={() => setTextOnly(!textOnly)}
                            />
                            <ListItem icon={<ShieldCheck />} label="Keamanan dan penghematan data" onClick={() => { alert(`Info Keamanan:\n\nAd-Blocker: ${adBlock ? 'Aktif' : 'Nonaktif'}\nKoneksi VPN: ${vpnActive ? 'Terenkripsi (Aktif)' : 'Standar (Nonaktif)'}\nCookie Pelacak: Diblokir\nEnkripsi: TLS 1.3 Aktif`); setIsMenuOpen(false); }} />
                            <ListItem 
                                icon={<Terminal className="text-orange-500" />} 
                                label="Buka F12 Web Log (Console)" 
                                onClick={() => {
                                    setIsMenuOpen(false);
                                    window.dispatchEvent(new CustomEvent('open-multi-tool-debugger'));
                                }} 
                            />
                            <ListItem 
                                icon={<Info className="text-blue-500" />} 
                                label="Buka Halaman Info (Diagnostic)" 
                                onClick={() => {
                                    setIsMenuOpen(false);
                                    window.dispatchEvent(new CustomEvent('trigger-open-element-info'));
                                }} 
                            />
                            <ListItem 
                                icon={<Settings />} 
                                label="Pengaturan" 
                                onClick={() => { setActiveScreen('settings'); setIsMenuOpen(false); }}
                            />
                            <ListItem icon={<Share />} label="Bagikan" onClick={() => { 
                                if (currentUrl && navigator.share) {
                                    navigator.share({ title: 'Shared via PRO Browser', url: currentUrl }).catch(console.error);
                                } else {
                                    if (currentUrl) {
                                       navigator.clipboard.writeText(currentUrl);
                                       alert('Tautan Tersalin: ' + currentUrl); 
                                    } else {
                                       alert('Tidak ada halaman untuk dibagikan');
                                    }
                                }
                                setIsMenuOpen(false); 
                            }} />
                        </div>

                        <div className="p-2 border-t border-zinc-700/50 space-y-1">
                            <ListItem icon={<Languages />} label="Terjemahan Halaman" hasToggle toggleState={false} onToggle={() => {
                                if (currentUrl) {
                                  setCurrentUrl(`https://translate.google.com/translate?sl=auto&u=${encodeURIComponent(currentUrl)}`);
                                }
                                setIsMenuOpen(false);
                            }} />
                            <ListItem icon={<Save />} label="Simpan Halaman Sebagai PDF" onClick={() => {
                                if (currentUrl) {
                                    try {
                                        window.open(`https://api.html2pdf.app/v1/generate?url=${encodeURIComponent(currentUrl)}&apiKey=`, '_blank', 'noopener,noreferrer');
                                    } catch(e) {
                                        alert("Gagal membuka window! Pop-up diblokir oleh browser.");
                                    }
                                }
                                setIsMenuOpen(false);
                            }} />
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

function ActionBtn({ icon, label, onClick }: any) {
    return (
        <button onClick={onClick} className="flex flex-col items-center gap-2 group">
            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center transition-colors group-hover:bg-zinc-700 text-zinc-400">
                {React.cloneElement(icon, { className: "w-5 h-5" })}
            </div>
            <span className="text-[10px] text-zinc-400">{label}</span>
        </button>
    );
}

function ListItem({ icon, label, hasToggle, toggleState, onToggle, onClick }: any) {
    return (
        <button onClick={onClick} className="w-full flex items-center px-4 py-3 rounded-xl hover:bg-zinc-800 transition">
            <div className="w-8 h-8 mr-3 flex items-center justify-center text-zinc-400 shrink-0">
                {React.cloneElement(icon, { className: "w-5 h-5" })}
            </div>
            <span className="flex-1 text-left text-[15px] font-medium text-zinc-200">{label}</span>
            {hasToggle && (
                <div onClick={(e) => { e.stopPropagation(); onToggle && onToggle(); }} className={`w-12 h-6 rounded-full p-1 transition-colors flex items-center cursor-pointer ${toggleState ? 'bg-blue-600' : 'bg-zinc-600'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${toggleState ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
            )}
        </button>
    );
}
