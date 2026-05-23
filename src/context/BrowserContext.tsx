import React, { createContext, useContext, useState, useEffect } from 'react';

export type SettingsMap = {
  adBlockStrong: boolean;
  acceptableAds: boolean;
  defaultBrowser: boolean;
  cloudAcceleration: boolean;
  language: string;
  theme: string;
  pushNotifications: boolean;
  newsNotifications: boolean;
  autoClipboard: boolean;
  autoLink: boolean;
  maxDownloads: number;
  
  // Browsing settings
  fontSize: string;
  pagePreloading: string;
  tabView: string;
  imageQuality: string;
  swipeToNavigate: boolean;
  reopenTabsAtStartup: boolean;
  formPasswords: string;
  scrollOptions: string;
  brightness: string;
  animations: boolean;
  showStatusBar: boolean;
  blockPopups: boolean;
  openExternalLinks: boolean;

  // Downloads
  downloadLocation: string;
  newDownloadTask: string;
  autoReconnect: boolean;
  downloadNotifications: boolean;

  // Search
  defaultSearchEngine: string;
  aggregateSearchEngine: string;

  // Notifications 
  siteNotifications: boolean;
  quickAccess: boolean;
};

export type DownloadItem = {
  id: string;
  filename: string;
  size: number;
  downloadedBytes: number;
  progress: number;
  speed: string;
  status: 'downloading' | 'paused' | 'completed' | 'failed';
  type: 'video' | 'music' | 'document' | 'other';
  date: string;
  realUrl?: string; // If this exists, it's a real download task
  objectUrl?: string; // The local blob url when finished
  location?: 'cloud' | 'local';
};

type BrowserState = {
  vpnActive: boolean;
  vpnConfig: string;
  setVpnActive: (val: boolean) => void;
  setVpnConfig: (val: string) => void;
  
  isDark: boolean;
  setIsDark: (val: boolean) => void;
  
  textOnly: boolean;
  setTextOnly: (val: boolean) => void;

  adBlock: boolean;
  setAdBlock: (val: boolean) => void;

  currentUrl: string;
  setCurrentUrl: (val: string) => void;

  history: string[];
  historyIndex: number;
  navigate: (url: string) => void;
  goBack: () => void;
  goForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;

  activeScreen: 'browser' | 'settings' | 'vpn';
  setActiveScreen: (val: 'browser' | 'settings' | 'vpn') => void;

  tabs: { id: string; url: string; title: string; history: string[]; historyIndex: number }[];
  activeTabId: string;
  addTab: (url?: string) => void;
  removeTab: (id: string) => void;
  removeAllTabs: () => void;
  setActiveTab: (id: string) => void;
  
  isMenuOpen: boolean;
  setIsMenuOpen: (val: boolean) => void;

  activeOverlay: string; // 'none', 'bookmarks', 'history', 'downloads', 'uc-drive'
  setActiveOverlay: (val: string) => void;

  downloads: DownloadItem[];
  addDownload: (item: Omit<DownloadItem, 'id' | 'progress' | 'status' | 'speed' | 'downloadedBytes'>) => void;
  updateDownloadPath: (id: string, updates: Partial<DownloadItem>) => void;
  removeDownload: (id: string) => void;
  pauseDownload: (id: string) => void;
  resumeDownload: (id: string) => void;

  bookmarks: { title: string; url: string }[];
  addBookmark: (url: string, title?: string) => void;
  removeBookmark: (url: string) => void;

  fullHistory: { title: string; url: string; time: string }[];
  clearHistory: () => void;
  removeHistoryItem: (index: number) => void;

  appSettings: SettingsMap;
  updateSetting: (key: keyof SettingsMap, value: any) => void;
  
  incognito: boolean;
  setIncognito: (val: boolean) => void;

  refreshTrigger: number;
  triggerRefresh: () => void;
  syncUrlSilently: (url: string) => void;
  videoDetected: boolean;
  setVideoDetected: (val: boolean) => void;
  videoUrlDetected: string | null;
  setVideoUrlDetected: (val: string | null) => void;
  triggerVideoDownload: boolean;
  setTriggerVideoDownload: (val: boolean) => void;
  blockedPopups: string[];
  addBlockedPopup: (url: string) => void;
  clearBlockedPopups: () => void;
  isCapturing: boolean;
  setIsCapturing: (val: boolean) => void;
  activePreviewFile: { url: string; filename: string; type: string } | null;
  setActivePreviewFile: (val: { url: string; filename: string; type: string } | null) => void;
};

