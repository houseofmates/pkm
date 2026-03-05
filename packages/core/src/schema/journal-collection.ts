/**
 * nocobase collection: journal
 *
 * create this collection via the nocobase admin ui or api.
 * collection name (api identifier): journal
 * display title: journal entries
 *
 * ─────────────────────────────────────────────
 *  field definitions
 * ─────────────────────────────────────────────
 *
 *  field name  | interface       | type         | notes
 *  ──────────────────────────────────────────────────────────────────────────
 *  id          | id              | bigInt       | auto, primary key (nocobase default)
 *  createdAt   | createdAt       | date         | auto-managed by nocobase
 *  updatedAt   | updatedAt       | date         | auto-managed by nocobase
 *  timestamp   | datetime        | string       | ISO 8601 client timestamp (e.g. 2026-03-04T14:32:00.000Z)
 *  date        | input           | string       | YYYY-MM-DD local date (e.g. 2026-03-04), used for grouping/filtering
 *  mood        | select          | string       | one of: 6 | 5 | 4 | 2 | 1 | 0   (nullable) (labels: amazing!, great, good, fine, bad, terrible)
 *  activities  | input           | string       | JSON-serialised string array (e.g. '["sleep","exercise"]')
 *  body        | textarea        | text         | long-form journal text (nullable / empty)
 *
 * ─────────────────────────────────────────────
 *  example record (as stored in db)
 * ─────────────────────────────────────────────
 *
 *  {
 *    "id": 1,
 *    "timestamp": "2026-03-04T14:32:00.000Z",
 *    "date": "2026-03-04",
 *    "mood": "4", // good
 *    "activities": "[\"sleep\",\"exercise\",\"hydrated\"]",
 *    "body": "today felt okay. switched a bit in the morning.",
 *    "createdAt": "2026-03-04T14:32:05.000Z",
 *    "updatedAt": "2026-03-04T14:32:05.000Z"
 *  }
 *
 * ─────────────────────────────────────────────
 *  reading activities back in the frontend
 * ─────────────────────────────────────────────
 *
 *  const activitiesList: string[] = JSON.parse(record.activities || '[]');
 *
 * ─────────────────────────────────────────────
 *  nocobase rest api – quick reference
 * ─────────────────────────────────────────────
 *
 *  create:  POST   /api/journal:create       { mood, activities, body, timestamp, date }
 *  list:    GET    /api/journal:list          ?pageSize=20&sort=-date
 *  get one: GET    /api/journal:get?filterByTk=<id>
 *  update:  POST   /api/journal:update?filterByTk=<id>
 *  delete:  POST   /api/journal:destroy?filterByTk=<id>
 */

export interface JournalRecord {
  id?: number;
  timestamp: string;   // ISO 8601
  date: string;        // YYYY-MM-DD
  mood: string | null;
  activities: string;  // JSON string – parse before use
  body: string;
  // optional metadata added by frontend
  weather?: string;
  location?: string;
  transcript?: string; // raw spoken text before summary
  createdAt?: string;
  updatedAt?: string;
}

/** parse activities json string → string array */
export function parseActivities(raw: string | null | undefined): string[] {
  try { return JSON.parse(raw ?? '[]'); } catch { return []; }
}
