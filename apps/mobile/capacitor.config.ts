import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.houseofmates.pkm',
  appName: 'pkm',
  webDir: 'dist',
  server: {
    // Auto-update: Load app from remote server so code changes update the APK automatically
    // without requiring a new APK build. The app will fetch latest code on each launch.
    url: 'http://pkm.houseofmates.space:3010',
    allowNavigation: ['*'],
    cleartext: true,
    // Enable offline caching - app will work offline and sync when back online
    androidScheme: 'https'
  },
  plugins: {
    // Enable background app refresh and offline capabilities
    SplashScreen: {
      launchShowDuration: 0
    }
  },
  android: {
    // Allow WebView to cache content for offline use
    webContentsDebuggingEnabled: true,
    backgroundColor: '#050505'
  }
};

export default config;
