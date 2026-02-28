import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.houseofmates.pkm',
  appName: 'pkm',
  webDir: 'dist',
  server: {
    // Load from public server for access anywhere (data, away from home)
    url: 'https://pkm.houseofmates.space',
    // allow navigation to the nocobase API and other houseofmates services
    allowNavigation: [
      'pkm.houseofmates.space',
      '*.houseofmates.space',
      'houseofmates.space',
    ],
    cleartext: false,
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
