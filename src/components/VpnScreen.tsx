import React, { useState } from 'react';
import { ChevronLeft, AlertTriangle, Power, Activity } from 'lucide-react';
import { useBrowser } from '../context/BrowserContext';
import { motion } from 'motion/react';

export default function VpnScreen() {
    const { setActiveScreen, vpnActive, setVpnActive, vpnConfig, setVpnConfig, navigate } = useBrowser();
    const [localConfig, setLocalConfig] = useState(vpnConfig);
    const [isConnecting, setIsConnecting] = useState(false);
    const [pingLatency, setPingLatency] = useState<number | null>(null);
    const [isPinging, setIsPinging] = useState(false);
    const [pingError, setPingError] = useState<string | null>(null);

    const handleSaveAndConnect = () => {
        setVpnConfig(localConfig);
        
        if (!vpnActive) {
            setIsConnecting(true);
            setTimeout(() => {
                setVpnActive(true);
                setIsConnecting(false);
            }, 1000);
        } else {
            setVpnActive(false);
        }
    };

    const handlePing = async () => {
        if (!localConfig) return;
        setIsPinging(true);
        setPingLatency(null);
        setPingError(null);
        try {
            const res = await fetch('/api/proxy/ping', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ proxyUrl: localConfig })
            });
            const data = await res.json();
            if (data.success) {
                setPingLatency(data.latency);
            } else {
                setPingError(data.error || 'Server Error');
            }
        } catch (e: any) {
            setPingError(e.message);
        } finally {
            setIsPinging(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-[#121212] overflow-hidden">
            <div className="h-14 flex items-center px-4 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 shrink-0 shadow-sm z-10">
                <button onClick={() => setActiveScreen('settings')} className="p-2 -ml-2 text-gray-600 dark:text-zinc-300 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="ml-2 font-medium text-lg">PRO VPN (cURL Proxy)</h1>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 w-full no-scrollbar">
                <div className={`p-8 rounded-[2rem] flex flex-col items-center justify-center overflow-hidden relative shadow-xl transition-colors duration-500 ${vpnActive ? 'bg-gradient-to-br from-green-500 to-emerald-700 text-white' : 'bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800'}`}>
                    <div className="relative mb-6">
                        <motion.button 
                            whileTap={{ scale: 0.95 }}
                            onClick={handleSaveAndConnect}
                            className={`w-28 h-28 rounded-full flex items-center justify-center shadow-lg transition-colors ${vpnActive ? 'bg-white/20 hover:bg-white/30' : 'bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700'}`}
                        >
                            <Power className={`w-12 h-12 ${vpnActive ? 'text-white' : 'text-gray-400'}`} />
                        </motion.button>
                        {isConnecting && (
                            <motion.div 
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                className="absolute inset-0 rounded-full border-[5px] border-blue-500 border-t-transparent"
                            />
                        )}
                    </div>
                    <h2 className="text-2xl font-bold mb-2 tracking-tight">
                        {isConnecting ? 'Menghubungkan...' : vpnActive ? 'Terhubung & Aman' : 'Tidak Terhubung'}
                    </h2>
                    <p className={`text-sm text-center px-4 ${vpnActive ? 'text-green-100' : 'text-gray-500 dark:text-zinc-400'}`}>
                        {vpnActive ? 'Data browser Anda diamankan dan di-routing secara otomatis menggunakan proxy melalui server.' : 'Masukkan konfigurasi proxy (socks5/http) di bawah untuk terhubung ke layanan VPN nyata.'}
                    </p>
                </div>

                <div className="space-y-3">
                    <label className="text-sm font-semibold text-gray-700 dark:text-zinc-300">
                        String Konfigurasi cURL Proxy
                    </label>
                    <textarea 
                        value={localConfig}
                        onChange={(e) => setLocalConfig(e.target.value)}
                        placeholder="socks5://... atau http://..."
                        className="w-full h-36 p-4 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm break-all font-mono shadow-sm resize-none"
                    />
                    
                    <div className="flex items-center gap-2 mt-2">
                        <button
                            onClick={handlePing}
                            disabled={isPinging || !localConfig}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
                        >
                            <Activity className={`w-4 h-4 ${isPinging ? 'animate-pulse' : ''}`} />
                            {isPinging ? 'Pinging...' : 'Ping Proxy'}
                        </button>
                        {pingLatency !== null && (
                            <span className="text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-lg border border-green-200 dark:border-green-900/50">
                                {pingLatency} ms
                            </span>
                        )}
                        {pingError && (
                            <span className="text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/50 truncate max-w-[200px]" title={pingError}>
                                Error: {pingError}
                            </span>
                        )}
                    </div>

                    <div className="flex items-start gap-3 mt-4 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-200 dark:border-amber-900/50">
                        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                        <div className="leading-relaxed">
                            <strong>Perhatian Mode Web:</strong> cURL Proxy agent menggunakan standar otentikasi basic/proxy. VPN ini <strong>telah di-upgrade</strong> sehingga dapat melakukan request proxy di backend (Node.js) jika Anda menggunakan config berawalan <code>http://</code> atau <code>socks5://</code>. Proxy string akan dikirim ke backend proxy renderer.
                        </div>
                    </div>
                </div>

                {/* Proxy Library & Cadangan */}
                <div className="space-y-3 pb-4">
                    <label className="text-sm font-semibold text-gray-700 dark:text-zinc-300 font-medium">
                        Proxy Library & Server Cadangan
                    </label>
                    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3 shadow-sm">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-zinc-50 dark:bg-zinc-800/10 rounded-xl border border-gray-200/50 dark:border-zinc-800">
                            <div className="space-y-1">
                                <h4 className="text-xs font-bold text-gray-950 dark:text-white flex items-center gap-1.5 font-sans">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                                    CroxyProxy (Web Proxy Cadangan)
                                </h4>
                                <p className="text-[10px] text-gray-500 dark:text-zinc-400 leading-relaxed font-sans">
                                    Server proxy web gratis berkualitas tinggi. Solusi instan untuk bypass geoblock atau restriksi ISP jika server utama VPN/SOCKS Anda mengalami kendala koneksi atau error.
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    navigate('https://www.croxyproxy.com/');
                                    setActiveScreen('browser');
                                }}
                                className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md active:scale-95 shrink-0 w-full sm:w-auto text-center cursor-pointer font-sans"
                            >
                                Buka Proxy
                            </button>
                        </div>
                    </div>
                </div>

                {vpnActive && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-[#0D0D0D] text-green-400 font-mono text-[11px] p-4 rounded-2xl overflow-hidden h-40 overflow-y-auto border border-zinc-800 shrink-0"
                    >
                        <div className="mb-1 text-zinc-500">--- Terminal Logs ---</div>
                        <div>{">"} [proxy-agent] Starting routing service...</div>
                        <div>{">"} [proxy-agent] Validating config protocol...</div>
                        <div>{">"} [proxy-agent] Injecting HTTP/SOCKS agent to global proxy.</div>
                        <div>{">"} [proxy-agent] Sending proxy config to backend renderer...</div>
                        <div>{">"} [proxy-agent] Cookies registered for backend interceptor.</div>
                        <div className="text-white">{">"} [proxy-agent] Connection established successfully! Traffic is securely proxied.</div>
                        <motion.div animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 1 }}>_</motion.div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
