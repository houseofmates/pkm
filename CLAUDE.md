# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## quick start

```bash
# install dependencies
npm install

# start dev server (frontend on port 3010, backend on port 4100)
npm run dev

# run tests
npm test

# lint
npm run lint
```

## essential commands

### development
- `npm run dev` - start vite dev server (port 3010) + backend (port 4100) concurrently
- `npm run backend` - start backend server only (PORT=4100)
- `npm run start` - start backend as background process
- `npm run test` - run vitest tests
- `npm run test:notion` - run notion import tests specifically

### lowercase enforcement (ci requirement)
- `npm run lowercase:check` - check code comments are lowercase
- `npm run check:ui-lowercase` - check ui strings are lowercase
- `npm run lowercase:all` - run both checks
- `npm run lowercase:fix` - auto-fix lowercase violations in comments
- `npm run check:ui-lowercase:fix` - auto-fix ui lowercase violations

**critical convention**: all user-facing ui text and code comments must be strictly lowercase. this is enforced by ci and will reject prs with uppercase letters (except for user data/external content).

### service management
- `./pkm-control.sh status` - check service status
- `./pkm-control.sh restart` - restart services
- `./pkm-control.sh logs` - view logs

### build
- `npm run build` - build frontend
- `npm run build:all` - build all workspaces
- `npm run build:releases` - build release packages

## architecture overview

### monorepo structure
```
pkm/
├── apps/
│   ├── web/              # main vite-based web app (port 3010)
│   ├── mobile/           # capacitor android app
│   ├── desktop-electron/ # electron desktop app
│   └── desktop-tauri/    # tauri desktop app
├── packages/
│   ├── core/             # shared core library (src/, tests)
│   └── backend/          # node.js express + socket.io server (port 4100)
├── scripts/              # build scripts, linters, importers
└── server-data.json      # schema data for sql completions
```

### service topology
- **frontend**: vite react app (port 3010) with subdomain-based routing ("prism router")
- **backend**: express + socket.io server (port 4100) for real-time events
- **nocobase**: headless cms/api server (external, port 1337 or remote)
- **n8n**: workflow automation (external, port 5678)
- **ollama**: local llm server (external, port 11434)

### data flow
1. frontend proxies api requests to backend or nocobase based on path
2. backend broadcasts real-time events via socket.io
3. optimistic ui pattern: immediate update, then api call, rollback on failure

## key conventions

### path aliases
- `@pkm/core` or `@` → `packages/core/src`
- `@core-ui` → `packages/core/src/components/ui`

### testing
- test files: `**/__tests__/*.test.ts` or `**/*.spec.ts`
- vitest config in root `vitest.config.ts`
- setup file: `tests/setup-test.ts`
- environment: jsdom (for react components)

### code style
- typescript strict mode enabled
- react 18 with functional components and hooks
- zustand for local state, tanstack/react-query for server state
- tailwind css + radix-ui/shadcn for ui primitives
- all comments and ui text: lowercase only

### important files
- `PKM_COMPREHENSIVE_MASTER_CONTEXT.md` - complete architecture reference
- `.github/copilot-instructions.md` - additional context for ai assistants
- `vitest.config.ts` - test configuration
- `packages/core/tsconfig.json` - core typescript config

### feature modules
features live in `packages/core/src/features/`:
- `edgeless/` - canvas drawing system with indexeddb + worker persistence
- `notion-import/` - notion workspace importer
- `dashboard/` - dashboard grid with draggable widgets
- `headmates/` - plural system identity tracking

### sql parser
- `packages/core/src/lib/sql-parser.ts` - lightweight sql parser for select/join/group by/order by/limit/subqueries
- completion generator: `npm run schema:completions`

### bidirectional git sync
automatic sync service keeps local filesystem and github in sync:
- `sudo ./scripts/install-bidirectional-sync.sh` - install service
- `./pkm-control.sh sync-status` - check status
- `./pkm-control.sh sync-logs` - view logs
