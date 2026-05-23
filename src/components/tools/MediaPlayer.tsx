import React, { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, Music, Video, File, X, Upload, Play, Pause, Volume2, Maximize } from 'lucide-react';
import { useBrowser } from '../../context/BrowserContext';

export default function MediaPlayer() {
    const { activePreviewFile, setActivePreviewFile } = useBrowser();
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [fileType, setFileType] = useState<'video' | 'audio' | 'image' | null>(null);
    const [fileName, setFileName] = useState<string>('');
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [videoError, setVideoError] = useState(false);

    useEffect(() => {
        if (activePreviewFile) {
            setVideoError(false);
            const ext = activePreviewFile.filename.toLowerCase();
            const isVideo = ext.endsWith('.mp4') || ext.endsWith('.webm') || ext.endsWith('.ogg') || ext.endsWith('.mkv') || ext.endsWith('.mov') || ext.endsWith('.3gp') || activePreviewFile.type === 'video';
            const isAudio = ext.endsWith('.mp3') || ext.endsWith('.wav') || ext.endsWith('.ogg') || ext.endsWith('.aac') || ext.endsWith('.flac') || ext.endsWith('.m4a') || ext.endsWith('.wma') || activePreviewFile.type === 'music' || activePreviewFile.type === 'audio';
            const isImage = ext.endsWith('.png') || ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.gif') || ext.endsWith('.webp') || ext.endsWith('.svg') || ext.endsWith('.bmp') || ext.endsWith('.ico') || activePreviewFile.type === 'image';
            
            if (isVideo) {
                setFileType('video');
                setFileUrl(activePreviewFile.url);
                setFileName(activePreviewFile.filename);
                setIsPlaying(true);
            } else if (isAudio) {
                setFileType('audio');
                setFileUrl(activePreviewFile.url);
                setFileName(activePreviewFile.filename);
                setIsPlaying(true);
            } else if (isImage) {
                setFileType('image');
                setFileUrl(activePreviewFile.url);
                setFileName(activePreviewFile.filename);
                setIsPlaying(false);
            }
        }
    }, [activePreviewFile]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const url = URL.createObjectURL(file);
            
            if (fileUrl && (!activePreviewFile || fileUrl !== activePreviewFile.url)) {
                URL.revokeObjectURL(fileUrl);
            }
            
            setFileUrl(url);
            setFileName(file.name);

            if (file.type.startsWith('video/')) setFileType('video');
            else if (file.type.startsWith('audio/')) setFileType('audio');
            else if (file.type.startsWith('image/')) setFileType('image');
            else setFileType(null);
            
            setVideoError(false);
            setIsPlaying(true);
        }
    };

    const clearMedia = () => {
        if (fileUrl && (!activePreviewFile || fileUrl !== activePreviewFile.url)) {
            URL.revokeObjectURL(fileUrl);
        }
        setFileUrl(null);
        setFileType(null);
        setFileName('');
        setIsPlaying(false);
        setVideoError(false);
        if (activePreviewFile) {
            setActivePreviewFile(null);
        }
    };

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) videoRef.current.pause();
            else videoRef.current.play();
            setIsPlaying(!isPlaying);
        }
    };

    const toggleFullscreen = () => {
        if (videoRef.current) {
            if (videoRef.current.requestFullscreen) {
                videoRef.current.requestFullscreen();
            }
        }
    };

    return (
        <div className="flex flex-col bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-xl mt-4 min-h-[450px]">
            <div className="p-4 border-b border-gray-200 dark:border-zinc-800 flex justify-between items-center bg-gray-50 dark:bg-zinc-800 rounded-t-2xl">
                <h3 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Video className="w-5 h-5 text-blue-500" />
                    Pemutar Media PRO
                </h3>
                {fileUrl && (
                    <button onClick={clearMedia} className="p-2 bg-gray-200 dark:bg-zinc-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-zinc-600 rounded-full transition">
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            <div className="flex-1 flex flex-col items-center justify-center relative bg-black rounded-b-2xl overflow-hidden min-h-[400px]">
                {!fileUrl ? (
                    <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-600/50 rounded-2xl cursor-pointer hover:bg-white/5 hover:border-blue-500 transition w-[90%] h-[90%] max-h-[350px]">
                        <div className="flex gap-4 mb-4 text-blue-500 animate-pulse">
                            <Video className="w-10 h-10" />
                            <Music className="w-10 h-10" />
                            <ImageIcon className="w-10 h-10" />
                        </div>
                        <span className="font-medium text-gray-200 text-center text-lg">Pilih file Media Anda</span>
                        <span className="text-sm text-gray-400 mt-2 text-center max-w-[280px]">Mendukung kualitas tinggi putar lokal tanpa batas kuota.</span>
                        <input type="file" accept="video/*,audio/*,image/*" className="hidden" onChange={handleFileChange} />
                        <div className="mt-8 flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold shadow-lg shadow-blue-900/50 transition transform hover:scale-105">
                            <Upload className="w-5 h-5" /> Unggah Media
                        </div>
                    </label>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center relative group">
                        {fileType === 'video' && (
                            <div className="w-full h-full flex flex-col relative bg-black object-contain justify-center items-center">
                                {!videoError ? (
                                    <video 
                                        ref={videoRef}
                                        src={fileUrl} 
                                        controls 
                                        autoPlay 
                                        className="w-full h-full max-h-[400px]" 
                                        onPlay={() => setIsPlaying(true)}
                                        onPause={() => setIsPlaying(false)}
                                        onError={() => setVideoError(true)}
                                    />
                                ) : (
                                    <div className="text-center text-gray-300 flex flex-col items-center gap-4 p-8 w-full max-w-md mx-auto">
                                        <div className="bg-zinc-800/80 p-5 rounded-full mb-2">
                                            <Video className="w-12 h-12 text-red-400" />
                                        </div>
                                        <p className="font-bold text-xl text-red-400">Tidak dapat memuat video</p>
                                        <p className="text-sm text-gray-400 leading-relaxed">
                                            URL media ini mungkin tidak dapat dimuat karena merupakan halaman web eksternal, format yang tidak didukung, atau dilindungi oleh pihak ketiga.
                                        </p>
                                        <a 
                                            href={fileUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="mt-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold shadow-lg shadow-blue-900/40 transition transform hover:scale-105 active:scale-95"
                                        >
                                            Buka di Tab Baru
                                        </a>
                                    </div>
                                )}
                                {!videoError && (
                                    <div className="absolute top-4 left-4 right-4 flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-b from-black/60 to-transparent p-4 -mx-4 -mt-4 rounded-t-2xl pointer-events-none">
                                        <span className="text-white font-medium drop-shadow-md truncate max-w-[80%]">{fileName}</span>
                                    </div>
                                )}
                            </div>
                        )}
                        {fileType === 'audio' && (
                            <div className="w-full max-w-sm px-6 py-8 bg-zinc-900 rounded-3xl shadow-2xl flex flex-col items-center gap-6 border border-zinc-800">
                                <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.3)] animate-pulse">
                                   <Music className="w-14 h-14 text-white" />
                                </div>
                                <div className="text-center w-full">
                                    <p className="text-white font-bold truncate px-4 text-lg">{fileName}</p>
                                    <p className="text-blue-400 text-sm mt-1">Audio Player</p>
                                </div>
                                <audio src={fileUrl} controls autoPlay className="w-full mt-4" />
                            </div>
                        )}
                        {fileType === 'image' && (
                            <div className="w-full h-full p-4 flex items-center justify-center">
                                <img src={fileUrl} alt={fileName} className="max-w-full max-h-[400px] object-contain rounded-xl shadow-2xl" />
                            </div>
                        )}
                        {fileType === null && (
                            <div className="text-center text-gray-400 flex flex-col items-center gap-4">
                                 <File className="w-16 h-16 opacity-50" />
                                 <p>Format file ini tidak didukung.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
