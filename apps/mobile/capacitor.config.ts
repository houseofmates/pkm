import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.houseofmates.pkm',
  appName: 'pkm',
  webDir: 'dist',
  server: {
    // load app from remote server for live updates (no rebuild needed!)
    // use your machine's local IP so the phone can reach it on same wifi
    url: 'http://pkm.houseofmates.space',
    // allow navigation to the nocobase API and other houseofmates services
    allowNavigation: [
      '192.168.4.233',
      '*.192.168.4.233',
      'pkm.houseofmates.space',
      '*.houseofmates.space',
      '*',
    ],
    cleartext: true,
    androidScheme: 'https',
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
