// script to hide the 'dupemates-pages' collection in nocobase
// usage: run with node, must have admin api key in localstorage or set up in api-client
import { api } from './api/nocobase-client.js';
import { secureLogger } from './lib/secure-logger.js';

async function hideDupematesPages() {
  try {
    // try to fetch the collection (handles case-insensitive and fallback logic)
    const col = await api.getCollection('dupemates-pages');
    const colData = Array.isArray(col) ? undefined : (col as { data?: { name?: string } }).data;
    const realName = colData?.name || (col as { name?: string })?.name || 'dupemates-pages';
    if (!col || !realName) {
      secureLogger.error("Collection 'dupemates-pages' not found.");
      return { success: false, message: "Collection not found." };
    }
    // update to hidden
    await api.updateCollection(realName, { hidden: true });
    secureLogger.info(`Collection '${realName}' was successfully hidden.`);
    return { success: true, message: `Collection '${realName}' was successfully hidden.` };
  } catch (err: any) {
    secureLogger.error("Error hiding collection:", err?.message || err);
    return { success: false, message: err?.message || String(err) };
  }
}

if (require.main === module) {
  hideDupematesPages().then(result => {
    secureLogger.info("Result:", result);
    process.exit(result.success ? 0 : 1);
  });
}

export default hideDupematesPages;
