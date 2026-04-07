/* *
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
 *  id          | id              | bigint       | auto, primary key (nocobase default)
 *  createdat   | createdat       | date         | auto-managed by nocobase
 *  updatedat   | updatedat       | date         | auto-managed by nocobase
 *  timestamp   | datetime        | string       | iso 8601 client timestamp (e.g. 2026-03-04t14:32:00.000z)
 *  date        | input           | string       | yyyy-mm-dd local date (e.g. 2026-03-04), used for grouping/filtering
 *  mood        | select          | string       | one of: 6 | 5 | 4 | 2 | 1 | 0   (nullable) (labels: amazing!, great, good, fine, bad, terrible)
 *  activities  | input           | string       | json-serialised string array (e.g. '["sleep","exercise"]')
 *  body        | textarea        | text         | long-form journal text (nullable / empty)
 *
 * ─────────────────────────────────────────────
 *  example record (as stored in db)
 * ─────────────────────────────────────────────
 *
 *  {
 *    "id": 1,
 *    "timestamp": "2026-03-04t14:32:00.000z",
 *    "date": "2026-03-04",
 *    "mood": "4", // good
 *    "activities": "[\"sleep\",\"exercise\",\"hydrated\"]",
 *    "body": "today felt okay. switched a bit in the morning.",
 *    "createdat": "2026-03-04t14:32:05.000z",
 *    "updatedat": "2026-03-04t14:32:05.000z"
 *  }
 *
 * ─────────────────────────────────────────────
 *  reading activities back in the frontend
 * ─────────────────────────────────────────────
 *
 *  const activitieslist: string[] = json.parse(record.activities || '[]');
 *
 * ─────────────────────────────────────────────
 *  nocobase rest api – quick reference
 * ─────────────────────────────────────────────
 *
 *  create:  post   /api/journal:create       { mood, activities, body, timestamp, date }
 *  list:    get    /api/journal:list          ?pagesize=20&sort=-date
 *  get one: get    /api/journal:get?filterbytk=<id>
 *  update:  post   /api/journal:update?filterbytk=<id>
 *  delete:  post   /api/journal:destroy?filterbytk=<id> */

export interface JournalRecord {
  id?: number;
  timestamp: string;   // iso 8601
  date: string;        // yyyy-mm-dd
  mood: string | null;
  activities: string;  // json string – parse before use
  body: string;
  tags?: string;       // json string – parse before use
  // optional metadata added by frontend
  weather?: string;
  location?: string;
  transcript?: string; // raw spoken text before summary
  createdAt?: string;
  updatedAt?: string;
}

/* * parse activities json string → string array */
export function parseActivities(raw: string | null | undefined): string[] {
  try { return JSON.parse(raw ?? '[]'); } catch { return []; }
}