const defaultSettings: SettingsMap = {
  adBlockStrong: false,
  acceptableAds: false,
  defaultBrowser: false,
  cloudAcceleration: true,
  language: 'Bahasa Indonesia',
  theme: 'default',
  pushNotifications: true,
  newsNotifications: true,
  autoClipboard: true,
  autoLink: true,
  maxDownloads: 3,

  // Browsing settings
  fontSize: '100% (Standard)',
  pagePreloading: 'Semua halaman',
  tabView: 'Tampilan Kartu',
  imageQuality: 'Sedang',
  swipeToNavigate: true,
  reopenTabsAtStartup: false,
  formPasswords: 'Selalu Bertanya',
  scrollOptions: 'Standard',
  brightness: 'Normal',
  animations: true,
  showStatusBar: false,
  blockPopups: true,
  openExternalLinks: false,

  // Downloads
  downloadLocation: '/sdcard/Downloads/',
  newDownloadTask: 'Selalu bertanya',
  autoReconnect: true,
  downloadNotifications: true,

  // Search
  defaultSearchEngine: 'Bing',
  aggregateSearchEngine: 'Aktif',

  // Notifications 
  siteNotifications: true,
  quickAccess: true,
};

const defaultState: BrowserState = {
  vpnActive: false,
  vpnConfig: '',
  setVpnActive: () => {},
  setVpnConfig: () => {},

  isDark: false,
  setIsDark: () => {},

  textOnly: false,
  setTextOnly: () => {},

  adBlock: false,
  setAdBlock: () => {},

  currentUrl: '',
  setCurrentUrl: () => {},

  history: [''],
  historyIndex: 0,
  navigate: () => {},
  goBack: () => {},
  goForward: () => {},
  canGoBack: false,
  canGoForward: false,

  activeScreen: 'browser',
  setActiveScreen: () => {},

  tabs: [],
  activeTabId: '',
  addTab: () => {},
  removeTab: () => {},
  removeAllTabs: () => {},
  setActiveTab: () => {},

  isMenuOpen: false,
  setIsMenuOpen: () => {},

  activeOverlay: 'none',
  setActiveOverlay: () => {},

  downloads: [],
  addDownload: () => {},
  updateDownloadPath: () => {},
  removeDownload: () => {},
  pauseDownload: () => {},
  resumeDownload: () => {},

  bookmarks: [],
  addBookmark: () => {},
  removeBookmark: () => {},

  fullHistory: [],
  clearHistory: () => {},
  removeHistoryItem: () => {},

  appSettings: defaultSettings,
  updateSetting: () => {},

  incognito: false,
  setIncognito: () => {},
  refreshTrigger: 0,
  triggerRefresh: () => {},
  syncUrlSilently: () => {},
  videoDetected: false,
  setVideoDetected: () => {},
  videoUrlDetected: null,
  setVideoUrlDetected: () => {},
  triggerVideoDownload: false,
  setTriggerVideoDownload: () => {},
  blockedPopups: [],
  addBlockedPopup: () => {},
  clearBlockedPopups: () => {},
  isCapturing: false,
  setIsCapturing: () => {},
  activePreviewFile: null,
  setActivePreviewFile: () => {},
};

const BrowserContext = createContext<BrowserState>(defaultState);

