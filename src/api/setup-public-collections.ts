import { api } from './nocobase-client';

async function setupPublicCollections() {
  console.log('[Setup] Starting SCORCHED EARTH collections check...');

  const collectionsToCreate = [
  {
  name: 'public_pages',
  title: 'public pages',
  hidden: true,
  fields: [
 { name: 'title', type: 'string' },
 { name: 'slug', type: 'string', unique: true },
 { name: 'theme_color', type: 'string' },
 { name: 'is_home', type: 'boolean' },
 { name: 'banner', type: 'attachment' }
  ]
  },
  {
  name: 'public_blocks',
  title: 'public blocks',
  hidden: true,
  fields: [
 { name: 'type', type: 'string' },
 { name: 'content', type: 'json' },
 { name: 'sort', type: 'sort' },
 {
 name: 'page',
 type: 'belongsTo',
 target: 'public_pages',
 foreignKey: 'page_id'
 }
  ]
  },
  // core collections
  {
  name: 'headmates',
  title: 'Headmates',
  fields: [
 { name: 'name', type: 'string' },
 { name: 'avatar', type: 'attachment' },
 { name: 'pronouns', type: 'string' },
 { name: 'color', type: 'string' },
 { name: 'description', type: 'text' }
  ]
  },
  {
  name: 'front_history',
  title: 'Front History',
  fields: [
 { name: 'startTime', type: 'date' },
 { name: 'endTime', type: 'date' },
 { name: 'members', type: 'json' },
 { name: 'comment', type: 'text' }
  ]
  }
  ];

  for (const colReq of collectionsToCreate) {

  // 1. check physical table existence via list
  let tableExists = false;
  try {
  await api.request(colReq.name, 'list', { params: { pageSize: 1 } });
  tableExists = true;
  console.log(`[Setup] Table ${colReq.name} exists physically.`);
  } catch (e: unknown) {
  const err = e as { response?: { status?: number } };
  console.warn(`[Setup] Table ${colReq.name} check failed (Status: ${err.response?.status}). Assuming missing/broken.`);
  }

  // 2. if table missing, destroy metadata first (scorched earth)
  if (!tableExists) {
  console.log(`[Setup] Nuking metadata for ${colReq.name}...`);
  try {
 await api.request('collections', 'destroy', {
 params: { filterByTk: colReq.name }
 });
 console.log(`[Setup] Metadata destroyed for ${colReq.name}.`);
 // wait a moment for nocobase to process
 await new Promise(r => setTimeout(r, 1000));
  } catch (_destroyErr) {
 // validation error usually means it didn't exist, which is good
  }

  // 3. create collection fresh
  console.log(`[Setup] Creating fresh collection ${colReq.name}...`);
 try {
 await api.request('collections', 'create', {
 method: 'POST',
 data: {
 name: colReq.name,
 title: colReq.title,
 hidden: colReq.hidden
 }
 });
 console.log(`[Setup] Collection ${colReq.name} created.`);
  } catch (createErr: unknown) {
 const errMsg = createErr instanceof Error ? createErr.message : String(createErr);
 console.error(`[Setup] Failed to create collection ${colReq.name}:`, errMsg);
  }
  }

  // 4. ensure fields exist (idempotent)
  if (colReq.fields) {
  console.log(`[Setup] Ensuring fields for ${colReq.name}...`);
  for (const field of colReq.fields) {
 try {
 await api.request(`collections/${colReq.name}/fields`, 'create', {
 method: 'POST',
 data: field
 });
 // success = created
 } catch (_e: unknown) {
 // 400 = already exists, usually
 }
  }
  }
  }

  console.log('[Setup] Scorched Earth initialization complete.');
}

export { setupPublicCollections };
