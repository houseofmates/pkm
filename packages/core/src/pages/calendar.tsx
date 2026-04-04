import { useEffect, useState } from 'react';
import { useRecords } from '@/hooks/use-records';
import { useCollection } from '@/hooks/use-collections';
import { CalendarView } from '@/components/views/calendar-view';
import { Loader2 } from 'lucide-react';
import { useAppSetting } from '@/hooks/use-app-setting';
import { toast } from 'sonner';
import { extractRecords } from '@/lib/nocobase-utils';
import { api as client } from '@/api/nocobase-client';
import { secureLogger } from '@/lib/secure-logger';

export function CalendarPage() {
  const { data: collection, loading: colLoading } = useCollection('events');
  const { records, loading: recLoading, error, updateRecord, deleteRecord, createRecord, refresh } = useRecords('events', {
    pageSize: 500 // Fetch a good chunk of events
  });

  // Try to load any user-defined view config for events, or fallback to sensible defaults
  const [viewConfig, setViewConfig] = useAppSetting('events_calendar_config', {
    titleField: 'title',
    dateField: 'start_time',
    endDateField: 'end_time',
    visibleFields: ['notes', 'location', 'url'],
    allDayField: 'all_day',
    recurringField: '' // If they add one later
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const ICS_PROXY_URL = '/api/ics-proxy';

  const syncIcs = async (silent = false) => {
    if (!collection) {
      if (!silent) secureLogger.warn('[ICS SYNC] skipped: collection not loaded');
      return;
    }

    if (isSyncing) return;
    setIsSyncing(true);
    try {
      // refresh the local cache and capture a *snapshot* we can search through.
      const refreshResult = await refresh();
      const freshRecords: Record<string, unknown>[] = extractRecords(refreshResult?.data) ?? [];

      const res = await fetch(ICS_PROXY_URL);
      if (!res.ok) throw new Error(`fetch failed ${res.status}`);
      const text = await res.text();
      let events;
      try {
        events = JSON.parse(text);
      } catch (err) {
        events = parseIcs(text);
      }

      // infer the actual field names in the events collection so we only send valid data
      const collectionFields: Array<{ name?: string; type?: string }> = Array.isArray(collection.fields) ? collection.fields : [];
      const fieldNames = collectionFields.map((f) => f.name).filter(Boolean) as string[];
      const defaultFieldNames = ['title', 'start-time', 'end-time', 'notes', 'location', 'url', 'uid'];
      const allowedFieldNames = fieldNames.length > 0 ? fieldNames : defaultFieldNames;

      const normalizeName = (s: string) => String(s || '').toLowerCase().replace(/[-_\s]+/g, '');
      const findField = (candidates: string[]) => {
        // exact matches first
        for (const cand of candidates) {
          const normCand = normalizeName(cand);
          const exact = allowedFieldNames.find((field) => normalizeName(field) === normCand);
          if (exact) return exact;
        }
        // partial match fallback
        for (const cand of candidates) {
          const normCand = normalizeName(cand);
          const partial = allowedFieldNames.find((field) => normalizeName(field).includes(normCand));
          if (partial) return partial;
        }
        return undefined;
      };

      const getType = (fieldName?: string) => {
        return collectionFields.find((f) => f.name === fieldName)?.type;
      };

      const titleField = findField(['title', 'name', 'summary']) ?? 'title';
      const dateField = findField(['start_time', 'start-time', 'startDate', 'start_date', 'date', 'datetime']) ?? 'start-time';
      const endDateField = findField(['end_time', 'end-time', 'endDate', 'end_date', 'enddatetime']) ?? 'end-time';
      const notesField = findField(['notes', 'description', 'details', 'body']) ?? 'notes';
      const locationField = findField(['location', 'place', 'venue', 'address']) ?? 'location';
      const urlField = findField(['url', 'link', 'website']) ?? 'url';
      const uidField = findField(['uid', 'uid_id', 'uuid', 'id']);

      const formatDateForField = (field: string | undefined, iso: string | undefined) => {
        if (!field || !iso) return undefined;
        const type = getType(field);
        if (type === 'date') {
          return iso.slice(0, 10);
        }
        return iso;
      };

      // Build a set of existing event keys for fast lookup.
      // NocoBase may not return `id` on event records, so we can't rely on IDs.
      // We use the title + date as the dedup key to correctly handle recurring events.
      const existingKeys = new Set<string>();
      for (const r of freshRecords) {
        const u = uidField ? r[uidField] : r.uid;
        if (u) {
          existingKeys.add(`uid:${u}`);
        }
        const t = r[titleField];
        const d = r[dateField];
        if (typeof t === 'string' && t && typeof d === 'string') {
          existingKeys.add(`${t}_${d.slice(0, 10)}`);
        } else if (typeof t === 'string' && t) {
          existingKeys.add(`${t}_nodate`);
        }
      }

      let created = 0;
      let updated = 0; // Unused now, but kept for logging format

      const newEventsPayloads: Record<string, unknown>[] = [];
      const MAX_BATCH_SIZE = 50;

      for (const ev of events) {
        const uid = ev.UID;
        const title = ev.SUMMARY || 'untitled';
        const start = ev.DTSTART;

        if (uid && existingKeys.has(`uid:${uid}`)) continue;
        const end = ev.DTEND;
        const notes = ev.DESCRIPTION;
        const location = ev.LOCATION;
        const url = ev.URL;

        if (!start) continue;

        const startIso = parseIcsDate(start);
        const endIso = end ? parseIcsDate(end) : undefined;
        const eventDateStr = startIso ? startIso.slice(0, 10) : 'nodate';
        const eventKey = `${title}_${eventDateStr}`;

        if (existingKeys.has(eventKey)) continue;

        const payload: Record<string, unknown> = {};

        const trySet = (field: string | undefined, value: unknown) => {
          if (!field || value === undefined || value === null) return;
          if (allowedFieldNames.includes(field)) {
            payload[field] = value;
          }
        };

        trySet(titleField, title);
        trySet(dateField, formatDateForField(dateField, startIso));
        trySet(endDateField, formatDateForField(endDateField, endIso));
        trySet(notesField, notes);
        trySet(locationField, location);
        trySet(urlField, url);
        trySet(uidField, uid);

        newEventsPayloads.push(payload);
        existingKeys.add(eventKey);
      }

      // Create new events. NocoBase collection create endpoint expects a single record object.
      for (const payload of newEventsPayloads) {
        try {
          await client.createRecord('events', payload);
          created += 1;
        } catch (err: any) {
          secureLogger.error('[ICS SYNC] record creation failed', err, payload);
          toast.error(`ics sync record failed: ${err?.message || 'unknown error'}`);
        }
      }

      if (created > 0 || updated > 0) {
        await refresh();
      }

      if (!silent || created > 0 || updated > 0) {
        toast.success(`synced ${created} new + ${updated} updated`);
      }
    } catch (err) {
      secureLogger.error('ics sync failed', err);
      if (!silent) toast.error('ics sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    // auto-sync once the collection schema is loaded
    if (collection) {
      syncIcs(true); // background silent sync initially

      // also auto-refresh every 2 minutes
      const interval = setInterval(() => {
        syncIcs(true);
      }, 120_000); 

      return () => clearInterval(interval);
    }
  }, [collection]);

  const parseIcs = (ics: string) => {
    const lines = ics.split(/\r?\n/).map(l => l.trim());
    const events: Record<string, string>[] = [];
    let current: Record<string, string> | null = null;

    for (const line of lines) {
      if (line === 'BEGIN:VEVENT') {
        current = {};
        continue;
      }
      if (line === 'END:VEVENT') {
        if (current) events.push(current);
        current = null;
        continue;
      }
      if (!current || !line) continue;

      const idx = line.indexOf(':');
      if (idx === -1) continue;
      const key = line.slice(0, idx).split(';')[0];
      const value = line.slice(idx + 1);
      current[key] = value;
    }

    return events;
  };

  const parseIcsDate = (value: string) => {
    // if value ends with Z, treat as UTC, else local
    // support yyyyMMdd or yyyyMMddTHHmmss
    if (/^\d{8}T\d{6}Z$/.test(value)) {
      return new Date(value).toISOString();
    }
    if (/^\d{8}T\d{6}$/.test(value)) {
      const year = Number(value.slice(0,4));
      const month = Number(value.slice(4,6)) - 1;
      const day = Number(value.slice(6,8));
      const hour = Number(value.slice(9,11));
      const minute = Number(value.slice(11,13));
      const second = Number(value.slice(13,15));
      return new Date(year, month, day, hour, minute, second).toISOString();
    }
    if (/^\d{8}$/.test(value)) {
      const year = Number(value.slice(0,4));
      const month = Number(value.slice(4,6)) - 1;
      const day = Number(value.slice(6,8));
      return new Date(year, month, day).toISOString();
    }
    return new Date(value).toISOString();
  };

  const loading = colLoading || (recLoading && !records.length); // don't show loading overlay if we already have records

  // Infer view config securely so we don't end up with field mismatch
  const collectionFields = Array.isArray(collection?.fields) ? collection.fields : [];
  const fieldNames = collectionFields.map((f: any) => f.name);

  // Fallback to checking keys on the first record if fieldNames is empty or missing expected fields
  const sampleKeys = records.length > 0 ? Object.keys(records[0]) : [];
  const availableKeys = [...new Set([...fieldNames, ...sampleKeys])];

  // Overwrite viewConfig properties if they are invalid and we can fix them
  const finalViewConfig = { ...viewConfig };
  
  if (!availableKeys.includes(finalViewConfig.titleField)) {
      finalViewConfig.titleField = availableKeys.find((n: string) => ['title', 'name', 'summary'].includes(n)) || 'title';
  }
  if (!availableKeys.includes(finalViewConfig.dateField)) {
      finalViewConfig.dateField = availableKeys.find((n: string) => ['start_time', 'start-time', 'startDate', 'start_date'].includes(n)) || 'start_time';
  }
  if (!availableKeys.includes(finalViewConfig.endDateField)) {
      finalViewConfig.endDateField = availableKeys.find((n: string) => ['end_time', 'end-time', 'endDate', 'end_date'].includes(n)) || 'end_time';
  }

  // Ensure all records have a unique ID for React keys and DndKit
  const mappedRecords = records.map((r, i) => {
    // Strictly prioritize database ID, then UID, then fallback to something unique
    const uniqueId = r.id ? String(r.id) : (r.uid ? `uid-${r.uid}` : `ev-${i}-${r[finalViewConfig.titleField] || 'untitled'}`);
    return { ...r, __originalId: r.id, id: uniqueId };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-primary">
        <Loader2 className="animate-spin mr-2" />
        <span>loading calendar...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-red-500">
        <h2 className="text-xl font-bold mb-2">signal loss</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-center">
        <h2 className="text-xl font-bold mb-2 lowercase text-primary">collection not found</h2>
        <p className="text-muted-foreground lowercase">collection 'events' not found. please create it in nocobase with a 'title' string, and 'start_time' datetime.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 overflow-hidden bg-background">
      <div className="flex flex-col gap-2 mb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold lowercase flex items-center gap-2">
                events calendar 
                {isSyncing && <Loader2 className="w-3 h-3 animate-spin opacity-50" />}
            </p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <CalendarView
          data={mappedRecords}
          collection={collection}
          config={finalViewConfig}
          onUpdateRecord={(id, updates) => { updateRecord(id, updates); }}
          onDelete={(recordOrId) => {
            const id = typeof recordOrId === 'object'
              ? recordOrId?.__originalId ?? recordOrId?.id
              : recordOrId;
            if (id != null) deleteRecord(id);
          }}
          onCreate={(item) => { createRecord(item); }}
        />
      </div>
    </div>
  );
}
