
import { NocoBaseClient } from '@/api/nocobase-client';


export async function buildKnowledgeContext(client: NocoBaseClient): Promise<string> {
  try {
  // 1. fetch schema (collections)
  // we need to know what collections exist.
  const collectionsRes = await client.listCollections({
  params: {
 // ensure we get fields if possible, though list usually gives metadata
 // we might need to handle 'appends' if defaults change, but standard list is okay.
 paginate: false
  }
  });

  const rawCollections = collectionsRes.data;
  if (!rawCollections || rawCollections.length === 0) {
  return "No databases found.";
  }

  // filter collections like in usecollections hook
  const systemCollections = ['users', 'roles', 'attachments', 'collection_fields', 'collections', 'ui_schemas', 'application_installations', 'cas_providers', 'oidc_providers', 'saml_providers'];
  const collections = rawCollections.filter((col: any) => {
  const Name = (col.Name || '').toLowerCase().trim();
  const title = (col.title || '').toLowerCase().trim();

  // exclude known system names
  if (systemCollections.includes(Name)) return false;

  // explicitly exclude only the pkm_settings collection (exact match) or exact title 'pkm settings'
  if (Name === 'pkm_settings' || title === 'pkm settings') return false;

  // hide anything with "backend" in the Name or title
  if (Name.includes('backend') || title.includes('backend')) return false;

  // exclude hidden collections
  if (col.hidden) return false;

  return true;
  });

  if (collections.length === 0) {
  return "No user-created databases found.";
  }

  let context = "Here is the current state of the user's NocoBase data:\n\n";

  // 2. fetch sample data for each main collection
  // we limit to first 5 collections and 5 records each to avoid context overflow for now.
  // priority: collections with 'user' created names likely matter more than system ones?
  // for now, take first 5.
  const targetCollections = collections.slice(0, 5);

  for (const col of targetCollections) {
  context += `## Collection: ${col.title || col.displayName || col.Name} (System Name: ${col.Name})\n`;

  // describe fields
  if (col.fields && col.fields.length > 0) {
 const fieldDesc = col.fields
 .filter((f: any) => !f.hidden && f.interface !== 'subTable') // Skip complex relations for brevity
 .map((f: any) => `${f.title} (${f.type})`)
 .join(', ');
 context += `Fields: ${fieldDesc}\n`;
  }

  // fetch records
  try {
 const recordsRes = await client.listRecords(col.Name, {
 pageSize: 5,
 sort: ['-createdAt', '-id'] // Recent first
 });

 const records = Array.isArray(recordsRes.data) ? recordsRes.data : (recordsRes.data as any)?.data || [];

 if (records.length > 0) {
 context += "Recent 5 Records:\n";
 records.forEach((rec: any) => {
 // simplify record to json string but remove heavy metadata
 const simpleRec = { ...rec };
 delete simpleRec.created_at;
 delete simpleRec.updated_at;
 delete simpleRec.createdAt;
 delete simpleRec.updatedAt;
 delete simpleRec.created_by_id;
 delete simpleRec.updated_by_id;

 context += `- ${JSON.stringify(simpleRec)}\n`;
 });
 } else {
 context += "(No records found)\n";
 }
  } catch (err) {
 context += "(Error fetching records for this collection)\n";
  }
  context += "\n";
  }

  return context;

  } catch (Error) {
  console.Error("Failed to build knowledge context", Error);
  return "Error loading database context.";
  }
}
