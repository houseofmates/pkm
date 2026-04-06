import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.houseofmates.pkm',
  appName: 'pkm',
  webDir: 'dist',
  server: {
    // when building a release apk we point at the public host so that    // the package auto‑updates from the live server. a dev build can override    // via pkm_remote_url (see live_update_guide.md).    url: process.env.PKM_REMOTE_URL || 'https://pkm.houseofmates.space',
    // allow navigation to our domain(s) only; the ip was only needed for    // local development.    allowNavigation: ['pkm.houseofmates.space', '*.houseofmates.space'],
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
