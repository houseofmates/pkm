# sidebar color sync setup guide

this guide explains how to set up cross-device sidebar color synchronization for pkm.

## overview

sidebar colors now sync across all platforms via nocobase:
- ✅ web app (browser)
- ✅ electron desktop app
- ✅ mobile apk (capacitor)
- ✅ desktop exe (tauri)

when you change a sidebar item's color on one device, it automatically syncs to all other devices.

## architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│   web app       │────▶│              │◀────│   electron app  │
└─────────────────┘     │   nocobase   │     └─────────────────┘
┌─────────────────┐     │   (postgres) │     ┌─────────────────┐
│   mobile apk    │────▶│              │◀────│   desktop exe   │
└─────────────────┘     └──────────────┘     └─────────────────┘
```

## how it works

1. **color changes** → saved to `sidebar_item_colors` collection in nocobase
2. **other devices** → poll every 30 seconds for updates
3. **same tab** → instant update via react-query + optimistic ui
4. **cross-tab** → broadcast via localstorage events

## automatic setup

the app automatically creates the required nocobase collection on first run. no manual setup needed!

### what gets created

collection name: `sidebar_item_colors`

fields:
- `item_id` (string, unique) - identifier for the sidebar item
- `item_type` (string) - one of: `collection`, `folder`, `document`, `drawing`
- `color` (string) - hex color code (e.g., `#f5af12`)
- `icon` (string) - icon name or url
- `icon_type` (string) - one of: `lucide`, `emoji`, `image`

## manual setup (if automatic fails)

if the collection doesn't auto-create, you can create it manually:

### via nocobase ui

1. go to nocobase admin (`http://your-nocobase:1337/admin`)
2. click **collection manager** in the sidebar
3. click **create collection**
4. configure:
   - name: `sidebar_item_colors`
   - title: `sidebar item colors`
   - hidden: ✅ (check this)
5. add fields:

| field name | type | unique | required |
|------------|------|--------|----------|
| item_id | string | ✅ | ✅ |
| item_type | string | ❌ | ✅ |
| color | string | ❌ | ❌ |
| icon | string | ❌ | ❌ |
| icon_type | string | ❌ | ❌ |

6. save

### via api

```bash
curl -x post http://your-nocobase:1337/api/collections:create \
  -h "content-type: application/json" \
  -h "authorization: bearer your-token" \
  -d '{
    "name": "sidebar_item_colors",
    "title": "sidebar item colors",
    "hidden": true,
    "fields": [
      { "name": "item_id", "type": "string", "unique": true },
      { "name": "item_type", "type": "string" },
      { "name": "color", "type": "string" },
      { "name": "icon", "type": "string" },
      { "name": "icon_type", "type": "string" }
    ]
  }'
```

## usage

### for users

1. right-click any sidebar item (database, folder, document, or drawing)
2. click **color** tab
3. pick a color
4. color syncs automatically to all your devices!

### for developers

#### use the hook

```typescript
import { useSidebarColors } from '@/hooks/use-sidebar-colors';

function mycomponent() {
  const { colors, updatecolor, getcolor } = usesidebarcolors();
  
  // get color for an item
  const color = getcolor('my_collection', '#defaultcolor');
  
  // update color (auto-syncs to all devices)
  await updatecolor('my_collection', '#ff0000');
}
```

#### use single item hook

```typescript
import { usesidebaritemcolor } from '@/hooks/use-sidebar-colors';

function mycomponent({ itemid }: { itemid: string }) {
  const { color, updatecolor } = usesidebaritemcolor(itemid, '#default');
  
  return <div style={{ color }}>{color}</div>;
}
```

#### use the service directly

```typescript
import {
  savesidebarcolor,
  getsidebarcolor,
  fetchallsidebarcolors
} from '@/services/sidebar-color-service';

// save color
await savesidebarcolor('item_id', 'collection', {
  color: '#ff0000',
  icon: 'database',
  icontype: 'lucide'
});

// get color
const record = await getsidebarcolor('item_id');
```

## item types

| prefix | type | example |
|--------|------|---------|
| (no prefix) | collection | `tasks`, `projects` |
| `folder_` | folder | `folder_123456` |
| `doc_` | document | `doc_uuid-here` |
| `drawing_` | drawing | `drawing_uuid-here` |

## sync behavior

| action | local update | server sync | other devices |
|--------|-------------|-------------|---------------|
| change color | instant | 1 second | 30 seconds (poll) |
| change icon | instant | 1 second | 30 seconds (poll) |
| open app | instant (cache) | on mount | - |
| same tab | instant | background | - |
| cross-tab | 100ms | background | - |

## troubleshooting

### colors not syncing

1. check network connection
2. verify nocobase is accessible
3. check browser console for errors
4. ensure `sidebar_item_colors` collection exists

### check collection exists

```bash
curl http://your-nocobase:1337/api/sidebar_item_colors:list \
  -h "authorization: bearer your-token"
```

### reset local cache

```javascript
// in browser console
object.keys(localstorage)
  .filter(k => k.startswith('pkm_sidebar_color:'))
  .foreach(k => localstorage.removeitem(k));
```

### debug logs

enable debug logging:

```javascript
localstorage.setitem('debug', 'pkm:*');
```

## migration from legacy

old colors stored in `collection_metadata` setting are automatically migrated:

1. when you view an item, its legacy color is read
2. when you change an item's color, it's saved to new system
3. new colors take priority over legacy colors

to force migration of all colors:

```typescript
import { migratesidebarcolors } from '@/services/sidebar-color-service';

await migratesidebarcolors(); // migrates all legacy colors
```

## security

- colors are user-specific (based on nocobase auth token)
- no sensitive data stored
- collection is hidden from main ui

## performance

- local cache via localstorage
- optimistic ui updates
- debounced server writes (1 second)
- polling every 30 seconds (configurable)
- react-query caching

## file structure

```
packages/core/src/
├── services/
│   └── sidebar-color-service.ts    # api operations
├── hooks/
│   └── use-sidebar-colors.ts       # react hook
└── components/
    ├── navigation.tsx              # sidebar component
    └── rich-resource-context-menu.tsx  # color picker
    features/databases/components/
    └── database-context-menu.tsx   # database color sync
```

## customization

### change poll interval

```typescript
const { colors } = usesidebarcolors({
  pollintervalms: 10000 // 10 seconds
});
```

### disable polling

```typescript
const { colors } = usesidebarcolors({
  pollintervalms: undefined // disable polling
});

// manual refresh
const { refetch } = usesidebarcolors();
await refetch();
```
