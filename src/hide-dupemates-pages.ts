// Script to hide the 'dupemates-pages' collection in NocoBase
// Usage: Run with node, must have admin API key in localStorage or set up in api-client
import { api } from './api/nocobase-client.js';

async function hideDupematesPages() {
  try {
    // Try to fetch the collection (handles case-insensitive and fallback logic)
    const col = await api.getCollection('dupemates-pages');
    const colData = Array.isArray(col) ? undefined : (col as { data?: { name?: string } }).data;
    const realName = colData?.name || (col as { name?: string })?.name || 'dupemates-pages';
    if (!col || !realName) {
      console.error("Collection 'dupemates-pages' not found.");
      return { success: false, message: "Collection not found." };
    }
    // Update to hidden
    await api.updateCollection(realName, { hidden: true });
    console.log(`Collection '${realName}' was successfully hidden.`);
    return { success: true, message: `Collection '${realName}' was successfully hidden.` };
  } catch (err: any) {
    console.error("Error hiding collection:", err?.message || err);
    return { success: false, message: err?.message || String(err) };
  }
}

if (require.main === module) {
  hideDupematesPages().then(result => {
    console.log("Result:", result);
    process.exit(result.success ? 0 : 1);
  });
}

export default hideDupematesPages;
