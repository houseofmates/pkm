import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.houseofmates.pkm',
  appName: 'pkm',
  webDir: 'dist',
  server: {
    // Load from dev server for live updates (IP must be reachable from phone on same WiFi)
    url: 'http://192.168.4.233:3010',
    // allow navigation to the nocobase API and other houseofmates services
    allowNavigation: [
      '192.168.4.233',
      '*.houseofmates.space',
    ],
    cleartext: true,
    androidScheme: 'http',
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    }
  },
  android: {
    webContentsDebuggingEnabled: true,
    backgroundColor: '#050505',
    allowMixedContent: true,
  }
};

export default config;
