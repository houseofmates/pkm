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
  // Try Capacitor Browser plugin if available, otherwise fallback to web download
  if (window && (window as any).Capacitor) {
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url: apkUrl });
      return;
    } catch (e) {
      // fallback if plugin not available
    }
  }
  // fallback: trigger web download
  const link = document.createElement('a');
  link.href = apkUrl;
  link.download = 'pkm-latest.apk';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
