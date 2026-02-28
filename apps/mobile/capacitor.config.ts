import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.houseofmates.pkm',
  appName: 'pkm',
  webDir: 'dist',
  server: {
    // For production APK builds, comment out the url line below to use bundled assets
    // For development with live reload, uncomment and set your dev machine IP
    // url: 'http://192.168.1.100:3010',
    // allow navigation to the nocobase API and other houseofmates services
    allowNavigation: [
      '192.168.*',
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
