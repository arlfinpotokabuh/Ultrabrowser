import React from 'react';
import { ChevronLeft, ChevronRight, Menu, Home, SquareStack, Plus } from 'lucide-react';
import { useBrowser } from '../context/BrowserContext';

export default function BottomBar() {
    const { setIsMenuOpen, setCurrentUrl, isMenuOpen, goBack, goForward, canGoBack, canGoForward, setActiveOverlay, tabs, addTab } = useBrowser();

    return (
        <div id="browser-bottombar" className="w-full h-14 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 flex items-center justify-between px-4 sm:px-6 z-20 shrink-0">
            <button 
                onClick={goBack} 
                disabled={!canGoBack}
                title="Kembali (Undo)"
                className={`p-2 rounded-full transition ${canGoBack ? 'text-gray-800 dark:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800' : 'text-gray-400 dark:text-zinc-600 cursor-not-allowed opacity-50'}`}>
                <ChevronLeft className="w-6 h-6" />
            </button>
            <button 
                onClick={goForward}
                disabled={!canGoForward}
                title="Maju (Redo)"
                className={`p-2 rounded-full transition ${canGoForward ? 'text-gray-800 dark:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800' : 'text-gray-400 dark:text-zinc-600 cursor-not-allowed opacity-50'}`}>
                <ChevronRight className="w-6 h-6" />
            </button>
            
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-gray-800 dark:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition relative">
                <Menu className="w-6 h-6" />
                {isMenuOpen && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-zinc-900"></div>}
            </button>
            
            <button onClick={() => setCurrentUrl('')} className="p-2 text-gray-800 dark:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition">
                <Home className="w-6 h-6" />
            </button>
            
            <button 
                onClick={() => { addTab(''); setActiveOverlay('none'); }} 
                className="p-2 text-gray-800 dark:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition"
                title="Buka tab baru"
            >
                <Plus className="w-6 h-6" />
            </button>
            
            <button onClick={() => setActiveOverlay('tabs')} className="p-2 text-gray-800 dark:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition relative">
                <SquareStack className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="absolute top-[3px] right-[3px] text-[9px] w-[14px] h-[14px] bg-orange-500 rounded-full text-white font-bold flex items-center justify-center">{tabs.length > 9 ? '9+' : tabs.length}</span>
            </button>
        </div>
    );
}
