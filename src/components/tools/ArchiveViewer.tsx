import React, { useState, useEffect } from 'react';
import { Archive, File, Folder, Upload, X } from 'lucide-react';
import JSZip from 'jszip';
import { useBrowser } from '../../context/BrowserContext';

export default function ArchiveViewer() {
    const { activePreviewFile, setActivePreviewFile } = useBrowser();
    const [fileName, setFileName] = useState<string>('');
    const [entries, setEntries] = useState<{name: string, dir: boolean, size: number}[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (activePreviewFile) {
            loadZipFromUrl(activePreviewFile.url, activePreviewFile.filename);
        }
    }, [activePreviewFile]);

    const loadZipFromUrl = async (url: string, name: string) => {
        setFileName(name);
        setLoading(true);
        setError('');
        setEntries([]);

        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const zip = new JSZip();
            const contents = await zip.loadAsync(blob);
            const fileList: {name: string, dir: boolean, size: number}[] = [];
            
            contents.forEach((relativePath, zipEntry) => {
                fileList.push({
                    name: zipEntry.name,
                    dir: zipEntry.dir,
                    size: (zipEntry as any)._data?.uncompressedSize || 0
                });
            });
            
            fileList.sort((a, b) => {
                if (a.dir === b.dir) return a.name.localeCompare(b.name);
                return a.dir ? -1 : 1;
            });

            setEntries(fileList);
        } catch (err) {
            console.error(err);
            setError('Gagal membaca file arsip dari cloud.');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setFileName(file.name);
            setLoading(true);
            setError('');
            setEntries([]);

            try {
                const zip = new JSZip();
                const contents = await zip.loadAsync(file);
                const fileList: {name: string, dir: boolean, size: number}[] = [];
                
                contents.forEach((relativePath, zipEntry) => {
                    // zipEntry.name, zipEntry.dir
                    // size is internal, we could use zipEntry._data?.uncompressedSize but it's internal API
                    // To keep it simple, we just show names.
                    fileList.push({
                        name: zipEntry.name,
                        dir: zipEntry.dir,
                        size: (zipEntry as any)._data?.uncompressedSize || 0
                    });
                });
                
                // Sort folders first, then alphabetically
                fileList.sort((a, b) => {
                    if (a.dir === b.dir) return a.name.localeCompare(b.name);
                    return a.dir ? -1 : 1;
                });

                setEntries(fileList);
            } catch (err) {
                console.error(err);
                setError('Gagal membaca file arsip. Pastikan file berformat ZIP yang valid.');
            } finally {
                setLoading(false);
            }
        }
    };

    const clearFile = () => {
        setFileName('');
        setEntries([]);
        setError('');
        if (activePreviewFile) {
            setActivePreviewFile(null);
        }
    };

    return (
        <div className="flex flex-col bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-xl mt-4 min-h-[400px]">
            <div className="p-4 border-b border-gray-200 dark:border-zinc-800 flex justify-between items-center bg-gray-50 dark:bg-zinc-800 rounded-t-2xl">
                <h3 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Archive className="w-5 h-5 text-orange-500" />
                    Pembuka Arsip (ZIP)
                </h3>
                {fileName && (
                    <button onClick={clearFile} className="p-2 bg-gray-200 dark:bg-zinc-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-zinc-600 rounded-full transition">
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            <div className="flex-1 flex flex-col relative bg-white dark:bg-zinc-900 rounded-b-2xl overflow-hidden max-h-[400px]">
                {!fileName ? (
                    <div className="p-4 flex-1 flex">
                        <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 hover:border-orange-400 transition w-full h-full text-center">
                            <Archive className="w-12 h-12 text-orange-500 mb-4 opacity-80" />
                            <span className="font-medium text-gray-700 dark:text-gray-300 mb-2">Pilih file ZIP untuk melihat isinya</span>
                            <span className="text-sm text-gray-500">Membaca isi file ZIP secara langsung di browser tanpa upload</span>
                            <input type="file" accept=".zip,application/zip" className="hidden" onChange={handleFileChange} />
                            <div className="mt-6 flex items-center gap-2 px-6 py-2 bg-orange-600 text-white rounded-full font-medium shadow">
                                <Upload className="w-4 h-4" /> Buka ZIP
                            </div>
                        </label>
                    </div>
                ) : loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8">
                        <Archive className="w-12 h-12 mb-4 animate-bounce text-orange-400" />
                        <p className="animate-pulse font-medium">Membaca arsip...</p>
                    </div>
                ) : error ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-red-500 p-8 text-center">
                        <X className="w-12 h-12 mb-4 opacity-50" />
                        <p>{error}</p>
                    </div>
                ) : (
                    <div className="flex flex-col h-full overflow-hidden">
                        <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/10 border-b border-gray-100 dark:border-zinc-800 text-sm font-mono text-blue-800 dark:text-blue-300 truncate font-semibold">
                            {fileName} <span className="font-normal text-gray-500 text-xs ml-2">({entries.length} item)</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            {entries.length === 0 ? (
                                <p className="text-center text-gray-500 mt-8">Arsip kosong.</p>
                            ) : (
                                <ul className="flex flex-col gap-1">
                                    {entries.map((entry, idx) => (
                                        <li key={idx} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg group">
                                            {entry.dir ? (
                                                <Folder className="w-5 h-5 text-yellow-500 shrink-0" />
                                            ) : (
                                                <File className="w-5 h-5 text-gray-400 shrink-0 group-hover:text-blue-500 transition" />
                                            )}
                                            <span className={`text-sm truncate ${entry.dir ? 'font-medium text-gray-800 dark:text-gray-200' : 'text-gray-600 dark:text-gray-400'}`}>
                                                {entry.name}
                                            </span>
                                            {/* Size roughly */}
                                            {!entry.dir && entry.size > 0 && (
                                                <span className="ml-auto text-xs text-gray-400 font-mono shrink-0">
                                                    {(entry.size / 1024).toFixed(1)} KB
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
