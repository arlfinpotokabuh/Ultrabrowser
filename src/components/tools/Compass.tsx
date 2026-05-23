import React, { useState, useEffect } from 'react';
import { Compass as CompassIcon } from 'lucide-react';

export default function Compass() {
    const [heading, setHeading] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [hasPermission, setHasPermission] = useState<boolean>(false);

    const requestPermission = () => {
        if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
            (DeviceOrientationEvent as any).requestPermission()
                .then((permissionState: string) => {
                    if (permissionState === 'granted') {
                        setHasPermission(true);
                        window.addEventListener('deviceorientation', handleOrientation, true);
                    } else {
                        setError('Izin sensor ditolak');
                    }
                })
                .catch(() => setError('Gagal meminta izin sensor'));
        } else {
            setHasPermission(true);
            window.addEventListener('deviceorientation', handleOrientation, true);
            
            // Fallback test
            setTimeout(() => {
               if (heading === null && !error) {
                   setError('Sensor tidak mendeteksi pergerakan atau tidak didukung di perangkat ini (Perlu perangkat seluler).');
               }
            }, 2000);
        }
    };

    const handleOrientation = (event: DeviceOrientationEvent) => {
        let h = event.alpha;
        // Webkit compass heading for iOS
        if ((event as any).webkitCompassHeading !== undefined) {
            h = (event as any).webkitCompassHeading;
        }
        if (h !== null) {
           setHeading(h);
           setError(null);
        }
    };

    useEffect(() => {
        if (!window.DeviceOrientationEvent) {
             setError('Device orientation API tidak didukung browser ini');
        } else if (typeof (DeviceOrientationEvent as any).requestPermission !== 'function') {
             // For android, auto start if no permission needed
             setHasPermission(true);
             window.addEventListener('deviceorientation', handleOrientation, true);
        }

        return () => {
            window.removeEventListener('deviceorientation', handleOrientation, true);
        };
    }, []);

    const getDirection = (heading: number) => {
        const val = Math.floor((heading / 22.5) + 0.5);
        const arr = ["U", "TL", "T", "TG", "S", "BD", "B", "BL"];
        return arr[(val % 8)];
    };

    return (
        <div className="flex flex-col items-center justify-center p-8 mt-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-xl min-h-[400px]">
            {error ? (
                <div className="text-center text-red-500 px-4 w-full flex flex-col items-center">
                    <p className="mb-2 text-wrap font-medium">Mode Simulasi Manual Aktif</p>
                    <p className="text-xs text-gray-400 mb-6 font-mono">Iframe preview / perangkat desktop tidak memiliki sensor fisik.</p>
                    
                    {/* Render compass in simulation mode */}
                    <div className="relative w-48 h-48 rounded-full border-8 border-gray-100 dark:border-zinc-800 flex items-center justify-center shadow-inner shadow-gray-200/50 dark:shadow-black/50">
                        <div className="absolute font-bold text-red-500 top-1 text-xs">U</div>
                        <div className="absolute font-bold text-gray-500 bottom-1 text-xs">S</div>
                        <div className="absolute font-bold text-gray-500 right-1 text-xs">T</div>
                        <div className="absolute font-bold text-gray-500 left-1 text-xs">B</div>
                        <div 
                           className="w-1.5 h-32 bg-gradient-to-b from-red-500 via-red-500 to-gray-800 dark:to-gray-100 origin-center transition-transform duration-[50ms] ease-linear z-10 rounded-full"
                           style={{ transform: `rotate(${-(heading || 0)}deg)` }}
                        ></div>
                        <div className="absolute w-4 h-4 bg-white dark:bg-zinc-800 border-2 border-gray-800 dark:border-gray-200 rounded-full z-20 shadow-md"></div>
                    </div>
                    
                    <div className="mt-4 text-2xl font-bold font-mono text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-zinc-800 px-4 py-2 rounded-xl border border-gray-200 dark:border-zinc-700">
                        {Math.round(heading || 0)}° {getDirection(heading || 0)}
                    </div>
                    
                    {/* Manual Rotation Slider Dial */}
                    <div className="mt-6 w-full max-w-xs space-y-2">
                        <div className="flex justify-between text-xs font-semibold text-gray-500">
                            <span>Putar Kompas:</span>
                            <span className="font-mono text-blue-500">{Math.round(heading || 0)}°</span>
                        </div>
                        <input 
                            type="range" 
                            min="0" 
                            max="359" 
                            value={heading || 0} 
                            onChange={(e) => {
                                setHeading(parseInt(e.target.value));
                            }} 
                            className="w-full h-2 bg-gray-250 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-600 focus:outline-none"
                        />
                    </div>
                </div>
            ) : heading !== null ? (
                <div className="flex flex-col items-center">
                    <div className="relative w-64 h-64 rounded-full border-8 border-gray-100 dark:border-zinc-800 flex items-center justify-center shadow-inner shadow-gray-200/50 dark:shadow-black/50">
                        <div className="absolute font-bold text-red-500 top-2">U</div>
                        <div className="absolute font-bold text-gray-500 bottom-2">S</div>
                        <div className="absolute font-bold text-gray-500 right-2">T</div>
                        <div className="absolute font-bold text-gray-500 left-2">B</div>
                        <div 
                           className="w-1.5 h-44 bg-gradient-to-b from-red-500 via-red-500 to-gray-800 dark:to-gray-100 origin-center transition-transform duration-[50ms] ease-linear z-10 rounded-full"
                           style={{ transform: `rotate(${-heading}deg)` }}
                        ></div>
                        <div className="absolute w-4 h-4 bg-white dark:bg-zinc-800 border-2 border-gray-800 dark:border-gray-200 rounded-full z-20 shadow-md"></div>
                    </div>
                    <div className="mt-8 text-4xl font-bold font-mono text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-zinc-800 px-6 py-3 rounded-2xl border border-gray-200 dark:border-zinc-700">
                        {Math.round(heading)}° {getDirection(heading)}
                    </div>
                </div>
            ) : !hasPermission ? (
                <div className="flex flex-col items-center text-gray-600 dark:text-gray-400">
                    <CompassIcon className="w-16 h-16 mb-6 text-purple-600" />
                    <p className="text-center mb-6 max-w-[200px] text-sm">Berikan izin sensor gerak untuk menggunakan Kompas.</p>
                    <button 
                        onClick={requestPermission}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-8 rounded-full transition shadow-lg shadow-purple-600/30"
                    >
                        Mulai Kompas
                    </button>
                    <button 
                        onClick={() => {
                            setError('Izin dinonaktifkan manuall');
                            setHeading(0);
                        }}
                        className="mt-3 text-xs text-purple-500 font-medium hover:underline"
                    >
                        Lewati & Gunakan Mode Simulasi
                    </button>
                </div>
            ) : (
                <div className="flex flex-col items-center text-gray-400">
                    <CompassIcon className="w-12 h-12 mb-4 animate-pulse opacity-50" />
                    <p className="animate-pulse">Mengkalibrasi sensor...</p>
                </div>
            )}
        </div>
    );
}
