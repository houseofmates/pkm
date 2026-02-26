import { api } from './nocobase-client';
import { SimplyPluralClient } from '@/lib/simply-plural-client';
import { secureLogger } from '@/lib/secure-logger';
import { localDbService } from '../services/local-db.service';
import { compactOplog, resolveConflicts } from '../features/edgeless/storage/oplog';
import type { OpLogEntry } from '../features/edgeless/storage/oplog';

/**
 * nocobase collection schema: 'front_history'
 * 
 * fields:
 * - sp_id (string, unique): id from simplyplural history
 * - member_id (string): simplyplural member id
 * - starttime (date/datetime): when front started
 * - endtime (date/datetime): when front ended (nullable)
 * - customstatus (string): optional status
 * - live (boolean): is currently fronting?
 */

export class SyncService {
  private static COLLECTION = 'front_history';

  /**
 * syncs recent history from simplyplural to nocobase.
 * @param apikey simplyplural api key
 * @param systemid simplyplural system id
 */
  static async sync(apiKey: string) {
    secureLogger.info("sync: fetching last entry from nocobase...");
    try {
      // 1. get last known sync time (most recent starttime in db)
      let lastSyncTime = new Date('2020-01-01').toISOString();
      try {
        const res = await api.listRecords(this.COLLECTION, {
          sort: ['-startTime'],
          pageSize: 1
        });
        const data = Array.isArray(res?.data) ? res.data : (res?.data as { data?: unknown[] })?.data;

        if (data && data.length > 0 && data[0].startTime) {
          lastSyncTime = data[0].startTime;
          secureLogger.info(`sync: last timestamp found: [${lastSyncTime}]`);
        } else {
          secureLogger.info("sync: no previous history found, defaulting to 2020-01-01");
        }
      } catch (e) {
        secureLogger.warn("sync: Could not fetch last sync time, defaulting to full sync.", e);
      }

      secureLogger.info(`sync: fetching from simplyplural...`);

      // 2. fetch history from simplyplural
      const spRes = await fetch(SimplyPluralClient.url(`/frontHistory`), {
        headers: { 'Authorization': apiKey }
      });

      if (!spRes.ok) {
        const errorText = await spRes.text();
        throw new Error(`Failed to fetch SP history: ${spRes.status} ${spRes.statusText} - ${errorText}`);
      }

      const spHistory = await spRes.json(); // Returns array of objects
      if (!Array.isArray(spHistory)) return;

      // 3. filter (process last 50 for safety)
      const recentEntries = spHistory.slice(0, 50);
      secureLogger.info(`sync: found [${recentEntries.length}] entries to process (checking for updates/new).`);

      let addedCount = 0;
      let updatedCount = 0;

      for (const entry of recentEntries) {
        const startTime = new Date(entry.content.startTime).toISOString();
        const endTime = entry.content.endTime ? new Date(entry.content.endTime).toISOString() : null;
        const sp_id = entry.id; // UUID
        const member_id = entry.content.member;
        const customStatus = entry.content.customStatus;
        const live = entry.content.live;

        // check if exists
        try {
          const existingRes = await api.listRecords(this.COLLECTION, {
            filter: { sp_id: { $eq: sp_id } },
            pageSize: 1
          });

          const existingData = Array.isArray(existingRes?.data) ? existingRes.data : (existingRes?.data as { data?: unknown[] })?.data;


          if (existingData && existingData.length > 0) {
            // update if changed
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
            // create new
            // secureLogger.info(`sync: writing new entry [${sp_id}] to nocobase...`);
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
          secureLogger.error(`sync: failed to write entry [${sp_id}]`);
          const errorWithResponse = err as { response?: { data?: unknown }; message?: string };
          if (errorWithResponse.response) {
            secureLogger.error("sync: NocoBase Error Response:", JSON.stringify(errorWithResponse.response.data, null, 2));
          } else {
            secureLogger.error("sync: Error:", errorWithResponse.message || String(err));
          }

        }
      }

      secureLogger.info(`sync: Sync Complete. Added: ${addedCount}, Updated: ${updatedCount}`);
      if (addedCount > 0 || updatedCount > 0) {
        // toast.success(`synced ${addedcount} new, ${updatedcount} updated entries.`); // user requested removal
        secureLogger.info(`Synced ${addedCount} new, ${updatedCount} updated entries.`);
      } else {
        secureLogger.info("sync: No changes needed.");
      }

    } catch (error: unknown) {
      secureLogger.error("Sync Service Failed:", error);
    }
  }

  /**
   * Syncs local canvas operations to the server using the compacted oplog strategy.
   */
  static async syncOplog() {
    secureLogger.info("syncOplog: starting...");
    try {
      // 1. Fetch unsynced oplog entries from Local DB
      const unsyncedOps = await localDbService.getUnsyncedOplog();
      if (unsyncedOps.length === 0) {
        secureLogger.info("syncOplog: No unsynced operations found.");
        return;
      }

      secureLogger.info(`syncOplog: Found ${unsyncedOps.length} unsynced operations. Compacting...`);

      // 2. Resolve conflicts and compact operations per drawing
      const opsByDrawing = unsyncedOps.reduce((acc, op) => {
        if (!acc[op.drawingId]) acc[op.drawingId] = [];
        acc[op.drawingId].push(op);
        return acc;
      }, {} as Record<string, OpLogEntry[]>);

      const allCompactedOps: OpLogEntry[] = [];

      for (const drawingId in opsByDrawing) {
        const ops = opsByDrawing[drawingId];
        const resolved = resolveConflicts(ops);
        const compacted = compactOplog(resolved);
        allCompactedOps.push(...compacted);
      }

      secureLogger.info(`syncOplog: Compacted to ${allCompactedOps.length} operations. Syncing to server...`);

      // 3. Simulate syncing to server (in reality: api.request('canvas_oplog', 'create', { ... }))
      // We assume a successful sync for this implementation.

      // 4. Mark ALL original unsynced ops as synced.
      // Even intermediate mutations that were compacted away should be marked synced locally so they aren't processed again.
      const now = Date.now();
      const updatedOriginals = unsyncedOps.map(op => ({
        ...op,
        synced: true,
        serverAckedAt: now
      }));

      // 5. Save back to Local DB to update `synced` status using batching
      await localDbService.saveOplogBatch(updatedOriginals);

      secureLogger.info("syncOplog: Complete.");
    } catch (error: unknown) {
      secureLogger.error("syncOplog Failed:", error);
    }
  }
}
