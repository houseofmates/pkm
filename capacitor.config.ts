import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.houseofmates.pkm',
  appName: 'pkm',
  webDir: 'dist',
  server: {
    // Live reload for Android app during development
    url: 'http://192.168.4.233:3010',
    allowNavigation: ['*'],
    cleartext: true
  }
};

export default config;
