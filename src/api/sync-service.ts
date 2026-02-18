import { api } from './nocobase-client';
import { SimplyPluralClient } from '@/lib/simply-plural-client';

/**
 * NocoBase Collection Schema: 'front_history'
 * 
 * Fields:
 * - sp_id (String, Unique): ID from SimplyPlural history
 * - member_id (String): SimplyPlural Member ID
 * - startTime (Date/DateTime): When front started
 * - endTime (Date/DateTime): When front ended (Nullable)
 * - customStatus (String): Optional status
 * - live (Boolean): Is currently fronting?
 */

export class SyncService {
  private static COLLECTION = 'front_history';

  /**
 * Syncs recent history from SimplyPlural to NocoBase.
 * @param apiKey SimplyPlural API Key
 * @param systemId SimplyPlural System ID
 */
  static async sync(apiKey: string) {
  console.log("sync: fetching last entry from nocobase...");
  try {
  // 1. Get last known sync time (most recent startTime in DB)
  let lastSyncTime = new Date('2020-01-01').toISOString();
  try {
 const res = await api.listRecords(this.COLLECTION, {
 sort: ['-startTime'],
 pageSize: 1
 });
  const data = Array.isArray(res?.data) ? res.data : (res?.data as { data?: unknown[] })?.data;

 if (data && data.length > 0 && data[0].startTime) {
 lastSyncTime = data[0].startTime;
 console.log(`sync: last timestamp found: [${lastSyncTime}]`);
 } else {
 console.log("sync: no previous history found, defaulting to 2020-01-01");
 }
  } catch (e) {
 console.warn("sync: Could not fetch last sync time, defaulting to full sync.", e);
  }

  console.log(`sync: fetching from simplyplural...`);

  // 2. Fetch History from SimplyPlural
  const spRes = await fetch(SimplyPluralClient.url(`/frontHistory`), {
 headers: { 'Authorization': apiKey }
  });

  if (!spRes.ok) {
 const errorText = await spRes.text();
 throw new Error(`Failed to fetch SP history: ${spRes.status} ${spRes.statusText} - ${errorText}`);
  }

  const spHistory = await spRes.json(); // Returns array of objects
  if (!Array.isArray(spHistory)) return;

  // 3. Filter (Process last 50 for safety)
  const recentEntries = spHistory.slice(0, 50);
  console.log(`sync: found [${recentEntries.length}] entries to process (checking for updates/new).`);

  let addedCount = 0;
  let updatedCount = 0;

  for (const entry of recentEntries) {
 const startTime = new Date(entry.content.startTime).toISOString();
 const endTime = entry.content.endTime ? new Date(entry.content.endTime).toISOString() : null;
 const sp_id = entry.id; // UUID
 const member_id = entry.content.member;
 const customStatus = entry.content.customStatus;
 const live = entry.content.live;

 // Check if exists
 try {
 const existingRes = await api.listRecords(this.COLLECTION, {
 filter: { sp_id: { $eq: sp_id } },
 pageSize: 1
 });

  const existingData = Array.isArray(existingRes?.data) ? existingRes.data : (existingRes?.data as { data?: unknown[] })?.data;


 if (existingData && existingData.length > 0) {
 // Update if changed
 const record = existingData[0];
 if (record.endTime !== endTime || record.live !== live) {
   await api.request(this.COLLECTION, 'update', {
   method: 'POST',
   params: {
   filter: { sp_id: { $eq: sp_id } }
   },
   data: {
   endTime,
   live,
   customStatus
   }
   });
   updatedCount++;
 }
 } else {
 // Create New
 // console.log(`sync: writing new entry [${sp_id}] to nocobase...`);
 await api.createRecord(this.COLLECTION, {
   sp_id,
   member_id,
   startTime,
   endTime,
   customStatus,
   live
 });
 addedCount++;

 }
  } catch (err: unknown) {
 console.error(`sync: failed to write entry [${sp_id}]`);
 const errorWithResponse = err as { response?: { data?: unknown }; message?: string };
 if (errorWithResponse.response) {
 console.error("sync: NocoBase Error Response:", JSON.stringify(errorWithResponse.response.data, null, 2));
 } else {
 console.error("sync: Error:", errorWithResponse.message || String(err));
 }

 }
  }

  console.log(`sync: Sync Complete. Added: ${addedCount}, Updated: ${updatedCount}`);
  if (addedCount > 0 || updatedCount > 0) {
 // toast.success(`Synced ${addedCount} new, ${updatedCount} updated entries.`); // User requested removal
 console.log(`Synced ${addedCount} new, ${updatedCount} updated entries.`);
  } else {
 console.log("sync: No changes needed.");
  }

  } catch (error: unknown) {
  console.error("Sync Service Failed:", error);
  }
  }
}
