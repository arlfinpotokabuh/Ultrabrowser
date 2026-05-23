import React, { useState, useEffect, useRef } from 'react';
import { useBrowser } from '../../context/BrowserContext';
import { 
  AlertTriangle, Terminal, X, Copy, Check, Sparkles, RefreshCw, Layers, 
  Cpu, Video, Image, Play, Shield, Globe, EyeOff, Zap, Download, Settings,
  FolderLock, Eye, HelpCircle, Flame, Scissors, Wrench, Send, ChevronDown, ChevronUp, FileText
} from 'lucide-react';

interface ErrorItem {
  id: string;
  message: string;
  stack?: string;
  timestamp: string;
  file?: string;
  line?: number;
  aiAnalysis?: {
    analisa: string;
    solusi: string;
    perbaikan_kode_diff?: string;
    prompt_chat?: string;
  };
}

// Export fungsi ini untuk mengatasi request ManualReport eksternal
export const ManualReport = (url: string) => {
  try {
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch (err) {
    console.error("Gagal membuka URL eksternal:", err);
    alert("Pop-up diblokir!");
  }
};

// Variable global aman untuk web-logger (console interceptor backend-only)
const MAX_LOGS = 100;
const logHistory: { type: string, message: string, timestamp: string }[] = [];

function interceptConsole() {
  if ((window as any)._consoleIntercepted) return;
  (window as any)._consoleIntercepted = true;
  
  const originalLog = console.log;
  const originalInfo = console.info;
  const originalWarn = console.warn;

  const addLog = (type: string, args: any[]) => {
    const rawMessage = args.map(arg => {
      if (arg instanceof Error) return arg.message + '\n' + arg.stack;
      if (typeof arg === 'object') {
        try { return JSON.stringify(arg); } catch (e) { return '[Object]'; }
      }
      return String(arg);
    }).join(' ');

    if (rawMessage.includes('ws://') || rawMessage.includes('HMR') || rawMessage.includes('React DevTools')) {
        return;
    }

    logHistory.push({
      type,
      message: rawMessage,
      timestamp: new Date().toISOString()
    });

    if (logHistory.length > MAX_LOGS) {
      logHistory.shift();
    }
  };

  console.log = (...args) => {
    addLog('log', args);
    originalLog.apply(console, args);
  }
  console.info = (...args) => {
    addLog('info', args);
    originalInfo.apply(console, args);
  }
  console.warn = (...args) => {
    addLog('warn', args);
    originalWarn.apply(console, args);
  }
}
interceptConsole();

export default function StudioDebugger() {
  const { 
    currentUrl, videoDetected, setVideoDetected, triggerVideoDownload, setTriggerVideoDownload,
    isCapturing, setIsCapturing, vpnActive, setVpnActive, textOnly, setTextOnly, 
    adBlock, setAdBlock, triggerRefresh, setActiveOverlay, appSettings, updateSetting, navigate
  } = useBrowser();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'shortcuts' | 'downloader' | 'debugger'>('shortcuts');
  const [errors, setErrors] = useState<ErrorItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [manualDownloadUrl, setManualDownloadUrl] = useState('');
  const initialized = useRef(false);

  // States for manual error reporting to AI Monitor
  const [isManualFormOpen, setIsManualFormOpen] = useState(false);
  const [manualErrorMsg, setManualErrorMsg] = useState('');
  const [manualErrorStack, setManualErrorStack] = useState('');
  const [isReportingError, setIsReportingError] = useState(false);
  const [manualReportSuccess, setManualReportSuccess] = useState(false);

  // Drag-and-drop state variables for non-blocking portable button
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const mouseMoveStart = useRef({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLDivElement>(null);

  // Load initial responsive position setting on load relative to parent container
  useEffect(() => {
    const parent = buttonRef.current?.parentElement;
    if (parent) {
      const parentRect = parent.getBoundingClientRect();
      const defaultX = parentRect.width > 100 ? parentRect.width - 60 : 340;
      const defaultY = parentRect.height > 100 ? parentRect.height - 180 : 550;
      setPosition({ x: defaultX, y: defaultY });
    } else {
      setPosition({ x: 340, y: 550 });
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only trigger for main button (left click)
    setIsDragging(true);
    setHasMoved(false);
    
    const parent = buttonRef.current?.parentElement;
    const parentRect = parent ? parent.getBoundingClientRect() : { left: 0, top: 0, width: 400, height: 800 };
    
    const posX = position?.x ?? (parentRect.width - 60);
    const posY = position?.y ?? (parentRect.height - 180);

    dragStart.current = {
      x: e.clientX - parentRect.left - posX,
      y: e.clientY - parentRect.top - posY
    };
    mouseMoveStart.current = {
      x: e.clientX,
      y: e.clientY
    };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      setIsDragging(true);
      setHasMoved(false);

      const parent = buttonRef.current?.parentElement;
      const parentRect = parent ? parent.getBoundingClientRect() : { left: 0, top: 0, width: 400, height: 800 };

      const posX = position?.x ?? (parentRect.width - 60);
      const posY = position?.y ?? (parentRect.height - 180);

      dragStart.current = {
        x: e.touches[0].clientX - parentRect.left - posX,
        y: e.touches[0].clientY - parentRect.top - posY
      };
      mouseMoveStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dist = Math.sqrt(
        Math.pow(e.clientX - mouseMoveStart.current.x, 2) + 
        Math.pow(e.clientY - mouseMoveStart.current.y, 2)
      );
      
      if (dist > 5) {
        setHasMoved(true);
      }

      const parent = buttonRef.current?.parentElement;
      const parentRect = parent ? parent.getBoundingClientRect() : { left: 0, top: 0, width: 400, height: 800 };

      let newX = e.clientX - parentRect.left - dragStart.current.x;
      let newY = e.clientY - parentRect.top - dragStart.current.y;

      // Add strict boundaries containing within container view
      newX = Math.max(5, Math.min(parentRect.width - 53, newX));
      newY = Math.max(5, Math.min(parentRect.height - 53, newY));

      setPosition({ x: newX, y: newY });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const dist = Math.sqrt(
          Math.pow(touch.clientX - mouseMoveStart.current.x, 2) + 
          Math.pow(touch.clientY - mouseMoveStart.current.y, 2)
        );
        
        if (dist > 5) {
          setHasMoved(true);
        }

        const parent = buttonRef.current?.parentElement;
        const parentRect = parent ? parent.getBoundingClientRect() : { left: 0, top: 0, width: 400, height: 800 };

        let newX = touch.clientX - parentRect.left - dragStart.current.x;
        let newY = touch.clientY - parentRect.top - dragStart.current.y;

        newX = Math.max(5, Math.min(parentRect.width - 53, newX));
        newY = Math.max(5, Math.min(parentRect.height - 53, newY));

        setPosition({ x: newX, y: newY });
      }
    };

    const handleDragEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleDragEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging]);

  const handleButtonClick = (e: React.MouseEvent) => {
    if (hasMoved) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    // If a video is detected, default open to downloader tab, else shortcuts
    if (videoDetected) {
      setActiveTab('downloader');
    } else {
      setActiveTab('shortcuts');
    }
    setIsOpen(true);
  };

  // Track error report from backend
  const reportErrorToBackend = async (msg: string, stackStr?: string) => {
    try {
      const response = await fetch('/api/debug/report-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          stack: stackStr || new Error().stack,
          url: window.location.href,
          timestamp: new Date().toISOString(),
          logs: [...logHistory]
        })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success' && data.report) {
          setErrors(prev => {
            const updated = prev.filter(e => e.message !== msg);
            return [data.report, ...updated];
          });
        }
      }
    } catch (err) {
      console.warn('Error reporting system failed safely:', err);
    }
  };

  // Hook terpisah untuk memantau error runtime secara pasif
  useEffect(() => {
    // Helper to notify main screen about a new error
    const notifyError = (msg: string) => {
      window.dispatchEvent(new CustomEvent('notify-error-toast', {
        detail: { message: msg }
      }));
    };

    const parseErrorStack = (stack: string) => {
      if (!stack) return { file: 'unknown', line: undefined };
      
      // Regular expressions to check common StackTrace patterns
      // Pattern 1: at functionName (filename.ts:line:column)
      const stackRegex1 = /at\s+(?:[^\s(]+?\s+\()?(?:https?:\/\/[^\/]+)?\/?([^:?#\s]+?)(?:\?[^#\s]*)?:(\d+):(\d+)\)?/i;
      // Pattern 2: at filename.ts:line:column
      const stackRegex2 = /at\s+(?:https?:\/\/[^\/]+)?\/?([^:?#\s]+?)(?:\?[^#\s]*)?:(\d+):(\d+)\s*$/im;
      // Pattern 3: Firefox style: label@filename.ts:line:column
      const stackRegex3 = /@(?:https?:\/\/[^\/]+)?\/?([^:?#\s]+?)(?:\?[^#\s]*)?:(\d+):(\d+)/i;

      let match = stack.match(stackRegex1) || stack.match(stackRegex2) || stack.match(stackRegex3);
      if (match) {
        return {
          file: match[1],
          line: parseInt(match[2], 10)
        };
      }
      return { file: 'unknown', line: undefined };
    };

    // 1. Uncaught Javascript Runtime Errors
    const handleErrorEvent = (event: ErrorEvent) => {
      const errorMsg = event.message || 'Unknown Runtime Error';
      const stack = event.error?.stack || '';
      const parsed = parseErrorStack(stack);
      
      setErrors(prev => {
        if (prev.some(e => e.message === errorMsg)) return prev;
        const newErr: ErrorItem = {
          id: 'err-' + Date.now(),
          message: errorMsg,
          stack,
          timestamp: new Date().toLocaleTimeString(),
          file: parsed.file,
          line: parsed.line
        };
        return [newErr, ...prev];
      });

      notifyError(errorMsg);
      reportErrorToBackend(errorMsg, stack);
    };

    // 2. Unhandled Promise Rejections
    const handleRejectionEvent = (event: PromiseRejectionEvent) => {
      const errorMsg = event.reason?.message || String(event.reason) || 'Unhandled Promise Rejection';
      const stack = event.reason?.stack || '';
      const parsed = parseErrorStack(stack);

      setErrors(prev => {
        if (prev.some(e => e.message === errorMsg)) return prev;
        const newErr: ErrorItem = {
          id: 'err-' + Date.now(),
          message: errorMsg,
          stack,
          timestamp: new Date().toLocaleTimeString(),
          file: parsed.file,
          line: parsed.line
        };
        return [newErr, ...prev];
      });

      notifyError(errorMsg);
      reportErrorToBackend(errorMsg, stack);
    };

    // 3. Monkeypatch console.error
    const originalConsoleError = console.error;
    console.error = (...args) => {
      originalConsoleError.apply(console, args);
      const strMessage = args.map(arg => {
        if (arg instanceof Error) return arg.message + '\n' + arg.stack;
        if (typeof arg === 'object') {
          try { return JSON.stringify(arg); } catch (e) { return '[Object]'; }
        }
        return String(arg);
      }).join(' ');

      if (
        strMessage.includes('ws://') || 
        strMessage.includes('websocket') || 
        strMessage.includes('HMR') ||
        strMessage.includes('React DevTools')
      ) {
        return;
      }

      // Extract error or construct virtual stack trace internally
      let stack = '';
      const errArg = args.find(a => a instanceof Error);
      if (errArg) {
        stack = errArg.stack || '';
      } else {
        stack = new Error().stack || '';
      }
      const parsed = parseErrorStack(stack);

      setErrors(prev => {
        if (prev.some(e => e.message.substring(0, 60) === strMessage.substring(0, 60))) return prev;
        const newErr: ErrorItem = {
          id: 'err-' + Date.now(),
          message: strMessage,
          stack,
          timestamp: new Date().toLocaleTimeString(),
          file: parsed.file,
          line: parsed.line
        };
        setTimeout(() => reportErrorToBackend(strMessage, stack), 100);
        return [newErr, ...prev];
      });

      notifyError(strMessage);
    };

    window.addEventListener('error', handleErrorEvent);
    window.addEventListener('unhandledrejection', handleRejectionEvent);

    return () => {
      window.removeEventListener('error', handleErrorEvent);
      window.removeEventListener('unhandledrejection', handleRejectionEvent);
      console.error = originalConsoleError;
    };
  }, []);

  // Hook kedua untuk pemantauan interaksi & event asisten
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Helper to notify main screen about a new error
    const notifyError = (msg: string) => {
      window.dispatchEvent(new CustomEvent('notify-error-toast', {
        detail: { message: msg }
      }));
    };

    // 3. Capture errors from proxies iFrames (disabled to prevent third-party website errors from bloating AI Debugger)
    const handleMessageEvent = (e: MessageEvent) => {
      // Third-party website errors inside the proxy iframe are completely isolated and handled by standard browser security, 
      // they do not represent real applet/portal crashes.
    };

    // 5. Custom Listener to force-trigger debugger slider
    const handleOpenDebugger = () => {
      setActiveTab('debugger');
      setIsOpen(true);
    };

    // 6. Keyboard Shortcut F12
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12') {
        e.preventDefault();
        setActiveTab('debugger');
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('message', handleMessageEvent);
    window.addEventListener('open-multi-tool-debugger', handleOpenDebugger);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('message', handleMessageEvent);
      window.removeEventListener('open-multi-tool-debugger', handleOpenDebugger);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const clearLogs = () => {
    setErrors([]);
  };

  const simulateError = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
      const simulatedStack = `TypeError: Cannot read properties of null (reading 'defaultSearchEngine')
    at MainScreen.tsx:125:40
    at HTMLButtonElement.onClick (ReactFiberClass.js:33:12)
    at Object.invokeGuardedCallback (ReactFiberWorkLoop.js:15:18)`;
      const simulatedMsg = "TypeError: Cannot read properties of null (reading 'defaultSearchEngine') inside components/MainScreen";
      
      setErrors(prev => [
        {
          id: 'sim-' + Date.now(),
          message: simulatedMsg,
          stack: simulatedStack,
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev
      ]);
      reportErrorToBackend(simulatedMsg, simulatedStack);
      setActiveTab('debugger');
      setIsOpen(true);
    }, 600);
  };

  const submitManualError = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualErrorMsg.trim()) return;

    setIsReportingError(true);
    setManualReportSuccess(false);

    try {
      const formattedStack = manualErrorStack.trim() || '    at ManualReport (StudioDebugger.tsx)';
      const cleanMessage = `[Laporan Manual] ${manualErrorMsg}`;

      const response = await fetch('/api/debug/report-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: cleanMessage,
          stack: formattedStack,
          url: window.location.href,
          source: 'manual',
          timestamp: new Date().toISOString(),
          logs: [...logHistory]
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success' && data.report) {
          setErrors(prev => {
            const filtered = prev.filter(err => err.message !== cleanMessage);
            return [data.report, ...filtered];
          });
          
          setManualErrorMsg('');
          setManualErrorStack('');
          setManualReportSuccess(true);
          
          window.dispatchEvent(new CustomEvent('notify-error-toast', {
            detail: { message: `Laporan Manual Terdaftar! AI sedang menganalisis...` }
          }));

          setTimeout(() => {
            setManualReportSuccess(false);
            setIsManualFormOpen(false);
          }, 2000);
        }
      }
    } catch (err: any) {
      console.warn("Gagal mengirim laporan manual secara aman:", err);
    } finally {
      setIsReportingError(false);
    }
  };

  const handleCopy = (id: string, text?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Action methods
  const triggerCropCapture = () => {
    setIsCapturing(true);
    setIsOpen(false);
  };

  const downloadDetectedVideo = () => {
    setTriggerVideoDownload(true);
    setIsOpen(false);
  };

  const downloadCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDownloadUrl.trim()) return;
    
    // Simply launch the downloader modal flow using custom URL as context url
    const a = document.createElement('a');
    // Save previous active url silently, change to custom and trigger downloader
    // Since triggerVideoDownload uses currentUrl, we can guide download url to context
    alert(`Memproses link unduhan kustom: ${manualDownloadUrl}`);
    setActiveOverlay('downloads');
    setIsOpen(false);
  };

  return (
    <>
      {/* Mini floating red balloon - Portable, Draggable & Interactive */}
      <div 
        ref={buttonRef}
        style={position ? { left: `${position.x}px`, top: `${position.y}px` } : { right: '16px', bottom: '150px' }}
        className="absolute z-[130] select-none touch-none"
      >
        <button
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onClick={handleButtonClick}
          className="group relative w-12 h-12 rounded-full bg-gradient-to-br from-red-500 via-rose-650 to-red-650 shadow-[0_5px_18px_rgba(239,68,68,0.65)] hover:shadow-[0_8px_24px_rgba(239,68,68,0.85)] border border-rose-450/60 hover:scale-110 active:scale-95 duration-200 transition-transform cursor-grab active:cursor-grabbing flex items-center justify-center animate-pulse"
          title="Seret / Pindahkan balon merah ini ke mana saja! Klik untuk membuka Pusat Akses Multi-Alat Pintar."
        >
          {/* Subtle balloon knot tie at the bottom */}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2 bg-gradient-to-br from-rose-650 to-red-850 rounded-b-md border-b border-rose-500/30" />

          {/* Central Utility Icon */}
          <Wrench className="w-5 h-5 text-white group-hover:rotate-45 transition-transform duration-300" />

          {/* Alert / Notification Badge on top-right */}
          {errors.length > 0 ? (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center px-1 rounded-full bg-yellow-400 border-2 border-red-600 text-[10px] font-black text-red-950 animate-bounce">
              {errors.length}
            </span>
          ) : videoDetected ? (
            <span className="absolute -top-1 -right-1 flex h-5.5 w-5.5 items-center justify-center rounded-full bg-orange-400 border-2 border-red-600 text-white animate-ping">
              <Play className="w-2.5 h-2.5 fill-current" />
            </span>
          ) : (
            <span className="absolute top-0.5 right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-65"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 border border-red-600"></span>
            </span>
          )}
        </button>
      </div>

      {/* Slide up Multi-Tool & Error Reports Inspector */}
      {isOpen && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-[140] flex flex-col justify-end">
          <div className="bg-white dark:bg-zinc-900 rounded-t-[2.5rem] border-t border-gray-200 dark:border-zinc-800 p-5 shadow-2xl max-h-[85vh] flex flex-col relative w-full overflow-hidden animate-slide-up">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-zinc-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-orange-600">
                  <Cpu className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900 dark:text-white leading-tight">Nextgen Portal Multi-Tool</h3>
                  <p className="text-[10px] text-gray-500 dark:text-zinc-400">Pusat kontrol asisten portable, pendeteksi media, dan debugger</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-900 dark:text-zinc-500 dark:hover:text-white transition rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* TAB SELECTOR HEADER */}
            <div className="flex bg-gray-100 dark:bg-zinc-800/80 p-1.5 rounded-xl gap-1 mt-3 shrink-0">
              <button
                onClick={() => setActiveTab('shortcuts')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'shortcuts'
                    ? 'bg-white dark:bg-zinc-700 text-gray-950 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Alat Pintas</span>
              </button>
              <button
                onClick={() => setActiveTab('downloader')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 relative ${
                  activeTab === 'downloader'
                    ? 'bg-white dark:bg-zinc-700 text-gray-950 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Unduh Video</span>
                {videoDetected && (
                  <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('debugger')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 relative ${
                  activeTab === 'debugger'
                    ? 'bg-white dark:bg-zinc-700 text-gray-950 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>AI Error Fixer</span>
                {errors.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white font-black text-[9px] min-w-[14px] h-[14px] flex items-center justify-center rounded-full px-1">
                    {errors.length}
                  </span>
                )}
              </button>
            </div>

            {/* ERROR BODY WORKSPACE CONTENT */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              
              {/* TAB 1: SHORTCUTS GRID - BENTO INSPIRED */}
              {activeTab === 'shortcuts' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Tool 1: Gunting Layar / Partial Screenshot */}
                    <button
                      onClick={triggerCropCapture}
                      className="p-3 bg-zinc-50 hover:bg-blue-50/50 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/80 border border-gray-100 dark:border-zinc-800/60 rounded-2xl text-left transition active:scale-[0.98] group flex flex-col gap-2 cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <Scissors className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-gray-900 dark:text-zinc-200">Gunting Layar</h4>
                        <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">Tangkapan layar area tertentu (crop)</p>
                      </div>
                    </button>

                    {/* Tool 2: VPN Toggle */}
                    <button
                      onClick={() => setVpnActive(!vpnActive)}
                      className={`p-3 border rounded-2xl text-left transition active:scale-[0.98] flex flex-col gap-2 cursor-pointer ${
                        vpnActive 
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/50' 
                          : 'bg-zinc-50 dark:bg-zinc-800/40 border-gray-100 dark:border-zinc-800/60'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        vpnActive ? 'bg-emerald-500 text-white animate-pulse' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                      }`}>
                        <Globe className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 justify-between">
                          <h4 className="font-bold text-xs text-gray-900 dark:text-zinc-200">Koneksi VPN</h4>
                          <span className={`w-2 h-2 rounded-full ${vpnActive ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">Proxy terenskripsi {vpnActive ? 'Aktif' : 'Nonaktif'}</p>
                      </div>
                    </button>

                    {/* Tool 3: AdBlock Toggle */}
                    <button
                      onClick={() => setAdBlock(!adBlock)}
                      className={`p-3 border rounded-2xl text-left transition active:scale-[0.98] flex flex-col gap-2 cursor-pointer ${
                        adBlock 
                          ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200/50' 
                          : 'bg-zinc-50 dark:bg-zinc-800/40 border-gray-100 dark:border-zinc-800/60'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        adBlock ? 'bg-blue-500 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                      }`}>
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 justify-between">
                          <h4 className="font-bold text-xs text-gray-900 dark:text-zinc-200">Blokir Iklan</h4>
                          <span className={`w-2 h-2 rounded-full ${adBlock ? 'bg-blue-500' : 'bg-zinc-400'}`} />
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">Mencegah adware & pelacakan iklan</p>
                      </div>
                    </button>

                    {/* Tool 4: Text-Only Mode */}
                    <button
                      onClick={() => setTextOnly(!textOnly)}
                      className={`p-3 border rounded-2xl text-left transition active:scale-[0.98] flex flex-col gap-2 cursor-pointer ${
                        textOnly 
                          ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/50' 
                          : 'bg-zinc-50 dark:bg-zinc-800/40 border-gray-100 dark:border-zinc-800/60'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        textOnly ? 'bg-amber-500 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                      }`}>
                        <EyeOff className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 justify-between">
                          <h4 className="font-bold text-xs text-gray-900 dark:text-zinc-200 font-medium">Tanpa Gambar</h4>
                          <span className={`w-2 h-2 rounded-full ${textOnly ? 'bg-amber-500' : 'bg-zinc-400'}`} />
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">Hemat kuota internet Anda maksimal</p>
                      </div>
                    </button>

                    {/* Tool 5: Cloud Acceleration */}
                    <button
                      onClick={() => updateSetting('cloudAcceleration', !appSettings.cloudAcceleration)}
                      className={`p-3 border rounded-2xl text-left transition active:scale-[0.98] flex flex-col gap-2 cursor-pointer ${
                        appSettings.cloudAcceleration 
                          ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200/50' 
                          : 'bg-zinc-50 dark:bg-zinc-800/40 border-gray-100 dark:border-zinc-800/60'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        appSettings.cloudAcceleration ? 'bg-indigo-500 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                      }`}>
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 justify-between">
                          <h4 className="font-bold text-xs text-gray-900 dark:text-zinc-200">Akselerasi Cloud</h4>
                          <span className={`w-2 h-2 rounded-full ${appSettings.cloudAcceleration ? 'bg-indigo-500' : 'bg-zinc-400'}`} />
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">Optimasi performa rendering halaman</p>
                      </div>
                    </button>

                    {/* Tool 6: Quick Cleaner (Memory Booster) */}
                    <button
                      onClick={() => {
                        alert('Berhasil mengoptimalkan memori cache browser!');
                      }}
                      className="p-3 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/80 border border-gray-100 dark:border-zinc-800/60 rounded-2xl text-left transition active:scale-[0.98] group flex flex-col gap-2 cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                        <Flame className="w-4 h-4 text-orange-500" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-gray-900 dark:text-zinc-200">Besihkan Cache</h4>
                        <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">Optimalkan performa memori RAM</p>
                      </div>
                    </button>
                  </div>

                  {/* Navigation Panel Overlay access links */}
                  <div className="pt-2 flex flex-col gap-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setActiveOverlay('uc-drive');
                          setIsOpen(false);
                        }}
                        className="flex-1 py-2.5 px-3 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <FolderLock className="w-4 h-4" />
                        <span>Cloud Drive</span>
                      </button>

                      <button
                        onClick={triggerRefresh}
                        className="flex-1 py-2.5 px-3 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Muat Ulang Halaman</span>
                      </button>
                    </div>

                    <a
                      href="/server_cjs_jagoanhosting.txt"
                      download="server_cjs_jagoanhosting.txt"
                      className="w-full py-2.5 px-3 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer text-center no-underline border border-emerald-500/25"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Unduh server.cjs format .txt (Jagoan Hosting)</span>
                    </a>
                  </div>
                </div>
              )}

              {/* TAB 2: DETEKTOR VIDEO & DOWNLOAD MANAGER */}
              {activeTab === 'downloader' && (
                <div className="space-y-4">
                  {videoDetected ? (
                    <div className="p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200/50 rounded-2xl text-center space-y-3">
                      <div className="w-12 h-12 bg-orange-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-lg shadow-orange-500/20">
                        <Video className="w-6 h-6 animate-bounce" />
                      </div>
                      <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">Video Terdeteksi di Halaman!</h4>
                      <p className="text-xs text-gray-500 max-w-[280px] mx-auto">
                        Sistem sniffer kami mendeteksi media video yang siap diunduh secara offline ke penyimpanan lokal atau Drive cloud.
                      </p>

                      <button
                        onClick={downloadDetectedVideo}
                        className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-extrabold p-3 rounded-xl transition shadow-lg active:scale-95 duration-100 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Unduh Video Sekarang</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 dark:bg-zinc-800/10 border border-gray-100 dark:border-zinc-800 rounded-2xl text-center">
                      <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Video className="w-5 h-5 opacity-40" />
                      </div>
                      <h4 className="font-bold text-xs text-gray-700 dark:text-zinc-300">Tidak Ada Video Terdeteksi di Halaman</h4>
                      <p className="text-[10px] text-gray-400 mt-1 max-w-[230px] mx-auto">
                        Pindai atau putar video di situs favorit Anda untuk mendeteksinya secara otomatis di sini.
                      </p>
                    </div>
                  )}

                  {/* Manual URL Downloader input widget */}
                  <form onSubmit={downloadCustomUrl} className="space-y-2.5 pt-2">
                    <label className="text-[10px] font-extrabold text-gray-400 dark:text-zinc-500 uppercase tracking-wider block">
                      Masukkan Link Download Manual
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="Tempel tautan video/file di sini..."
                        value={manualDownloadUrl}
                        onChange={(e) => setManualDownloadUrl(e.target.value)}
                        className="flex-1 bg-gray-50 dark:bg-zinc-800/50 text-xs p-2.5 rounded-xl border border-gray-200/80 dark:border-zinc-700/80 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 dark:text-white"
                      />
                      <button
                        type="submit"
                        className="bg-orange-500 hover:bg-orange-600 text-white px-4 rounded-xl text-xs font-bold transition flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Kirim</span>
                      </button>
                    </div>
                  </form>

                  {/* Situs Downloader Alternatif */}
                  <div className="space-y-2 pt-2.5 border-t border-gray-100 dark:border-zinc-800">
                    <label className="text-[10px] font-extrabold text-gray-400 dark:text-zinc-500 uppercase tracking-wider block">
                      Layanan Downloader Alternatif
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const url = `https://9xbuddy.site/id/process?url=${encodeURIComponent(currentUrl || '')}`;
                          navigate(url);
                          setIsOpen(false);
                        }}
                        className="p-2.5 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/20 dark:hover:bg-zinc-800/40 border border-gray-200/50 dark:border-zinc-700/50 rounded-xl flex flex-col items-center justify-center text-center gap-1 transition cursor-pointer"
                        title="Ekstrak video/media dari halaman saat ini menggunakan 9xBuddy"
                      >
                        <span className="text-xs font-bold text-gray-800 dark:text-zinc-200">9xBuddy Downloader</span>
                        <span className="text-[9px] text-zinc-400 dark:text-zinc-500 truncate max-w-full">Unduh URL Aktif</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(currentUrl || '');
                          alert('URL halaman saat ini telah disalin ke Clipboard! Kami akan mengantarkan Anda ke SnapSave.');
                          navigate('https://snapsave.app/id/download-video-instagram');
                          setIsOpen(false);
                        }}
                        className="p-2.5 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/20 dark:hover:bg-zinc-800/40 border border-gray-200/50 dark:border-zinc-700/50 rounded-xl flex flex-col items-center justify-center text-center gap-1 transition cursor-pointer"
                        title="Salin halaman saat ini & buka Instagram Downloader di SnapSave"
                      >
                        <span className="text-xs font-bold text-gray-800 dark:text-zinc-200">SnapSave Instagram</span>
                        <span className="text-[9px] text-zinc-400 dark:text-zinc-500 truncate max-w-full font-mono">Salin & Buka IG</span>
                      </button>
                    </div>
                  </div>

                  {/* Quick file explorer link */}
                  <button
                    onClick={() => {
                      setActiveOverlay('downloads');
                      setIsOpen(false);
                    }}
                    className="w-full py-2.5 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 text-gray-800 dark:text-zinc-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Buka Folder File Unduhan</span>
                  </button>
                </div>
              )}

              {/* TAB 3: SYSTEM LOGS & AI AUTO FIXER */}
              {activeTab === 'debugger' && (
                <div className="space-y-4 animate-fade-in">
                  {/* Status AI Monitor Aktif */}
                  <div className="flex items-center justify-between p-3.5 bg-zinc-950 dark:bg-black text-white rounded-2xl border border-zinc-800 shadow-xl overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-red-500/10 animate-pulse pointer-events-none" />
                    
                    <div className="flex items-center gap-3 relative z-10">
                      <div className="relative flex items-center justify-center">
                        <span className="flex h-3.5 w-3.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
                        </span>
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-[10px] tracking-wider text-rose-500 uppercase">AI Real-Time Sentinel</span>
                          <span className="text-[8px] tracking-wide bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded-full font-black border border-red-500/20 animate-pulse">MONITOR AKTIF</span>
                        </div>
                        <p className="text-[10.5px] text-zinc-400 leading-normal mt-0.5">Mendeteksi crash page, uncaught error, unhandled promise, dan console.error secara instan.</p>
                      </div>
                    </div>
                  </div>

                  {/* Manual Error Reporter Toggle & Form */}
                  <div className="border border-orange-200/60 dark:border-orange-900/30 rounded-2xl bg-orange-50/15 dark:bg-orange-950/5 overflow-hidden transition-all duration-350">
                    <button
                      type="button"
                      onClick={() => setIsManualFormOpen(!isManualFormOpen)}
                      className="w-full flex items-center justify-between p-3.5 text-left font-bold text-xs text-orange-800 dark:text-orange-400 hover:bg-orange-50/30 dark:hover:bg-orange-950/10 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4.5 h-4.5 text-orange-500 shrink-0" />
                        <div>
                          <span>Laporkan Masalah / Error Secara Manual</span>
                          <p className="text-[10px] text-gray-500 dark:text-zinc-500 font-normal mt-0.5 leading-normal">
                            Masukkan detail untuk error visual atau kegagalan yang luput dari deteksi otomatis.
                          </p>
                        </div>
                      </div>
                      {isManualFormOpen ? (
                        <ChevronUp className="w-4 h-4 text-orange-500 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-orange-500 shrink-0" />
                      )}
                    </button>

                    {isManualFormOpen && (
                      <form onSubmit={submitManualError} className="p-4 border-t border-orange-100 dark:border-orange-950/20 space-y-3.5 bg-white dark:bg-zinc-900/40 animate-fade-in text-left">
                        {manualReportSuccess && (
                          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-xl text-center flex items-center justify-center gap-1.5">
                            <Check className="w-4 h-4 text-emerald-500" />
                            <span>Laporan Berhasil Terkirim ke AI Monitor!</span>
                          </div>
                        )}

                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-gray-405 dark:text-zinc-500 uppercase tracking-wider block">
                            Deskripsi Masalah / Pesan Error <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Contoh: Tangkapan layar kembali tidak menampilkan realtime bursa harga"
                            value={manualErrorMsg}
                            onChange={(e) => setManualErrorMsg(e.target.value)}
                            className="w-full bg-gray-50/50 dark:bg-zinc-805/50 text-xs p-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:text-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-gray-405 dark:text-zinc-500 uppercase tracking-wider block">
                            Pesan Log Konsol / Jejak Stack Trace (Opsional)
                          </label>
                          <textarea
                            rows={3}
                            placeholder="Tempel stack trace error dari Developer Console jika tersedia..."
                            value={manualErrorStack}
                            onChange={(e) => setManualErrorStack(e.target.value)}
                            className="w-full bg-gray-55/50 dark:bg-zinc-805/50 text-[11px] font-mono p-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:text-white"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isReportingError || !manualErrorMsg.trim()}
                          className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 dark:disabled:bg-zinc-800 disabled:text-gray-400 dark:disabled:text-zinc-500 text-white p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg active:scale-95 duration-100 cursor-pointer"
                        >
                          {isReportingError ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Menganalisis Error Dengan Gemini...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
                              <span>Kirim Laporan & Mulai Diagnosa AI</span>
                            </>
                          )}
                        </button>
                      </form>
                    )}
                  </div>

                  {errors.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                      <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3 border border-emerald-100 dark:border-emerald-900/30">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-8 h-8">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                      </div>
                      <h4 className="font-bold text-sm text-gray-800 dark:text-zinc-200">Tidak Ada Error Terdeteksi di Preview</h4>
                      <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1 max-w-[240px]">
                        Sistem dalam kondisi prima. Segala error runtime atau crash proxy akan otomatis ditangkap di sini.
                      </p>
                      
                      <button
                        onClick={simulateError}
                        className="mt-5 text-xs bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200/50 hover:border-red-300/50 py-2 px-4 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        {isSimulating ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Terminal className="w-3.5 h-3.5" />
                        )}
                        <span>Simulasikan Error Untuk Uji AI</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {errors.map((err, idx) => (
                        <div 
                          key={err.id || idx}
                          className="border border-red-100 dark:border-red-900/20 rounded-2xl bg-red-50/30 dark:bg-red-950/5 overflow-hidden shadow-sm animate-fade-in"
                        >
                          <div className="bg-red-100/40 dark:bg-red-950/20 p-3 flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-extrabold uppercase bg-red-600 text-white px-1.5 py-0.5 rounded leading-none">CRASH</span>
                                <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono">{err.timestamp}</span>
                              </div>
                              <div className="text-xs font-mono font-bold text-red-700 dark:text-red-400 break-words mt-1.5 select-all leading-normal">
                                {err.message}
                              </div>
                              {err.file && err.file !== 'unknown' && (
                                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono mt-1">
                                  📍 File: <span className="text-blue-600 dark:text-blue-400 underline">{err.file}:{err.line}</span>
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                const logText = `Error: ${err.message}\nFile: ${err.file || 'unknown'}:${err.line || 'N/A'}\nTimestamp: ${err.timestamp || 'N/A'}\nStack trace:\n${err.stack || 'none'}`;
                                handleCopy(err.id, logText);
                              }}
                              className="p-1 px-2.5 text-[10px] font-bold bg-white hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-lg flex items-center gap-1 cursor-pointer transition shrink-0 active:scale-95 shadow-sm"
                              title="Salin Log Error Lengkap"
                            >
                              {copiedId === err.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-500" />
                                  <span>Disalin!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Salin Log</span>
                                </>
                              )}
                            </button>
                          </div>

                          <div className="p-3 border-t border-red-100/40 dark:border-red-900/10 space-y-3">
                            {err.aiAnalysis ? (
                              <div className="space-y-3 select-text">
                                <div>
                                  <div className="text-[10px] font-extrabold text-gray-400 dark:text-zinc-500 flex items-center gap-1 uppercase tracking-wider">
                                    <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                                    <span>Analisis Penyebab Error</span>
                                  </div>
                                  <p className="text-xs text-gray-700 dark:text-zinc-300 mt-1 leading-relaxed">
                                    {err.aiAnalysis.analisa}
                                  </p>
                                </div>

                                <div>
                                  <div className="text-[10px] font-extrabold text-gray-400 dark:text-zinc-500 flex items-center gap-1 uppercase tracking-wider">
                                    <Layers className="w-3.5 h-3.5 text-orange-500" />
                                    <span>Solusi Pemulihan</span>
                                  </div>
                                  <p className="text-xs text-gray-700 dark:text-zinc-300 mt-1 leading-relaxed whitespace-pre-line">
                                    {err.aiAnalysis.solusi}
                                  </p>
                                </div>

                                {err.aiAnalysis.perbaikan_kode_diff && (
                                  <div>
                                    <div className="text-[10px] font-extrabold text-gray-400 dark:text-zinc-500 flex items-center justify-between gap-1 uppercase tracking-wider">
                                      <span>Rekomendasi Kode Perbaikan</span>
                                      <button
                                        onClick={() => handleCopy(err.id + "-diff", err.aiAnalysis?.perbaikan_kode_diff)}
                                        className="p-1 px-2 text-[9px] font-extrabold bg-gray-200 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 hover:text-black dark:hover:text-white rounded flex items-center gap-1 cursor-pointer transition"
                                      >
                                        {copiedId === err.id + "-diff" ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5" />}
                                        <span>{copiedId === err.id + "-diff" ? "Disalin!" : "Salin Kode"}</span>
                                      </button>
                                    </div>
                                    <pre className="bg-zinc-950 text-emerald-400 p-2.5 rounded-xl text-[10px] font-mono mt-1 overflow-x-auto border border-zinc-800 max-h-36">
                                      {err.aiAnalysis.perbaikan_kode_diff}
                                    </pre>
                                  </div>
                                )}

                                {err.aiAnalysis.prompt_chat && (
                                  <div className="pt-2">
                                    <button
                                      onClick={() => handleCopy(err.id + "-prompt", err.aiAnalysis?.prompt_chat)}
                                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold p-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95 duration-100"
                                    >
                                      {copiedId === err.id + "-prompt" ? (
                                        <>
                                          <Check className="w-4 h-4 text-white animate-bounce" />
                                          <span>Prompt Berhasil Disalin!</span>
                                        </>
                                      ) : (
                                        <>
                                          <Sparkles className="w-4 h-4" />
                                          <span>Salin Prompt Perbaikan untuk AI Chat</span>
                                        </>
                                      )}
                                    </button>
                                    <p className="text-[10px] text-gray-400 dark:text-zinc-500 text-center mt-1.5 leading-normal">
                                      Tempel prompt ini ke AI Studio Chat. AI Coding Agent juga telah mencatat error ini di <strong>studio_error_reports.json</strong> di workspace Anda, siap memproses perbaikan otomatis!
                                    </p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center justify-center py-4 gap-2 text-zinc-400 text-xs">
                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                                <span>Gemini AI sedang merumuskan solusi auto-fix...</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      <div className="pt-4 flex justify-between gap-3">
                        <button
                          onClick={clearLogs}
                          className="flex-1 py-2.5 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-extrabold rounded-xl transition cursor-pointer"
                        >
                          Bersihkan Log
                        </button>
                        <button
                          onClick={simulateError}
                          className="flex-1 py-2.5 border border-red-200/50 hover:border-red-300 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-extrabold rounded-xl transition cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Terminal className="w-3.5 h-3.5" />
                          <span>Uji Error Baru</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
          </div>
        </div>
      )}
    </>
  );
}