export const BrowserProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [vpnActive, setVpnActive] = useState(false);
  const [vpnConfig, setVpnConfig] = useState('');
  const [isDark, setIsDark] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('browser_is_dark');
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {}
    return false;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('browser_is_dark', JSON.stringify(isDark));
    }
  }, [isDark]);
  const [textOnly, setTextOnly] = useState(false);
  const [adBlock, setAdBlock] = useState(false);
  
  const initialTabId = Math.random().toString(36).substring(7);
  const [tabs, setTabs] = useState([{ id: initialTabId, url: '', title: 'Beranda', history: [''], historyIndex: 0 }]);
  const [activeTabId, setActiveTabId] = useState(initialTabId);
  const [fullHistory, setFullHistory] = useState<{title: string, url: string, time: string}[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('browser_history');
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('browser_history', JSON.stringify(fullHistory));
    }
  }, [fullHistory]);
  
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const history = activeTab.history;
  const historyIndex = activeTab.historyIndex;
  const currentUrl = history[historyIndex] || '';

  const updateActiveTab = (updates: any) => {
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, ...updates } : t));
  };

  const addTab = (url: string = '') => {
    const newId = Math.random().toString(36).substring(7);
    setTabs(prev => [...prev, { id: newId, url, title: url ? url : 'Beranda', history: [url], historyIndex: 0 }]);
    setActiveTabId(newId);
  };

  const removeTab = (id: string) => {
    setTabs(prev => {
      const filtered = prev.filter(t => t.id !== id);
      if (filtered.length === 0) {
        const newId = Math.random().toString(36).substring(7);
        return [{ id: newId, url: '', title: 'Beranda', history: [''], historyIndex: 0 }];
      }
      return filtered;
    });
    if (activeTabId === id) {
      setTabs(prev => {
        const remaining = prev.filter(t => t.id !== id);
        if (remaining.length > 0) setActiveTabId(remaining[remaining.length - 1].id);
        return prev; // actual remove is handled above
      });
    }
  };

  const removeAllTabs = () => {
    const newId = Math.random().toString(36).substring(7);
    setTabs([{ id: newId, url: '', title: 'Beranda', history: [''], historyIndex: 0 }]);
    setActiveTabId(newId);
  };

  const setActiveTab = (id: string) => {
    setActiveTabId(id);
    setRefreshTrigger(prev => prev + 1);
  };

  const navigate = (url: string) => {
    setTabs(prevTabs => {
      const activeIdx = prevTabs.findIndex(t => t.id === activeTabId);
      if (activeIdx === -1) return prevTabs;
      
      const activeTab = prevTabs[activeIdx];
      const currentHistUrl = activeTab.history[activeTab.historyIndex] || '';
      const normalize = (u: string) => u.replace(/\/$/, "");
      if (normalize(currentHistUrl) === normalize(url)) return prevTabs;

      const newHistory = activeTab.history.slice(0, activeTab.historyIndex + 1);
      newHistory.push(url);
      
      let title = 'Beranda';
      if (url) {
        if (url.includes('google.com/search') || url.includes('bing.com/search') || url.includes('duckduckgo.com')) {
           title = 'Pencarian';
        } else {
           title = url.replace(/^https?:\/\//, '').split('/')[0];
        }
      }

      const newTabs = [...prevTabs];
      newTabs[activeIdx] = {
        ...activeTab,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        url: url,
        title: title
      };
      return newTabs;
    });
    
    // Add to full history
    if (!incognito && url !== '') {
      let title = 'Beranda';
      if (url.includes('google.com/search') || url.includes('bing.com/search') || url.includes('duckduckgo.com')) {
         title = 'Pencarian';
      } else {
         title = url.replace(/^https?:\/\//, '').split('/')[0];
      }
      setFullHistory(prev => [{
        title: title,
        url,
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      }, ...prev]);
    }
    
    setRefreshTrigger(prev => prev + 1);
  };

  const setCurrentUrl = (url: string) => navigate(url);

  const syncUrlSilently = (url: string) => {
    setTabs(prevTabs => {
      const activeIdx = prevTabs.findIndex(t => t.id === activeTabId);
      if (activeIdx === -1) return prevTabs;
      
      const activeTab = prevTabs[activeIdx];
      // Don't sync if it's the exact same as current history index (ignoring trailing slash)
      const currentHistUrl = activeTab.history[activeTab.historyIndex] || '';
      const normalize = (u: string) => u.replace(/\/$/, "");
      if (normalize(currentHistUrl) === normalize(url)) return prevTabs;

      const newHistory = activeTab.history.slice(0, activeTab.historyIndex + 1);
      newHistory.push(url);
      
      let title = 'Beranda';
      if (url) {
        if (url.includes('google.com/search') || url.includes('bing.com/search') || url.includes('duckduckgo.com')) {
           title = 'Pencarian';
        } else {
           title = url.replace(/^https?:\/\//, '').split('/')[0];
        }
      }

      const newTabs = [...prevTabs];
      newTabs[activeIdx] = {
        ...activeTab,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        url: url,
        title: title
      };
      
      return newTabs;
    });
    
    if (!incognito && url !== '') {
      let title = 'Beranda';
      if (url.includes('google.com/search') || url.includes('bing.com/search') || url.includes('duckduckgo.com')) {
         title = 'Pencarian';
      } else {
         title = url.replace(/^https?:\/\//, '').split('/')[0];
      }
      setFullHistory(prev => [{
        title: title,
        url,
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      }, ...prev]);
    }
  };

  const goBack = () => {
    setTabs(prev => {
      const activeIdx = prev.findIndex(t => t.id === activeTabId);
      if (activeIdx === -1) return prev;
      const tab = prev[activeIdx];
      if (tab.historyIndex > 0) {
        const newTabs = [...prev];
        newTabs[activeIdx] = { 
          ...tab, 
          historyIndex: tab.historyIndex - 1, 
          url: tab.history[tab.historyIndex - 1] 
        };
        return newTabs;
      }
      return prev;
    });
    setRefreshTrigger(prev => prev + 1);
  };

  const goForward = () => {
    setTabs(prev => {
      const activeIdx = prev.findIndex(t => t.id === activeTabId);
      if (activeIdx === -1) return prev;
      const tab = prev[activeIdx];
      if (tab.historyIndex < tab.history.length - 1) {
        const newTabs = [...prev];
        newTabs[activeIdx] = { 
          ...tab, 
          historyIndex: tab.historyIndex + 1, 
          url: tab.history[tab.historyIndex + 1] 
        };
        return newTabs;
      }
      return prev;
    });
    setRefreshTrigger(prev => prev + 1);
  };

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  const [activeScreen, setActiveScreen] = useState<'browser' | 'settings' | 'vpn'>('browser');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeOverlay, setActiveOverlay] = useState('none');

  const [downloads, setDownloads] = useState<DownloadItem[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('browser_downloads');
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('browser_downloads', JSON.stringify(downloads));
    }
  }, [downloads]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDownloads(prev => prev.map(d => {
        if (d.status === 'downloading' && !d.realUrl) {
          // Simulated downloads
          const speedInBytes = Math.floor((Math.random() * 2 + 0.5) * 1024 * 1024);
          let newDownloadedBytes = (d.downloadedBytes || 0) + (speedInBytes / 5); 
          
          if (newDownloadedBytes >= d.size) {
            newDownloadedBytes = d.size;
            return { ...d, downloadedBytes: newDownloadedBytes, status: 'completed', progress: 100, speed: undefined };
          }
          
          const progress = Math.floor((newDownloadedBytes / d.size) * 100);
          
          return { 
            ...d, 
            downloadedBytes: newDownloadedBytes,
            progress,
            speed: `${(speedInBytes / (1024 * 1024)).toFixed(1)} MB/s`
          };
        }
        return d;
      }));
    }, 200);

    return () => clearInterval(interval);
  }, []);

  const startRealDownload = async (id: string, url: string, filename: string, location?: 'cloud' | 'local') => {
    try {
      let targetUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
      if (url.startsWith('blob:') || url.startsWith('data:')) {
          targetUrl = url;
      }
      const response = await fetch(targetUrl);
      if (!response.ok) {
          throw new Error('Network response was not ok: ' + response.status + ' ' + response.statusText);
      }
      
      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      
      setDownloads(prev => prev.map(d => d.id === id ? { ...d, size: total > 0 ? total : 20000000 } : d));

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      let received = 0;
      const chunks: Uint8Array[] = [];
      let startTime = Date.now();
      let lastReportTime = startTime;
      let lastReportedReceived = 0;

      let fileHandle;
      let writable: any;
      if (location !== 'cloud') {
         if ((window as any).localDownloadDirectoryHandle) {
             try {
                 const dirHandle = (window as any).localDownloadDirectoryHandle;
                 const permission = await dirHandle.queryPermission({ mode: 'readwrite' });
                 if (permission === 'granted' || await dirHandle.requestPermission({ mode: 'readwrite' }) === 'granted') {
                     fileHandle = await dirHandle.getFileHandle(filename, { create: true });
                     writable = await fileHandle.createWritable();
                 }
             } catch (e) {
                 console.log("Failed to get file handle from dir handle", e);
             }
         }
      }

      while(true) {
        const {done, value} = await reader.read();
        if (done) break;
        if (value) {
            if (writable) {
                await writable.write(value);
            } else {
                chunks.push(value);
            }
            received += value.length;
            const now = Date.now();
            if (now - lastReportTime > 500) {
              const speedBytes = ((received - lastReportedReceived) / (now - lastReportTime)) * 1000;
              const speedStr = `${(speedBytes / (1024 * 1024)).toFixed(1)} MB/s`;
              lastReportTime = now;
              lastReportedReceived = received;

              setDownloads(prev => prev.map(d => {
                if (d.id === id && d.status === 'downloading') {
                  const finalTotal = d.size > 0 ? d.size : received * 2;
                  return {
                    ...d,
                    downloadedBytes: received,
                    progress: Math.min(99, Math.floor((received / finalTotal) * 100)),
                    speed: speedStr,
                    size: finalTotal
                  }
                }
                return d;
              }));
            }
        }
      }
      
      if (writable) {
          await writable.close();
      }

      let objectUrl = '';
      if (!writable) {
          const blob = new Blob(chunks);
          objectUrl = URL.createObjectURL(blob);

          if (location === 'cloud') {
             const formData = new FormData();
             formData.append('file', blob, filename);
             await fetch('/api/cloud-files/upload', {
                 method: 'POST',
                 body: formData
             });
          }
      }

      setDownloads(prev => prev.map(d => d.id === id ? { ...d, downloadedBytes: received, progress: 100, status: 'completed', objectUrl, size: received } : d));

      if (location !== 'cloud' && !writable) {
         // Trigger actual download to user browser only if not cloud
         const a = document.createElement('a');
         a.href = objectUrl;
         a.download = filename;
         document.body.appendChild(a);
         a.click();
         document.body.removeChild(a);
      }

    } catch (err) {
      console.error("Download failed:", err);
      setDownloads(prev => prev.map(d => d.id === id ? { ...d, status: 'failed', speed: 'Gagal' } : d));
    }
  };

  const addDownload = (item: Omit<DownloadItem, 'id' | 'progress' | 'status' | 'speed' | 'downloadedBytes'>) => {
    const newId = Math.random().toString(36);
    setDownloads(prev => [{ ...item, id: newId, progress: 0, status: 'downloading', downloadedBytes: 0, speed: '' }, ...prev]);
    if (item.realUrl) {
      startRealDownload(newId, item.realUrl, item.filename, item.location);
    }
  };

  const updateDownloadPath = (id: string, updates: Partial<DownloadItem>) => {
    setDownloads(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  const removeDownload = (id: string) => {
    setDownloads(prev => prev.filter(d => d.id !== id));
  };

  const pauseDownload = (id: string) => {
    updateDownloadPath(id, { status: 'paused', speed: '0 MB/s' });
  };

  const resumeDownload = (id: string) => {
    updateDownloadPath(id, { status: 'downloading', speed: '1.2 MB/s' });
  };



  const [bookmarks, setBookmarks] = useState<{title: string, url: string}[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('browser_bookmarks');
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {}
    return [
      { title: 'Wikipedia', url: 'https://en.wikipedia.org' }
    ];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('browser_bookmarks', JSON.stringify(bookmarks));
    }
  }, [bookmarks]);

  const addBookmark = (url: string, title?: string) => {
    if (!bookmarks.find(b => b.url === url)) {
      setBookmarks([...bookmarks, { title: title || url, url }]);
    }
  };

  const removeBookmark = (url: string) => {
    setBookmarks(bookmarks.filter(b => b.url !== url));
  };

  const clearHistory = () => setFullHistory([]);
  
  const removeHistoryItem = (index: number) => {
    setFullHistory(prev => prev.filter((_, i) => i !== index));
  };

  const [appSettings, setAppSettings] = useState<SettingsMap>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('browser_settings');
        if (saved) return { ...defaultSettings, ...JSON.parse(saved) };
      }
    } catch (e) {}
    return defaultSettings;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('browser_settings', JSON.stringify(appSettings));
    }
  }, [appSettings]);
  const updateSetting = (key: keyof SettingsMap, value: any) => {
    setAppSettings(prev => ({ ...prev, [key]: value }));
  };

  const [incognito, setIncognito] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  const [videoDetected, setVideoDetected] = useState(false);
  const [videoUrlDetected, setVideoUrlDetected] = useState<string | null>(null);
  const [triggerVideoDownload, setTriggerVideoDownload] = useState(false);
  const [blockedPopups, setBlockedPopups] = useState<string[]>([]);
  const addBlockedPopup = (url: string) => {
    setBlockedPopups(prev => {
        if (!prev.includes(url)) return [...prev, url];
        return prev;
    });
  };
  const clearBlockedPopups = () => setBlockedPopups([]);

  const [isCapturing, setIsCapturing] = useState(false);
  const [activePreviewFile, setActivePreviewFile] = useState<{ url: string; filename: string; type: string } | null>(null);

  return (
    <BrowserContext.Provider value={{
      vpnActive, setVpnActive,
      vpnConfig, setVpnConfig,
      isDark, setIsDark,
      textOnly, setTextOnly,
      adBlock, setAdBlock,
      currentUrl, setCurrentUrl,
      history, historyIndex,
      navigate, goBack, goForward, canGoBack, canGoForward,
      activeScreen, setActiveScreen,
      isMenuOpen, setIsMenuOpen,
      activeOverlay, setActiveOverlay,
      downloads, addDownload, updateDownloadPath, removeDownload, pauseDownload, resumeDownload,
      bookmarks, addBookmark, removeBookmark,
      fullHistory, clearHistory, removeHistoryItem,
      appSettings, updateSetting,
      incognito, setIncognito,
      refreshTrigger, triggerRefresh,
      tabs, activeTabId, addTab, removeTab, removeAllTabs, setActiveTab,
      syncUrlSilently,
      videoDetected, setVideoDetected,
      videoUrlDetected, setVideoUrlDetected,
      triggerVideoDownload, setTriggerVideoDownload,
      blockedPopups, addBlockedPopup, clearBlockedPopups,
      isCapturing, setIsCapturing,
      activePreviewFile, setActivePreviewFile
    }}>
      {children}
    </BrowserContext.Provider>
  );
};

export const useBrowser = () => useContext(BrowserContext);
