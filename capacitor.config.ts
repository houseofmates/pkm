import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.houseofmates.pkm',
  appName: 'pkm',
  webDir: 'dist',
  plugins: {
    haptics: {
      enabled: true
    },
    pushnotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
