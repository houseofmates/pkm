// apkUpdater.ts
// Utility for checking and downloading new APK versions from server

import axios from 'axios';

export interface ApkVersionManifest {
  version: string;
  apkUrl: string;
}

export async function checkForApkUpdate(currentVersion: string, apiKey: string): Promise<ApkVersionManifest | null> {
  try {
    const response = await axios.get('https://pkm.houseofmates.space/apk/version.json', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    const manifest: ApkVersionManifest = response.data;
    if (manifest.version !== currentVersion) {
      return manifest;
    }
    return null;
  } catch (err) {
    // handle error (network, auth, etc)
    return null;
  }
}

export async function downloadAndPromptInstall(apkUrl: string) {
  // For Capacitor: use Browser plugin to open APK URL
  // User must confirm install due to Android security
  const { Browser } = await import('@capacitor/browser');
  await Browser.open({ url: apkUrl });
}
