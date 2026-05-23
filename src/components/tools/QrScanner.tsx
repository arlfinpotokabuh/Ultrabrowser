import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useBrowser } from '../../context/BrowserContext';

export default function QrScanner() {
    const [scanResult, setScanResult] = useState<string | null>(null);
    const { setCurrentUrl, setActiveOverlay } = useBrowser();
    const scannerRef = useRef<Html5Qrcode | null>(null);

    const [cameraError, setCameraError] = useState<string | null>(null);

    useEffect(() => {
        const startScanner = async () => {
            scannerRef.current = new Html5Qrcode("qr-reader");
            try {
                await scannerRef.current.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    (decodedText) => {
                        setScanResult(decodedText);
                        if (scannerRef.current) {
                            scannerRef.current.stop().catch(() => {}).then(() => {
                                scannerRef.current?.clear();
                                scannerRef.current = null;
                            });
                        }
                    },
                    (err) => {
                        // ignore scanning errors
                    }
                );
            } catch (err) {
                console.error("Camera access failed", err);
                setCameraError("Tidak dapat mengakses kamera. Mode Pengunggahan Berkas QR diaktifkan.");
            }
        };

        startScanner();

        return () => {
            if (scannerRef.current) {
                try {
                    scannerRef.current.stop().catch(() => {}).then(() => {
                        scannerRef.current?.clear();
                    });
                } catch(e) {}
            }
        };
    }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const tempReader = new Html5Qrcode("qr-reader-temp");
            try {
                const decodedText = await tempReader.scanFile(file, true);
                setScanResult(decodedText);
            } catch (err) {
                console.error(err);
                alert("Gagal memproses gambar. Pastikan gambar mengandung QR Code yang jelas, tajam dan terbaca.");
            } finally {
                try { tempReader.clear(); } catch(e){}
            }
        }
    };

    const handleSimulatedScan = () => {
        const sampleUrls = [
            "https://www.google.com",
            "https://github.com",
            "Sistem PRO Browser v3 siap digunakan! Hubungi support kami.",
            "https://translate.google.com",
            "https://www.wikipedia.org"
        ];
        const randomItem = sampleUrls[Math.floor(Math.random() * sampleUrls.length)];
        setScanResult(randomItem);
    };

    const handleAction = () => {
        if (scanResult) {
            if (scanResult.startsWith('http://') || scanResult.startsWith('https://')) {
                setCurrentUrl(scanResult);
                setActiveOverlay(null);
            } else {
                navigator.clipboard.writeText(scanResult);
                alert('Teks disalin ke clipboard');
            }
        }
    };

    const resetScanner = () => {
        setScanResult(null);
        setActiveOverlay(null);
        setTimeout(() => setActiveOverlay('tool-qrcode'), 50); // Hacky flip to trigger remount
    };

    return (
        <div className="flex flex-col p-4 mt-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-xl min-h-[400px]">
             {/* Hidden anchor div to facilitate background file scans without breaking layouts */}
             <div id="qr-reader-temp" className="hidden" />

             {scanResult ? (
                 <div className="flex flex-col h-full flex-1">
                     <p className="text-gray-500 mb-2 font-medium">Hasil pindai:</p>
                     <div className="bg-gray-100 dark:bg-zinc-800 p-4 rounded-xl break-all mb-6 font-mono text-sm max-h-[250px] overflow-y-auto border border-gray-200 dark:border-zinc-700">
                         {scanResult}
                     </div>
                     
                     <div className="mt-auto flex flex-col gap-3 w-full">
                        <button 
                            onClick={handleAction} 
                            className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl font-medium w-full transition shadow-lg shadow-blue-600/20"
                        >
                            {scanResult.startsWith('http') ? 'Buka Tautan' : 'Salin Teks'}
                        </button>
                        <button 
                            onClick={resetScanner} 
                            className="bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-200 p-4 rounded-xl font-medium w-full transition"
                        >
                            Pindai Lagi
                        </button>
                     </div>
                 </div>
             ) : (
                 <div className="flex flex-col h-full">
                    <h3 className="font-semibold text-center mb-1 text-gray-800 dark:text-gray-200">Arahkan kamera ke QR Code</h3>
                    <p className="text-[11px] text-gray-400 text-center mb-4 leading-normal">
                        Kamera tidak mendeteksi web atau jika diblokir oleh lingkungan, unggah berkas gambar QR di bawah.
                    </p>
                    
                    <div className="w-full flex-1 overflow-hidden rounded-xl bg-gray-50 dark:bg-zinc-800 relative min-h-[200px]" id="qr-reader">
                        {/* html5-qrcode dynamically injects UI here */}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800 flex flex-col gap-2">
                        <label className="bg-blue-600 hover:bg-blue-700 text-white font-medium p-3.5 rounded-xl text-xs text-center cursor-pointer transition flex items-center justify-center gap-2">
                            <span>📂 Unggah & Scan File Gambar QR</span>
                            <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={handleFileUpload} 
                            />
                        </label>
                        <button 
                            onClick={handleSimulatedScan}
                            className="bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 font-medium p-2.5 rounded-xl text-xs text-center transition"
                        >
                            ⚡ Klik Simulasi Scan Acak (Untuk Uji Coba)
                        </button>
                    </div>
                 </div>
             )}
        </div>
    );
}
