import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.houseofmates.pkm',
  appName: 'pkm',
  webDir: 'dist',
  server: {
    // Auto-update: Load app from remote server so code changes update the APK automatically
    // without requiring a new APK build. The app will fetch latest code on each launch.
    url: 'http://pkm.houseofmates.space:3010',
    allowNavigation: [
      'pkm.houseofmates.space',
      '*.houseofmates.space',
    ],
    cleartext: true,
    // use http scheme to match the server url and avoid mixed-content blocks
    // (https scheme + http server url = android blocks all non-tls fetches)
    androidScheme: 'http'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    }
  },
  android: {
    webContentsDebuggingEnabled: true,
    backgroundColor: '#050505',
    // allow the webview to load content from the remote server and localhost
    allowMixedContent: true,
  }
};

export default config;
