import React, { useState, useEffect } from 'react';
import { Network, Cloud, RefreshCw, Clock, Search, Star, AlertTriangle, Moon, ChevronRight, Wrench, Copy, Download, FileText, Printer, Info, Fingerprint, ExternalLink, Sparkles, Terminal, X } from 'lucide-react';
import { useBrowser } from '../context/BrowserContext';
import TopBar from './TopBar';
import BottomBar from './BottomBar';
import MainMenu from './MainMenu';
import Overlays from './Overlays';
import ScreenCapture from './tools/ScreenCapture';
import { motion, AnimatePresence } from 'motion/react';

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

export default function MainScreen() {
  const { currentUrl, isDark, textOnly, setCurrentUrl, addDownload, setActiveOverlay, appSettings, addTab, refreshTrigger, vpnActive, vpnConfig, syncUrlSilently, videoDetected, setVideoDetected, videoUrlDetected, setVideoUrlDetected, triggerVideoDownload, setTriggerVideoDownload, addBlockedPopup, blockedPopups, isCapturing, setIsCapturing, setActiveScreen } = useBrowser();
  const [inputUrl, setInputUrl] = useState(currentUrl);
  const [iframeSrc, setIframeSrc] = useState(currentUrl);
  const [hideGoogleWarning, setHideGoogleWarning] = useState(false);
  
  useEffect(() => {
     setInputUrl(currentUrl);
     setHideGoogleWarning(false);
     
     // Deteksi video otomatis berdasarkan URL
     if (currentUrl) {
       let decodedUrl = currentUrl;
       try { decodedUrl = decodeURIComponent(currentUrl); } catch(e) {}
       
       const isVideoDomain = 
         decodedUrl.includes('youtube.com/watch') || 
         decodedUrl.includes('youtu.be/') || 
         decodedUrl.includes('tiktok.com/') || 
         decodedUrl.includes('instagram.com/p/') || 
         decodedUrl.includes('instagram.com/reel/') || 
         decodedUrl.includes('soundcloud.com/') ||
         decodedUrl.toLowerCase().endsWith('.mp4') ||
         decodedUrl.toLowerCase().endsWith('.mkv');
         
       if (isVideoDomain) {
         setVideoDetected(true);
         setVideoUrlDetected(decodedUrl);
       } else {
         setVideoDetected(false);
         setVideoUrlDetected(null);
       }
     }
  }, [currentUrl, setVideoDetected, setVideoUrlDetected]);

  useEffect(() => {
     setIframeSrc(currentUrl);
  }, [refreshTrigger]);

  // Google Search or Google Security check/reCAPTCHA sorry URL matcher
  const isGooglePage = currentUrl && (
      currentUrl.includes("google.com/search") || 
      currentUrl.includes("google.com/sorry") || 
      currentUrl.includes("google.co.id/search") || 
      currentUrl.includes("google.co.id/sorry") ||
      currentUrl.includes("sorry")
  );

  const googleQuery = (() => {
      if (!currentUrl) return "";
      try {
          const u = new URL(currentUrl);
          return u.searchParams.get("q") || "";
      } catch (e) {
          const match = currentUrl.match(/[?&]q=([^&]+)/);
          return match ? decodeURIComponent(match[1]) : "";
      }
  })();

  const [showVideoSniffer, setShowVideoSniffer] = useState(false);
  const [pendingPopupUrl, setPendingPopupUrl] = useState<string | null>(null);
  const [popupBlockedToast, setPopupBlockedToast] = useState<string | null>(null);
  const [lastErrorToast, setLastErrorToast] = useState<{ message: string; timestamp: string } | null>(null);
  const [downloadPromptData, setDownloadPromptData] = useState<{ filename: string, size: number, type: 'video' | 'music' | 'document' | 'other', source?: { isPage?: boolean; url?: string; text?: string; externalUrl?: string } } | null>(null);
  
  // Advanced video download options
  const [activeDownloadTab, setActiveDownloadTab] = useState<'9xbuddy' | 'snap' | 'stream_sniffer'>('snap');
  const [formats9xBuddy, setFormats9xBuddy] = useState<any[]>([]);
  const [fetching9x, setFetching9x] = useState(false);
  const [loadingSnap, setLoadingSnap] = useState(false);
  const [snapParsedData, setSnapParsedData] = useState<any | null>(null);
  const [customStreamUrl, setCustomStreamUrl] = useState('');
  const [selectedQualityFormat, setSelectedQualityFormat] = useState<any | null>(null);
  const [contextMenu, setContextMenu] = useState<{show: boolean, url: string, text: string, link: string | null, image: string | null}>({show: false, url: '', text: '', link: null, image: null});
  const [infoMode, setInfoMode] = useState<'standard' | 'advanced'>('standard');
  const [tapCount, setTapCount] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);

  const handleScreenDoubleOrTripleTap = () => {
    const now = Date.now();
    if (now - lastTapTime < 500) {
      const next = tapCount + 1;
      setTapCount(next);
      if (next >= 3) {
        setInfoMode((m) => {
          const newMode = m === 'standard' ? 'advanced' : 'standard';
          alert(`🔔 Mode Halaman Info diubah ke: ${newMode === 'advanced' ? 'Diagnostik Lanjutan 🚀' : 'Mode Standar 📃'}`);
          return newMode;
        });
        setTapCount(0);
      }
    } else {
      setTapCount(1);
    }
    setLastTapTime(now);
  };

  useEffect(() => {
    const handleNotifyError = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.message) {
        setLastErrorToast({
          message: customEvent.detail.message,
          timestamp: new Date().toLocaleTimeString()
        });
      }
    };
    window.addEventListener('notify-error-toast', handleNotifyError);
    return () => window.removeEventListener('notify-error-toast', handleNotifyError);
  }, []);

  useEffect(() => {
    if (lastErrorToast) {
      const timer = setTimeout(() => {
        setLastErrorToast(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [lastErrorToast]);

  useEffect(() => {
    if (vpnActive && vpnConfig) {
        document.cookie = `vpnProxy=${encodeURIComponent(vpnConfig)}; path=/`;
    } else {
        document.cookie = `vpnProxy=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    }
  }, [vpnActive, vpnConfig]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'navigate' && e.data.url) {
        setCurrentUrl(e.data.url);
        setIframeSrc(e.data.url);
      } else if (e.data?.type === 'open_vpn_screen') {
        setActiveScreen('vpn');
      } else if (e.data?.type === 'open-multi-tool') {
        window.dispatchEvent(new CustomEvent('open-multi-tool-debugger'));
      } else if (e.data?.type === 'popup' && e.data.url) {
        if (appSettings?.blockPopups && !e.data.isClick) {
          addBlockedPopup(e.data.url);
          setPopupBlockedToast(e.data.url);
        } else {
          addTab(e.data.url);
        }
      } else if (e.data?.type === 'loaded' && e.data.url) {
        if (currentUrl !== e.data.url) {
           syncUrlSilently(e.data.url);
        }
      } else if (e.data?.type === 'longpress' || e.data?.type === 'triple-tap') {
        setContextMenu({
           show: true,
           url: e.data.url,
           text: e.data.text,
           link: e.data.link || null,
           image: e.data.image || null
         });
      } else if (e.data?.type === 'download') {
        const filename = e.data.filename || `File_${Math.floor(Math.random() * 10000)}`;
        const isVideoFile = filename.toLowerCase().endsWith('.mp4') || 
                            filename.toLowerCase().endsWith('.mkv') || 
                            filename.toLowerCase().endsWith('.webm') ||
                            e.data.url?.toLowerCase().includes('youtube') ||
                            e.data.url?.toLowerCase().includes('tiktok');

        if (isVideoFile) {
          setVideoDetected(true);
          setShowVideoSniffer(true);
        }

        setDownloadPromptData({
           filename,
           size: 10 * 1024 * 1024, // roughly 10MB simulated for now
           type: isVideoFile ? 'video' : 'other',
           source: { externalUrl: e.data.url }
         });
      } else if (e.data?.type === 'video-detected' || e.data?.videoDetected === true) {
        setVideoDetected(true);
        if (e.data?.videoUrl) {
            setVideoUrlDetected(e.data.videoUrl);
        }
        setShowVideoSniffer(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setCurrentUrl, currentUrl, appSettings?.blockPopups, addTab, addBlockedPopup, setActiveScreen, setVideoDetected, setVideoUrlDetected, setShowVideoSniffer]);

  useEffect(() => {
    const handleOpenElementInfo = () => {
      setContextMenu({
        show: true,
        url: currentUrl || 'Browser Home',
        text: 'Halaman Info Diagnostik Browser',
        link: currentUrl || null,
        image: null
      });
    };
    window.addEventListener('trigger-open-element-info' as any, handleOpenElementInfo);
    return () => window.removeEventListener('trigger-open-element-info' as any, handleOpenElementInfo);
  }, [currentUrl]);

  // Hook untuk mendeteksi usapan pola V pada layar handphone maupun desktop
  useEffect(() => {
    let points: { x: number; y: number; t: number }[] = [];
    let isDrawing = false;

    const handleStart = (x: number, y: number) => {
      points = [{ x, y, t: Date.now() }];
      isDrawing = true;
    };

    const handleMove = (x: number, y: number) => {
      if (!isDrawing) return;
      if (points.length < 300) {
        points.push({ x, y, t: Date.now() });
      }
    };

    const handleEnd = () => {
      if (!isDrawing || points.length < 5) {
        isDrawing = false;
        return;
      }
      isDrawing = false;

      // Cari index dengan nilai Y tertinggi (lembah paling bawah)
      let maxYIdx = 0;
      for (let i = 0; i < points.length; i++) {
        if (points[i].y > points[maxYIdx].y) {
          maxYIdx = i;
        }
      }

      const minPointsRequirement = 2;
      if (maxYIdx >= minPointsRequirement && maxYIdx <= points.length - 1 - minPointsRequirement) {
        const startPoint = points[0];
        const valleyPoint = points[maxYIdx];
        const endPoint = points[points.length - 1];

        const dy1 = valleyPoint.y - startPoint.y; // Turun ke bawah (positif)
        const dx1 = valleyPoint.x - startPoint.x; // Maju ke kanan

        const dy2 = valleyPoint.y - endPoint.y;   // Naik ke atas
        const dx2 = endPoint.x - valleyPoint.x;   // Maju ke kanan

        const minStrokeLength = 40;

        if (dy1 > minStrokeLength && dy2 > minStrokeLength && dx1 > -20 && dx2 > -20) {
          const totalWidth = endPoint.x - startPoint.x;
          if (totalWidth > minStrokeLength) {
            console.log("[Gesture] Pola usapan 'V' terdeteksi! Membuka F12 Web Log...");
            window.dispatchEvent(new CustomEvent('open-multi-tool-debugger'));
            alert("🔒 Gesture 'V' Terdeteksi: Membuka F12 Web Log Debugger!");
          }
        }
      }
      points = [];
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches && e.touches.length === 1) {
        handleStart(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches.length === 1) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        handleStart(e.clientX, e.clientY);
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', handleEnd, { passive: true });
    
    window.addEventListener('mousedown', onMouseDown, { passive: true });
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseup', handleEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', handleEnd);
    };
  }, []);

  useEffect(() => {
    if (popupBlockedToast) {
      const timer = setTimeout(() => {
        setPopupBlockedToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [popupBlockedToast]);

  useEffect(() => {
    setInputUrl(currentUrl);
  }, [currentUrl]);

  // Real-time video detection logic through DOM monitoring & Message communication
  useEffect(() => {
    // Reset video state when URL changes or text-only mode is active
    if (!currentUrl || textOnly || currentUrl.length <= 5) {
      setVideoDetected(false);
      setShowVideoSniffer(false);
      return;
    }

    // Initialize detection as false first
    setVideoDetected(false);
    setShowVideoSniffer(false);

    let found = false;
    let observer: MutationObserver | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    const runDOMDetection = (doc: Document) => {
      if (found) return;
      try {
        // Query elements that suggest active video players or video tags in same-origin DOM
        const videoElement = doc.querySelector('video, audio');
        const sourceElement = doc.querySelector('source[type*="video"], source[type*="audio"], source[src*=".mp4"], source[src*=".mp3"], source[src*=".m4a"], source[src*=".mpeg"], source[src*=".mov"], source[src*=".mkv"], source[src*=".m3u8"], source[src*=".webm"], source[src*=".ogg"], source[src*=".wav"], a[href*=".mp4"], a[href*=".mp3"], a[href*=".m4a"], a[href*=".mpeg"], a[href*=".mov"], a[href*=".mkv"], a[href*=".m3u8"], a[href*=".webm"], a[href*=".ogg"], a[href*=".wav"]');
        const customPlayer = doc.querySelector('#embed_holder, .responsive-embed-stream, .embed-holder, .responsive-embed-iframe, #pembed, .player-embed, .video-content, .video-holder, [data-sentinel-enhanced], .audio-content');
        const videoIframe = doc.querySelector('iframe[src*="youtube"], iframe[src*="youtu.be"], iframe[src*="tiktok"], iframe[src*="instagram"], iframe[src*="soundcloud"], iframe[src*="vimeo"], iframe[src*="dailymotion"]');

        const frameUrl = doc.location?.href || '';
        const isKnownVideoDomain = frameUrl.includes('youtube.com/watch') || 
                                   frameUrl.includes('youtu.be/') || 
                                   frameUrl.includes('tiktok.com/') || 
                                   frameUrl.includes('instagram.com/p/') || 
                                   frameUrl.includes('instagram.com/reel/') || 
                                   frameUrl.includes('soundcloud.com/');

        if (videoElement || sourceElement || customPlayer || videoIframe || isKnownVideoDomain) {
          found = true;
          setVideoDetected(true);
          setShowVideoSniffer(true);
          console.log('[VideoSniffer] Video elements successfully detected inside iframe DOM!');
          cleanup();
        }
      } catch (err) {
        // Safe catch for potential cross-origin boundary or navigation timing quirks
      }
    };

    const cleanup = () => {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };

    const attachDetection = () => {
      try {
        const iframe = document.getElementById('browser-webview-iframe') as HTMLIFrameElement | null;
        if (!iframe) return;

        let doc: Document | null = null;
        try {
          doc = iframe.contentDocument || iframe.contentWindow?.document || null;
        } catch (err) {
          // Blocked cross-origin access, ignore gracefully
        }
        if (!doc) return;

        cleanup();

        // Run immediately on attach
        runDOMDetection(doc);

        // Set up MutationObserver to react to dynamically loaded players
        observer = new MutationObserver(() => {
          runDOMDetection(doc);
        });
        observer.observe(doc.body || doc.documentElement, {
          childList: true,
          subtree: true,
          attributes: true
        });

        // Set up fallback safe poll interval as safety check
        pollInterval = setInterval(() => {
          runDOMDetection(doc);
        }, 1000);

      } catch (e) {
        console.warn('[VideoSniffer] Failed attaching DOM tracker:', e);
      }
    };

    // Attach tracker on iframe initialization & load
    const iframe = document.getElementById('browser-webview-iframe') as HTMLIFrameElement | null;
    if (iframe) {
      attachDetection();
      iframe.addEventListener('load', attachDetection);
    }

    // Standard interval attempt in case the element gets rendered in DOM sluggishly
    const globalPoll = setInterval(() => {
      if (found) {
        clearInterval(globalPoll);
        return;
      }
      try {
        const activeIframe = document.getElementById('browser-webview-iframe') as HTMLIFrameElement | null;
        if (activeIframe) {
          let activeDoc: Document | null = null;
          try {
            activeDoc = activeIframe.contentDocument || activeIframe.contentWindow?.document || null;
          } catch (err) {
            // Blocked cross-origin access, ignore gracefully
          }
          if (activeDoc) {
            if (!observer) {
              attachDetection();
            } else {
              runDOMDetection(activeDoc);
            }
          }
        }
      } catch (err) {
        // Safe catch for interval
      }
    }, 1500);

    return () => {
      cleanup();
      clearInterval(globalPoll);
      const activeIframe = document.getElementById('browser-webview-iframe') as HTMLIFrameElement | null;
      if (activeIframe) {
        activeIframe.removeEventListener('load', attachDetection);
      }
    };
  }, [currentUrl, textOnly, refreshTrigger, setVideoDetected, setShowVideoSniffer]);

  useEffect(() => {
    if (triggerVideoDownload) {
      setTriggerVideoDownload(false);
      handleDownloadDetectedVideo();
    }
  }, [triggerVideoDownload]);

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    let finalUrl = inputUrl.trim();
    if (finalUrl) {
        // Simple check if it looks like a URL (contains a dot, no spaces)
        // or if it already has a protocol.
        const isUrl = /^([a-zA-Z0-9_-]+\.)*[a-zA-Z0-9_-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(finalUrl) && !finalUrl.includes(' ') || finalUrl.startsWith('http://') || finalUrl.startsWith('https://');
        
        if (!isUrl) {
            const query = encodeURIComponent(finalUrl);
            let engine = appSettings?.defaultSearchEngine || 'Google';
            let homeUrl = '';
            let searchUrl = '';
            
            switch (engine) {
                case 'Bing': 
                    homeUrl = 'https://www.bing.com/';
                    searchUrl = `https://www.bing.com/search?q=${query}&adlt=off`; 
                    break;
                case 'DuckDuckGo': 
                    homeUrl = 'https://duckduckgo.com/';
                    searchUrl = `https://duckduckgo.com/?q=${query}&kp=-2`; 
                    break;
                case 'DuckDuckGo Lite': 
                    homeUrl = 'https://html.duckduckgo.com/html/';
                    searchUrl = `https://html.duckduckgo.com/html/?q=${query}`; 
                    break;
                case 'Yandex':
                    homeUrl = 'https://yandex.com/';
                    searchUrl = `https://yandex.com/search/?text=${query}`;
                    break;
                case 'Brave':
                    homeUrl = 'https://search.brave.com/';
                    searchUrl = `https://search.brave.com/search?q=${query}&safesearch=off`;
                    break;
                case 'Yahoo': 
                    homeUrl = 'https://search.yahoo.com/';
                    searchUrl = `https://search.yahoo.com/search?p=${query}&vm=p`; 
                    break;
                case 'Startpage (Google)': 
                    homeUrl = 'https://www.startpage.com/';
                    searchUrl = `https://www.startpage.com/do/dsearch?query=${query}`; 
                    break;
                case 'Google': 
                default: 
                    homeUrl = 'https://www.google.com/';
                    searchUrl = `https://www.google.com/search?q=${query}&safe=off`; 
                    break;
            }
            
            // Buka homepage dulu, baru mencari agar tidak eror (agar menjadi search engine asli)
            setCurrentUrl(homeUrl);
            setInputUrl(homeUrl);
            
            // Clear previous timeout if any to prevent overlapping
            if (typeof window !== 'undefined') {
                if ((window as any).searchTimeout) {
                    clearTimeout((window as any).searchTimeout);
                }
                
                (window as any).searchTimeout = setTimeout(() => {
                    setCurrentUrl(searchUrl);
                    setInputUrl(searchUrl);
                }, 1000); // 1 detik sudah cukup untuk menyimpan cookie homepage
            } else {
                setCurrentUrl(searchUrl);
                setInputUrl(searchUrl);
            }
            return;
        } else if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
            finalUrl = `https://${finalUrl}`;
        }
        setCurrentUrl(finalUrl);
    }
  };

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadDetectedVideo = () => {
    const filename = `Mendeteksi Aliran Video & Media...`;
    const size = 0;
    
    let targetDownloadUrl = videoUrlDetected || currentUrl;
    if (targetDownloadUrl && targetDownloadUrl.includes('/api/proxy?url=')) {
      try {
         const extracted = new URL(targetDownloadUrl).searchParams.get('url');
         if (extracted) {
             targetDownloadUrl = extracted;
         }
      } catch (e) {
         const parts = targetDownloadUrl.split('url=');
         if (parts.length > 1) {
             targetDownloadUrl = decodeURIComponent(parts[1]);
         }
      }
    }
    
    setCustomStreamUrl(targetDownloadUrl);
    setDownloadPromptData({ filename, size, type: 'video', source: { externalUrl: targetDownloadUrl } });
    
    // Proactively fetch formats to build SnapVideo / 9xBuddy options list instantly!
    fetchSnapVideo(targetDownloadUrl);
    fetch9xBuddyFormats(targetDownloadUrl);
  };

  const fetch9xBuddyFormats = async (url: string) => {
    if (!url) return;
    setFetching9x(true);
    setFormats9xBuddy([]);
    setSelectedQualityFormat(null);
    try {
      const response = await fetch('/api/video/9xbuddy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await response.json();
      if (response.ok && data.formats) {
        setFormats9xBuddy(data.formats);
        if (data.formats.length > 0) {
          setSelectedQualityFormat(data.formats[0]);
        }
      } else {
        console.warn('9xBuddy offline/unsupported', data.error);
      }
    } catch (e) {
      console.warn('Gagal menghubungi ekstraktor format 9xBuddy', e);
    } finally {
      setFetching9x(false);
    }
  };

  const fetchSnapVideo = async (url: string) => {
    if (!url) return;
    setLoadingSnap(true);
    setSnapParsedData(null);
    try {
      const response = await fetch('/api/video/snapvideo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await response.json();
      if (response.ok) {
        setSnapParsedData(data);
      } else {
        setSnapParsedData({
          title: 'Direct Link Stream',
          directUrl: url,
          filename: `video_stream_${Date.now()}.mp4`
        });
      }
    } catch (e) {
      setSnapParsedData({
        title: 'Direct Link Stream',
        directUrl: url,
        filename: `video_stream_${Date.now()}.mp4`
      });
    } finally {
      setLoadingSnap(false);
    }
  };

  const handleDownloadActiveMode = async (location: 'cloud' | 'local') => {
    if (isDownloading) return;
    setIsDownloading(true);

    try {
      let targetUrl = videoUrlDetected || currentUrl;
      if (activeDownloadTab === 'stream_sniffer' && customStreamUrl) {
         targetUrl = customStreamUrl;
      }

      if (activeDownloadTab === 'snap') {
         const res = await fetch('/api/video/snapvideo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: targetUrl })
         });
         const data = await res.json();
         if (res.ok && data.directUrl) {
           if (location === 'cloud') {
              const buffRes = await fetch('/api/video/buffer-stream', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ url: data.directUrl, filename: data.filename, target: 'cloud' })
              });
              const buffData = await buffRes.json();
              if (buffRes.ok) {
                addDownload({
                   filename: buffData.filename || data.filename,
                   size: 0,
                   type: 'video',
                   date: new Date().toLocaleDateString(),
                   location
                });
                alert('Video berhasil disniff, disalin & disinkronisasikan ke Cloud Storage!');
              } else {
                alert(`Gagal merekam buffer ke cloud: ${buffData.error}`);
              }
           } else {
              const a = document.createElement('a');
              a.href = data.directUrl;
              a.download = data.filename || `SnapVideo_${Date.now()}.mp4`;
              a.target = '_blank';
              a.click();

              addDownload({
                 filename: data.filename || `SnapVideo_${Date.now()}.mp4`,
                 size: 0,
                 type: 'video',
                 date: new Date().toLocaleDateString(),
                 location
              });
              alert('Unduhan lokal dimulai secara langsung!');
           }
         } else {
           alert(data.error || 'Gagal memproses via SnapVideo.');
         }
      } else if (activeDownloadTab === '9xbuddy') {
         const selectedF = selectedQualityFormat;
         if (!selectedF || !selectedF.url) {
            alert('Silakan pilih salah satu opsi format/kualitas media terlebih dahulu.');
            setIsDownloading(false);
            return;
         }

         const downloadFilename = `${(snapParsedData?.title || downloadPromptData?.filename || 'video').replace(/[/\\?%*:|"<>]/g, '-')}.${selectedF.ext}`;

         if (location === 'cloud') {
            const buffRes = await fetch('/api/video/buffer-stream', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ url: selectedF.url, filename: downloadFilename, target: 'cloud' })
            });
            const buffData = await buffRes.json();
            if (buffRes.ok) {
              addDownload({
                 filename: buffData.filename || downloadFilename,
                 size: 0,
                 type: 'video',
                 date: new Date().toLocaleDateString(),
                 location
              });
              alert('Media (9xBuddy format) berhasil disniff, disalin & disinkronisasikan ke Cloud Storage!');
            } else {
              alert(`Gagal merekam stream ke cloud storage: ${buffData.error}`);
            }
         } else {
            const buffRes = await fetch('/api/video/buffer-stream', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ url: selectedF.url, filename: downloadFilename, target: 'local' })
            });
            const buffData = await buffRes.json();
            if (buffRes.ok && buffData.filename) {
               const a = document.createElement('a');
               a.href = `/api/video/buffers/${buffData.filename}`;
               a.download = downloadFilename;
               a.click();

               addDownload({
                  filename: downloadFilename,
                  size: 0,
                  type: 'video',
                  date: new Date().toLocaleDateString(),
                  location
               });
               alert('Unduhan media (9xBuddy format) berhasil selesai dibuffer & diunduh!');
            } else {
               const a = document.createElement('a');
               a.href = selectedF.url;
               a.download = downloadFilename;
               a.target = '_blank';
               a.click();
               alert('Layanan buffer sibuk. Mengunduh secara langsung dari server!');
            }
         }
      } else {
         const downloadFilename = `SniffedStream_${Date.now()}.mp4`;
         const buffRes = await fetch('/api/video/buffer-stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: targetUrl, filename: downloadFilename, target: location })
         });
         const buffData = await buffRes.json();
         if (buffRes.ok) {
            if (location === 'cloud') {
              addDownload({
                 filename: buffData.filename || downloadFilename,
                 size: 0,
                 type: 'video',
                 date: new Date().toLocaleDateString(),
                 location
              });
              alert('Aliran stream video berhasil ditangkap & disinkronkan ke Cloud Disk!');
            } else {
              const a = document.createElement('a');
              a.href = `/api/video/buffers/${buffData.filename}`;
              a.download = downloadFilename;
              a.click();

              addDownload({
                 filename: downloadFilename,
                 size: 0,
                 type: 'video',
                 date: new Date().toLocaleDateString(),
                 location
              });
              alert('Aliran stream video berhasil ditangkap lengkap & tersimpan di lokal!');
            }
         } else {
            alert(buffData.error || 'Gagal mendaratkan buffer stream video.');
         }
      }
    } catch (e: any) {
      console.error(e);
      alert(`Gagal menyelesaikan unduhan parser server: ${e.message || e}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const confirmDownload = async (location: 'cloud' | 'local') => {
    if (downloadPromptData && !isDownloading) {
        if (downloadPromptData.type === 'video' && downloadPromptData.source?.externalUrl) {
            await handleDownloadActiveMode(location);
            return;
        }
        setIsDownloading(true);
        if (downloadPromptData.source?.isPage) {
            try {
                const content = `<html><body><h2>${downloadPromptData.source.url}</h2><p>${downloadPromptData.source.text}</p></body></html>`;
                const blob = new Blob([content], {type: 'text/html'});
                if (location === 'cloud') {
                    const file = new File([blob], downloadPromptData.filename, {type: 'text/html'});
                    const fd = new FormData(); fd.append('file', file);
                    const response = await fetch('/api/cloud-files/upload', { method: 'POST', body: fd });
                    if (response.ok) {
                        const data = await response.json();
                        addDownload({
                            ...downloadPromptData,
                            filename: data.filename || downloadPromptData.filename,
                            date: new Date().toLocaleDateString(),
                            location
                        });
                        alert(`Halaman disimpan ke Cloud!`);
                    } else {
                        alert('Terjadi kesalahan saat mengupload halaman ke cloud.');
                    }
                } else {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = downloadPromptData.filename;
                    a.click();
                    URL.revokeObjectURL(url);
                    addDownload({
                        ...downloadPromptData,
                        date: new Date().toLocaleDateString(),
                        location
                    });
                }
            } catch(e) { console.error(e); }
        } else if (downloadPromptData.source?.externalUrl) { // Other general files
            try {
                if (location === 'cloud') {
                    const response = await fetch('/api/cloud-files/download-url', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: downloadPromptData.source.externalUrl, filename: downloadPromptData.filename })
                    });
                    if (response.ok) {
                        const data = await response.json();
                        addDownload({
                            ...downloadPromptData,
                            filename: data.filename || downloadPromptData.filename,
                            date: new Date().toLocaleDateString(),
                            location
                        });
                        alert(`File diunduh ke Cloud!`);
                    } else {
                        const data = await response.json();
                        alert(data.error || 'Terjadi kesalahan saat menyimpan ke cloud.');
                    }
                } else {
                    const filename = downloadPromptData.filename;
                    const a = document.createElement('a');
                    a.href = `/api/proxy-download?filename=${encodeURIComponent(filename)}&url=${encodeURIComponent(downloadPromptData.source.externalUrl)}`;
                    a.download = filename;
                    a.click();
                    addDownload({
                        ...downloadPromptData,
                        date: new Date().toLocaleDateString(),
                        location
                    });
                }
            } catch(e) { console.error(e); }
        }

        setIsDownloading(false);
        setDownloadPromptData(null);
        setShowVideoSniffer(false);
        setActiveOverlay('downloads');
    }
  };

    let iframeZoom = 1;
    if (appSettings?.fontSize === '80%') iframeZoom = 0.8;
    if (appSettings?.fontSize === '120%') iframeZoom = 1.2;
    if (appSettings?.fontSize === '150%') iframeZoom = 1.5;

    let brightnessOverlay = null;
    if (appSettings?.brightness === 'Redup') {
        brightnessOverlay = <div className="absolute inset-0 bg-black/40 pointer-events-none z-10" />;
    } else if (appSettings?.brightness === 'Terang Maksimal') {
        brightnessOverlay = <div className="absolute inset-0 bg-white/10 pointer-events-none z-10 mix-blend-overlay" />;
    }

  return (
    <div id="browser-wrapper" className="flex flex-col h-full bg-white dark:bg-[#121212] overflow-hidden relative w-full">
        <TopBar inputUrl={inputUrl} setInputUrl={setInputUrl} onNavigate={handleNavigate} />
        
        <div className="flex-1 w-full bg-gray-50 dark:bg-[#1a1a1a] relative z-0 flex flex-col overflow-y-auto no-scrollbar overflow-hidden relative">
            {brightnessOverlay}
            {currentUrl === '' ? (
                <HomeScreen />
            ) : !textOnly ? (
                <div className="flex-1 w-full h-full flex flex-col overflow-hidden relative">
                    {/* Google Search Assistance Bar */}
                    {isGooglePage && !hideGoogleWarning && (
                        <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200/50 dark:border-amber-900/40 p-4 px-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs text-amber-850 dark:text-amber-300 z-10 shrink-0 select-none animate-fade-in shadow-md relative pr-11">
                            {/* Option to dismiss/hide the warning bar */}
                            <button
                                type="button"
                                onClick={() => setHideGoogleWarning(true)}
                                className="absolute top-2.5 right-2.5 text-amber-600 hover:text-amber-900 dark:text-amber-500 dark:hover:text-amber-200 transition p-1 hover:bg-amber-200/30 dark:hover:bg-amber-800/30 rounded-lg cursor-pointer flex items-center justify-center border-none"
                                title="Sembunyikan Bantuan"
                            >
                                <X className="w-4.5 h-4.5" />
                            </button>
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0 animate-pulse" />
                                <div className="flex flex-col gap-1 max-w-xl">
                                    <span className="font-extrabold text-amber-950 dark:text-amber-200 text-[13px]">Bantuan Pencarian Google</span>
                                    <span className="leading-relaxed">
                                        Pencarian Google memblokir akses proxy cloud (muncul layar putih/CAPTCHA). Silakan gunakan alternatif pencarian lain yang dioptimalkan untuk proxy di bawah ini, atau buka Google di tab baru.
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                                <button 
                                    type="button"
                                    onClick={() => {
                                        const gUrl = `https://www.google.com/search?q=${encodeURIComponent(googleQuery || 'Google')}&safe=off`;
                                        addTab(gUrl);
                                    }}
                                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-extrabold transition shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 text-[11px] cursor-pointer"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    <span>Buka di Tab Baru (Lancar)</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const sUrl = `https://www.startpage.com/do/dsearch?query=${encodeURIComponent(googleQuery || 'Google')}`;
                                        setCurrentUrl(sUrl);
                                        setInputUrl(sUrl);
                                    }}
                                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold transition shadow-md shadow-purple-500/15 hover:shadow-lg active:scale-95 text-[11px] cursor-pointer"
                                >
                                    <span>🧠 Startpage (Bebas CAPTCHA)</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const dUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(googleQuery || 'Google')}`;
                                        setCurrentUrl(dUrl);
                                        setInputUrl(dUrl);
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:border-zinc-700 font-extrabold transition active:scale-95 text-[11px] cursor-pointer"
                                >
                                    <span>DuckDuckGo</span>
                                </button>
                            </div>
                        </div>
                    )}

                    <div 
                        id="browser-webview-container"
                        className="flex-1 w-full"
                        style={
                        iframeZoom !== 1 ? {
                            width: `${100 / iframeZoom}%`,
                            height: `${100 / iframeZoom}%`,
                            transform: `scale(${iframeZoom})`,
                            transformOrigin: 'top left'
                        } : { width: '100%', height: '100%' }
                    }>
                        <iframe 
                            id="browser-webview-iframe"
                            key={refreshTrigger}
                            src={`/api/proxy?url=${encodeURIComponent(iframeSrc)}`} 
                            className="w-full h-full border-none bg-white"
                            title="Browser Window"
                            sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals"
                            allowFullScreen
                            allow="geolocation; microphone; camera; fullscreen; encrypted-media; autoplay"
                        />
                    </div>
                </div>
            ) : (
                <div className="p-8 flex flex-col items-center justify-center h-full text-center text-zinc-500 dark:text-zinc-400">
                    <Search className="w-16 h-16 mb-4 opacity-50" />
                    <span className="text-xl font-bold mb-2">Mode Tanpa Gambar Aktif</span>
                    <span className="text-sm px-4">Gambar diblokir untuk menghemat kuota data Anda (Simulasi). Akses situs via teks lebih cepat.</span>
                </div>
            )}
        </div>
         {/* Video downloader triggers are safely managed inside the consolidated portable Multitool balloon */}
        <AnimatePresence>
            {downloadPromptData && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
                >
                    <motion.div
                        initial={{ scale: 0.95, y: 15 }}
                        animate={{ scale: 1, y: 0 }}
                        className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 border border-gray-100 dark:border-zinc-800 flex flex-col gap-5 justify-between"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 pb-3">
                            <h2 className="text-lg font-extrabold text-blue-600 dark:text-blue-400 tracking-tight flex items-center gap-2">
                                <span>🎥</span> Pusat Kontrol Unduhan (Sniffer & Parser)
                            </h2>
                            <button 
                                onClick={() => setDownloadPromptData(null)}
                                className="text-gray-400 hover:text-gray-650 dark:hover:text-zinc-200 transition p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Prompt Info */}
                        <div className="bg-gray-50 dark:bg-zinc-800/60 p-3.5 rounded-2xl flex flex-col gap-1 text-sm border border-gray-150/40 dark:border-zinc-800">
                            <span className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Media Terdeteksi</span>
                            <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">{snapParsedData?.title || downloadPromptData.filename}</span>
                            <span className="text-zinc-400 text-xs font-mono select-all truncate">{videoUrlDetected || currentUrl}</span>
                        </div>

                        {downloadPromptData.type === 'video' ? (
                            <>
                                {/* Selection Tabs */}
                                <div className="grid grid-cols-3 gap-1 bg-gray-100 dark:bg-zinc-800/80 p-1.5 rounded-2xl border border-gray-200/40 dark:border-zinc-700/60">
                                    <button
                                        onClick={() => setActiveDownloadTab('snap')}
                                        className={`py-2 px-3 text-xs font-bold rounded-xl transition ${activeDownloadTab === 'snap' ? 'bg-white dark:bg-zinc-750 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-zinc-300'}`}
                                    >
                                        🌐 SnapVideo
                                    </button>
                                    <button
                                        onClick={() => setActiveDownloadTab('9xbuddy')}
                                        className={`py-2 px-3 text-xs font-bold rounded-xl transition ${activeDownloadTab === '9xbuddy' ? 'bg-white dark:bg-zinc-750 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-zinc-300'}`}
                                    >
                                        ⚡ 9xBuddy
                                    </button>
                                    <button
                                        onClick={() => setActiveDownloadTab('stream_sniffer')}
                                        className={`py-2 px-3 text-xs font-bold rounded-xl transition ${activeDownloadTab === 'stream_sniffer' ? 'bg-white dark:bg-zinc-750 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-zinc-300'}`}
                                    >
                                        🧬 Stream Sniffer
                                    </button>
                                </div>

                                {/* Tab Body */}
                                <div className="min-h-[160px] flex flex-col justify-center border border-gray-100 dark:border-zinc-800 p-4 rounded-2xl bg-gray-50/50 dark:bg-zinc-950/20">
                                    {activeDownloadTab === 'snap' && (
                                        <div className="flex flex-col gap-2">
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">Mode Parser Satu-Ketuk SnapVideo</h3>
                                            {loadingSnap ? (
                                                <div className="flex flex-col items-center justify-center py-6 gap-2">
                                                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                                    <span className="text-xs text-zinc-400">Menghubungkan ke parser SnapVideo...</span>
                                                </div>
                                            ) : snapParsedData ? (
                                                <div className="text-xs flex flex-col gap-2 text-zinc-650 dark:text-zinc-350">
                                                    <div className="flex justify-between border-b dark:border-zinc-800 pb-1.5">
                                                        <span>Nama file:</span>
                                                        <span className="font-bold text-zinc-850 dark:text-zinc-200 truncate max-w-[280px]">{snapParsedData.filename}</span>
                                                    </div>
                                                    <div className="flex justify-between border-b dark:border-zinc-800 pb-1.5">
                                                        <span>Format Unduhan:</span>
                                                        <span className="font-bold text-green-500">MP4 Full-Media</span>
                                                    </div>
                                                    <div className="flex mt-1 text-zinc-400 font-mono gap-1 items-center bg-zinc-100 dark:bg-zinc-800 p-2 rounded-lg truncate">
                                                        <span className="text-[10px] truncate">{snapParsedData.directUrl}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-orange-500 text-center py-4">Gagal mengekstrak data dari server parser SnapVideo.</span>
                                            )}
                                        </div>
                                    )}

                                    {activeDownloadTab === '9xbuddy' && (
                                        <div className="flex flex-col gap-2 h-full">
                                            <div className="flex justify-between items-center pb-2 border-b dark:border-zinc-800">
                                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">9xBuddy Media Quality Extractor</h3>
                                                <button 
                                                    onClick={() => fetch9xBuddyFormats(videoUrlDetected || currentUrl)}
                                                    className="text-xs text-blue-500 hover:underline font-semibold"
                                                >
                                                    Penyegaran ↻
                                                </button>
                                            </div>

                                            {fetching9x ? (
                                                <div className="flex flex-col items-center justify-center py-6 gap-2">
                                                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                                    <span className="text-xs text-zinc-400">Mengekstrak opsi resolusi dari 9xBuddy server...</span>
                                                </div>
                                            ) : formats9xBuddy.length > 0 ? (
                                                <div className="flex flex-col gap-2">
                                                    <span className="text-[11px] text-zinc-400">Pilih kualitas file yang diinginkan:</span>
                                                    <div className="grid grid-cols-1 gap-2 max-h-[140px] overflow-y-auto pr-1">
                                                        {formats9xBuddy.map((format, idx) => (
                                                            <button
                                                                key={idx}
                                                                onClick={() => setSelectedQualityFormat(format)}
                                                                className={`p-2.5 rounded-xl border text-left text-xs flex justify-between items-center transition ${selectedQualityFormat?.formatId === format.formatId ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-900/10' : 'border-gray-200 dark:border-zinc-800 hover:border-gray-350 dark:hover:border-zinc-600'}`}
                                                            >
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold text-zinc-800 dark:text-zinc-100 uppercase">{format.quality}</span>
                                                                    <span className="text-[10px] text-zinc-400 font-mono">{format.ext} • {format.type}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 font-medium text-zinc-500">{format.size}</span>
                                                                    {selectedQualityFormat?.formatId === format.formatId && <span className="text-blue-500 font-bold">✓</span>}
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center py-4 text-center">
                                                    <span className="text-xs text-zinc-400 mb-2">9xBuddy gagal mengekstrak resolusi khusus untuk URL media ini.</span>
                                                    <button 
                                                        onClick={() => fetch9xBuddyFormats(videoUrlDetected || currentUrl)}
                                                        className="px-3 py-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg text-xs font-semibold text-zinc-750 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-700"
                                                    >
                                                        Coba Lagi
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeDownloadTab === 'stream_sniffer' && (
                                        <div className="flex flex-col gap-3">
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">Bypass Filter & Penangkap Stream Sniffer</h3>
                                            <p className="text-[11px] text-zinc-400 leading-normal">
                                                Fitur ini akan mengunduh media aliran (stream/buffer) apa saja di server secara progresif dan menggabungkannya sebelum disimpan di Cloud / Lokal Anda.
                                            </p>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold text-zinc-400 uppercase">Alamat Aliran Media (Stream Buffer URL)</label>
                                                <input
                                                    type="text"
                                                    value={customStreamUrl}
                                                    onChange={(e) => setCustomStreamUrl(e.target.value)}
                                                    placeholder="URL stream .mp4 / .m3u8 / .ts"
                                                    className="w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-700 dark:text-zinc-205 focus:outline-none focus:border-blue-500 font-mono"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="bg-blue-50/20 dark:bg-zinc-950/20 p-4 border border-blue-100/10 rounded-2xl text-sm min-h-[100px] flex items-center justify-center text-center text-zinc-500">
                                Berkas Dokumen / Halaman Web terdeteksi. Silakan pilih lokasi penyimpanan di bawah untuk mendownload langsung.
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-3 pt-2">
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => confirmDownload('cloud')}
                                    disabled={isDownloading}
                                    className="bg-blue-600 hover:bg-blue-700 text-white p-3.5 flex flex-col items-center justify-center rounded-2xl shadow-lg font-bold gap-1 transition cursor-pointer disabled:opacity-50"
                                >
                                    <Cloud className="w-5 h-5 text-semibold" />
                                    <span className="text-sm">Unduh ke Cloud Browser</span>
                                    <span className="text-[10px] text-blue-200 font-normal">Buffer Aman & Sinkronisasi Drive</span>
                                </button>
                                <button 
                                    onClick={() => confirmDownload('local')}
                                    disabled={isDownloading}
                                    className="bg-gray-100 hover:bg-gray-200 dark:bg-zinc-850 dark:hover:bg-zinc-750 text-gray-950 dark:text-white p-3.5 flex flex-col items-center justify-center rounded-2xl shadow font-bold gap-1 transition cursor-pointer disabled:opacity-50 border border-gray-200/50 dark:border-zinc-805"
                                >
                                    <ChevronRight className="w-5 h-5 text-zinc-500" />
                                    <span className="text-sm">Simpan di Lokal Perangkat</span>
                                    <span className="text-[10px] text-zinc-400 font-normal">Konversi & Transfer Langsung</span>
                                </button>
                            </div>

                            {isDownloading ? (
                                <div className="mt-2 flex flex-col items-center justify-center space-y-2 p-1 bg-blue-50/10 dark:bg-zinc-950/20 rounded-xl border border-blue-500/10">
                                    <div className="w-6 h-6 border-2 border-blue-505 border-t-transparent rounded-full animate-spin" />
                                    <span className="text-xs font-semibold text-blue-500 text-center">Sedang merekam buffer streaming video di server, mohon tunggu...</span>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => setDownloadPromptData(null)}
                                    className="w-full text-center mt-1 text-xs text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 transition font-medium"
                                >
                                    Batal & Tutup Panel
                                </button>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
            
            {pendingPopupUrl && (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-white dark:bg-zinc-800 p-4 rounded-2xl shadow-2xl border dark:border-zinc-700 w-11/12 max-w-sm z-50 overflow-hidden"
                >
                    <h3 className="font-semibold gap-2 flex items-center text-sm mb-2 text-zinc-900 dark:text-zinc-100">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        Izin Buka Popup
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 truncate w-full" title={pendingPopupUrl}>
                        Situs ingin membuka: <br />
                        <span className="font-medium text-blue-500 truncate block mt-1">{pendingPopupUrl}</span>
                    </p>
                    <div className="flex flex-col gap-2 mt-4">
                        <button 
                            onClick={() => {
                                addTab(pendingPopupUrl);
                                setPendingPopupUrl(null);
                            }}
                            className="w-full px-4 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg shadow-sm shadow-orange-500/20 transition-colors"
                        >
                            Buka di Tab Baru
                        </button>
                        {appSettings?.openExternalLinks && (
                            <button
                                onClick={() => {
                                    try {
                                        window.open(pendingPopupUrl, '_blank', 'noopener,noreferrer');
                                    } catch(e) {
                                        console.warn("Gagal membuka window.open manual:", e);
                                        alert("Gagal membuka window! Pop-up diblokir oleh browser atau batasan sandbox.");
                                    }
                                    setPendingPopupUrl(null);
                                }}
                                className="w-full px-4 py-2 text-xs font-semibold text-center text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-lg transition-colors border border-blue-200 dark:border-blue-800"
                            >
                                Buka di Browser External
                            </button>
                        )}
                        <button 
                            onClick={() => setPendingPopupUrl(null)}
                            className="w-full px-4 border border-zinc-200 dark:border-zinc-700 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                        >
                            Batalkan
                        </button>
                    </div>
                </motion.div>
            )}

            {popupBlockedToast && (
                <motion.div 
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 30, scale: 0.95 }}
                    className="absolute bottom-20 left-4 right-4 bg-zinc-950/95 dark:bg-zinc-900/95 text-white p-4 rounded-2xl shadow-2xl z-50 flex items-center justify-between border border-white/10"
                >
                    <div className="flex-1 min-w-0 mr-3">
                        <div className="flex items-center gap-1.5 text-xs text-orange-400 font-bold uppercase tracking-wider">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Popup Diblokir</span>
                        </div>
                        <p className="text-xs text-zinc-300 truncate mt-1" title={popupBlockedToast}>{popupBlockedToast}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button 
                            type="button"
                            onClick={() => {
                                addTab(popupBlockedToast);
                                setPopupBlockedToast(null);
                            }}
                            className="bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-[11px] py-1.5 px-3 rounded-xl shadow-md transition active:scale-95 cursor-pointer"
                        >
                            Buka
                        </button>
                        <button 
                            type="button"
                            onClick={() => setPopupBlockedToast(null)}
                            className="text-zinc-400 hover:text-white font-semibold text-[11px] px-2 py-1.5 rounded-xl transition cursor-pointer"
                        >
                            Tutup
                        </button>
                    </div>
                </motion.div>
            )}

            {lastErrorToast && (
                <motion.div 
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 30, scale: 0.95 }}
                    className="absolute bottom-20 left-4 right-4 bg-red-950/95 dark:bg-red-950/95 text-white p-4 rounded-2xl shadow-2xl z-50 flex items-center justify-between border border-red-500/30"
                >
                    <div className="flex-1 min-w-0 mr-3">
                        <div className="flex items-center gap-1.5 text-xs text-red-400 font-extrabold uppercase tracking-wider">
                            <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                            <span>Sistem AI Sentinel: Error Terdeteksi!</span>
                        </div>
                        <p className="text-xs text-red-200 mt-1 font-mono truncate" title={lastErrorToast.message}>{lastErrorToast.message}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button 
                            type="button"
                            onClick={() => {
                                window.dispatchEvent(new CustomEvent('open-multi-tool-debugger'));
                                setLastErrorToast(null);
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-[11px] py-1.5 px-3 rounded-xl shadow-md transition active:scale-95 cursor-pointer flex items-center gap-1"
                        >
                            <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
                            <span>Perbaiki</span>
                        </button>
                        <button 
                            type="button"
                            onClick={() => setLastErrorToast(null)}
                            className="text-zinc-400 hover:text-white font-semibold text-[11px] px-2 py-1.5 rounded-xl transition cursor-pointer"
                        >
                            Tutup
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        <BottomBar />
        <MainMenu />
        <Overlays />
        <ScreenCapture />
        {/* Bottom Sheet Context Menu */}
        <AnimatePresence>
            {contextMenu.show && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex flex-col justify-end"
                    onClick={() => setContextMenu({...contextMenu, show: false})}
                >
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white dark:bg-zinc-900 rounded-t-3xl w-full p-6 shadow-2xl flex flex-col gap-4 border-t dark:border-zinc-800"
                    >
                        <div className="w-12 h-1.5 bg-gray-300 dark:bg-zinc-700 rounded-full mx-auto mb-2" />
                        
                        <div 
                            title="Ketuk cepat 3x pada header untuk beralih mode"
                            onClick={handleScreenDoubleOrTripleTap} 
                            className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-zinc-800 cursor-pointer select-none active:scale-[0.99] transition-transform"
                        >
                            <Info className="w-6 h-6 text-blue-500 shrink-0" />
                            <div className="flex-1 overflow-hidden">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-gray-900 dark:text-zinc-100 truncate">
                                        {infoMode === 'advanced' ? 'Halaman Info (Diagnostik Lanjutan 🚀)' : 'Halaman info'}
                                    </h3>
                                    <span className="text-[9px] bg-gray-100 dark:bg-zinc-800 text-gray-500 px-1.5 py-0.5 rounded-full font-sans">
                                        {infoMode === 'advanced' ? 'Advanced' : 'Standard'}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 truncate mt-0.5">{contextMenu.link || contextMenu.url}</p>
                            </div>
                        </div>

                        {infoMode === 'advanced' && (
                            <div className="bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl p-4 flex flex-col gap-2.5 font-mono text-[10px] md:text-xs text-zinc-600 dark:text-zinc-400">
                                <div className="flex justify-between items-center bg-zinc-100 dark:bg-zinc-900 px-2.5 py-1.5 rounded-xl">
                                    <span className="font-bold text-zinc-500">ENGINE STATUS:</span>
                                    <span className="text-emerald-500 font-extrabold animate-pulse">● SECURE RUNTIME SECURED</span>
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-1 px-1">
                                    <div><span className="text-zinc-400">Core Node:</span> Cloud Proxy Sandbox</div>
                                    <div><span className="text-zinc-400">Protocol:</span> HTTPS (TLS v1.3)</div>
                                    <div><span className="text-zinc-400">Sub-Iframe:</span> Strict Sandbox (no-referrer)</div>
                                    <div><span className="text-zinc-400">VPN Routing:</span> {vpnActive ? 'Active Encrypted' : 'Passthrough'}</div>
                                    <div><span className="text-zinc-400">Script Injector:</span> Otakudesu Sentinel V1.5</div>
                                    <div><span className="text-zinc-400">Navigation:</span> Next-Episode Key-Bind Active</div>
                                </div>
                                <div className="text-[9px] text-zinc-400/80 border-t border-zinc-200 dark:border-zinc-800 pt-2 px-1 flex items-center gap-1.5 leading-relaxed">
                                    <span className="bg-blue-500/10 text-blue-500 px-1 rounded text-[8px] font-bold">INFO</span>
                                    Mode Diagnostik Lanjutan diaktifkan secara mandiri via 3-Tap Gesture.
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-4 gap-2 sm:gap-4 py-2">
                            {(contextMenu.link || contextMenu.text) && (
                                <button onClick={() => {
                                    navigator.clipboard.writeText(contextMenu.link || contextMenu.text);
                                    alert('Teks/Link disalin!');
                                    setContextMenu({...contextMenu, show: false});
                                }} className="flex flex-col items-center gap-2 text-[10px] sm:text-xs font-medium text-gray-700 dark:text-zinc-300 group text-center">
                                    <div className="w-12 h-12 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 group-hover:text-blue-500 transition-colors">
                                        <Copy className="w-5 h-5" />
                                    </div>
                                    Salin
                                </button>
                            )}

                            <button onClick={() => {
                                const targetUrl = contextMenu.link || contextMenu.url;
                                if (targetUrl) {
                                    addTab(targetUrl);
                                }
                                setContextMenu({...contextMenu, show: false});
                            }} className="flex flex-col items-center gap-2 text-[10px] sm:text-xs font-medium text-gray-700 dark:text-zinc-300 group text-center">
                                <div className="w-12 h-12 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center group-hover:bg-orange-100 dark:group-hover:bg-orange-900/40 group-hover:text-orange-500 transition-colors">
                                    <ExternalLink className="w-5 h-5" />
                                </div>
                                Buka di Tab Baru
                            </button>

                            <button onClick={() => {
                                const iframe = document.querySelector('iframe');
                                if (iframe && iframe.contentWindow) iframe.contentWindow.print();
                                setContextMenu({...contextMenu, show: false});
                            }} className="flex flex-col items-center gap-2 text-[10px] sm:text-xs font-medium text-gray-700 dark:text-zinc-300 group text-center">
                                <div className="w-12 h-12 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center group-hover:bg-purple-100 dark:group-hover:bg-purple-900/40 group-hover:text-purple-500 transition-colors">
                                    <Printer className="w-5 h-5" />
                                </div>
                                Cetak Page (PDF Lokal)
                            </button>

                            <button onClick={() => {
                                setDownloadPromptData({
                                    filename: `Halaman_${Date.now()}.html`,
                                    size: 1.5 * 1024 * 1024,
                                    type: 'document',
                                    source: { isPage: true, url: contextMenu.url, text: contextMenu.text }
                                });
                                setContextMenu({...contextMenu, show: false});
                            }} className="flex flex-col items-center gap-2 text-[10px] sm:text-xs font-medium text-gray-700 dark:text-zinc-300 group text-center">
                                <div className="w-12 h-12 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center group-hover:bg-green-100 dark:group-hover:bg-green-900/40 group-hover:text-green-500 transition-colors">
                                    <Download className="w-5 h-5" />
                                </div>
                                Save HTML Page
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
}

function HomeScreen() {
    const { setCurrentUrl, setActiveScreen, setActiveOverlay, setIncognito, incognito, appSettings } = useBrowser();

    let bgClass = "";
    let forceTextWhite = false;
    if (appSettings?.theme === 'darkblue') {
        bgClass = "bg-blue-900";
        forceTextWhite = true;
    } else if (appSettings?.theme === 'snow') {
        bgClass = "bg-gradient-to-b from-blue-100 to-white dark:bg-zinc-800";
    }

    return (
        <div className={`flex-1 w-full flex flex-col items-center pt-8 px-4 h-full ${bgClass}`}>
            <div className="flex items-center gap-3 mb-10 mt-6 z-10 relative">
                <div className="w-12 h-12 rounded-2xl bg-orange-500 shadow-xl shadow-orange-500/20 flex items-center justify-center">
                    <Network className="w-8 h-8 text-white" />
                </div>
                <h1 className={`text-2xl font-black tracking-tight ${forceTextWhite ? 'text-white' : 'text-zinc-800 dark:text-white'}`}>PRO Browser</h1>
            </div>
            
            <div className="w-full max-w-[320px] grid grid-cols-4 gap-y-8 gap-x-4 mb-10 z-10 relative">
                <HomeIcon onClick={() => { setActiveScreen('vpn'); }} title="VPN" icon={<Network />} forceTextWhite={forceTextWhite} />
                <HomeIcon onClick={() => { setActiveOverlay('uc-drive'); }} title="Cloud Drive" icon={<Cloud />} forceTextWhite={forceTextWhite} />
                <HomeIcon onClick={() => { setActiveOverlay('tools'); }} title="Alat" icon={<Wrench />} forceTextWhite={forceTextWhite} />
                <HomeIcon onClick={() => { setActiveOverlay('history'); }} title="Riwayat" icon={<Clock />} forceTextWhite={forceTextWhite} />
                
                <HomeIcon onClick={() => setCurrentUrl('https://en.wikipedia.org')} title="Wikipedia" icon={<Search />} color="bg-gray-200 dark:bg-zinc-700 text-gray-800 dark:text-white" forceTextWhite={forceTextWhite} />
                <HomeIcon onClick={() => setCurrentUrl('https://discord.com/app')} title="HotChat" icon={<Star />} color="bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-400" forceTextWhite={forceTextWhite} />
                <HomeIcon onClick={() => setCurrentUrl('https://news.google.com')} title="Live News" icon={<AlertTriangle />} color="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" forceTextWhite={forceTextWhite} />
                <HomeIcon onClick={() => setCurrentUrl('https://gemini.google.com/app')} title="Tanya AI" icon={<RefreshCw />} color="bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400" forceTextWhite={forceTextWhite} />
            </div>

            <div className={`w-full max-w-[320px] rounded-2xl p-5 flex items-center justify-between cursor-pointer border z-10 relative shadow-sm ${forceTextWhite ? 'bg-white/10 border-white/20 text-white' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border-blue-100 dark:border-blue-900/50'}`}
                 onClick={() => setIncognito(!incognito)}>
                <div>
                    <h3 className="font-bold text-sm">Mode Incognito {incognito ? '(Aktif)' : ''}</h3>
                    <p className="text-xs mt-1.5 opacity-80 leading-relaxed max-w-[200px]">Jelajahi internet tanpa meninggalkan jejak pencarian atau riwayat.</p>
                </div>
                <div className={`w-12 h-6 rounded-full p-1 transition-colors flex items-center shrink-0 ${incognito ? 'bg-orange-500' : (forceTextWhite ? 'bg-white/20' : 'bg-blue-200 dark:bg-blue-800/50')}`}>
                   <div className={`w-4 h-4 bg-white rounded-full transition-transform ${incognito ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
            </div>
            
            {/* Simple decoration for Snow Theme */}
            {appSettings?.theme === 'snow' && (
                <div className="absolute inset-0 pointer-events-none opacity-50 z-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiNmZmYiLz48L3N2Zz4=')] mix-blend-overlay"></div>
            )}
        </div>
    );
}

function HomeIcon({ title, icon, onClick, color, forceTextWhite }: any) {
    return (
        <button onClick={onClick} className="flex flex-col items-center gap-2.5 group">
            <div className={`w-[3.25rem] h-[3.25rem] rounded-[1.25rem] flex items-center justify-center transition-transform group-hover:scale-105 ${color || 'bg-white dark:bg-zinc-800 shadow-sm border border-gray-100 dark:border-zinc-700/50 text-gray-700 dark:text-zinc-300'} ${forceTextWhite && !color ? 'bg-white/10 dark:bg-zinc-800/80 border-white/10 text-white' : ''}`}>
                {React.cloneElement(icon, { className: 'w-6 h-6' })}
            </div>
            <span className={`text-[11px] font-medium text-center truncate w-full px-1 ${forceTextWhite ? 'text-white/80' : 'text-gray-600 dark:text-gray-400'}`}>{title}</span>
        </button>
    );
}
