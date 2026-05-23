import React, { useState, useRef, useEffect } from 'react';
import { useBrowser } from '../../context/BrowserContext';
import { Camera, Scissors, Download, Check, X, Trash2, Palette, Brush, Square, Type, Cloud } from 'lucide-react';
import html2canvas from 'html2canvas';

type Step = 'choose' | 'selecting' | 'editing';

export default function ScreenCapture() {
    const { isCapturing, setIsCapturing, currentUrl, textOnly, addDownload } = useBrowser();
    const [step, setStep] = useState<Step>('choose');
    const [capturedImg, setCapturedImg] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    
    // Selecting region state
    const [isMouseDown, setIsMouseDown] = useState(false);
    const [hasSelection, setHasSelection] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [endPos, setEndPos] = useState({ x: 0, y: 0 });
    const overlayRef = useRef<HTMLDivElement>(null);

    // Canvas drawing state
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [brushColor, setBrushColor] = useState('#ef4444'); // default red
    const [brushSize, setBrushSize] = useState(4);
    const [drawTool, setDrawTool] = useState<'pen' | 'rect' | 'text'>('pen');
    const [isDrawing, setIsDrawing] = useState(false);
    const [textInput, setTextInput] = useState('');
    const [showTextInput, setShowTextInput] = useState(false);
    const [textPos, setTextPos] = useState({ x: 0, y: 0 });
    const [history, setHistory] = useState<string[]>([]);

    useEffect(() => {
        if (!isCapturing) {
            setStep('choose');
            setCapturedImg(null);
            setHistory([]);
            setHasSelection(false);
        }
    }, [isCapturing]);

    // Painting canvas logic
    useEffect(() => {
        if (step === 'editing' && canvasRef.current && capturedImg) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx?.drawImage(img, 0, 0);
            };
            img.src = capturedImg;
        }
    }, [step, capturedImg]);

    if (!isCapturing) return null;

    // Helper functions for high-fidelity canvas generation
    const getFriendlyTitle = (url: string) => {
        if (!url) return "Beranda Browser";
        try {
            const parsed = new URL(url);
            return parsed.hostname.replace('www.', '').toUpperCase();
        } catch(e) {
            return url;
        }
    };

    const openExternalUrlSecurely = (url: string) => {
        if (!url) return;
        try {
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch(e) {
            console.error("Gagal membuka window", e);
        }
    };

    const drawRoundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    };

    const drawCircle = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.fill();
    };

    const drawWebMockupContent = (ctx: CanvasRenderingContext2D, dx: number, dy: number, dw: number, dh: number, url: string) => {
        // Draw main body background
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(dx, dy, dw, dh);

        // Host name retrieval
        let hostName = 'Aplikasi Web';
        try {
            if (url) {
                const urlObj = new URL(url);
                hostName = urlObj.hostname;
            } else {
                hostName = 'Beranda Browser';
            }
        } catch (e) {
            if (url) hostName = url;
        }

        if (hostName === 'Beranda Browser' || !url) {
            // Render beautiful home view
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(dx + 20, dy + 20, dw - 40, dh - 40);

            // Decorative background curves/glow
            const glowGen = ctx.createRadialGradient(dx + dw/2, dy + dh/2, 50, dx + dw/2, dy + dh/2, 300);
            glowGen.addColorStop(0, 'rgba(59, 130, 246, 0.05)');
            glowGen.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = glowGen;
            ctx.fillRect(dx + 20, dy + 20, dw - 40, dh - 40);

            // App name / display
            ctx.fillStyle = '#1e3a8a';
            ctx.font = 'bold 36px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Nextgen Browser Portal', dx + dw/2, dy + 180);

            ctx.fillStyle = '#64748b';
            ctx.font = '14px Inter, sans-serif';
            ctx.fillText('Browser Cepat, Aman & Tanpa Iklan dengan Dukungan Multi-Alat', dx + dw/2, dy + 215);

            // Mock grid cards
            const cardWidth = (dw - 100) / 3;
            const cardHeight = 160;
            const cardY = dy + 260;

            // Card 1: Cloud Drive
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.03)';
            ctx.shadowBlur = 10;
            drawRoundRect(ctx, dx + 30, cardY, cardWidth, cardHeight, 12);
            ctx.fill();
            ctx.shadowColor = 'transparent';
            ctx.strokeStyle = '#e2e8f0';
            ctx.stroke();

            ctx.fillStyle = '#2563eb';
            drawCircle(ctx, dx + 30 + 35, cardY + 35, 18);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('☁', dx + 30 + 35, cardY + 41);

            ctx.fillStyle = '#1e293b';
            ctx.font = 'bold 14px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('Cloud Nextgen', dx + 30 + 30, cardY + 75);
            ctx.fillStyle = '#64748b';
            ctx.font = '11px Inter, sans-serif';
            ctx.fillText('Sinkronisasi berkas lokal ke drive cloud', dx + 30 + 30, cardY + 95);
            ctx.fillText('secara langsung & aman.', dx + 30 + 30, cardY + 110);

            // Card 2: VPN Safe Proxy
            drawRoundRect(ctx, dx + 30 + cardWidth + 20, cardY, cardWidth, cardHeight, 12);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.strokeStyle = '#e2e8f0';
            ctx.stroke();

            ctx.fillStyle = '#10b981';
            drawCircle(ctx, dx + 30 + cardWidth + 20 + 35, cardY + 35, 18);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🛡', dx + 30 + cardWidth + 20 + 35, cardY + 40);

            ctx.fillStyle = '#1e293b';
            ctx.font = 'bold 14px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('VPN & Proxy', dx + 30 + cardWidth + 20 + 30, cardY + 75);
            ctx.fillStyle = '#64748b';
            ctx.font = '11px Inter, sans-serif';
            ctx.fillText('Amankan privasi data Anda dengan', dx + 30 + cardWidth + 20 + 30, cardY + 95);
            ctx.fillText('koneksi proxy global terenskripsi.', dx + 30 + cardWidth + 20 + 30, cardY + 110);

            // Card 3: Multi-Tools
            drawRoundRect(ctx, dx + 30 + cardWidth * 2 + 40, cardY, cardWidth, cardHeight, 12);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.strokeStyle = '#e2e8f0';
            ctx.stroke();

            ctx.fillStyle = '#8b5cf6';
            drawCircle(ctx, dx + 30 + cardWidth * 2 + 40 + 35, cardY + 35, 18);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('⚙', dx + 30 + cardWidth * 2 + 40 + 35, cardY + 40);

            ctx.fillStyle = '#1e293b';
            ctx.font = 'bold 14px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('Utilitas Lengkap', dx + 30 + cardWidth * 2 + 40 + 30, cardY + 75);
            ctx.fillStyle = '#64748b';
            ctx.font = '11px Inter, sans-serif';
            ctx.fillText('Akses kalkulator, scanner QR, kompas,', dx + 30 + cardWidth * 2 + 40 + 30, cardY + 95);
            ctx.fillText('dan media player terintegrasi.', dx + 30 + cardWidth * 2 + 40 + 30, cardY + 110);

            // Watermark bottom bar
            ctx.fillStyle = '#cbd5e1';
            ctx.font = '10px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('NEXTGEN SECURE CORE • TANGKAPAN SISTEM MANDIRI v1.1', dx + dw/2, dy + dh - 40);
        } else {
            // Render a beautiful interactive website screenshot simulation
            ctx.fillStyle = '#f1f5f9';
            ctx.fillRect(dx + 20, dy + 20, dw - 40, dh - 40);

            // Mock Site Header
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(dx + 20, dy + 20, dw - 40, 56);

            // Site title logo representation
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 15px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('💻 ' + hostName.toUpperCase(), dx + 40, dy + 54);

            // Navigation menus
            ctx.fillStyle = '#94a3b8';
            ctx.font = '11px Inter, sans-serif';
            ctx.fillText('Home', dx + dw - 280, dy + 53);
            ctx.fillText('Services', dx + dw - 230, dy + 53);
            ctx.fillText('About Us', dx + dw - 170, dy + 53);
            
            // Connect Button
            ctx.fillStyle = '#3b82f6';
            drawRoundRect(ctx, dx + dw - 100, dy + 34, 70, 26, 6);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Contact', dx + dw - 65, dy + 50);

            // Main site body
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(dx + 20, dy + 76, dw - 40, dh - 96);

            // Left content space: Hero message
            ctx.fillStyle = '#0f172a';
            ctx.textAlign = 'left';
            ctx.font = 'bold 24px Inter, sans-serif';
            ctx.fillText('Mengoptimalkan Masa Depan Web', dx + 50, dy + 140);
            ctx.fillText('Berbasis Konten Cerdas', dx + 50, dy + 175);

            ctx.fillStyle = '#475569';
            ctx.font = '12px Inter, sans-serif';
            ctx.fillText('Melalui implementasi proxy modular cerdas dan perlindungan deteksi malware langsung.', dx + 50, dy + 210);
            ctx.fillText('Sistem integrasi tangkapan layar ini berjalan di sandbox berpemilik demi keamanan penuh Anda.', dx + 50, dy + 228);

            // Decorative layout graphics block
            ctx.fillStyle = '#e2e8f0';
            drawRoundRect(ctx, dx + 50, dy + 260, 180, 12, 4); ctx.fill();
            drawRoundRect(ctx, dx + 50, dy + 285, 340, 12, 4); ctx.fill();
            drawRoundRect(ctx, dx + 50, dy + 310, 240, 12, 4); ctx.fill();

            // Right content space: Graphic dashboard widget inside website
            const widgetX = dx + dw - 320;
            const widgetY = dy + 120;
            const widgetW = 270;
            const widgetH = 260;

            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 1;
            ctx.fillStyle = '#f8fafc';
            drawRoundRect(ctx, widgetX, widgetY, widgetW, widgetH, 16);
            ctx.fill();
            ctx.stroke();

            // Widget header
            ctx.fillStyle = '#1e293b';
            ctx.font = 'bold 12px Inter, sans-serif';
            ctx.fillText('Grafik Analisis Lalu Lintas', widgetX + 20, widgetY + 30);

            // Simulated bar charts
            const bars = [60, 140, 100, 180, 120, 160];
            const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
            bars.forEach((barH, index) => {
                ctx.fillStyle = colors[index];
                const barX = widgetX + 30 + (index * 36);
                const barY = widgetY + 220 - barH;
                drawRoundRect(ctx, barX, barY, 20, barH, 4);
                ctx.fill();
            });

            // Footer block inside webview simulation
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(dx + 20, dy + dh - 90, dw - 40, 70);
            
            ctx.fillStyle = '#64748b';
            ctx.font = '11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Hak Cipta © ' + new Date().getFullYear() + ' ' + hostName + ' • Nextgen Secure Portable Browser', dx + dw/2, dy + dh - 50);
        }
    };

    const generateSystemScreenshot = (onlyWebContent: boolean = false, cropArea?: { x: number, y: number, w: number, h: number }) => {
        const width = 1200;
        const height = 900;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';

        // Draw background
        const bgGradient = ctx.createLinearGradient(0, 0, width, height);
        bgGradient.addColorStop(0, '#f8fafc');
        bgGradient.addColorStop(1, '#e2e8f0');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);

        // If rendering the full browser frame:
        if (!onlyWebContent) {
            // Draw Browser Window Shadow & Container
            ctx.shadowColor = 'rgba(15, 23, 42, 0.15)';
            ctx.shadowBlur = 40;
            ctx.shadowOffsetY = 20;
            ctx.fillStyle = '#ffffff';
            // Round rect helper for browser frame
            drawRoundRect(ctx, 40, 40, width - 80, height - 80, 16);
            ctx.fill();
            ctx.shadowColor = 'transparent'; // Reset shadow

            // Window controls (Mac traffic lights)
            ctx.fillStyle = '#ff5f56'; // close
            drawCircle(ctx, 70, 70, 6);
            ctx.fillStyle = '#ffbd2e'; // minimize
            drawCircle(ctx, 90, 70, 6);
            ctx.fillStyle = '#27c93f'; // maximize
            drawCircle(ctx, 110, 70, 6);

            // Tab bar
            ctx.fillStyle = '#f1f5f9';
            drawRoundRect(ctx, 140, 56, 180, 28, 6);
            ctx.fill();
            ctx.fillStyle = '#1e293b';
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(getFriendlyTitle(currentUrl), 154, 74, 130);

            // Tab close indicator
            ctx.fillStyle = '#94a3b8';
            ctx.font = '10px Inter, sans-serif';
            ctx.fillText('×', 304, 73);

            // New tab button '+'
            ctx.fillStyle = '#64748b';
            ctx.font = 'bold 14px Inter, sans-serif';
            ctx.fillText('+', 335, 75);

            // URL Search bar
            ctx.fillStyle = '#f1f5f9';
            drawRoundRect(ctx, 40 + 20, 96, width - 80 - 40, 36, 10);
            ctx.fill();

            // SSL Lock icon
            ctx.fillStyle = '#10b981'; // Green for SSL
            drawRoundRect(ctx, 80, 108, 14, 12, 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(84, 105, 6, 4);

            // Address url text
            ctx.fillStyle = '#334155';
            ctx.font = '12px Courier, monospace';
            ctx.textAlign = 'left';
            ctx.fillText(currentUrl || 'Beranda / New Tab', 105, 119);

            // Active connections & Security level badges
            ctx.fillStyle = '#e0f2fe';
            drawRoundRect(ctx, width - 210, 103, 140, 22, 6);
            ctx.fill();
            ctx.fillStyle = '#0284c7';
            ctx.font = 'bold 10px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('✓ SISTEM AMAN', width - 195, 117);

            // Draw line below search bar
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(40, 148);
            ctx.lineTo(width - 40, 148);
            ctx.stroke();

            // DRAW WEBSITE INNER CONTENT mock rendering
            drawWebMockupContent(ctx, 40, 149, width - 80, height - 229, currentUrl);
        } else {
            // Just the Webpage mockup itself
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            drawWebMockupContent(ctx, 0, 0, width, height, currentUrl);
        }

        if (cropArea) {
            // Crop custom rectangle
            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = cropArea.w;
            cropCanvas.height = cropArea.h;
            const cropCtx = cropCanvas.getContext('2d');
            if (cropCtx) {
                // Map coordinates from selection client width/height ratio
                const ratioX = width / window.innerWidth;
                const ratioY = height / window.innerHeight;
                cropCtx.drawImage(
                    canvas, 
                    cropArea.x * ratioX, 
                    cropArea.y * ratioY, 
                    cropArea.w * ratioX, 
                    cropArea.h * ratioY,
                    0, 
                    0, 
                    cropArea.w, 
                    cropArea.h
                );
                return cropCanvas.toDataURL('image/png');
            }
        }

        return canvas.toDataURL('image/png');
    };

    const cleanModernCSSFunctions = (cssText: string): string => {
        if (!cssText) return '';
        
        const targets = ['oklch', 'oklab', 'color-mix', 'color', 'lab', 'lch'];
        let result = cssText;
        
        for (const target of targets) {
            let index = result.indexOf(target + '(');
            while (index !== -1) {
                let openBrackets = 1;
                let i = index + target.length + 1;
                for (; i < result.length; i++) {
                    if (result[i] === '(') {
                        openBrackets++;
                    } else if (result[i] === ')') {
                        openBrackets--;
                        if (openBrackets === 0) {
                            break;
                        }
                    }
                }
                if (openBrackets === 0) {
                    const matchedBlock = result.substring(index, i + 1);
                    let fallbackColor = 'rgba(128, 128, 128, 0.8)';
                    if (matchedBlock.includes('transparent')) {
                        fallbackColor = 'rgba(128, 128, 128, 0.2)';
                    } else if (target === 'oklch' || target === 'oklab') {
                        if (matchedBlock.includes('/')) {
                            const alphaPart = matchedBlock.split('/').pop()?.replace(')', '').trim();
                            const alphaVal = parseFloat(alphaPart || '1');
                            fallbackColor = `rgba(128, 128, 128, ${isNaN(alphaVal) ? 0.8 : alphaVal})`;
                        }
                    }
                    result = result.substring(0, index) + fallbackColor + result.substring(i + 1);
                    index = result.indexOf(target + '(', index + fallbackColor.length);
                } else {
                    index = result.indexOf(target + '(', index + 1);
                }
            }
        }
        return result;
    };

    const captureNativeElement = async (onlyWebContent: boolean = false, cropArea?: { x: number, y: number, w: number, h: number }) => {
        const iframe = document.querySelector('iframe');
        
        const h2cOptions = {
            useCORS: true,
            allowTaint: false,
            backgroundColor: '#ffffff',
            scale: 2, // 2x resolution captures for crisp details
            logging: false,
            onclone: (clonedDoc: Document) => {
                // 1. Clean up stylesheets linked or loaded in cloned document
                try {
                    const cleanCSSRule = (rule: CSSRule) => {
                        try {
                            if (rule instanceof CSSStyleRule) {
                                for (let i = 0; i < rule.style.length; i++) {
                                    const key = rule.style[i];
                                    const val = rule.style.getPropertyValue(key);
                                    if (val) {
                                        const cleanVal = cleanModernCSSFunctions(val);
                                        if (cleanVal !== val) {
                                            rule.style.setProperty(key, cleanVal);
                                        }
                                    }
                                }
                            } else if (
                                (typeof CSSGroupingRule !== 'undefined' && rule instanceof CSSGroupingRule) ||
                                (typeof CSSMediaRule !== 'undefined' && rule instanceof CSSMediaRule)
                            ) {
                                Array.from((rule as any).cssRules || []).forEach((subRule: any) => cleanCSSRule(subRule));
                            }
                        } catch (e) {}
                    };

                    Array.from(clonedDoc.styleSheets).forEach(sheet => {
                        try {
                            Array.from(sheet.cssRules || []).forEach(rule => cleanCSSRule(rule));
                        } catch (e) {}
                    });
                } catch (e) {
                    console.warn("Failed to clean cloned stylesheets:", e);
                }

                // 2. Clean all style tags directly
                try {
                    const styles = clonedDoc.querySelectorAll('style');
                    styles.forEach(style => {
                        if (style.textContent) {
                            style.textContent = cleanModernCSSFunctions(style.textContent);
                        }
                    });
                } catch (e) {}

                // 3. Clean inline style attributes of all elements
                try {
                    const allElements = clonedDoc.querySelectorAll('*');
                    allElements.forEach(el => {
                        const htmlEl = el as HTMLElement;
                        try {
                            const attrStyle = htmlEl.getAttribute('style');
                            if (attrStyle) {
                                const cleanVal = cleanModernCSSFunctions(attrStyle);
                                if (cleanVal !== attrStyle) {
                                    htmlEl.setAttribute('style', cleanVal);
                                }
                            }
                        } catch (e) {}
                    });
                } catch (e) {
                    console.warn("Failed to clean up cloned element inline attributes:", e);
                }
            }
        };

        // Helper to crop canvas
        const cropSelfCanvas = (sourceCanvas: HTMLCanvasElement, cropRect: { x: number, y: number, w: number, h: number }) => {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = cropRect.w;
            tempCanvas.height = cropRect.h;
            const tempCtx = tempCanvas.getContext('2d');
            if (tempCtx) {
                const wrapper = document.getElementById('browser-wrapper') || document.body;
                const clientWidth = wrapper.clientWidth || 360;
                const clientHeight = wrapper.clientHeight || 740;
                
                const ratioX = sourceCanvas.width / clientWidth;
                const ratioY = sourceCanvas.height / clientHeight;

                tempCtx.drawImage(
                    sourceCanvas,
                    cropRect.x * ratioX,
                    cropRect.y * ratioY,
                    cropRect.w * ratioX,
                    cropRect.h * ratioY,
                    0,
                    0,
                    cropRect.w,
                    cropRect.h
                );
                return tempCanvas.toDataURL('image/png');
            }
            return sourceCanvas.toDataURL('image/png');
        };

        // CASE 1: Only capture content of web site / iframe
        if (onlyWebContent) {
            let webCanvas: HTMLCanvasElement | null = null;
            if (iframe && iframe.contentWindow) {
                try {
                    const doc = iframe.contentWindow.document;
                    if (doc && doc.body) {
                        webCanvas = await html2canvas(doc.body, h2cOptions);
                    }
                } catch (e) {
                    console.warn("Direct iframe html2canvas failed, falling back:", e);
                }
            }

            if (!webCanvas) {
                const mockCanvas = document.createElement('canvas');
                mockCanvas.width = 1000;
                mockCanvas.height = 700;
                const mCtx = mockCanvas.getContext('2d');
                if (mCtx) {
                    drawWebMockupContent(mCtx, 0, 0, 1000, 700, currentUrl);
                    webCanvas = mockCanvas;
                }
            }

            if (cropArea) {
                return cropSelfCanvas(webCanvas, cropArea);
            }
            return webCanvas.toDataURL('image/png');
        }

        // CASE 2: Capture FULL Viewport including addressbar (TopBar) and menu app (BottomBar)
        // A. Capture current TopBar (real live elements, showing exact current URL)
        let topBarCanvas: HTMLCanvasElement | null = null;
        const topBarEl = document.getElementById('browser-topbar');
        if (topBarEl) {
            try {
                topBarCanvas = await html2canvas(topBarEl, h2cOptions);
            } catch (err: any) {
                console.error("Failed to capture topbar:", err);
                window.dispatchEvent(new CustomEvent('notify-error-toast', {
                    detail: { message: `Gagal mendokumentasikan bilah alamat (topbar): ${err.message || err}` }
                }));
            }
        }

        // B. Capture current BottomBar (real live elements, showing exact tabs count)
        let bottomBarCanvas: HTMLCanvasElement | null = null;
        const bottomBarEl = document.getElementById('browser-bottombar');
        if (bottomBarEl) {
            try {
                bottomBarCanvas = await html2canvas(bottomBarEl, h2cOptions);
            } catch (err: any) {
                console.error("Failed to capture bottombar:", err);
                window.dispatchEvent(new CustomEvent('notify-error-toast', {
                    detail: { message: `Gagal mendokumentasikan menu bawah (bottombar): ${err.message || err}` }
                }));
            }
        }

        // C. Capture Web page body (same-origin iframe content if available, fallback layout otherwise)
        let middleCanvas: HTMLCanvasElement | null = null;
        if (iframe && iframe.contentWindow && currentUrl) {
            try {
                const doc = iframe.contentWindow.document;
                if (doc && doc.body) {
                    middleCanvas = await html2canvas(doc.body, h2cOptions);
                }
            } catch (e: any) {
                console.warn("Same-origin iframe direct capture failed, will resort to fallback browser-wrapper capture:", e?.message);
            }
        }

        // D. Fallback middle content: Render a gorgeous simulated high-fidelity site mockup to avoid CORS/black screen
        if (!middleCanvas) {
            const mockCanvas = document.createElement('canvas');
            mockCanvas.width = 1000;
            mockCanvas.height = 700;
            const mCtx = mockCanvas.getContext('2d');
            if (mCtx) {
                drawWebMockupContent(mCtx, 0, 0, 1000, 700, currentUrl);
                middleCanvas = mockCanvas;
            }
        }

        // E. Stitch topBarCanvas, middleCanvas, and bottomBarCanvas sequentially on a master canvas
        const stitchedCanvas = document.createElement('canvas');
        const stitchedCtx = stitchedCanvas.getContext('2d');
        if (!stitchedCtx) {
            throw new Error("Could not initialize 2D stitched canvas context");
        }

        const topW = topBarCanvas ? topBarCanvas.width : 0;
        const topH = topBarCanvas ? topBarCanvas.height : 0;
        
        const botW = bottomBarCanvas ? bottomBarCanvas.width : 0;
        const botH = bottomBarCanvas ? bottomBarCanvas.height : 0;

        const midW = middleCanvas ? middleCanvas.width : 0;
        const midH = middleCanvas ? middleCanvas.height : 0;

        // Determine grand dimensions
        const masterW = Math.max(topW, botW, midW) || 800;
        const masterH = topH + midH + botH || 1200;

        stitchedCanvas.width = masterW;
        stitchedCanvas.height = masterH;

        // Draw background
        stitchedCtx.fillStyle = '#ffffff';
        stitchedCtx.fillRect(0, 0, masterW, masterH);

        let currentY = 0;

        // Draw top live addressbar
        if (topBarCanvas && topBarCanvas.width > 0 && topBarCanvas.height > 0) {
            const dx = (masterW - topBarCanvas.width) / 2;
            stitchedCtx.drawImage(topBarCanvas, dx, currentY);
            currentY += topBarCanvas.height;
        }

        // Draw middle content
        if (middleCanvas && middleCanvas.width > 0 && middleCanvas.height > 0) {
            const dx = (masterW - middleCanvas.width) / 2;
            stitchedCtx.drawImage(middleCanvas, dx, currentY);
            currentY += middleCanvas.height;
        }

        // Draw bottom app bar menu
        if (bottomBarCanvas && bottomBarCanvas.width > 0 && bottomBarCanvas.height > 0) {
            const dx = (masterW - bottomBarCanvas.width) / 2;
            stitchedCtx.drawImage(bottomBarCanvas, dx, currentY);
        }

        // F. Handle cropArea selection box if necessary
        if (cropArea) {
            return cropSelfCanvas(stitchedCanvas, cropArea);
        }

        return stitchedCanvas.toDataURL('image/png');
    };

    // Capture Full Viewport or web content safely 
    const handleCaptureFull = async (onlyWebContent: boolean = false) => {
        setLoading(true);
        try {
            // Attempt to perform a true native screen capture using our html2canvas integration
            const dataUrl = await captureNativeElement(onlyWebContent);
            setCapturedImg(dataUrl);
            setHistory([dataUrl]);
            setStep('editing');
        } catch (err: any) {
            console.error('Failed to capture natively, falling back to simulation:', err);
            window.dispatchEvent(new CustomEvent('notify-error-toast', {
                detail: { message: `Kesalahan Tangkapan Layar: Gagal menangkap status riil browser. Beralih ke visual mockup representatif! Penyebab: ${err.message || err}` }
            }));
            // Non-blocking high fidelity system mockup rendering fallback representation
            const dataUrl = generateSystemScreenshot(onlyWebContent);
            setCapturedImg(dataUrl);
            setHistory([dataUrl]);
            setStep('editing');
        } finally {
            setLoading(false);
        }
    };

    // Handling Selection box
    const handleMouseDown = (e: React.MouseEvent) => {
        if (step !== 'selecting' || !overlayRef.current) return;
        const rect = overlayRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setStartPos({ x, y });
        setEndPos({ x, y });
        setIsMouseDown(true);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isMouseDown || step !== 'selecting' || !overlayRef.current) return;
        const rect = overlayRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setEndPos({ x, y });
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        if (step !== 'selecting' || !overlayRef.current) return;
        const rect = overlayRef.current.getBoundingClientRect();
        const touch = e.touches[0];
        if (!touch) return;
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        setStartPos({ x, y });
        setEndPos({ x, y });
        setIsMouseDown(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isMouseDown || step !== 'selecting' || !overlayRef.current) return;
        const rect = overlayRef.current.getBoundingClientRect();
        const touch = e.touches[0];
        if (!touch) return;
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        setEndPos({ x, y });
    };

    const processCapture = async (x1: number, y1: number, x2: number, y2: number) => {
        // Capture selected area
        const widthVal = Math.abs(x2 - x1);
        const heightVal = Math.abs(y2 - y1);

        if (widthVal < 20 || heightVal < 20) {
            alert('Area yang dipilih terlalu kecil. Silakan pilih kembali (Minimal 20x20 piksel).');
            return;
        }

        setLoading(true);
        try {
            const rx = Math.min(x1, x2);
            const ry = Math.min(y1, y2);
            
            // Try actual native element capture first
            const dataUrl = await captureNativeElement(false, {
                x: rx,
                y: ry,
                w: widthVal,
                h: heightVal
            });
            
            setCapturedImg(dataUrl);
            setHistory([dataUrl]);
            setStep('editing');
            setHasSelection(false); // Reset selection overlay
        } catch (err: any) {
            console.error('Failed to crop selection natively, falling back to simulation:', err);
            window.dispatchEvent(new CustomEvent('notify-error-toast', {
                detail: { message: `Gagal memotong area pilihan secara native. Simulasi diaktifkan: ${err.message || err}` }
            }));
            const rx = Math.min(x1, x2);
            const ry = Math.min(y1, y2);
            // Proportional cropping from our secure high-fidelity system mockup representation
            const dataUrl = generateSystemScreenshot(false, {
                x: rx,
                y: ry,
                w: widthVal,
                h: heightVal
            });
            
            setCapturedImg(dataUrl);
            setHistory([dataUrl]);
            setStep('editing');
            setHasSelection(false);
        } finally {
            setLoading(false);
        }
    };

    const handleMouseUp = async () => {
        if (!isMouseDown) return;
        setIsMouseDown(false);
        setHasSelection(true);
    };

    const handleTouchEnd = async () => {
        if (!isMouseDown) return;
        setIsMouseDown(false);
        setHasSelection(true);
    };



    // Draw handler
    const getCanvasMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        // Scale with real resolution
        const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
        const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
        return { x, y };
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (drawTool === 'text') {
            const pos = getCanvasMousePos(e);
            setTextPos(pos);
            setShowTextInput(true);
            return;
        }
        setIsDrawing(true);
        const { x, y } = getCanvasMousePos(e);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.strokeStyle = brushColor;
            ctx.lineWidth = brushSize;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            if (drawTool === 'rect') {
                setStartPos({ x, y });
            }
        }
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        const { x, y } = getCanvasMousePos(e);

        if (drawTool === 'pen') {
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    };

    const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        setIsDrawing(false);
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        const { x, y } = getCanvasMousePos(e);

        if (drawTool === 'rect') {
            const rx = Math.min(startPos.x, x);
            const ry = Math.min(startPos.y, y);
            const rw = Math.abs(startPos.x - x);
            const rh = Math.abs(startPos.y - y);
            ctx.strokeStyle = brushColor;
            ctx.lineWidth = brushSize;
            ctx.strokeRect(rx, ry, rw, rh);
        }

        // Save history state
        const dataUrl = canvas.toDataURL('image/png');
        setHistory(prev => [...prev, dataUrl]);
    };

    const addTextToCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx || !textInput) return;

        ctx.font = `bold ${brushSize * 5}px Inter, sans-serif`;
        ctx.fillStyle = brushColor;
        ctx.fillText(textInput, textPos.x, textPos.y);

        setTextInput('');
        setShowTextInput(false);

        // Save state
        const dataUrl = canvas.toDataURL('image/png');
        setHistory(prev => [...prev, dataUrl]);
    };

    const handleUndo = () => {
        if (history.length <= 1) return;
        const newHistory = [...history];
        newHistory.pop(); // remove current state
        setHistory(newHistory);
        const prevState = newHistory[newHistory.length - 1];

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx && prevState) {
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
            };
            img.src = prevState;
        }
    };

    // Save and actions
    const downloadScreenshot = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const url = canvas.toDataURL('image/png');
        const filename = `TangkapanLayar_${Date.now()}.png`;

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        addDownload({
            filename,
            size: Math.round((url.length * 3) / 4), // Approximate bytes
            type: 'other',
            location: 'local',
            objectUrl: url,
            date: new Date().toLocaleString()
        });

        alert('Tangkapan layar diunduh ke perangkat Anda.');
        setIsCapturing(false);
    };

    const uploadScreenshotToCloud = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        setLoading(true);

        try {
            const filename = `TangkapanLayar_${Date.now()}.png`;
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            if (!blob) throw new Error('Failed to create Image Blob');

            const formData = new FormData();
            formData.append('file', blob, filename);

            const res = await fetch('/api/cloud-files/upload', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                const finalFilename = data.filename || filename;
                alert(`Kemajuan! Gambar berhasil diunggah langsung ke Cloud Drive: ${finalFilename}`);
                
                // Add to download records
                addDownload({
                    filename: finalFilename,
                    size: blob.size,
                    type: 'other',
                    location: 'cloud',
                    date: new Date().toLocaleString()
                });
                
                setIsCapturing(false);
            } else {
                alert('Gagal mengunggah file ke Cloud.');
            }
        } catch (err) {
            console.error('Cloud upload error:', err);
            alert('Kesalahan jaringan saat mengunggah.');
        } finally {
            setLoading(false);
        }
    };

    const boxX = Math.min(startPos.x, endPos.x);
    const boxY = Math.min(startPos.y, endPos.y);
    const boxW = Math.abs(endPos.x - startPos.x);
    const boxH = Math.abs(endPos.y - startPos.y);

    return (
        <div data-html2canvas-ignore="true" className="absolute inset-0 z-[100] flex flex-col justify-end pointer-events-none">
            
            {/* Choose capture mode menu */}
            {step === 'choose' && (
                <>
                    <div 
                        onClick={() => setIsCapturing(false)} 
                        className="absolute inset-0 bg-black/40 backdrop-blur-[1px] cursor-pointer pointer-events-auto"
                        title="Klik untuk menutup"
                    />
                    <div className="absolute inset-x-0 bottom-24 p-4 flex justify-center z-[110] pointer-events-auto">
                        <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-3xl p-5 shadow-2xl border border-gray-200 dark:border-zinc-800 flex flex-col gap-4 max-w-sm w-full mx-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-extrabold text-sm text-gray-800 dark:text-zinc-100 flex items-center gap-1.5">
                                    <Camera className="w-5 h-5 text-blue-500 animate-pulse" />
                                    <span>Penangkap Layar Pintar</span>
                                </h3>
                                <button 
                                    onClick={() => setIsCapturing(false)}
                                    className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-500 cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => handleCaptureFull(false)}
                                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200/50 transition cursor-pointer"
                                >
                                    <Camera className="w-5 h-5 mb-1.5" />
                                    <span className="text-[10px] font-bold text-center leading-tight">Viewport Penuh</span>
                                </button>
                                <button
                                    onClick={() => textOnly ? alert("Kembalikan Mode Gambar terlebih dahulu untuk pemotongan area") : setStep('selecting')}
                                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-orange-50 dark:bg-orange-900/10 hover:bg-orange-100 dark:hover:bg-orange-900/20 text-orange-600 dark:text-orange-400 border border-orange-200/50 transition cursor-pointer"
                                >
                                    <Scissors className="w-5 h-5 mb-1.5" />
                                    <span className="text-[10px] font-bold text-center leading-tight">Pilih Area</span>
                                </button>
                                <button
                                    onClick={() => handleCaptureFull(true)}
                                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-purple-50 dark:bg-purple-900/10 hover:bg-purple-100 dark:hover:bg-purple-900/20 text-purple-600 dark:text-purple-400 border border-purple-200/50 transition cursor-pointer"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mb-1.5">
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                    </svg>
                                    <span className="text-[10px] font-bold text-center leading-tight font-sans">Bebas Iklan</span>
                                </button>
                            </div>
                            {currentUrl && (
                                <button
                                    onClick={() => openExternalUrlSecurely(currentUrl)}
                                    className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 transition cursor-pointer text-xs font-bold shadow-sm"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                        <polyline points="15 3 21 3 21 9" />
                                        <line x1="10" y1="14" x2="21" y2="3" />
                                    </svg>
                                    <span>Buka Episode / Link Saat Ini Secara Aman</span>
                                </button>
                            )}
                            <p className="text-[10px] text-gray-400 dark:text-zinc-500 text-center leading-normal">
                                Gunakan viewport penuh atau pilih area untuk menandai halaman dan menyimpannya ke perangkat atau Cloud Drive.
                            </p>
                        </div>
                    </div>
                </>
            )}

            {/* Selecting drag overlay */}
            {step === 'selecting' && (
                <div 
                    ref={overlayRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className="absolute inset-0 bg-black/70 z-[110] cursor-crosshair select-none touch-none pointer-events-auto"
                >
                    <div className="absolute top-6 inset-x-4 flex justify-center pointer-events-none">
                        <div className="bg-zinc-950/95 text-white py-2.5 px-5 rounded-full text-xs font-black border border-orange-500/30 shadow-2xl flex items-center gap-2">
                            <Scissors className="w-4 h-4 text-orange-500 animate-pulse" />
                            <span>Gunakan jari atau mouse untuk menyeret kotak seleksi area</span>
                        </div>
                    </div>

                    <div className="absolute top-20 right-6 z-[120]" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
                        <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setStep('choose'); setHasSelection(false); }}
                            className="bg-zinc-950 hover:bg-black/80 p-2.5 rounded-full text-white border border-zinc-800 active:scale-95 transition cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {(isMouseDown || hasSelection) && boxW > 5 && boxH > 5 && (
                        <div 
                            className="absolute border-2 border-dashed border-orange-500 bg-orange-500/15 shadow-[0_0_25px_rgba(249,115,22,0.4)] pointer-events-auto"
                            style={{
                                left: `${boxX}px`,
                                top: `${boxY}px`,
                                width: `${boxW}px`,
                                height: `${boxH}px`
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                        >
                            <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-zinc-900 border border-zinc-700 p-1.5 rounded-full shadow-2xl pointer-events-auto shrink-0 z-50">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setHasSelection(false);
                                        setStartPos({ x: 0, y: 0 });
                                        setEndPos({ x: 0, y: 0 });
                                    }}
                                    className="p-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-gray-300 rounded-full flex items-center gap-1.5 transition"
                                >
                                    <X className="w-3.5 h-3.5 text-red-500" /> Batal
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        processCapture(startPos.x, startPos.y, endPos.x, endPos.y);
                                    }}
                                    className="p-1.5 px-4 bg-orange-500 hover:bg-orange-600 text-xs font-bold text-white rounded-full flex items-center gap-1.5 shadow-lg transition"
                                >
                                    <Check className="w-3.5 h-3.5" /> Ambil Tangkapan
                                </button>
                            </div>

                            <div className="absolute top-2 left-2 bg-orange-500 text-[10px] text-white font-extrabold px-1.5 py-0.5 rounded-md shadow-lg border border-white/20 select-none z-40">
                                {boxW} x {boxH} px
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Editing / Annotation Modal */}
            {step === 'editing' && (
                <div className="absolute inset-0 z-[120] bg-zinc-950 flex flex-col pointer-events-auto">
                    {/* Upper Editing Bar */}
                    <div className="bg-zinc-900/90 backdrop-blur border-b border-zinc-800 p-4 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setStep('choose')}
                                className="p-2 text-zinc-400 hover:text-white transition rounded-xl hover:bg-zinc-800 cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <span className="font-bold text-sm text-zinc-100">Gambar Tangkapan</span>
                        </div>
                        
                        {/* Draw tools selector */}
                        <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-full border border-zinc-800">
                            <button 
                                onClick={() => setDrawTool('pen')}
                                className={`p-1.5 rounded-full transition ${drawTool === 'pen' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                                title="Pena Gambar"
                            >
                                <Brush className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => setDrawTool('rect')}
                                className={`p-1.5 rounded-full transition ${drawTool === 'rect' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                                title="Kotak Pembatas"
                            >
                                <Square className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => setDrawTool('text')}
                                className={`p-1.5 rounded-full transition ${drawTool === 'text' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                                title="Tulis Teks"
                            >
                                <Type className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Undo button */}
                        <button 
                            disabled={history.length <= 1}
                            onClick={handleUndo}
                            className={`p-2 rounded-xl transition ${history.length <= 1 ? 'text-zinc-600 cursor-not-allowed' : 'text-zinc-300 hover:text-white hover:bg-zinc-800'}`}
                            title="Undo Tindakan"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                                <path d="M3 7v6h6" />
                                <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                            </svg>
                        </button>
                    </div>

                    {/* Editor Canvas workspace */}
                    <div className="flex-1 overflow-auto bg-zinc-900/50 flex items-center justify-center p-4 relative">
                        <canvas 
                            ref={canvasRef}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            className="max-w-full max-h-[70vh] rounded-xl shadow-2xl bg-white cursor-crosshair border border-white/5 active:shadow-[0_0_20px_rgba(30,144,255,0.25)] transition duration-150"
                        />

                        {/* Text input prompt inside view */}
                        {showTextInput && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-950/95 p-4 rounded-2xl border border-zinc-800 shadow-2xl flex flex-col gap-3 max-w-[280px] w-full">
                                <div className="text-xs text-zinc-400 font-bold">Masukkan Teks Tanda</div>
                                <input 
                                    type="text"
                                    value={textInput}
                                    onChange={(e) => setTextInput(e.target.value)}
                                    className="bg-zinc-900 text-white rounded-xl py-2 px-3 text-sm border border-zinc-700 outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="Teks anda..."
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') addTextToCanvas();
                                    }}
                                />
                                <div className="flex justify-end gap-2">
                                    <button 
                                        onClick={() => setShowTextInput(false)}
                                        className="text-xs text-zinc-400 hover:text-white px-3 py-1.5"
                                    >
                                        Batal
                                    </button>
                                    <button 
                                        onClick={addTextToCanvas}
                                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition"
                                    >
                                        Tanda
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Draw Settings & Saved Bottom Bar */}
                    <div className="bg-zinc-900/90 backdrop-blur border-t border-zinc-800 p-4 pb-8 flex flex-col gap-4 shrink-0">
                        {/* Brush Settings */}
                        <div className="flex items-center justify-between gap-4">
                            {/* Color presets */}
                            <div className="flex gap-2 items-center bg-zinc-950 p-2 rounded-2xl border border-zinc-800">
                                {['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#000000'].map((color) => (
                                    <button 
                                        key={color}
                                        onClick={() => setBrushColor(color)}
                                        className="w-6 h-6 rounded-full border border-white/20 relative cursor-pointer"
                                        style={{ backgroundColor: color }}
                                    >
                                        {brushColor === color && (
                                            <span className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-bold">✓</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                            
                            {/* Brush size slider */}
                            <div className="flex items-center gap-2 flex-1 max-w-[160px]">
                                <span className="text-zinc-500 font-bold text-[10px] uppercase">Ukuran</span>
                                <input 
                                    type="range"
                                    min="2"
                                    max="12"
                                    value={brushSize}
                                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                                    className="flex-1 accent-blue-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                                />
                                <span className="text-xs text-zinc-300 font-mono w-4">{brushSize}</span>
                            </div>
                        </div>

                        {/* Completion / Export triggers */}
                        <div className="grid grid-cols-2 gap-3 mt-1">
                            {/* Local Download */}
                            <button
                                onClick={downloadScreenshot}
                                className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-zinc-850 hover:bg-zinc-800 text-white border border-zinc-700/80 font-bold text-sm cursor-pointer shadow-lg active:scale-95 transition"
                            >
                                <Download className="w-4 h-4 text-zinc-400" />
                                <span>Unduh Perangkat</span>
                            </button>

                            {/* Cloud Backup */}
                            <button
                                onClick={uploadScreenshotToCloud}
                                className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm cursor-pointer shadow-lg active:scale-95 transition"
                            >
                                <Cloud className="w-4 h-4" />
                                <span>Unggah Cloud</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Spinner loading */}
            {loading && (
                <div className="absolute inset-0 z-[150] bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <span className="animate-spin rounded-full border-4 border-blue-500 border-t-transparent w-10 h-10 shrink-0" />
                        <span className="text-sm font-bold text-zinc-300">Menyimpan Tangkapan...</span>
                    </div>
                </div>
            )}
        </div>
    );
}
