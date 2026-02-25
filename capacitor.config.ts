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
    cleartext: true
  }
};

export default config;
