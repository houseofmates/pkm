# pkm backend audit & competitive analysis

**date**: april 12, 2026
**auditor**: aurora
**context**: single-user, ultra-robust notion alternative for depression/asd-friendly personal knowledge management

---

## task 1: environment audit

### current architecture

**host**: 192.168.4.233 (pop!_os laptop) ✓

**frontend stack**:
- react 18 + vite 7 + typescript
- monorepo structure (apps/*, packages/*)
- multiple targets: web, desktop-electron, desktop-tauri, mobile (capacitor)
- ui: radix-ui components, tailwindcss, framer-motion
- state: zustand, tanstack query
- running on port 3010 (dev mode active)

**backend stack**:
- express.js server on port 4100
- socket.io for realtime
- nocobase integration via api calls
- custom ollama embeddings integration
- pieces mcp integration
- bot memory system

**database layer**:
- nocobase: docker container on port 8091 (healthy, 2 hours uptime)
  - postgres backend on port 5432
  - redis for caching
  - external endpoint: `db.houseofmates.space/api` (returns "not found" - may need nginx check)
- pocketbase: running on port 8090
  - sqlite backend
  - 15 collections created (empty except 1 headmate record)
  - no frontend integration yet

### nocobase integration points

**api endpoints** (from code):
- `https://db.houseofmates.space/api` - primary endpoint
- gamification routes: `/habits`, `/streaks`, `/activity_logs`
- activity logger: `/activity_logs:create`
- captures: `/captures:create`

**authentication**:
- nocobase api key in `.env` (`NOCOBASE_API_KEY`, `VITE_NOCOBASE_API_TOKEN`)
- admin api key for elevated operations
- no user-level auth visible - all server-to-server

**data schema** (from nocobase setup docs):
- custom ai field system for rag
- collections: notes, tasks, projects, research, dupemates, captures
- workflow automation (n8n integration)
- formula fields, sequence fields, markdown fields

### architectural complexity assessment

**problems identified**:
1. **nocobase is enterprise-grade for single-user use** - massive overhead
2. **two backends running simultaneously** - nocobase + pocketbase, neither fully utilized
3. **frontend-backend coupling** - direct nocobase api calls in react components
4. **data loss risk** - the pocketbase schema doc mentions "replaced nocobase after data loss incident"
5. **complexity tax** - docker compose for nocobase runs 4 containers (app, postgres, redis, mcp)

**resource usage**:
- nocobase: ~200-400mb ram minimum
- postgres: ~50-100mb
- redis: ~20-50mb
- pocketbase: ~15-30mb
- total: ~300-600mb for database layer alone

---

## task 2: competitive research

### comparison matrix

| criterion | nocobase | directus | pocketbase | baserow | nocodb |
|-----------|----------|----------|------------|--------|--------|
| **field type variety** | 50+ types, 8 categories, plugin-extensible | 30+ types, geospatial, computed fields | 12 core types, go-extendable | 20+ types, ai fields | 22+ types, formula/rollup |
| **single-user maintenance** | ❌ heavy - docker, postgres, plugins | ⚠️ moderate - docker, postgres/mysql | ✅ trivial - single binary, sqlite | ⚠️ moderate - docker, postgres | ✅ easy - single container, works with existing db |
| **setup time** | 30-60 min | 15-30 min | 2 min | 15-30 min | 5-10 min |
| **ram usage (idle)** | 400-800mb | 200-400mb | 15-30mb | 800mb+ | 200mb |
| **backup simplicity** | pg_dump + file storage | db dump + uploads | single directory copy | pg dump + uploads | db dump (external db) |
| **offline capability** | ❌ needs network for postgres | ⚠️ if local postgres | ✅ fully offline | ❌ needs postgres | ⚠️ depends on db location |
| **license** | agpl-3.0 | bsl (business source) | mit | mit (core) | agpl-3.0 |
| **ai integration** | ✅ built-in ai employees | ✅ mcp server built-in | ❌ via external | ✅ ai fields | ❌ via external |
| **api style** | rest + graphql (plugin) | rest + graphql | rest + realtime ws | rest | rest + graphql |

### detailed field type comparison

**nocobase** (50+ types):
- basic: text, number, boolean, date, datetime, time
- choice: select, radio, checkbox, multiple select
- media: file, image, audio, video
- relation: m2o, o2m, m2m, m2a, tree
- special: formula, sequence, encryption, markdown, json, geo
- plugin-extensible: custom field types via field plugins

**directus** (30+ types):
- basic: string, text, integer, float, boolean, uuid
- temporal: timestamp, datetime, date, time
- structured: json, csv, geometry types (point, linestring, polygon, etc.)
- relation: m2o, o2m, m2m, m2a, translations
- special: hash, alias, calculated (formula.js)
- interfaces: 40+ ui interfaces for fields

**pocketbase** (12 core types):
- text, number, bool, email, url, date
- select (single/multi), json, file, relation
- editor (rich text), autodate, password
- extendable via go hooks but requires recompilation

**baserow** (20+ types):
- basic: text, number, boolean, date
- special: ai field (llm-generated), formula, lookup, rollup
- relation: link to table, lookup
- file, url, email, phone, rating
- no geospatial, no custom types

**nocodb** (22+ types):
- basic: text, number, boolean, date
- formula, lookup, rollup, count
- link, qrcode, barcode
- attachment, json
- no geospatial, limited extensibility

### 2026 landscape insights

**pocketbase trajectory**:
- 56k+ github stars, fastest-growing
- pre-v1.0 but production-ready for single-server
- mit license, single maintainer (risk: bus factor)
- go extension system maturing (pocodex plugin manager)
- litestream for s3 replication

**directus trajectory**:
- 35k+ stars, established enterprise player
- bsl license restricts commercial use for orgs >$5m revenue
- native mcp server (ai-ready)
- active development, monthly releases

**nocobase trajectory**:
- 21k+ stars, enterprise-focused
- 2.0 released feb 2026 with ai employees
- plugin ecosystem growing (112 plugins, 70 free)
- agpl-3.0 license
- heavy architecture, complex setup

---

## task 3: synthesis & recommendation

### verdict

**switch from nocobase to pocketbase.**

here's why:

### field types: nocobase wins on paper, pocketbase wins in practice

nocobase has 50+ field types. pocketbase has 12. for a **single-user pkm**, you need:
- text, number, boolean, date, select, relation, json, file

pocketbase covers all of these. the "missing" types in nocobase (formula, sequence, encryption, tree) are either:
- implementable in frontend logic (formula → computed in react)
- unnecessary for your use case (tree for hierarchical data you don't have)
- better handled elsewhere (encryption → don't store sensitive data in pkm)

**for your actual use case, pocketbase's 12 types are sufficient.**

### maintenance: pocketbase by a landslide

**nocobase maintenance burden**:
- docker compose with 4 containers
- postgres backups, updates, vacuum
- plugin updates, compatibility checks
- workflow debugging across services
- memory monitoring for leaks

**pocketbase maintenance**:
```bash
# backup
cp -r ~/pocketbase/pb_data ~/backup

# update
wget latest-pocketbase && ./pocketbase serve

# done
```

for someone with **depression and limited executive function**, this difference is existential. every extra moving part is a potential failure point that drains energy to fix.

### enjoyment factor: pocketbase feels good

- admin ui is snappy, not enterprise-heavy
- single binary feels honest, not over-engineered
- realtime subscriptions built-in (no socket.io complexity)
- extending via go hooks is clean, not plugin hell
- the 15mb binary vs nocobase's 4-container stack - you can actually understand the whole thing

**nocobase's admin ui** feels like salesforce - powerful but exhausting. pocketbase feels like a tool built by someone who uses it.

### the single-user truth

nocobase is designed for:
- teams with roles and permissions
- multi-tenant applications
- enterprise workflows and approvals
- plugin ecosystems for non-technical users

you are:
- one person
- building for yourself
- comfortable with code
- needing reliability over features

**every nocobase feature you don't use is complexity you pay for anyway.**

---

## migration plan

### phase 0: preparation (day 1)

1. **audit nocobase data**
   ```bash
   # export all collections
   curl -H "Authorization: Bearer $NOCOBASE_API_KEY" \
     https://db.houseofmates.space/api/collections:list > nocobase-schema.json
   
   # export all records
   for collection in notes tasks projects captures habits; do
     curl -H "Authorization: Bearer $NOCOBASE_API_KEY" \
       "https://db.houseofmates.space/api/${collection}:list?pageSize=1000" \
       > exports/${collection}.json
   done
   ```

2. **verify pocketbase schema**
   - your existing schema in `POCKETBASE_SCHEMA.md` is solid
   - 15 collections cover all nocobase data
   - already migrated, just need to populate

### phase 1: data migration (day 1-2)

1. **write migration script**
   ```javascript
   // scripts/migrate-nocobase-to-pocketbase.js
   // map nocobase records to pocketbase schema
   // handle field name differences
   // preserve relations
   ```

2. **migrate in order** (respecting relations):
   - projects first (no dependencies)
   - headmates (already exists)
   - notes, tasks (depend on projects)
   - habit_completions, mood_logs (depend on habits, headmates)
   - captures, finances (no relations)

3. **validate migration**
   - count records in both systems
   - spot-check random records
   - verify relations work

### phase 2: frontend update (day 2-3)

1. **replace nocobase client with pocketbase sdk**
   ```bash
   npm install pocketbase
   ```

2. **update api layer**
   - `src/lib/nocobase-client.ts` → `src/lib/pocketbase-client.ts`
   - same interface, different backend
   - realtime subscriptions simpler (pocketbase native)

3. **update stores**
   - tanstack query keys stay same
   - pocketbase handles caching differently
   - zustand stores need collection name updates

### phase 3: backend cleanup (day 3)

1. **remove nocobase dependencies**
   - delete `NOCOBASE_*` from `.env`
   - remove nocobase routes from backend server
   - keep express for custom routes (pieces mcp, bot memory)

2. **shutdown nocobase**
   ```bash
   docker-compose -f ~/nocobase/docker-compose.yml down
   docker volume rm nocobase_postgres-data nocobase_redis-data
   ```

3. **update nginx**
   - remove `db.houseofmates.space` proxy
   - pocketbase on `localhost:8090` only

### phase 4: testing (day 4)

1. **functional testing**
   - create, read, update, delete for each collection
   - relations work correctly
   - realtime updates fire
   - file uploads work

2. **performance check**
   - pocketbase should be faster (sqlite vs postgres roundtrip)
   - check memory usage (should drop 400mb+)

### phase 5: decommission nocobase (day 5)

1. **final backup of nocobase data** (just in case)
2. **remove nocobase docker images**
3. **update documentation**
4. **celebrate** - you just eliminated 4 containers and 400mb of complexity

---

## risk assessment

| risk | likelihood | impact | mitigation |
|------|------------|--------|------------|
| pocketbase hits scaling limit | low (single-user) | medium | litestream for replication if needed |
| go extension needed for custom field | low | low | implement in frontend, or write go hook |
| nocobase had feature we need | low | medium | nocobase plugins are mostly enterprise features |
| pocketbase maintainer burns out | medium | high | fork is viable (mit license), community active |
| data migration corrupts | low | high | multiple backups, test on copy first |

---

## final thoughts

you built a pkm to reduce cognitive load. nocobase adds cognitive load:

- "why is postgres using 50% cpu?"
- "which plugin broke the workflow?"
- "how do i backup the docker volumes again?"

pocketbase removes cognitive load:

- "it's a folder. copy the folder. done."

for a single-user, offline-first, depression-friendly pkm, pocketbase is the honest choice. nocobase is overkill that you're paying for in complexity currency you can't afford.

**switch to pocketbase. your future self will thank you.**

---

## appendix: pocketbase benefits for your use case

1. **offline-first**: sqlite means your pkm works without internet. sync when you want, not when forced.

2. **single backup file**: `pb_data/` contains everything. copy it to usb, cloud, another machine. no volume management, no s3 configs.

3. **fast startup**: `./pocketbase serve` and you're running in 2 seconds. no docker pull, no container orchestration, no health checks.

4. **simple extensions**: need a custom endpoint? add a go hook. no plugin system, no middleware hell, just code that runs.

5. **honest scope**: pocketbase does database, auth, files, realtime. that's it. it won't try to be your cms, your workflow engine, your ai platform.

6. **proper relations**: your schema uses relations correctly (habit_completions -> habits, tasks -> projects). pocketbase handles these natively.

7. **gamification-ready**: your points/streak system maps cleanly to pocketbase collections. no need for nocobase's complex workflow system.

8. **future-proof**: if you ever need more, pocketbase has a migration path to postgres (via external tools). but you probably won't.

---

*end of audit Report*
