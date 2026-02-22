# pkm (personal knowledge manager)

an aesthetically comfortable, self-hosted system for identity tracking, doodling, and knowledge organization.

## quick start (service management)

the system is managed via `pkm-control.sh`.

```bash
# check status
./pkm-control.sh status

# restart services
./pkm-control.sh restart  # if the frontend is moved to port 3011 by accident, restart the service so it binds to 3010 again

# view logs
./pkm-control.sh logs
```

### bidirectional git sync (24/7)

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

## documentation

the primary source of truth for architecture, dev patterns, and troubleshooting is:
- **[PKM_COMPREHENSIVE_MASTER_CONTEXT.md](PKM_COMPREHENSIVE_MASTER_CONTEXT.md)**

### lowercase checks (ci)

the repo enforces strictly-lowercase comments and ui text. a github action runs on pull requests and pushes to `main` that will:

- check code comments are all-lowercase (`npm run lowercase:check`)
- check visible ui strings (jsx/html attributes & text nodes) are lowercase (`npm run check:ui-lowercase`)
- run linters and tests as part of the job

to run locally:

- `npm run lowercase:check` (comments)
- `npm run check:ui-lowercase` (ui strings)
- `npm run lowercase:all` (both checks)

if you want to allow an exception, talk to the team — the CI rule is strict by design.

## architecture overview

- **frontend**: Vite-based (port 3010)
- **backend**: Node.js WebSocket/API (port 4100)
- **Services**: Managed via `systemctl --user pkm.service`, initiated by `/etc/systemd/system/pkm-boot.service`.

### SQL Parser & Editor Support
A lightweight SQL parser lives in `src/lib/sql-parser.ts` with tests under `src/lib/__tests__`. It currently handles:

- `SELECT` fields and simple `FROM table [alias]`
- `JOIN` clauses (with optional `ON`)
- `GROUP BY` / `HAVING`
- `ORDER BY` and `LIMIT`
- **subqueries** in the `FROM` clause and in joins
- basic `IN` expressions and `UNION` (records additional SELECTs in a `union` array; only the first is returned as the main tree)

The implementation is intentionally naive: it tokenizes on whitespace and balanced parentheses, then walks the string. Expanding the parser further means adding grammar rules for additional SQL features (e.g. `UNION ALL`, `INTERSECT`, `EXISTS`, nested expressions, arithmetic, function calls), improving tokenization (strings, identifiers, operators), and possibly adopting a proper parser generator (PEG.js, nearley, etc.) once needs grow beyond toy level.

The associated test file shows usage and serves as a regression suite.

An example completion generator script (`npm run schema:completions`) reads `server-data.json` and prints table suggestions; you can hook this into a VS Code extension or other editor plugin by invoking the script and using its output for IntelliSense.

To build a real extension:
1. Create a VS Code extension project (`yo code` or `npm init @vscode/extension`).
2. Call `npm run schema:completions` from the extension's language server to fetch tables/columns.
3. Use `src/lib/sql-parser.ts` if you need to parse user queries.

These files are intentionally simple; expand them as needed for your editor tooling.

## Notion Export Importer

A new CLI and UI tool lets you import a full Notion workspace export directly into PKM/NocoBase. The importer now understands Notion property metadata where available (title, number, checkbox, relation, date, multi‑select, etc.) and uses value heuristics to guess types, including arrays, dates and booleans. This richer handling makes collections more faithful to the original Notion schema.

Editor authors: there’s a helper library (`src/features/notion-import/editor-hook.ts`) which exports type mappings and a `generateSchemaSuggestions` function. You can import this in a VS Code extension or other editor tooling to provide completions and inline hints when working with Notion exports or writing migration scripts.

### Usage

1. Export your workspace from Notion (ZIP format, up to 5 GB).
2. From the command line run:
   ```bash
   npm run notion:import -- /path/to/notion-export.zip
   ```
   configure `NOCOBASE_URL` and `ADMIN_API_KEY` environment variables the same way other scripts use.

3. Alternatively, open the app and click **settings ▶ import notion workspace**; select the ZIP and watch progress logs.

The backend endpoint (`POST /api/notion-import`) accepts the ZIP via multipart/form-data and streams progress via SSE at `/api/notion-import/:taskId/stream`.

### Mapping rules

- **Databases** in Notion become NocoBase collections named after the CSV filename.
- **Pages** become records in a `pages` collection; markdown body and front-matter fields are preserved.
- Property types are guessed from sample values (number, boolean, string).
- Relations, multi-selects and other complex field types are currently treated as plain text but the transformer is easily extensible.

The parser is tolerant of malformed files, logging warnings and continuing. Large exports are streamed to avoid high memory usage.

### Code structure

- `src/features/notion-import/parser.ts` – recursive directory walker, CSV and Markdown loader.
- `src/features/notion-import/transformer.ts` – turns parsed workspace into a sequence of import instructions.
- `scripts/notion-import.js` – CLI entrypoint used by both `npm run notion:import` and the backend API.
- `backend/server.js` – new endpoints and SSE task management.
- `src/pages/notion-import.tsx` – UI page with file input and progress panel.

Unit and integration tests cover parsing, transformation, and CLI logic (`src/features/notion-import/__tests__`).

A future extension could allow direct client‑side parsing or more advanced field-type inference; the current implementation is designed for simplicity and robustness.


> Legacy drawings stored in localStorage are automatically migrated to the new IndexedDB backend on first app load. After migration the old keys are cleaned up and the localStorage path will be removed.
- **tunneling**: cloudflare tunnel (`cloudflared`) handles external routing.
