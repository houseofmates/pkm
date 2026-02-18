import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.houseofmates.pkm',
  appName: 'pkm',
  webDir: 'dist',
  server: {
    // To enable live updates, point this to your production URL
    // url: 'https://pkm.yourdomain.com',
    allowNavigation: ['*'],
    cleartext: true
  }
};

export default config;
