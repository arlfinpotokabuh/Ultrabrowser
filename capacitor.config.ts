import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ultrabrowser.app',
  appName: 'UltraBrowser',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
