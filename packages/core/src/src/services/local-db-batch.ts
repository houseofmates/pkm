let pendingCollections: any[] | null = null;
let batchTimeout: number | null = null;

export function batchSaveCollections(collections: any[], saveFn: (c: any[]) => Promise<void>) {
  pendingCollections = collections;
  if (batchTimeout) clearTimeout(batchTimeout);
  batchTimeout = window.setTimeout(() => {
    if (pendingCollections) {
      saveFn(pendingCollections);
      pendingCollections = null;
    }
  }, 100); // batch within 100ms window
}
