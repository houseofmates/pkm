import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.houseofmates.pkm',
  appName: 'pkm',
  webDir: 'dist',
  server: {
    // allow navigation to the nocobase API and other houseofmates services
    allowNavigation: [
      'pkm.houseofmates.space',
      '*.houseofmates.space',
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
