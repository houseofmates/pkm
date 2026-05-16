# pocketbase migration guide

this document tracks the migration from nocobase to pocketbase.

## overview

the pkm application has been migrated from nocobase to pocketbase. pocketbase provides:

- simpler deployment (single binary)
- better offline support
- real-time subscriptions
- similar data model

## completed changes

### 1. pocketbase client setup

- **file**: `packages/core/src/lib/pocketbase.ts`
- created `pocketbaseclient` class with methods matching nocobaseclient
- supports authentication, crud operations, realtime subscriptions
- configured to use `VITE_POCKETBASE_URL` env var (default: `http://192.168.4.233:8090`)

### 2. authentication

- **file**: `packages/core/src/contexts/auth-context.tsx`
- updated to use pocketbase email/password authentication
- login now accepts email and password instead of jwt token
- auth state persisted in `pocketbase_token` and `pocketbase_user` storage keys

### 3. login page

- **file**: `packages/core/src/pages/login.tsx`
- updated ui for email/password login
- removed jwt token input
- added email and password fields

### 4. hooks

- **file**: `packages/core/src/hooks/use-records.ts`
- updated to use pocketbase client
- response format: `{ data: T[], meta?: { total?: number } }`
- supports pagination, sorting, filtering via pocketbase syntax

### 5. api client

- **file**: `packages/core/src/lib/api-client.ts`
- updated token kind to use `pocketbase_token` instead of `nocobase_token`
- maintains compatibility with existing auth headers

### 6. services

- **file**: `packages/core/src/services/data.service.ts`
- updated to use pocketbase client
- added realtime subscription helpers (`subscribetocollection`, `unsubscribefromcollection`)
- collections must be created via pocketbase admin ui

### 7. contexts

- **file**: `packages/core/src/contexts/fronter-context.tsx`
- updated all api calls to use pocketbase client
- maintains simplyplural integration

### 8. backend

- **file**: `packages/backend/pocketbase-client.js`
- created backend pocketbase client helper
- supports admin authentication
- provides crud operation helpers

### 9. environment variables

- **file**: `.env.example`
- added `VITE_POCKETBASE_URL`
- added `POCKETBASE_ADMIN_EMAIL`
- added `POCKETBASE_ADMIN_PASSWORD`
- marked nocobase vars as deprecated

## remaining work

### files needing import updates

run the migration helper script to update remaining files:

```bash
./scripts/migrate-to-pocketbase.sh
```

files still using nocobase imports (~50 files):

- `packages/core/src/services/sidebar-color-service.ts`
- `packages/core/src/services/offline-service.ts`
- `packages/core/src/services/ai-field-generator.ts`
- `packages/core/src/services/dupemates-integration.ts`
- `packages/core/src/services/rag-service.ts`
- `packages/core/src/services/scheduled-generation.ts`
- `packages/core/src/hooks/useSimplyPluralSync.ts`
- `packages/core/src/hooks/use-journal-data.ts`
- `packages/core/src/hooks/use-pet-health-tracker.ts`
- `packages/core/src/hooks/use-finance-tracker.ts`
- `packages/core/src/hooks/use-exercise-tracker.ts`
- `packages/core/src/store/useGamificationStore.ts`
- `packages/core/src/features/edgeless/sync/canvas-sync.ts`
- `packages/core/src/features/houseofmates-builder/*` (8 files)
- `packages/core/src/features/headmates/components/ContactProfileView.tsx`
- `packages/core/src/features/databases/components/canvas/CanvasCard.tsx`
- `packages/core/src/features/blog-builder/components/BlogEditor.tsx`
- `packages/core/src/pages/journal.tsx`
- `packages/core/src/pages/template.tsx`
- `packages/core/src/pages/calendar.tsx`
- `packages/core/src/pages/today.tsx`
- `packages/core/src/pages/achievements.tsx`
- `packages/core/src/pages/rag-test.tsx`
- `packages/core/src/components/financial-hub.tsx`
- `packages/core/src/components/shower-logger-modal.tsx`
- `packages/core/src/components/dashboard/DashboardCard.tsx`
- `packages/core/src/components/MedicalExport.tsx`
- `packages/core/src/components/DataEmbed/*`
- `packages/core/src/components/habits/*`
- `packages/core/src/components/mood-energy-widgets.tsx`
- `packages/core/src/components/activity-log-widget.tsx`
- `packages/core/src/components/database-view-renderer.tsx`
- `packages/core/src/components/routine-checklist.tsx`
- `packages/core/src/components/editor/*`
- `packages/core/src/lib/context-builder.ts`
- `packages/core/src/lib/vector-store.ts`
- `packages/core/src/lib/link-migration.ts`
- `packages/core/src/api/member-service.ts`
- `packages/core/src/api/sync-service.ts`
- `packages/core/src/api/setup-public-collections.ts`
- `packages/core/src/utils/sync-headmates.ts`

### manual updates needed

1. **import statements** - replace:

   ```typescript
   // old
   import { api } from "@/api/nocobase-client";
   import api from "@/api/nocobase-client";

   // new
   import { pocketBaseClient } from "@/lib/pocketbase";
   ```

2. **api calls** - update method signatures:

   ```typescript
   // old
   const res = await api.listRecords("collection", { filter: "field=value" });
   const data = Array.isArray(res) ? res : res.data;

   // new
   const res = await pocketBaseClient.listRecords("collection", {
     filter: "field=value",
   });
   const data = res.data;
   ```

3. **filter syntax** - pocketbase uses different filter syntax:

   ```typescript
   // old (nocobase)
   filter: {
     field: "value";
   }
   filterByTk: id;

   // new (pocketbase)
   filter: 'field = "value"';
   // no filterByTk - use filter: 'id = "xxx"'
   ```

4. **realtime subscriptions** - use pocketbase native:

   ```typescript
   // subscribe
   const unsubscribe = pocketBaseClient.subscribe("collection", (e) => {
     if (e.action === "create") {
       /* handle */
     }
   });

   // unsubscribe
   unsubscribe();
   ```

## pocketbase setup

### creating collections

collections must be created via pocketbase admin ui at `http://192.168.4.233:8090/_/`

required collections (already created):

- `psychology_logs`
- `neuroscience_notes`
- `daily_activity`
- `simplyplural_fronters`
- `headmates`
- `front_history`
- `journal`
- `activities`
- `activity_logs`

### user authentication

pocketbase uses the `_pb_users_auth_` collection by default.

create users via admin ui or programmatically:

```typescript
await pb.collection("users").create({
  email: "user@example.com",
  password: "password123",
  passwordConfirm: "password123",
});
```

## testing

after migration, verify:

1. login with email/password works
2. crud operations on collections work
3. realtime subscriptions work (open two tabs)
4. offline queue works (disconnect, create, reconnect)
5. simplyplural sync works
6. gamification state persists

## rollback

if needed, revert to nocobase by:

1. restore `.env` nocobase variables
2. revert auth-context.tsx
3. revert login.tsx
4. run migration script in reverse

## resources

- pocketbase docs: https://pocketbase.io/docs/
- pocketbase js sdk: https://github.com/pocketbase/js-sdk
- pocketbase typescript: https://pocketbase.io/docs/manage-typescript/
