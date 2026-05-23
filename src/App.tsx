import React from 'react';
import { BrowserProvider, useBrowser } from './context/BrowserContext';
import MainScreen from './components/MainScreen';
import SettingsScreen from './components/SettingsScreen';
import VpnScreen from './components/VpnScreen';
import StudioDebugger from './components/tools/StudioDebugger';

const AppContent = () => {
    const { activeScreen, isDark } = useBrowser();

    return (
        <div className={`h-screen w-full flex items-center justify-center bg-gray-950 font-sans ${isDark ? 'dark' : ''}`}>
            {/* Mobile constraints for desktop preview */}
            <div className="w-full h-full max-w-[400px] bg-white dark:bg-[#121212] lg:h-[800px] lg:rounded-[3rem] lg:border-[8px] lg:border-zinc-900 lg:shadow-2xl relative overflow-hidden flex flex-col text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
                {activeScreen === 'browser' && <MainScreen />}
                {activeScreen === 'settings' && <SettingsScreen />}
                {activeScreen === 'vpn' && <VpnScreen />}
                <StudioDebugger />
            </div>
        </div>
    );
};

export default function App() {
  return (
    <BrowserProvider>
      <AppContent />
    </BrowserProvider>
  );
}
