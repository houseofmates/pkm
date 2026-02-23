import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.houseofmates.pkm',
  appName: 'pkm',
  webDir: 'dist',
  server: {
    // Live reload for Android app during development
    url: 'http://pkm.houseofmates.space:3010',
    allowNavigation: ['*'],
    cleartext: true
  }
};

export default config;
