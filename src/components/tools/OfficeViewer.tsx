import React, { useState, useEffect } from 'react';
import { FileText, Upload, X, AlertCircle, Code } from 'lucide-react';
import mammoth from 'mammoth';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useBrowser } from '../../context/BrowserContext';

export default function OfficeViewer() {
    const { activePreviewFile, setActivePreviewFile } = useBrowser();
    const [fileName, setFileName] = useState<string>('');
    const [fileContent, setFileContent] = useState<string | null>(null);
    const [fileType, setFileType] = useState<'text' | 'html' | 'pdf' | 'code' | null>(null);
    const [codeLanguage, setCodeLanguage] = useState<string>('javascript');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (activePreviewFile) {
            loadFileFromUrl(activePreviewFile.url, activePreviewFile.filename);
        }
    }, [activePreviewFile]);

    const loadFileFromUrl = async (url: string, name: string) => {
        setFileName(name);
        setLoading(true);
        setError('');
        setFileContent(null);
        setFileType(null);

        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const nameLower = name.toLowerCase();
            
            if (nameLower.endsWith('.docx')) {
                const arrayBuffer = await blob.arrayBuffer();
                const result = await mammoth.convertToHtml({ arrayBuffer });
                setFileContent(result.value); 
                setFileType('html');
            } else if (nameLower.endsWith('.pdf')) {
                const pdfUrl = URL.createObjectURL(blob);
                setFileContent(pdfUrl);
                setFileType('pdf');
            } else if (nameLower.endsWith('.txt') || nameLower.endsWith('.csv') || nameLower.endsWith('.md')) {
                const text = await blob.text();
                setFileContent(text);
                setFileType('text');
            } else if (nameLower.match(/\.(js|jsx|ts|tsx|json|html|css|py|java|c|cpp|go|rs)$/)) {
                const text = await blob.text();
                setFileContent(text);
                setFileType('code');
                const ext = nameLower.split('.').pop();
                if (ext === 'js' || ext === 'jsx') setCodeLanguage('javascript');
                else if (ext === 'ts' || ext === 'tsx') setCodeLanguage('typescript');
                else if (ext === 'json') setCodeLanguage('json');
                else if (ext === 'html') setCodeLanguage('html');
                else if (ext === 'css') setCodeLanguage('css');
                else if (ext === 'py') setCodeLanguage('python');
                else if (ext === 'java') setCodeLanguage('java');
                else if (ext === 'go') setCodeLanguage('go');
                else if (ext === 'rs') setCodeLanguage('rust');
                else setCodeLanguage('javascript');
            } else {
                setError('Format tidak didukung. Harap pilih file .txt, .csv, .md, .docx, .pdf, atau file kode.');
            }
        } catch (err) {
            console.error(err);
            setError('Gagal membaca file dari cloud.');
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
            setFileContent(null);
            setFileType(null);

            try {
                const nameLower = file.name.toLowerCase();
                
                if (nameLower.endsWith('.docx')) {
                    const arrayBuffer = await file.arrayBuffer();
                    const result = await mammoth.convertToHtml({ arrayBuffer });
                    setFileContent(result.value); 
                    setFileType('html');
                } else if (nameLower.endsWith('.pdf')) {
                    const url = URL.createObjectURL(file);
                    setFileContent(url);
                    setFileType('pdf');
                } else if (nameLower.endsWith('.txt') || nameLower.endsWith('.csv') || nameLower.endsWith('.md')) {
                    const text = await file.text();
                    setFileContent(text);
                    setFileType('text');
                } else if (nameLower.match(/\.(js|jsx|ts|tsx|json|html|css|py|java|c|cpp|go|rs)$/)) {
                    const text = await file.text();
                    setFileContent(text);
                    setFileType('code');
                    const ext = nameLower.split('.').pop();
                    if (ext === 'js' || ext === 'jsx') setCodeLanguage('javascript');
                    else if (ext === 'ts' || ext === 'tsx') setCodeLanguage('typescript');
                    else if (ext === 'json') setCodeLanguage('json');
                    else if (ext === 'html') setCodeLanguage('html');
                    else if (ext === 'css') setCodeLanguage('css');
                    else if (ext === 'py') setCodeLanguage('python');
                    else if (ext === 'java') setCodeLanguage('java');
                    else if (ext === 'go') setCodeLanguage('go');
                    else if (ext === 'rs') setCodeLanguage('rust');
                    else setCodeLanguage('javascript');
                } else {
                    setError('Format tidak didukung. Harap pilih file .txt, .csv, .md, .docx, .pdf, atau file kode.');
                }
            } catch (err) {
                console.error(err);
                setError('Gagal membaca file tersebut.');
            } finally {
                setLoading(false);
            }
        }
    };

    const clearFile = () => {
        if (fileType === 'pdf' && fileContent) {
            URL.revokeObjectURL(fileContent);
        }
        setFileName('');
        setFileContent(null);
        setFileType(null);
        setError('');
        if (activePreviewFile) {
            setActivePreviewFile(null);
        }
    };

    return (
        <div className="flex flex-col bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-xl mt-4 min-h-[400px]">
             <div className="p-4 border-b border-gray-200 dark:border-zinc-800 flex justify-between items-center bg-gray-50 dark:bg-zinc-800 rounded-t-2xl">
                <h3 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-500" />
                    Pembuka File / Dokumen Khusus
                </h3>
                {fileName && (
                    <button onClick={clearFile} className="p-2 bg-gray-200 dark:bg-zinc-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-zinc-600 rounded-full transition">
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            <div className="flex-1 flex flex-col relative rounded-b-2xl overflow-hidden min-h-[350px]">
                {!fileName ? (
                     <div className="p-4 flex-1 flex">
                        <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 hover:border-blue-400 transition w-full h-full text-center max-h-[300px]">
                            <div className="flex gap-3 mb-4 opacity-80">
                                <FileText className="w-10 h-10 text-blue-500" />
                                <Code className="w-10 h-10 text-emerald-500" />
                            </div>
                            <span className="font-medium text-gray-700 dark:text-gray-300 mb-2">Pilih File untuk Dibaca</span>
                            <span className="text-sm text-gray-500 max-w-[280px]">Mendukung Office (.docx), PDF, Teks, & Source Code dengan Syntax Highlighting.</span>
                            <input type="file" accept=".docx,.pdf,.txt,.csv,.md,.js,.ts,.jsx,.tsx,.json,.css,.html,.py,.java,.c,.cpp,.go,.rs" className="hidden" onChange={handleFileChange} />
                            <div className="mt-6 flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-full font-medium shadow">
                                <Upload className="w-4 h-4" /> Buka File
                            </div>
                        </label>
                    </div>
                ) : loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8">
                        <FileText className="w-12 h-12 mb-4 animate-pulse text-blue-400" />
                        <p className="animate-pulse font-medium">Membaca file...</p>
                    </div>
                ) : error ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-red-500 p-8 text-center bg-red-50 dark:bg-red-900/10 h-full">
                        <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
                        <p>{error}</p>
                    </div>
                ) : (
                    <div className={`flex flex-col h-full overflow-hidden w-full ${fileType === 'code' ? 'bg-[#1e1e1e] text-white' : 'bg-white text-black'}`}>
                        {/* Header status bar inside the viewer */}
                        <div className={`px-4 py-2 border-b text-xs font-mono truncate font-semibold w-full flex justify-between
                            ${fileType === 'code' ? 'bg-[#252526] border-[#3c3c3c] text-gray-300' : 'bg-gray-100 border-gray-200 text-gray-700'}`}>
                            <span>{fileName}</span>
                            {fileType === 'code' && <span className="text-emerald-400">{codeLanguage}</span>}
                        </div>
                        
                        <div className="flex-1 w-full h-full overflow-hidden flex flex-col">
                            {fileType === 'pdf' && fileContent ? (
                                <iframe src={fileContent} className="w-full h-[400px] border-none flex-1 bg-gray-300" title="PDF Viewer" />
                            ) : fileType === 'html' && fileContent ? (
                                <div className="p-6 overflow-y-auto prose prose-sm sm:prose max-w-none text-black bg-white flex-1 min-h-[350px]">
                                    <div dangerouslySetInnerHTML={{ __html: fileContent }} />
                                </div>
                            ) : fileType === 'text' && fileContent ? (
                                <div className="p-4 overflow-y-auto bg-gray-50 flex-1 min-h-[350px]">
                                    <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800">{fileContent}</pre>
                                </div>
                            ) : fileType === 'code' && fileContent ? (
                                <div className="overflow-y-auto flex-1 min-h-[350px] w-full bg-[#1e1e1e]">
                                    <SyntaxHighlighter 
                                        language={codeLanguage} 
                                        style={vscDarkPlus}
                                        customStyle={{ margin: 0, padding: '16px', borderRadius: 0, background: 'transparent' }}
                                        showLineNumbers
                                    >
                                        {fileContent}
                                    </SyntaxHighlighter>
                                </div>
                            ) : null}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
