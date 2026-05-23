import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Image as ImageIcon, Search } from 'lucide-react';
import { useBrowser, SettingsMap } from '../context/BrowserContext';

export default function SettingsScreen() {
    const { setActiveScreen, adBlock, setAdBlock, appSettings, updateSetting, isDark, setIsDark, clearHistory } = useBrowser();
    const [page, setPage] = useState('main'); // main, ads, browsing, downloads, notifications, search, social, theme, language, cleardata, account, about
    const [clearHistoryToggle, setClearHistoryToggle] = useState(true);
    const [clearCacheToggle, setClearCacheToggle] = useState(true);
    const [clearPasswordsToggle, setClearPasswordsToggle] = useState(false);

    const renderHeader = (title: string, onBack: () => void) => (
        <div className="h-14 flex items-center px-4 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 shrink-0 shadow-sm z-10 sticky top-0">
            <button onClick={onBack} className="p-2 -ml-2 text-gray-600 dark:text-zinc-300 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition">
                <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="ml-2 font-medium text-lg">{title}</h1>
        </div>
    );

    const [installPrompt, setInstallPrompt] = useState<any>(null);

    React.useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (installPrompt) {
            installPrompt.prompt();
            const { outcome } = await installPrompt.userChoice;
            if (outcome === 'accepted') {
                setInstallPrompt(null);
            }
        } else {
            alert('Buka web ini (https://ais-pre-bwxnnq2kixbywozdpqlimx-915032687877.asia-southeast1.run.app) di Google Chrome Android, lalu pilih "Tambahkan ke Layar Utama" (Add to Home screen) dari menu opsi Chrome ⁝ untuk memasang menjadi Aplikasi Android.');
        }
    };

    if (page === 'ads') {
        return (
            <div className="flex flex-col h-full bg-gray-100 dark:bg-[#121212] overflow-y-auto">
                {renderHeader('Pengaturan Iklan', () => setPage('main'))}
                <SettingsGroup>
                    <SettingsItem label="Ad-Blocker" hasToggle toggleState={adBlock} onToggle={() => setAdBlock(!adBlock)} />
                    <SettingsItem label="Ad-Blocker yang kuat" subtext="Blok Iklan yang Nakal" hasToggle toggleState={appSettings.adBlockStrong} onToggle={() => updateSetting('adBlockStrong', !appSettings.adBlockStrong)} disabled={!adBlock} />
                    <SettingsItem label="Iklan yang Berterima" subtext="Iklan yang dapat diterima adalah iklan yang tidak mengganggu sekaligus memenuhi standar iklan yang ketat." hasToggle toggleState={appSettings.acceptableAds} onToggle={() => updateSetting('acceptableAds', !appSettings.acceptableAds)} disabled={!adBlock} />
                </SettingsGroup>
            </div>
        );
    }

    if (page === 'browsing') {
        const cycleSetting = (key: keyof SettingsMap, options: any[]) => {
            const idx = options.indexOf(appSettings[key]);
            updateSetting(key, options[(idx + 1) % options.length] || options[0]);
        };

        return (
            <div className="flex flex-col h-full bg-gray-100 dark:bg-[#121212] overflow-y-auto">
                {renderHeader('Pengaturan Browsing', () => setPage('main'))}
                <SettingsGroup>
                    <SettingsItem label="Font & Tampilan" value={appSettings.fontSize} isLink onClick={() => cycleSetting('fontSize', ['80%', '100% (Standard)', '120%', '150%'])} />
                    <SettingsItem label="Preloading Halaman" value={appSettings.pagePreloading} isLink onClick={() => cycleSetting('pagePreloading', ['Semua halaman', 'Hanya Wi-Fi', 'Matikan'])} />
                    <SettingsItem label="Tampilan Tab" value={appSettings.tabView} isLink onClick={() => cycleSetting('tabView', ['Tampilan Kartu', 'Tampilan Daftar'])} />
                    <SettingsItem label="Kualitas Gambar" value={appSettings.imageQuality} isLink onClick={() => cycleSetting('imageQuality', ['Rendah', 'Sedang', 'Tinggi'])} />
                    <SettingsItem label="Usap layar kedepan&Belakang" hasToggle toggleState={appSettings.swipeToNavigate} onToggle={() => updateSetting('swipeToNavigate', !appSettings.swipeToNavigate)} />
                    <SettingsItem label="Membuka kembali Tab di Awal" hasToggle toggleState={appSettings.reopenTabsAtStartup} onToggle={() => updateSetting('reopenTabsAtStartup', !appSettings.reopenTabsAtStartup)} />
                    <SettingsItem label="Form dan kata sandi" value={appSettings.formPasswords} isLink onClick={() => cycleSetting('formPasswords', ['Otomatis Isi', 'Selalu Bertanya', 'Jangan Pernah'])} />
                    <SettingsItem label="Pilihan Scroll" value={appSettings.scrollOptions} isLink onClick={() => cycleSetting('scrollOptions', ['Standard', 'Cepat', 'Mulus'])} />
                    <SettingsItem label="Kecerahan" value={appSettings.brightness} isLink onClick={() => cycleSetting('brightness', ['Redup', 'Normal', 'Terang Maksimal'])} />
                    <SettingsItem label="Blokir Popup" hasToggle toggleState={appSettings.blockPopups} onToggle={() => updateSetting('blockPopups', !appSettings.blockPopups)} />
                    <SettingsItem label="Buka Link di Browser External" subtext="Buka link di luar aplikasi ini" hasToggle toggleState={appSettings.openExternalLinks} onToggle={() => updateSetting('openExternalLinks', !appSettings.openExternalLinks)} />
                    <SettingsItem label="Animasi" hasToggle toggleState={appSettings.animations} onToggle={() => updateSetting('animations', !appSettings.animations)} />
                    <SettingsItem label="Tampilkan Status Bar" hasToggle toggleState={appSettings.showStatusBar} onToggle={() => updateSetting('showStatusBar', !appSettings.showStatusBar)} />
                </SettingsGroup>
            </div>
        );
    }

    if (page === 'downloads') {
        const cycleSetting = (key: keyof SettingsMap, options: any[]) => {
            const idx = options.indexOf(appSettings[key]);
            updateSetting(key, options[(idx + 1) % options.length] || options[0]);
        };
        return (
            <div className="flex flex-col h-full bg-gray-100 dark:bg-[#121212] overflow-y-auto">
                {renderHeader('Pengaturan Unduhan', () => setPage('main'))}
                <SettingsGroup>
                    <SettingsItem label="Lokasi default" value={appSettings.downloadLocation} isLink onClick={() => cycleSetting('downloadLocation', ['/sdcard/Downloads/', '/sdcard/UCDownloads/', '/storage/extSdCard/'])} />
                    <SettingsItem label="Unduhan maksimal" value={appSettings.maxDownloads.toString()} isLink onClick={() => cycleSetting('maxDownloads', [1, 3, 6])} />
                    <SettingsItem label="Tugas baru" value={appSettings.newDownloadTask} isLink onClick={() => cycleSetting('newDownloadTask', ['Selalu bertanya', 'Otomatis unduh', 'Tanya saat di seluler'])} />
                    <SettingsItem label="Terhubung kembali otomatis" hasToggle toggleState={appSettings.autoReconnect} onToggle={() => updateSetting('autoReconnect', !appSettings.autoReconnect)} />
                    <SettingsItem label="Notifikasi" subtext="Lampu Denyut dan Suara Notifikasi" hasToggle toggleState={appSettings.downloadNotifications} onToggle={() => updateSetting('downloadNotifications', !appSettings.downloadNotifications)} />
                </SettingsGroup>
            </div>
        );
    }

    if (page === 'notifications') {
        return (
            <div className="flex flex-col h-full bg-gray-100 dark:bg-[#121212] overflow-y-auto">
                {renderHeader('Pengaturan Notifikasi', () => setPage('main'))}
                <SettingsGroup>
                    <SettingsItem label="Pemberitahuan Push" subtext="Bar Sistem Notification" hasToggle toggleState={appSettings.pushNotifications} onToggle={() => updateSetting('pushNotifications', !appSettings.pushNotifications)} />
                    <SettingsItem label="Notifikasi Berita Terbaru" subtext="Dapatkan pengingat saat berselancar" hasToggle toggleState={appSettings.newsNotifications} onToggle={() => updateSetting('newsNotifications', !appSettings.newsNotifications)} />
                    <SettingsItem label="Pemberitahuan Situs" hasToggle toggleState={appSettings.siteNotifications} onToggle={() => updateSetting('siteNotifications', !appSettings.siteNotifications)} />
                    <SettingsItem label="Akses Cepat" hasToggle toggleState={appSettings.quickAccess} onToggle={() => updateSetting('quickAccess', !appSettings.quickAccess)} />
                </SettingsGroup>
            </div>
        );
    }

    if (page === 'search') {
        const cycleSetting = (key: keyof SettingsMap, options: any[]) => {
            const idx = options.indexOf(appSettings[key]);
            updateSetting(key, options[(idx + 1) % options.length] || options[0]);
        };
        return (
            <div className="flex flex-col h-full bg-gray-100 dark:bg-[#121212] overflow-y-auto">
                {renderHeader('Pengaturan Pencarian', () => setPage('main'))}
                <SettingsGroup>
                    <SettingsItem label="Mesin default halaman utama" value={appSettings.defaultSearchEngine} isLink onClick={() => cycleSetting('defaultSearchEngine', ['Bing', 'Google', 'Startpage (Google)', 'DuckDuckGo', 'DuckDuckGo Lite', 'Yahoo'])} />
                    <SettingsItem label="Mesin pencari agregat" value={appSettings.aggregateSearchEngine} isLink onClick={() => cycleSetting('aggregateSearchEngine', ['Aktif', 'Nonaktif'])} />
                </SettingsGroup>
            </div>
        );
    }

    if (page === 'social') {
        return (
            <div className="flex flex-col h-full bg-gray-100 dark:bg-[#121212] overflow-y-auto">
                {renderHeader('Pengaturan download media sosial', () => setPage('main'))}
                <SettingsGroup>
                    <SettingsItem label="Identifikasi otomatis papan klip" hasToggle toggleState={appSettings.autoClipboard} onToggle={() => updateSetting('autoClipboard', !appSettings.autoClipboard)} />
                    <SettingsItem label="Identifikasi otomatis link website" hasToggle toggleState={appSettings.autoLink} onToggle={() => updateSetting('autoLink', !appSettings.autoLink)} />
                </SettingsGroup>
            </div>
        );
    }

    if (page === 'theme') {
        return (
            <div className="flex flex-col h-full bg-white dark:bg-[#121212] overflow-y-auto">
                {renderHeader('Tema', () => setPage('main'))}
                <div className="p-4 grid grid-cols-2 gap-4">
                    <ThemeCard bg="bg-white dark:bg-zinc-800" selected={appSettings.theme === 'default'} onClick={() => updateSetting('theme', 'default')} icon={<ImageIcon className="w-12 h-12 text-gray-300" />} />
                    <ThemeCard bg="bg-blue-900" selected={appSettings.theme === 'darkblue'} onClick={() => updateSetting('theme', 'darkblue')} />
                    <ThemeCard bg="bg-gradient-to-b from-blue-300 to-white" selected={appSettings.theme === 'snow'} onClick={() => updateSetting('theme', 'snow')} />
                    <div className="rounded-xl border-2 border-dashed border-gray-300 dark:border-zinc-700 flex items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/50 aspect-[9/16]">
                        <span className="text-4xl text-gray-300">+</span>
                    </div>
                </div>
            </div>
        );
    }

    if (page === 'language') {
        const langs = ['Bahasa Indonesia', 'English', 'Malay', 'Espanol', 'Français'];
        return (
            <div className="flex flex-col h-full bg-white dark:bg-[#121212] overflow-y-auto">
                {renderHeader('Bahasa', () => setPage('main'))}
                <div className="py-2">
                    {langs.map(l => (
                        <button key={l} onClick={() => updateSetting('language', l)} className="w-full flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition">
                            <span className="text-[15px] text-gray-800 dark:text-zinc-200">{l}</span>
                            {appSettings.language === l && <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center"><div className="w-2 h-2 bg-white rounded-full"></div></div>}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    if (page === 'cleardata') {
        return (
            <div className="flex flex-col h-full bg-gray-100 dark:bg-[#121212] overflow-y-auto">
                {renderHeader('Bersihkan Catatan', () => setPage('main'))}
                <div className="p-4">
                    <p className="text-sm text-gray-500 mb-4">Pilih data yang ingin Anda bersihkan.</p>
                    <SettingsGroup>
                        <SettingsItem label="Riwayat Penelusuran" hasToggle toggleState={clearHistoryToggle} onToggle={() => setClearHistoryToggle(!clearHistoryToggle)} />
                        <SettingsItem label="Cache dan Cookies" hasToggle toggleState={clearCacheToggle} onToggle={() => setClearCacheToggle(!clearCacheToggle)} />
                        <SettingsItem label="Kata Sandi yang Disimpan" hasToggle toggleState={clearPasswordsToggle} onToggle={() => setClearPasswordsToggle(!clearPasswordsToggle)} />
                    </SettingsGroup>
                    <button className="w-full py-3 mt-6 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition" onClick={async () => { 
                        if (clearHistoryToggle) {
                            clearHistory();
                        }
                        if (clearCacheToggle) {
                            if ('caches' in window) {
                                const keys = await caches.keys();
                                await Promise.all(keys.map(k => caches.delete(k)));
                            }
                        }
                        alert('Data berhasil dibersihkan.'); 
                        setPage('main'); 
                    }}>
                        Bersihkan Sekarang
                    </button>
                </div>
            </div>
        );
    }

    if (page === 'account') {
        return (
            <div className="flex flex-col h-full bg-white dark:bg-[#121212] overflow-y-auto w-full">
                {renderHeader('Akun / Masuk', () => setPage('main'))}
                <div className="flex-1 flex flex-col items-center justify-center px-6 text-center mt-12 pb-12">
                    <div className="w-24 h-24 bg-gray-200 dark:bg-zinc-800 rounded-full mb-6 flex items-center justify-center">
                        <ImageIcon className="w-10 h-10 text-gray-400" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">Masuk untuk pengalaman menjelajah yang lebih aman</h2>
                    <p className="text-sm text-gray-500 max-w-[280px] mx-auto mb-8">Sinkronkan bookmark, riwayat, dan pengaturan Anda di semua perangkat Anda.</p>
                    
                    <button className="w-full py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full font-medium mb-4 shadow hover:opacity-90 transition">
                        Masuk dengan Google
                    </button>
                    <button className="w-full py-3.5 bg-gray-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-full font-medium hover:bg-gray-200 dark:hover:bg-zinc-700 transition">
                        Masuk dengan Akun PRO
                    </button>
                </div>
            </div>
        );
    }

    if (page === 'about') {
        return (
            <div className="flex flex-col h-full bg-gray-100 dark:bg-[#121212] overflow-y-auto text-center items-center">
                {renderHeader('Tentang PRO Browser', () => setPage('main'))}
                <div className="mt-12 mb-6">
                    <div className="w-24 h-24 bg-orange-500 rounded-[2rem] mx-auto shadow-lg flex items-center justify-center text-white mb-4">
                       <Search className="w-12 h-12" />
                    </div>
                    <h2 className="text-2xl font-bold">PRO Browser</h2>
                    <p className="text-gray-500 mt-1">Versi 15.1.5.1391</p>
                </div>
                <div className="w-full px-4 text-left">
                    <SettingsGroup>
                        <SettingsItem label="Pembaruan Versi" value="Sudah versi terbaru" isLink />
                        <SettingsItem label="Beri Rating" isLink />
                        <SettingsItem label="Syarat dan Ketentuan" isLink />
                        <SettingsItem label="Kebijakan Privasi" isLink />
                    </SettingsGroup>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-100 dark:bg-[#121212] overflow-hidden">
            {/* Header */}
            <div className="h-14 flex items-center px-4 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 shrink-0 shadow-sm z-10">
                <button onClick={() => setActiveScreen('browser')} className="p-2 -ml-2 text-gray-600 dark:text-zinc-300 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="ml-2 font-medium text-lg">Pengaturan</h1>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto w-full no-scrollbar">
                <div className="py-2">
                    <SettingsGroup>
                        <SettingsItem label="Pengaturan Iklan" onClick={() => setPage('ads')} isLink />
                        <SettingsItem label="Atur sebagai browser default" hasToggle toggleState={appSettings.defaultBrowser} onToggle={() => updateSetting('defaultBrowser', !appSettings.defaultBrowser)} />
                        <SettingsItem label="Pengaturan VPN" onClick={() => setActiveScreen('vpn')} isLink />
                        <SettingsItem label="Pengaturan Browsing" isLink onClick={() => setPage('browsing')} />
                        <SettingsItem label="Pengaturan Unduhan" isLink onClick={() => setPage('downloads')} />
                        <SettingsItem label="Pengaturan Notifikasi" isLink onClick={() => setPage('notifications')} />
                        <SettingsItem label="Pengaturan Pencarian" isLink onClick={() => setPage('search')} />
                        <SettingsItem label="Pengaturan download media sosial" isLink onClick={() => setPage('social')} />
                    </SettingsGroup>

                    <SettingsGroup>
                        <SettingsItem label="Tema" isLink onClick={() => setPage('theme')} />
                        <SettingsItem label="Mode Gelap" hasToggle toggleState={isDark} onToggle={() => setIsDark(!isDark)} />
                        <SettingsItem label="Akselerasi Cloud" value={appSettings.cloudAcceleration ? 'AKTIF' : 'NONAKTIF'} isLink onClick={() => updateSetting('cloudAcceleration', !appSettings.cloudAcceleration)} />
                        <SettingsItem label="Bahasa" value={appSettings.language} isLink onClick={() => setPage('language')} />
                    </SettingsGroup>

                    <SettingsGroup>
                        <SettingsItem label="Bersihkan Catatan" isLink onClick={() => setPage('cleardata')} />
                        <SettingsItem label="Privasi & Keamanan" isLink onClick={() => alert('Pengaturan Privasi & Keamanan (Simulasi)')} />
                        <SettingsItem label="Akun" isLink onClick={() => setPage('account')} />
                        <SettingsItem label="Pasang Aplikasi Android (WebAPK)" isLink onClick={handleInstall} />
                        <SettingsItem label="Tentang PRO Browser" value="V15.1.5" isLink onClick={() => setPage('about')} />
                    </SettingsGroup>
                </div>
            </div>
        </div>
    );
}

function SettingsGroup({ children }: { children: React.ReactNode }) {
    return (
        <div className="bg-white dark:bg-zinc-900 mb-4 border-y border-gray-200 dark:border-zinc-800 shadow-sm">
            {children}
        </div>
    );
}

function SettingsItem({ label, value, subtext, hasToggle, toggleState, onToggle, isLink, onClick, disabled }: any) {
    return (
        <button onClick={onClick} className={`w-full flex items-center justify-between px-4 py-4 border-b last:border-0 border-gray-100 dark:border-zinc-800/50 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <div className="flex flex-col items-start gap-1 pr-4 text-left">
                <span className="text-[15px] font-medium text-gray-800 dark:text-zinc-200">{label}</span>
                {subtext && <span className="text-xs text-gray-400 leading-relaxed">{subtext}</span>}
            </div>
            
            <div className="flex items-center shrink-0">
                {value && <span className="text-sm text-gray-400 mr-2">{value}</span>}
                {hasToggle && (
                    <div onClick={(e) => { e.stopPropagation(); if(!disabled && onToggle) onToggle(); }} className={`w-12 h-6 rounded-full p-1 transition-colors flex items-center cursor-pointer ${toggleState ? 'bg-orange-500' : 'bg-gray-300 dark:bg-zinc-600'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${toggleState ? 'translate-x-6' : 'translate-x-0'}`} />
                    </div>
                )}
                {isLink && !hasToggle && (
                    <ChevronRight className="w-5 h-5 text-gray-300 dark:text-zinc-600" />
                )}
            </div>
        </button>
    );
}

function ThemeCard({ bg, selected, onClick, icon }: any) {
    return (
        <div onClick={onClick} className={`aspect-[9/16] rounded-xl overflow-hidden relative cursor-pointer border-2 transition ${selected ? 'border-orange-500' : 'border-transparent'} ${bg} flex items-center justify-center`}>
            {icon}
            {selected && (
                <div className="absolute bottom-2 right-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold">✓</div>
            )}
        </div>
    );
}
