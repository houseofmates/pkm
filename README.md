<h2 align="center">pkm (personal knowledge manager)</h2>

an aesthetically comfortable, self-hosted system for identity tracking, doodling, and knowledge organization

<h2 align="center">quick start</h2>

the system is managed via `pkm-control.sh`.

```bash
# check status
./pkm-control.sh status

# restart services
./pkm-control.sh restart  # if the frontend is moved to port 3011 by accident, restart the service so it binds to 3010 again

# view logs
./pkm-control.sh logs
```

<h2 align="center">bidirectional git sync</h2>

automatic sync between local filesystem and github enables collaboration with external agents like jules.

```bash
# install (one-time)
sudo ./scripts/install-bidirectional-sync.sh

# manage sync
./pkm-control.sh sync-status   # check sync status
./pkm-control.sh sync-logs     # view live sync logs
./pkm-control.sh sync-stop     # stop sync
./pkm-control.sh sync-start    # start sync
```

features:
- local changes → auto-push to github within 10s
- github changes (prs by jules) → auto-pull within 30s
- survives reboots, auto-restarts on failure
- automatic conflict resolution with manual fallback

<h2 align="center">documentation</h2>

the primary source of truth for architecture, dev patterns, and troubleshooting is:
- **[PKM_COMPREHENSIVE_MASTER_CONTEXT.md](PKM_COMPREHENSIVE_MASTER_CONTEXT.md)**

<h2 align="center">architecture</h2>

- **frontend**: Vite-based (port 3010)
- **backend**: Node.js WebSocket/API (port 4100)  
  start it in the background with `npm run start` or install the
  provided systemd service (`scripts/pkm-backend.service`).
- **Services**: Managed via `systemctl --user pkm.service`, initiated by `/etc/systemd/system/pkm-boot.service`.

<h2 align="center">edgeless canvas + syncing</h2>

this project contains a low-latency, local-first canvas system built around an **append-only oplog + indexeddb cache**.

- **canvas state** is reconstructed by replaying a compacted oplog (operations = strokes, erases, transforms, deletes).
- **optimistic UI**: user actions are pushed into memory immediately, then flushed to IndexedDB on a debounce timer.
- **worker-backed persistence**: IndexedDB writes (and read-heavy scans) run in a Web Worker (`canvas-db.worker.ts`) to keep the main thread at 60fps.
- **sync to server**: a background loop batches unsynced operations and pushes them to the backend (NocoBase) in fixed-size chunks, with retries + conflict detection.
- **offline-first**: the UI is always responsive even without network; completed actions are queued locally and synced when online.

for full low-level details, see `packages/core/src/features/edgeless`.

<h2 align="center">sql parser + editor</h2>
a lightweight SQL parser lives in `src/lib/sql-parser.ts` with tests under `src/lib/__tests__`. It currently handles:

- `SELECT` fields and simple `FROM table [alias]`
- `JOIN` clauses (with optional `ON`)
- `GROUP BY` / `HAVING`
- `ORDER BY` and `LIMIT`
- **subqueries** in the `FROM` clause and in joins
- basic `IN` expressions and `UNION` (records additional SELECTs in a `union` array; only the first is returned as the main tree)

the implementation is intentionally naive: it tokenizes on whitespace and balanced parentheses, then walks the string. expanding the parser further means adding grammar rules for additional SQL features (e.g. `UNION ALL`, `INTERSECT`, `EXISTS`, nested expressions, arithmetic, function calls), improving tokenization (strings, identifiers, operators), and possibly adopting a proper parser generator (PEG.js, nearley, etc.) once needs grow beyond toy level.

the associated test file shows usage and serves as a regression suite.

<h2 align="center">notion importer</h2>

a cli/ui tool that lets you export yourotion workspace directly into pkm/nocobase. the importer understands notion property metadata where available (title, number, checkbox, relation, date, multi‑select, etc.) and uses value heuristics to guess types, including arrays, dates and booleans. this richer handling makes collections more faithful to the original Notion schema.

<h2 align="center">usage</h2>

1. export your workspace from notion (ZIP format, up to 5 GB).

<h2 align="center">canvas drawing</h2>

The embedded drawing canvas uses a pleasant-to-use feature-rich brush and eraser tool alongside selecting and transforming of strokes. when editing drawings you can:

- resize the brush or eraser with the size slider
- control **individual opacity** for brush and eraser
- pick pen color from the palette
- adjust **smoothness** (stabilizer level) for fluid, lag‑free strokes
- access all of the above via **right‑click** on the canvas when the brush or eraser is active – a context menu lets you tweak size, opacity, and colour (brush only) without opening the toolbar
- undo/redo via the normal history controls

brush defaults match the drawing app (10 px brush, 20 px eraser). These
values are persisted per‑drawing and exposed in the toolbar menus in case
you prefer left‑click controls.

the behaviour is implemented with fabric.js; the brush respects these
settings and automatically updates when you adjust sliders.


2. from the command line run:
   ```bash
   npm run notion:import -- /path/to/notion-export.zip
   ```
   configure `NOCOBASE_URL` and `ADMIN_API_KEY` environment variables the same way other scripts use.

> **tip:** you can enable a small health/status widget in the app's top-right by setting `VITE_SHOW_HEALTH_BAR=true` in your `.env` or environment. It's off by default to keep the UI clean.

3. alternatively, open the app and click **settings ▶ import notion workspace**; select the ZIP and watch progress logs.

The backend endpoint (`POST /api/notion-import`) accepts the ZIP via multipart/form-data and streams progress via SSE at `/api/notion-import/:taskId/stream`.

<h2 align="center">mapping rules</h2>

- **databases** in notion become nocobase collections named after the csv filename.
- **pages** become records in a `pages` collection; markdown body and front-matter fields are preserved.
- property types are guessed from sample values (number, boolean, string).
- relations, multi-selects and other complex field types are currently treated as plain text but the transformer is easily extensible.

the parser is tolerant of malformed files, logging warnings and continuing. Large exports are streamed to avoid high memory usage.

### code structure

- `src/features/notion-import/parser.ts` – recursive directory walker, CSV and Markdown loader.
- `src/features/notion-import/transformer.ts` – turns parsed workspace into a sequence of import instructions.
- `scripts/notion-import.js` – CLI entrypoint used by both `npm run notion:import` and the backend API.
- `packages/backend/server.js` – new endpoints and SSE task management.
- `src/pages/notion-import.tsx` – UI page with file input and progress panel.

unit and integration tests cover parsing, transformation, and CLI logic (`src/features/notion-import/__tests__`).

a future extension could allow direct client‑side parsing or more advanced field-type inference; the current implementation is designed for simplicity and robustness.

<h2 align="center">why?</h2>
im a neurodivergent system with highly specific needs and visual preferences. pkm is a project in addition to my main brain, the one i can use when i cant trust my own
