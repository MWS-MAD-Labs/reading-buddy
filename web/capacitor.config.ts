import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.readingbuddy.app',
  appName: 'Reading Buddy',
  webDir: 'public',
  server: {
    url: 'https://staging-reads.mws.web.id',
    cleartext: true,
    allowNavigation: ['*']
  },
  android: {
    overrideUserAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
  }
};

export default config;
