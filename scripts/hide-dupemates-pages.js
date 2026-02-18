// standalone node script to hide the 'dupemates-pages' collection in nocobase
// uses direct axios call to the api, not the app's client
import axios from 'axios';

const API_URL = process.env.NOCOBASE_URL || 'http://localhost:4100/api';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || process.env.hom_api_key || process.env.nocobase_token;

if (!ADMIN_API_KEY) {
  console.error('Missing ADMIN_API_KEY. Set ADMIN_API_KEY env variable.');
  process.exit(1);
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ADMIN_API_KEY}`
  }
});

async function hideDupematesPages() {
  try {
    // try to fetch the collection (case-insensitive search)
    let res = await api.get('/collections:list');
    let list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
    let found = list.find(c => (c.name || '').toLowerCase() === 'dupemates-pages');
    if (!found) {
      console.error("Collection 'dupemates-pages' not found.");
      return { success: false, message: "Collection not found." };
    }
    // update to hidden
    await api.post(`/collections/${found.name}:update`, { hidden: true });
    console.log(`Collection '${found.name}' was successfully hidden.`);
    return { success: true, message: `Collection '${found.name}' was successfully hidden.` };
  } catch (err) {
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
