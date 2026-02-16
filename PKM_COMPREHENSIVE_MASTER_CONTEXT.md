# pkm comprehensive master context document

**version**: 1.1 golden master  
**last updated**: february 14, 2026  
**purpose**: complete architectural and implementation reference for llm-assisted development

---

## table of contents

1. [system overview](#1-system-overview)
2. [architecture deep dive](#2-architecture-deep-dive)
3. [frontend implementation](#3-frontend-implementation)
4. [backend services](#4-backend-services)
5. [data model and persistence](#5-data-model-and-persistence)
6. [component catalog](#6-component-catalog)
7. [automation and workflows](#7-automation-and-workflows)
8. [capture system](#8-capture-system)
9. [design system](#9-design-system)
10. [development patterns](#10-development-patterns)
11. [deployment and operations](#11-deployment-and-operations)
12. [troubleshooting guide](#12-troubleshooting-guide)
13. [service recovery: how to make it go up](#13-service-recovery-how-to-make-it-go-up)

---

## 1. system overview

### 1.1 what is pkm?

pkm is a **personal knowledge management system** designed for self-hosted, offline-capable use. it combines:
- **database management** (notion-like flexibility)
- **infinite canvas** (tldraw/miro-style spatial thinking)
- **markdown journaling** (obsidian-style note-taking)
- **media organization** (pinterest-like moodboards)
- **identity management** (plural system support)
- **automation** (n8n workflows + local ai)

**core philosophy**:
- **yours**: fully self-hosted, no external dependencies beyond optional ai services
- **lowercase**: aesthetic choice - all ui text is lowercase, using varela round font
- **glass & void**: design language of dark backgrounds (#050505, #050505) with opaque dark gray panels
- **omni-protocol**: integrates life aspects: shopping, finance, gaming (minecraft), journaling
- **identity-aware**: built-in support for plural systems (headmates/alters), tracking who is "fronting"

### 1.2 target users

- **knowledge workers** organizing research and projects
- **creative professionals** managing media and inspiration
- **plural systems** needing identity-aware tools
- **privacy-conscious individuals** wanting self-hosted alternatives
- **developers** building personal dashboards

### 1.3 key capabilities (production ready)

✅ **capture**: one-click web clipping with ai summarization  
✅ **organize**: drag-and-drop dashboard with customizable widgets  
✅ **visualize**: infinite canvas with drawing, sticky notes, and mind maps  
✅ **database**: flexible collections with 12+ view types (table, kanban, calendar, gallery, etc.)  
✅ **journal**: distraction-free markdown writing with live preview  
✅ **moodboard**: pinterest-style image grid with drag-and-drop  
✅ **monitor**: real-time minecraft server integration (chat + status)  
✅ **identity**: headmate tracking with fronting history and custom profiles  
✅ **media**: custom players for video, audio, pdf with drawing/crop tools  
✅ **automation**: n8n workflows + local llm (qwen2.5:7b via ollama)  

### 1.4 system requirements

**host machine**:
- linux (tested on pop!_os 22.04)
- 8gb ram minimum (16gb recommended)
- 20gb disk space (more for media storage)
- docker + docker compose
- node.js 18+ (for local development)

**browser support**:
- firefox 100+ (primary)
- chrome/edge 100+
- mobile: android chrome (capacitor app in progress)

---

## 2. architecture deep dive

### 2.1 service topology

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                         │
├─────────────────────────────────────────────────────────────┤
│  Browser (Firefox/Chrome)                                   │
│  └─ React App (port 3000/3010)                             │
│     ├─ Prism Router (subdomain detection)                  │
│     ├─ Socket.IO Client (real-time events)                 │
│     └─ NocoBase API Client (data operations)               │
├─────────────────────────────────────────────────────────────┤
│                      APPLICATION LAYER                      │
├─────────────────────────────────────────────────────────────┤
│  PKM Backend (port 4100)                                    │
│  └─ Express Server                                          │
│     ├─ File Upload Handler (/api/upload-background)        │
│     ├─ Socket.IO Server (broadcasts)                       │
│     └─ Webhook Receiver (/api/broadcast)                   │
├─────────────────────────────────────────────────────────────┤
│                         DATA LAYER                          │
├─────────────────────────────────────────────────────────────┤
│  NocoBase (port 1337)                                       │
│  └─ Headless CMS + API Server                              │
│     ├─ Collections (tables)                                │
│     ├─ Relationships (foreign keys)                        │
│     └─ Attachments (file storage)                          │
│                                                             │
│  PostgreSQL (port 5432)                                     │
│  └─ Relational Database                                    │
│     └─ NocoBase schema storage                             │
├─────────────────────────────────────────────────────────────┤
│                     AUTOMATION LAYER                        │
├─────────────────────────────────────────────────────────────┤
│  n8n (port 5678)                                            │
│  └─ Workflow Engine                                         │
│     ├─ Webhooks (capture, minecraft)                       │
│     ├─ HTTP Requests (exa.ai, ollama)                      │
│     └─ NocoBase Integration                                │
│                                                             │
│  Redis (port 6379)                                          │
│  └─ n8n queue storage                                       │
├─────────────────────────────────────────────────────────────┤
│                          AI LAYER                           │
├─────────────────────────────────────────────────────────────┤
│  Ollama (port 11434)                                        │
│  └─ Local LLM Server                                        │
│     └─ qwen2.5:7b model                                     │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 network flow

**local dns** (via `/etc/hosts` or router):
```
192.168.x.x    houseofmates.space
192.168.x.x    *.houseofmates.space
```

**subdomain routing** (handled by frontend prism router):
- `pkm.houseofmates.space` → main dashboard
- `blog.houseofmates.space` → public blog
- `home.houseofmates.space` → public landing page
- `dupe.houseofmates.space` → minecraft dashboard
- `api.houseofmates.space` → nocobase (port 1337)

### 2.3 authentication flow

**nocobase authentication**:
1. user enters api key in settings (`/settings`)
2. frontend stores token in `localStorage` (`nocobase_api_key`)
3. all api requests include header: `Authorization: Bearer <token>`
4. token is validated by nocobase on each request
5. invalid token → redirect to `/auth`

**auth context** (`src/contexts/auth-context.tsx`):
```typescript
const AuthContext = {
  token: string | null,
  isAuthenticated: boolean,
  client: NocoBaseClient,
  login: (apiKey: string) => void,
  logout: () => void
}
```

### 2.4 data synchronization

**optimistic ui pattern**:
1. user action triggers immediate ui update
2. background request sent to nocobase
3. on success: no change (already updated)
4. on failure: rollback + toast error message

**real-time updates**:
- socket.io connection to `localhost:4100`
- events: `minecraft:chat`, `fronter:switch`, `capture:new`
- listeners in `src/main.tsx` and component-specific hooks

---

## 3. frontend implementation

### 3.1 technology stack

**core**:
- **react** 18.3.1 (ui framework)
- **typescript** 5.5.3 (type safety)
- **vite** 5.4.1 (build tool + dev server)

**routing**:
- **react-router-dom** 6.26.0 (spa routing)
- custom "prism router" for subdomain detection

**state management**:
- **zustand** 4.5.5 (lightweight state)
- **tanstack/react-query** 5.52.1 (server state + caching)
- **localstorage** (persistent settings via `use-app-setting` hook)

**ui libraries**:
- **tailwind css** 3.4.10 (utility-first styling)
- **shadcn/ui** (component primitives)
- **radix-ui** (accessible primitives)
- **lucide-react** (icon library)

**specialized**:
- **tldraw** 2.4.0 (infinite canvas)
- **socket.io-client** 4.7.5 (real-time)
- **react-grid-layout** 1.4.4 (dashboard widgets)
- **pdfjs-dist** 4.6.82 (pdf rendering)
- **capacitor** 6.1.2 (mobile wrapper)

### 3.2 directory structure

```
src/
├── api/                    # external api clients
│   ├── member-service.ts   # simply plural integration
│   └── ollama-client.ts    # local llm client
├── components/             # shared ui components
│   ├── bottom-nav.tsx      # mobile navigation
│   ├── navigation.tsx      # desktop sidebar
│   ├── global-command-palette.tsx  # ctrl+k search
│   ├── icon-picker-dialog.tsx      # emoji/icon selector
│   ├── journal/            # markdown editor components
│   ├── media/              # video/audio/pdf players
│   ├── ui/                 # shadcn primitives
│   └── views/              # database view types
│       ├── registry.tsx    # view type mapping
│       ├── calendar-view.tsx
│       ├── kanban-view.tsx
│       ├── gallery-view.tsx
│       ├── gantt-view.tsx
│       ├── chart-view.tsx
│       ├── network-view.tsx
│       ├── mind-map-view.tsx
│       ├── list-view.tsx
│       └── journal-view.tsx
├── contexts/               # react contexts
│   ├── auth-context.tsx    # authentication state
│   ├── fronter-context.tsx # headmate fronting state
│   └── llm-context.tsx     # ai service state
├── features/               # feature modules
│   ├── blog-builder/       # blog editor
│   ├── collections/        # database collections ui
│   ├── dashboard/          # dashboard widgets
│   │   ├── dashboard-grid.tsx  # main dashboard canvas
│   │   └── widgets.tsx     # widget catalog
│   ├── databases/          # database views
│   │   └── components/
│   │       ├── database-widget.tsx  # full table view
│   │       └── dashboard-database-card.tsx  # card preview
│   ├── edgeless/           # canvas/whiteboard
│   ├── headmates/          # plural system features
│   ├── houseofmates-builder/  # landing page editor
│   └── records/            # crud operations
├── hooks/                  # custom react hooks
│   ├── use-app-setting.ts  # persistent settings
│   ├── use-canvas-layout.ts # canvas state
│   ├── use-collections.ts  # collection data
│   └── use-records.ts      # record crud
├── lib/                    # utility libraries
│   ├── api-client.ts       # nocobase client
│   ├── block-engine.ts     # notion-style blocks
│   ├── llm-service.ts      # ai service wrapper
│   ├── import-export.ts    # data portability
│   └── utils.ts            # helpers
├── pages/                  # route components
│   ├── canvas-page.tsx     # infinite canvas
│   ├── captures.tsx        # web clips inbox
│   ├── collection-detail.tsx  # database view
│   ├── drawing-page.tsx    # drawing canvas
│   ├── home.tsx            # dashboard
│   ├── moodboard.tsx       # image grid
│   ├── root-layout.tsx     # app shell
│   ├── settings.tsx        # configuration
│   └── workspace.tsx       # workspace selector
├── plugins/                # plugin system
│   └── plugin-registry.ts  # plugin loader
├── stores/                 # zustand stores
│   └── llm-store.ts        # llm state
├── types/                  # typescript definitions
│   └── nocobase.ts         # api types
├── utils/                  # utilities
│   └── color-generator.ts  # theme colors
├── App.tsx                 # root component
├── main.tsx                # entry point
└── index.css               # global styles
```

### 3.3 the prism router

**location**: `src/App.tsx`

**purpose**: route different subdomains to different ui modes

**implementation**:
```typescript
const subdomain = window.location.hostname.split('.')[0];

if (subdomain === 'blog') {
  return <BlogView />;
} else if (subdomain === 'home') {
  return <HomeView />;
} else if (subdomain === 'dupe') {
  return <MinecraftDashboard />;
} else {
  return <MainApp />;
}
```

**key pattern**: single codebase, multiple interfaces based on subdomain

### 3.4 block-based engine

**location**: `src/lib/block-engine.ts`

**concept**: everything is a block (text, heading, database, media, etc.)

**zustand store**:
```typescript
interface BlockStore {
  blocks: Record<string, Block[]>;  // pageId → blocks
  columnWidths: Record<string, number[]>;  // layoutKey → widths
  addBlock: (pageId: string, block: Block) => void;
  removeBlock: (pageId: string, blockId: string) => void;
  updateBlock: (pageId: string, blockId: string, updates: Partial<Block>) => void;
  moveBlock: (pageId: string, blockId: string, newIndex: number) => void;
  setColumnWidths: (layoutKey: string, widths: number[]) => void;
}
```

**block types**:
- `text`: paragraph content
- `heading`: h1/h2/h3
- `database`: embedded collection view
- `image`: uploaded image with caption
- `video`: video player
- `audio`: audio player
- `pdf`: pdf viewer
- `embed`: iframe (youtube, etc.)
- `code`: syntax-highlighted code block
- `divider`: horizontal rule
- `canvas`: embedded tldraw canvas

**platform detection**:
```typescript
const getPlatform = () => {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'apk';
  return 'desktop';
};
```

**column layouts**: 1-4 columns per page, stored separately for apk vs desktop

### 3.5 dashboard system

**location**: `src/features/dashboard/dashboard-grid.tsx`

**architecture**: absolute-positioned widgets on infinite canvas with drawing overlay

**widget types**:
1. **database widgets**: show database collections
   - normal mode: `DatabaseWidget` (full table/kanban/etc.)
   - card mode: `DashboardDatabaseCard` (latest entry preview)
2. **document widgets**: local canvas/notes
3. **contact widgets**: headmate cards
4. **view widgets**: special canvas snapshots

**widget definition**:
```typescript
interface WidgetDefinition {
  id: string;
  type: 'view' | 'document' | 'contact';
  title: string;
  collectionName: string;  // or document id
  viewType: ViewType;
  viewConfig?: {
    sort?: string[];
    filter?: Record<string, any>;
  };
  x: number;  // px position
  y: number;
  w: number;  // px width
  h: number;  // px height
  zIndex: number;
}
```

**storage**: `useAppSetting('dashboard_widgets_v2', [])`

**features**:
- drag to move
- resize handles (8-direction)
- drawing overlay (pencil, eraser, lasso)
- undo/redo for drawings
- synced canvas background image
- edit mode toggle

**drawing tools**:
- **pencil**: freehand drawing with color picker (default: #ffffff)
- **eraser**: configurable size (default: 20px)
- **lasso**: selection tool (free, rect, magic wand modes)
- **undo/redo**: full history stack (max 20 snapshots)

### 3.6 canvas implementation

**location**: `src/pages/canvas-page.tsx`

**technology**: tldraw 2.4.0

**features**:
- infinite whiteboard
- drawing tools (pen, shapes, text, sticky notes)
- image uploads
- arrow connections
- local persistence (localStorage)
- snapshot generation for dashboard cards

**storage keys**:
- `canvas-config-{id}`: metadata (title, created date)
- `canvas-blocks-{id}`: block content (for documents)
- `edgeless-snapshot-{id}`: base64 snapshot image

**snapshot generation**:
```typescript
// location: src/features/edgeless/utils/snap-generator.ts
export async function generateSnapshot(editor: Editor): Promise<string> {
  const ids = editor.getCurrentPageShapeIds();
  const blob = await editor.getSvgString(ids);
  return `data:image/svg+xml;base64,${btoa(blob.svg)}`;
}
```

### 3.7 database views

**registry**: `src/components/views/registry.tsx`

**view types** (12 total):
1. **table**: spreadsheet-style rows/columns
2. **kanban**: cards grouped by select field
3. **calendar**: events on date grid
4. **gallery**: image-focused card grid
5. **list**: compact rows with custom templates
6. **gantt**: timeline view with dependencies
7. **chart**: bar/line/pie charts
8. **network**: graph visualization (nodes + edges)
9. **mindmap**: hierarchical tree layout
10. **journal**: chronological entries
11. **canvas**: spatial layout (tldraw)
12. **contacts**: headmate-specific view

**common props**:
```typescript
interface ViewProps {
  data: any[];
  loading?: boolean;
  collection: Collection;
  config?: any;
  onUpdateRecord?: (id: any, data: any) => Promise<void>;
  onDelete?: (id: any) => Promise<void>;
  onEdit?: (id: any) => void;
  onConfigChange?: (key: string, value: any) => void;
  onCreateRecord?: () => void;
  onCreateField?: () => void;
}
```

**example - kanban view**:
- groups records by a `select` field
- drag-and-drop between columns
- optimistic updates (immediate ui change, then api call)
- create new cards inline

### 3.8 media players

all custom-built to match "glass & void" aesthetic

**pdf viewer** (`src/components/media/pdf-viewer.tsx`):
- pdf.js rendering
- page navigation
- zoom (50-300%)
- lowercase ui

**video player** (`src/components/media/video-player.tsx`):
- custom controls
- auto-hide after 3s
- fullscreen support
- progress bar with seek

**audio player** (`src/components/media/audio-player.tsx`):
- waveform visualization
- ±10s skip buttons
- volume control

**image editor** (`src/components/media/image-editor.tsx`):
- crop tool (drag selection)
- freehand drawing
- censor overlay
- color grading (brightness/contrast/saturation)
- rotation
- undo/redo

### 3.9 hooks reference

**`useAppSetting<T>(key, defaultValue)`**:
- persistent localStorage-backed state
- syncs across tabs via `storage` event
- debounced writes (500ms)
- returns: `[value, setValue, loading, flush]`

**`useCollections()`**:
- fetches all nocobase collections
- caches with react-query
- returns: `{ collections, loading, error, refetch }`

**`useRecords(collectionName, params)`**:
- fetches records from a collection
- pagination, sorting, filtering
- mutations: create, update, delete
- optimistic updates
- returns: `{ records, meta, loading, create, update, delete, refresh }`

**`useFronter()`**:
- headmate fronting state
- members list
- active fronters
- switch history
- returns: `{ members, activeFronters, switchFronter, history }`

---

## 4. backend services

### 4.1 pkm backend server

**location**: `backend/server.js`

**purpose**: file uploads, socket.io, webhook bridge

**port**: 4100

**endpoints**:

**`POST /api/upload-background`**:
- accepts multipart/form-data (images, videos)
- saves to `backend/uploads/`
- returns: `{ success: true, filePath: '/uploads/...' }`
- used for: dashboard canvas backgrounds, media uploads

**`POST /api/broadcast`**:
- accepts json payload: `{ event: string, data: any }`
- emits to all connected socket.io clients
- used by: n8n workflows (minecraft chat, captures)

**`POST /api/oracle`**:
- accepts json: `{ query: string, collections: string[], context?: string }`
- ai-powered semantic search intent parser
- uses qwen2.5:7b via ollama to extract:
  - `keywords`: synonyms and related terms
  - `collections`: targeted database collections
  - `filters`: parsed date ranges, tags, field filters
  - `isQuestion`: boolean if query is a direct question
  - `directAnswer`: concise lowercase answer if question detected
- returns: `{ success: boolean, intent: OracleIntent, rawQuery: string }`
- used by: global command palette (ctrl+k / ` key)

**socket.io events**:
- `minecraft:chat` → { username, message, timestamp }
- `fronter:switch` → { member, timestamp }
- `capture:new` → { id, title, url }

**cors**: allows all origins (local dev)

### 4.2 nocobase

**version**: latest docker image

**port**: 1337 (internal), 80 (within docker network)

**database**: postgresql 14

**authentication**: api token (stored in `x-authenticator` header or `Authorization: Bearer`)

**collections** (key ones):

**`captures`**:
- fields: `url`, `content`, `summary`, `tags`, `createdAt`
- stores web clips from browser extension

**`headmates`**:
- fields: `name`, `pronouns`, `color`, `avatar`, `bio`, `role`
- system member profiles

**`front_history`**:
- fields: `member` (relation), `startedAt`, `endedAt`, `notes`
- tracks who was fronting when

**`documents`**:
- fields: `title`, `content` (json), `tags`, `coverImage`
- stores page content (block engine)

**`collections_metadata`**:
- fields: `collectionName`, `icon`, `color`, `description`
- ui customization for collections

**api patterns**:

**list records**:
```http
GET /api/collections:list?page=1&pageSize=20&sort=-createdAt
Authorization: Bearer <token>
```

**create record**:
```http
POST /api/collections:create
Authorization: Bearer <token>
Content-Type: application/json

{ "title": "test", "content": "..." }
```

**update record**:
```http
POST /api/collections:update?filterByTk=123
Authorization: Bearer <token>
Content-Type: application/json

{ "title": "updated" }
```

**delete record**:
```http
POST /api/collections:destroy?filterByTk=123
Authorization: Bearer <token>
```

**file attachments**:
- stored in nocobase's internal storage
- accessed via `storage:attachments/{id}`
- returns signed url or direct file

### 4.3 n8n automation

**version**: latest docker image

**port**: 5678

**storage**: redis (queue), postgresql (workflows)

**key workflows**:

**`harpoon-capture` webhook**:
1. receives `POST /webhook/harpoon-capture`
2. payload: `{ url, content, isLink }`
3. if `isLink`:
   - call exa.ai to fetch full content
   - call ollama (qwen2.5:7b) to summarize
4. save to nocobase `captures` collection
5. broadcast via pkm backend socket.io

**`minecraft-chat-bridge`**:
1. minecraft plugin sends `POST /webhook/minecraft-chat`
2. payload: `{ username, message }`
3. broadcast to pkm backend → frontend toast

**ollama integration**:
```javascript
// n8n http request node
{
  method: 'POST',
  url: 'http://localhost:11434/api/generate',
  body: {
    model: 'qwen2.5:7b',
    prompt: 'summarize this in lowercase: ...',
    stream: false
  }
}
```

### 4.4 ollama (local llm)

**model**: `qwen2.5:7b` (7 billion parameter)

**port**: 11434

**api endpoint**: `/api/generate`

**usage in pkm**:
- web capture summarization (via n8n)
- in-app chat assistant ("wilson")
- semantic search (planned)

**prompt template** (lowercase enforcement):
```
you are wilson, a helpful assistant for the pkm system.
respond in lowercase only. be concise and friendly.

user: {query}
assistant:
```

---

## 5. data model and persistence

### 5.1 storage layers

**1. nocobase (postgresql)**: relational data
- collections (tables)
- records (rows)
- relationships (foreign keys)

**2. localstorage**: client-side settings
- `nocobase_api_key`: auth token
- `dashboard_widgets_v2`: widget positions
- `canvas-config-{id}`: canvas metadata
- `edgeless-snapshot-{id}`: canvas snapshots
- `appSettings_{key}`: persistent ui state

**3. filesystem**: media files
- `backend/uploads/`: user-uploaded files
- nocobase attachments: managed by nocobase

### 5.2 nocobase field types

**basic**:
- `input`: text input
- `textarea`: multi-line text
- `number`: numeric value
- `percent`: percentage (0-100)
- `boolean`: checkbox

**selection**:
- `select`: single choice dropdown
- `multipleSelect`: multi-choice dropdown
- `radioGroup`: radio buttons
- `checkboxGroup`: checkbox group

**datetime**:
- `datetime`: date + time picker
- `date`: date only
- `time`: time only

**relation**:
- `hasOne`: 1:1 relationship
- `hasMany`: 1:many relationship
- `belongsTo`: reverse of hasOne
- `belongsToMany`: many:many relationship

**advanced**:
- `attachment`: file upload (single)
- `attachments`: file upload (multiple)
- `json`: arbitrary json data
- `richText`: markdown/html editor

**example - captures collection**:
```javascript
{
  name: 'captures',
  fields: [
    { name: 'url', type: 'input', uiSchema: { title: 'url' } },
    { name: 'content', type: 'textarea', uiSchema: { title: 'content' } },
    { name: 'summary', type: 'textarea', uiSchema: { title: 'summary' } },
    { name: 'tags', type: 'multipleSelect', uiSchema: { title: 'tags' } },
    { name: 'image', type: 'attachment', uiSchema: { title: 'image' } },
    { name: 'createdAt', type: 'datetime', uiSchema: { title: 'created' } }
  ]
}
```

### 5.3 data flow patterns

**create record**:
```
user action (form submit)
  ↓
optimistic ui update (immediate)
  ↓
api call (background)
  ↓
success: commit
failure: rollback + toast
```

**update record**:
```
user edit (inline field)
  ↓
debounced update (500ms)
  ↓
api call
  ↓
success: background sync
failure: revert + error
```

**real-time sync**:
```
external event (n8n webhook)
  ↓
broadcast via socket.io
  ↓
frontend listener
  ↓
update ui (toast/notification)
  ↓
refetch affected queries (react-query invalidation)
```

---

## 6. component catalog

### 6.1 layout components

**`Navigation`** (`src/components/navigation.tsx`):
- desktop sidebar
- collection list with icons
- quick actions (new, settings)
- fronter indicator

**`BottomNav`** (`src/components/bottom-nav.tsx`):
- mobile navigation bar
- 5 primary tabs: home, databases, canvas, captures, settings

**`ColumnLayout`** (`src/components/ui/column-layout.tsx`):
- 1-4 column page layout
- draggable gutters
- persistent widths (per platform)

### 6.2 database components

**`RecordTable`** (`src/features/records/components/record-table.tsx`):
- spreadsheet-style table
- inline editing
- column resizing
- sorting/filtering

**`KanbanView`** (`src/components/views/kanban-view.tsx`):
- drag-and-drop cards
- grouped by select field
- create inline

**`CalendarView`** (`src/components/views/calendar-view.tsx`):
- month/week/day views
- drag events to reschedule
- create by clicking date

**`GalleryView`** (`src/components/views/gallery-view.tsx`):
- masonry image grid
- lightbox preview
- caption overlay

### 6.3 media components

**`PdfViewer`** (`src/components/media/pdf-viewer.tsx`):
```typescript
interface PdfViewerProps {
  url: string;
  onClose?: () => void;
}
```

**`VideoPlayer`** (`src/components/media/video-player.tsx`):
```typescript
interface VideoPlayerProps {
  src: string;
  autoplay?: boolean;
  onEnded?: () => void;
}
```

**`AudioPlayer`** (`src/components/media/audio-player.tsx`):
```typescript
interface AudioPlayerProps {
  src: string;
  title?: string;
  artist?: string;
}
```

**`ImageEditor`** (`src/components/media/image-editor.tsx`):
```typescript
interface ImageEditorProps {
  src: string;
  onSave: (blob: Blob) => void;
  onCancel: () => void;
}
```

### 6.4 headmate components

**`HeadmateCard`** (`src/features/headmates/components/headmate-card.tsx`):
- displays member profile
- color-coded border
- pronouns, role, bio
- "front" button

**`FrontingSwitcher`** (`src/features/headmates/components/fronting-switcher.tsx`):
- dropdown to switch fronter
- logs to `front_history`
- broadcasts via socket.io

### 6.5 utility components

**`GlobalCommandPalette`** (`src/components/global-command-palette.tsx`):
- ctrl+k or ` (backtick) quick search
- ai-powered semantic search via `/api/oracle` endpoint
- intent parsing with qwen2.5:7b
- features:
  - **oracle mode**: llm parses search intent, extracts keywords, suggests collections
  - **direct answers**: if query is a question, shows ai-generated answer in gold card
  - **grouped results**: organizes by collection with custom labels (void archives, neural fragments, etc.)
  - **relevance scoring**: calculates match score based on keyword frequency + recency
  - **visual feedback**: 
    - `Zap` icon + "thinking..." when oracle is processing
    - gradient border on oracle answer card with pulsing sparkles
    - progress indicator during search
  - **collection labels**: custom names (captures → "void archives", notes → "neural fragments")
  - **fallback**: if oracle fails, performs basic keyword search
- navigate to collections
- execute commands (new note, etc.)
- sanctuary mode toggle
- lowercase aesthetic with glass effects

**`IconPickerDialog`** (`src/components/icon-picker-dialog.tsx`):
- emoji + lucide icon picker
- used for collection customization

**`QuickEditSheet`** (`src/components/quick-edit-sheet.tsx`):
- slide-out panel
- edit record without leaving page

---

## 7. automation and workflows

### 7.1 n8n workflow structure

**workflow format**: json export from n8n ui

**key workflows location**: `unified_pkm.json` (snapshot)

**common nodes**:
- **webhook trigger**: receives http requests
- **http request**: calls external apis
- **nocobase node**: crud operations on collections
- **function node**: javascript logic
- **if node**: conditional branching

### 7.2 capture workflow deep dive

**trigger**: `POST /webhook/harpoon-capture`

**payload**:
```json
{
  "url": "https://example.com/article",
  "content": "selected text or full page",
  "isLink": true
}
```

**flow**:
1. **webhook trigger** → receives payload
2. **if node** → check `isLink`
3. **exa.ai fetch** (if link):
   ```javascript
   {
     url: 'https://api.exa.ai/search',
     method: 'POST',
     body: {
       query: payload.url,
       numResults: 1,
       contents: { text: true }
     },
     headers: { 'X-API-Key': env.EXA_API_KEY }
   }
   ```
4. **ollama summarize**:
   ```javascript
   {
     url: 'http://localhost:11434/api/generate',
     method: 'POST',
     body: {
       model: 'qwen2.5:7b',
       prompt: `summarize this in lowercase:\n\n${content}`,
       stream: false
     }
   }
   ```
5. **nocobase create**:
   ```javascript
   {
     collection: 'captures',
     data: {
       url: payload.url,
       content: payload.content,
       summary: ollama.response,
       createdAt: new Date()
     }
   }
   ```
6. **broadcast** → `POST localhost:4100/api/broadcast`
   ```json
   {
     "event": "capture:new",
     "data": { "id": recordId, "title": url }
   }
   ```

### 7.3 minecraft integration workflow

**minecraft plugin** (spigot/paper):
- listens to chat events
- sends `POST /webhook/minecraft-chat`

**n8n webhook**:
```javascript
{
  trigger: 'webhook',
  path: '/webhook/minecraft-chat',
  method: 'POST'
}
```

**flow**:
1. receive `{ username, message }`
2. broadcast via socket.io
3. (optional) log to nocobase `minecraft_logs` collection

**frontend listener** (`src/main.tsx`):
```typescript
socket.on('minecraft:chat', (data) => {
  toast(`[minecraft] ${data.username}: ${data.message}`);
});
```

---

## 8. capture system

### 8.1 browser extension

**location**: `pkm-extension/`

**manifest v3**:
```json
{
  "manifest_version": 3,
  "name": "pkm capture",
  "permissions": ["activeTab", "contextMenus", "storage"],
  "background": { "service_worker": "background.js" },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"]
  }]
}
```

**files**:
- `background.js`: context menu registration, message handling
- `content.js`: page scraping, selection detection
- `popup.html/js`: extension popup ui
- `options.html/js`: settings (n8n webhook url, api key)

**context menu**:
```javascript
chrome.contextMenus.create({
  id: 'save-to-pkm',
  title: 'save to pkm',
  contexts: ['page', 'selection', 'link']
});
```

**capture logic**:
```javascript
// content.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'capture') {
    const selection = window.getSelection().toString();
    const url = window.location.href;
    const title = document.title;
    
    // send to n8n
    fetch(msg.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        content: selection || document.body.innerText.slice(0, 5000),
        isLink: !selection,
        title
      })
    });
  }
});
```

### 8.2 userscript

**location**: `pkm-capture.user.js`

**purpose**: lightweight alternative to extension (tampermonkey/violentmonkey)

**features**:
- floating "capture" button on all pages
- keyboard shortcut (ctrl+shift+s)
- sends to configured n8n webhook

**install**:
1. install tampermonkey/violentmonkey
2. load `pkm-capture.user.js`
3. configure webhook url in script

### 8.3 capture inbox

**page**: `/captures`

**ui**:
- list of captured items
- filters: all, unread, starred
- bulk actions: delete, tag, archive
- inline editing (title, tags, notes)

**actions**:
- **open original**: opens source url
- **view summary**: shows ai-generated tldr
- **edit**: full-screen editor
- **delete**: removes from inbox

---

## 9. design system

### 9.1 color palette

**primary**:
- `--primary`: #f6b012 (yellow/gold)
- `--primary-foreground`: #050505 (dark text on yellow)

**backgrounds**:
- `--background`: #050505 (deepest void)
- `--background-alt`: #050505 (canvas backgrounds)
- `--card`: #0a0a0a (elevated surfaces)

**borders**:
- `--border`: #1a1a1a (subtle dividers)
- `--border-strong`: #2a2a2a (prominent dividers)

**text**:
- `--foreground`: #ffffff (primary text)
- `--muted-foreground`: #888888 (secondary text)

**glass effect**:
```css
.glass {
  background: rgba(10, 10, 10, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

### 9.2 typography

**font family**: varela round (google fonts)

**sizes**:
- `text-xs`: 0.75rem (12px)
- `text-sm`: 0.875rem (14px)
- `text-base`: 1rem (16px)
- `text-lg`: 1.125rem (18px)
- `text-xl`: 1.25rem (20px)
- `text-2xl`: 1.5rem (24px)

**weights**:
- `font-normal`: 400 (body text)
- `font-medium`: 500 (emphasis)
- `font-bold`: 700 (headings)

**lowercase convention**:
- all ui text is lowercase
- applies to: buttons, labels, headings, toasts
- exceptions: user-generated content, code, urls

### 9.3 spacing scale

**tailwind defaults**:
- `p-1`: 0.25rem (4px)
- `p-2`: 0.5rem (8px)
- `p-3`: 0.75rem (12px)
- `p-4`: 1rem (16px)
- `p-6`: 1.5rem (24px)
- `p-8`: 2rem (32px)

**layout gaps**:
- cards: `gap-4` (16px)
- sections: `gap-6` (24px)
- pages: `gap-8` (32px)

### 9.4 component patterns

**card structure**:
```tsx
<Card className="bg-card border-border">
  <CardHeader className="bg-muted/20">
    <CardTitle className="text-sm font-bold lowercase">
      title
    </CardTitle>
  </CardHeader>
  <CardContent className="p-4">
    {/* content */}
  </CardContent>
</Card>
```

**button variants**:
- `default`: yellow background, dark text
- `secondary`: dark background, light text
- `ghost`: transparent, hover background
- `outline`: border only

**input styling**:
```css
.input {
  background: #0a0a0a;
  border: 1px solid #1a1a1a;
  color: #ffffff;
  font-family: 'Varela Round';
  text-transform: lowercase;
}
```

---

## 10. development patterns

### 10.1 code style

**naming conventions**:
- **components**: PascalCase (e.g., `DashboardGrid.tsx`)
- **hooks**: camelCase with `use` prefix (e.g., `useAppSetting.ts`)
- **utils**: camelCase (e.g., `formatDate.ts`)
- **constants**: SCREAMING_SNAKE_CASE (e.g., `API_BASE_URL`)

**file organization**:
- **colocation**: keep related files together
- **index exports**: use `index.ts` for public api
- **types**: separate `.types.ts` files for complex types

**imports**:
```typescript
// external dependencies
import React from 'react';
import { useQuery } from '@tanstack/react-query';

// internal absolute imports (via tsconfig paths)
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';

// relative imports (local files)
import { helper } from './helper';
```

### 10.2 state management

**when to use what**:

**localstorage** (via `useAppSetting`):
- ui preferences (theme, layout)
- non-critical app state
- offline-first data
- example: dashboard widget positions

**react-query** (server state):
- api data (collections, records)
- cached responses
- automatic refetching
- example: collection list

**zustand** (complex client state):
- shared state across components
- derived state with selectors
- middleware (persist, devtools)
- example: block engine

**context** (scoped state):
- auth state
- theme provider
- feature flags
- example: fronter context

### 10.3 api client patterns

**base client** (`src/lib/api-client.ts`):
```typescript
class NocoBaseClient {
  private baseUrl: string;
  private token: string | null;

  async request<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        ...options?.headers
      }
    });
    
    if (!response.ok) throw new Error(response.statusText);
    return response.json();
  }

  listRecords(collection: string, params?: any) {
    return this.request(`/api/${collection}:list`, { params });
  }

  createRecord(collection: string, data: any) {
    return this.request(`/api/${collection}:create`, {
      method: 'POST',
      data
    });
  }

  // ... etc
}
```

**usage in hooks**:
```typescript
export function useRecords(collectionName: string) {
  const { client } = useAuth();
  
  return useQuery({
    queryKey: ['records', collectionName],
    queryFn: () => client.listRecords(collectionName),
    enabled: !!collectionName
  });
}
```

### 10.4 error handling

**api errors**:
```typescript
try {
  await client.createRecord('captures', data);
  toast.success('saved!');
} catch (error) {
  console.error(error);
  toast.error('failed to save');
}
```

**boundary component**:
```typescript
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('uncaught error:', error, errorInfo);
    toast.error('something went wrong');
  }
  
  render() {
    return this.props.children;
  }
}
```

**toast patterns**:
- success: `toast.success('record created')`
- error: `toast.error('failed to load')`
- info: `toast.info('syncing...')`
- promise: `toast.promise(apiCall, { loading: '...', success: 'done!', error: 'failed' })`

### 10.5 performance optimization

**react-query caching**:
```typescript
useQuery({
  queryKey: ['collections'],
  queryFn: fetchCollections,
  staleTime: 5 * 60 * 1000,  // 5 minutes
  cacheTime: 10 * 60 * 1000   // 10 minutes
});
```

**debounced updates**:
```typescript
const debouncedSave = useMemo(
  () => debounce((value) => {
    saveToApi(value);
  }, 500),
  []
);
```

**lazy loading**:
```typescript
const CanvasPage = lazy(() => import('@/pages/canvas-page'));

<Suspense fallback={<div>loading...</div>}>
  <CanvasPage />
</Suspense>
```

**virtualization** (for long lists):
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 50
});
```

---

## 11. deployment and operations

### 11.1 docker compose setup

**file**: `docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: nocobase
      POSTGRES_USER: nocobase
      POSTGRES_PASSWORD: nocobase
    volumes:
      - postgres_data:/var/lib/postgresql/data

  nocobase:
    image: nocobase/nocobase:latest
    depends_on:
      - postgres
    environment:
      DB_DIALECT: postgres
      DB_HOST: postgres
      DB_DATABASE: nocobase
      DB_USER: nocobase
      DB_PASSWORD: nocobase
      API_BASE_URL: http://localhost:1337
    ports:
      - "1337:80"
    volumes:
      - nocobase_storage:/app/storage

  n8n:
    image: n8nio/n8n:latest
    depends_on:
      - postgres
      - redis
    environment:
      DB_TYPE: postgresdb
      DB_POSTGRESDB_HOST: postgres
      DB_POSTGRESDB_DATABASE: n8n
      DB_POSTGRESDB_USER: nocobase
      DB_POSTGRESDB_PASSWORD: nocobase
      N8N_BASIC_AUTH_ACTIVE: false
      WEBHOOK_URL: http://localhost:5678
    ports:
      - "5678:5678"
    volumes:
      - n8n_data:/home/node/.n8n

  redis:
    image: redis:7-alpine

volumes:
  postgres_data:
  nocobase_storage:
  n8n_data:
```

### 11.2 systemd services

**frontend service** (`pkm-frontend.service`):
```ini
[Unit]
Description=PKM Frontend (Vite Dev Server)
After=network.target

[Service]
Type=simple
User=house
WorkingDirectory=/home/house/pkm
ExecStart=/usr/bin/npm run dev -- --host --port 3000
Restart=always

[Install]
WantedBy=multi-user.target
```

**backend service** (`pkm-services.service`):
```ini
[Unit]
Description=PKM Backend (Express Server)
After=network.target

[Service]
Type=simple
User=house
WorkingDirectory=/home/house/pkm/backend
ExecStart=/usr/bin/node server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

**commands**:
```bash
sudo systemctl enable pkm-frontend
sudo systemctl enable pkm-services
sudo systemctl start pkm-frontend
sudo systemctl start pkm-services
sudo systemctl status pkm-frontend
```

### 11.3 production build

**frontend**:
```bash
cd /home/house/pkm
npm run build
# outputs to dist/

# serve with nginx or caddy
# or use: npm run preview
```

**backend**:
```bash
cd /home/house/pkm/backend
node server.js
# no build step (plain node.js)
```

**environment variables**:
```bash
# .env file
VITE_API_BASE_URL=http://localhost:1337
VITE_WS_URL=http://localhost:4100
VITE_OLLAMA_URL=http://localhost:11434
```

### 11.4 backup strategy

**nocobase data**:
```bash
# backup postgres
docker exec pkm-postgres-1 pg_dump -U nocobase nocobase > backup.sql

# restore
docker exec -i pkm-postgres-1 psql -U nocobase < backup.sql
```

**uploads**:
```bash
# backend uploads
tar -czf uploads-backup.tar.gz backend/uploads/

# nocobase storage (docker volume)
docker run --rm -v pkm_nocobase_storage:/data -v $(pwd):/backup \
  busybox tar -czf /backup/nocobase-storage.tar.gz /data
```

**settings**:
```bash
# export localStorage
# run in browser console:
const backup = {};
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  backup[key] = localStorage.getItem(key);
}
console.log(JSON.stringify(backup));
```

### 11.5 monitoring

**health checks**:
```bash
# frontend
curl http://localhost:3000

# backend
curl http://localhost:4100

# nocobase
curl http://localhost:1337/api/app:getLang

# n8n
curl http://localhost:5678/healthz

# ollama
curl http://localhost:11434/api/tags
```

**logs**:
```bash
# docker services
docker compose logs -f nocobase
docker compose logs -f n8n

# systemd services
journalctl -u pkm-frontend -f
journalctl -u pkm-services -f
```

---

## 12. troubleshooting guide

### 12.1 common issues

**frontend won't load**:
- check if vite dev server is running: `ps aux | grep vite`
- verify port 3000 is not in use: `lsof -i :3000`
- check browser console for errors
- clear browser cache and localstorage

**database connection failed**:
- verify nocobase is running: `docker ps | grep nocobase`
- check api token is set: inspect localstorage `nocobase_api_key`
- test api directly: `curl -H "Authorization: Bearer <token>" http://localhost:1337/api/app:getLang`

**captures not working**:
- verify n8n is running: `curl http://localhost:5678/healthz`
- check webhook url in extension options
- inspect n8n workflow execution logs (ui → executions)
- verify ollama is running: `curl http://localhost:11434/api/tags`

**socket.io not connecting**:
- check backend server logs: `journalctl -u pkm-services -f`
- verify port 4100 is accessible
- check cors settings in `backend/server.js`

**widgets not saving positions**:
- check browser localstorage quota
- verify `useAppSetting` hook is initialized
- inspect `dashboard_widgets_v2` key in localstorage

### 12.2 debugging techniques

**react devtools**:
- install react devtools browser extension
- inspect component props and state
- profile rendering performance

**network tab**:
- filter by `Fetch/XHR`
- check request/response payloads
- verify authorization headers

**console debugging**:
```typescript
// add temporary logs
console.log('[DEBUG] widget positions:', widgets);
console.log('[DEBUG] api response:', response);

// use debugger
debugger; // pauses execution
```

**react-query devtools**:
```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<ReactQueryDevtools initialIsOpen={false} />
```

### 12.3 performance profiling

**react profiler**:
```typescript
import { Profiler } from 'react';

<Profiler id="Dashboard" onRender={(id, phase, actualDuration) => {
  console.log(`${id} (${phase}) took ${actualDuration}ms`);
}}>
  <Dashboard />
</Profiler>
```

**lighthouse**:
- run in chrome devtools
- focus on: performance, accessibility
- target: >90 performance score

**bundle analysis**:
```bash
npm run build -- --mode analyze
# generates build stats
```

---

## appendix a: keyboard shortcuts

**global**:
- `ctrl+k` or `` ` `` (backtick): oracle command palette
- `ctrl+/`: toggle sidebar
- `ctrl+b`: toggle bottom nav (mobile)

**editor** (markdown/journal):
- `ctrl+b`: bold
- `ctrl+i`: italic
- `ctrl+shift+x`: strikethrough
- `ctrl+shift+c`: code block

**canvas**:
- `v`: select tool
- `d`: draw tool
- `t`: text tool
- `r`: rectangle
- `o`: ellipse

**dashboard**:
- `e`: toggle edit mode
- `p`: pencil tool
- `e`: eraser tool
- `l`: lasso tool
- `ctrl+z`: undo
- `ctrl+y`: redo

---

## appendix b: api reference

### nocobase rest api

**base url**: `http://localhost:1337/api`

**authentication**: `Authorization: Bearer <token>`

**endpoints**:

**collections**:
```
GET /collections:list
GET /collections:get?filterByTk=<name>
```

**records**:
```
GET /{collection}:list?page=1&pageSize=20&sort=-createdAt
POST /{collection}:create
POST /{collection}:update?filterByTk=<id>
POST /{collection}:destroy?filterByTk=<id>
GET /{collection}:get?filterByTk=<id>
```

**attachments**:
```
POST /attachments:create (multipart/form-data)
GET /attachments/<id>/file
```

### pkm backend api

**base url**: `http://localhost:4100/api`

**endpoints**:

**oracle (semantic search)**:
```http
POST /oracle
Content-Type: application/json

{
  "query": "what are house's pronouns?",
  "collections": ["headmates", "documents"],
  "context": "current page: /headmates\nfronting: alice, bob"
}
```

**response**:
```json
{
  "success": true,
  "intent": {
    "keywords": ["house", "pronouns", "identity"],
    "collections": ["headmates"],
    "filters": {
      "dateRange": null,
      "tags": [],
      "fieldFilters": {}
    },
    "isQuestion": true,
    "directAnswer": "house uses they/them pronouns"
  },
  "rawQuery": "what are house's pronouns?"
}
```

**broadcast**:
```http
POST /broadcast
X-API-Key: <shared-secret>
Content-Type: application/json

{
  "event": "minecraft:chat",
  "data": { "username": "player", "message": "hello" }
}
```

**upload background**:
```http
POST /upload-background
Content-Type: multipart/form-data

file: <image-file>
```

### ollama api

**base url**: `http://localhost:11434/api`

**endpoints**:

**generate**:
```http
POST /generate
Content-Type: application/json

{
  "model": "qwen2.5:7b",
  "prompt": "your prompt here",
  "stream": false,
  "format": "json",
  "options": {
    "temperature": 0.7,
    "top_p": 0.9
  }
}
```

**response**:
```json
{
  "model": "qwen2.5:7b",
  "created_at": "2024-01-01T00:00:00Z",
  "response": "generated text here",
  "done": true
}
```

---

## appendix c: file structure reference

```
pkm/
├── android/                    # capacitor android project
├── backend/                    # express server
│   ├── server.js
│   ├── uploads/                # user-uploaded files
│   └── package.json
├── electron/                   # electron wrapper (optional)
│   ├── main.js
│   └── preload.js
├── minecraft/                  # minecraft integration scripts
│   └── scripts/
├── pkm-extension/              # browser extension
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   ├── popup.html/js
│   └── options.html/js
├── plugins/                    # user plugins
├── public/                     # static assets
│   ├── sw.js                   # service worker
│   └── icons/
├── scripts/                    # build/deploy scripts
│   ├── auto-deploy.js
│   └── normalize-collections.js
├── server/                     # alternative server implementations
│   └── sync-server.js
├── src/                        # main react app (see detailed structure above)
├── tests/                      # unit/integration tests
│   ├── setup-test.ts
│   └── *.test.tsx
├── docker-compose.yml          # service orchestration
├── package.json                # npm dependencies
├── tsconfig.json               # typescript config
├── vite.config.ts              # vite bundler config
├── tailwind.config.js          # tailwind css config
├── README_FINAL.md             # production guide
├── ARCHITECTURE-REFACTOR.md    # refactor log
├── unified_pkm.json            # n8n workflow snapshot
└── pkm-capture.user.js         # userscript capture tool
```

---

## appendix d: third-party integrations

### exa.ai (web search)
- **purpose**: fetch full content from urls
- **api**: `https://api.exa.ai/search`
- **auth**: `X-API-Key` header
- **usage**: capture workflow (fetch linked articles)

### simply plural (headmate tracking)
- **api**: `https://api.apparyllis.com/v1/`
- **auth**: bearer token
- **usage**: sync fronting history (optional)

### minecraft server
- **plugin**: custom spigot/paper plugin
- **webhook**: sends chat events to n8n
- **status**: rcon or server query protocol

---

## appendix e: changelog

**v1.1 (the oracle update)** - february 11, 2026:
- ✅ ai-powered semantic search ("the oracle")
- ✅ `/api/oracle` backend endpoint with qwen2.5:7b integration
- ✅ intent parsing: keywords, collections, filters, direct answers
- ✅ upgraded global command palette with visual enhancements
- ✅ grouped search results with relevance scoring
- ✅ custom collection labels (void archives, neural fragments, etc.)
- ✅ fallback to basic search if oracle unavailable
- ✅ backtick (`) shortcut for quick access

**v1.0 (golden master)** - february 2026:
- ✅ production-ready architecture
- ✅ full nocobase integration
- ✅ 12 database view types
- ✅ infinite canvas with tldraw
- ✅ custom media players
- ✅ browser capture extension
- ✅ n8n automation workflows
- ✅ local llm (qwen2.5:7b)
- ✅ headmate/fronting support
- ✅ mobile-responsive ui

**planned for v1.2**:
- ⏳ native android app (capacitor)
- ⏳ obsidian bidirectional sync
- ⏳ vector embeddings for semantic search
- ⏳ collaborative editing (websocket sync)
- ⏳ plugin marketplace

---

## appendix f: glossary

**block**: atomic unit of content (text, image, database, etc.)  
**canvas**: infinite whiteboard for spatial thinking  
**capture**: web clipping with ai summarization  
**collection**: nocobase table/database  
**fronter**: currently active headmate/alter  
**glass & void**: design aesthetic (dark + translucent)  
**headmate**: member of a plural system  
**moodboard**: pinterest-style image grid  
**nocobase**: headless cms (like strapi/directus)  
**oracle**: ai-powered semantic search system using qwen2.5:7b  
**prism**: subdomain-based routing system  
**widget**: dashboard card (database, note, contact, etc.)  
**wilson**: ai assistant personality for chat and oracle responses  

---

## conclusion

this document captures the complete architectural, implementation, and operational knowledge of the pkm system as of february 2026. it is designed to maximize llm context awareness for code generation, debugging, and feature development.

**when modifying pkm**:
1. reference this document for architectural patterns
2. preserve lowercase convention and glass & void aesthetic
3. maintain backward compatibility with existing data
4. test across firefox (primary) and chrome
5. update this document when adding major features

**for llm assistants**:
- this is the canonical source of truth
- prioritize patterns defined here over external conventions
- when uncertain, ask for clarification rather than assuming
- all code should match the existing style and philosophy

## what pkm is in general
"pkm" is a personal knowledge management system built with a "glass & void" aesthetic. it is a self-hosted, offline-capable environment designed for individuals (including plural systems/headmates) to organize thoughts, media, databases, and creative work. it blends the database flexibility of notion, the link-based thinking of obsidian, and infinite canvas tools into one unified interface.

philosophically, pkm is designed to be:
- **yours**: fully self-hosted, no cloud dependency.
- **lowercase**: a calm, non-shouting interface using the "varela round" font.
- **omni-protocol**: integrates shopping, finance, gaming (minecraft), and journaling into one life dashboard.
- **identity-aware**: built-in support for plural systems (headmates), allowing different profiles to front and track activity.

## high-level architecture
the system runs as a collection of docker services orchestrated via systemd on linux (pop!_os).

- **frontend**: react 18 + typescript + vite. uses tailwind css for styling and shadcn/ui for components. runs on port 3000 (dev) / 3010 (prod).
- **backend**: node.js / express server (port 4100). handles file uploads, websocket broadcasts, and server-side logic.
- **database**: nocobase (running on port 1337 or 80 within docker network). serves as the headless cms and relational data engine.
- **automation**: n8n (port 5678). handles background workflows, webhooks, and ai pipelines.
- **ai**: local llms (ollama running qwen2.5:7b) via api.
- **deployment**: docker compose manages the containers (`nocobase`, `postgres`, `n8n`, `redis`). local systemd services manage the host-level frontend/backend processes.

## frontend application
the frontend is the primary interface, reachable via `http://houseofmates.space` (local dns).

### routing and subdomains (`the prism`)
the app uses a "prism" router that changes behavior based on the subdomain:
- `dupe.houseofmates.space`: shows the "dupemates" version (minecraft server dashboard).
- `blog.houseofmates.space`: renders the public blog view.
- `home.houseofmates.space`: renders the public home page.
- `pkm.houseofmates.space` (or root): the main authenticated pkm workspace.

### key pages
- **dashboard (home)**: a grid of draggable widgets (databases, notes, contacts).
- **databases**: browsing and managing nocobase collections.
- **canvas**: infinite drawing and note-taking surface.
- **moodboard**: visual infinite grid for images and media.
- **captures**: specialized inbox for web clips.
- **headmates**: interface for system members to log switches and manage profiles.
- **journal**: distraction-free writing mode.

### block-based engine
inspired by notion, content is structured as blocks (`src/lib/block-engine.ts`). page layouts support 1-4 columns with draggable gutters. supports text, headings, images, databases, and media embeds.

## backend and services
- **pkm-server (port 4100)**:
  - `POST /api/upload-background`: handles large file uploads (images/media) to local filesystem.
  - `POST /api/broadcast`: receives events from n8n (e.g., minecraft chat) and broadcasts via socket.io.
  - socket.io server: pushes real-time updates to connected clients (chat, status).
- **n8n server (port 5678)**:
  - runs automation flows.
  - connects external webhooks to internal socket broadcasts.

## data model and nocobase
nocobase provides the schema and data interactions.
- **collections**: analogous to tables. important ones:
  - `captures`: web clips and ai summaries.
  - `headmates`: profiles for system members.
  - `front_history`: log of who was fronting when.
  - `documents`: page content and metadata.
- **field types**: fully typed support for text, number, select, relation, attachment, and json fields.
- **unified_pkm.json**: a snapshot of n8n workflows (not strict schema, but operational config).

## automation and n8n workflows
automation bridges the gap between external inputs and the pkm database.
- **capture workflow**: receives data from browser extension → fetches content (exa.ai if link) → summarizes (qwen) → saves to nocobase.
- **minecraft bridge**: server plugin sends json payload → n8n webhook → pkm backend broadcast → frontend ui toast/log.

## browser capture extension
tools to save content from the web to pkm.
- **extension (`pkm-extension/`)**: firefox/chrome extension. adds context menu "save to pkm". sends page url and selection to n8n webhook.
- **userscript (`pkm-capture.user.js`)**: lightweight alternative. adds floating "capture" button to all webpages.
- **flow**:
  1. user triggers capture.
  2. payload `{ url, content, isLink }` sent to n8n webhook keys.
  3. n8n processes (fetch + summarize).
  4. result stored in `captures` collection.

## local llm and qwen integration
local intelligence powered by ollama.
- **model**: `qwen2.5:7b` (optimized for speed/quality balance).
- **usage**:
  - **summarization**: automatic "tldr" of web captures.
  - **search**: semantic search (planned/in-progress).
  - **wilson**: in-app chat assistant (if enabled).
- **philosophy**: ai output is lowercase to match system aesthetic.

## interactions with website editors
the pkm acts as a cms for public sites.
- **blog builder**: visual editor for `blog.houseofmates.space`. saves layout/content JSON to backend.
- **houseofmates builder**: editor for the main landing page `home.houseofmates.space`.
- **live preview**: changes are reflected immediately on the public subdomains.

## current capabilities
- **capture**: one-click web saving with auto-summary.
- **organize**: drag-and-drop dashboard, nested database views.
- **visualize**: infinite canvas, image editing (crop/draw), moodboards.
- **monitor**: real-time minecraft server status and chat.
- **identity**: track who is fronting and customize ui per-headmate.
- **media**: custom video/audio players and pdf viewer.

## limitations
- **mobile**: native android app is wip (capacitor), currently best on desktop web.
- **search**: full semantic search across all content is partial.
- **multi-user**: focused on single-tenant (single auth token) usage, though supports distinct identity profiles.

## planned features
- **obsidian sync**: bidirectional markdown sync.
- **screenshots**: ocr integration for image captures.
- **offline first**: improved pwa support for fully offline usage.
- **tauri**: dedicated desktop wrapper for tighter os integration.

## design philosophy
- **aesthetic**: "glass & void". dark backgrounds (`#050505`), transluscent panels, yellow (`#f6b012`) accents.
- **typography**: all text is **lowercase**. font family is **varela round**.
- **sanctuary mode**: hidden "konami code" trigger (`↑↑↓↓←→←→ba`) enables specific visual overrides (aurora background).

## how to use this document
- this file is the **master context**.
- when modifying code, verify against architectural patterns defined here.
- preserve the **lowercase** convention in logic and ui.
- updates to architecture should be reflected here.

## cloudflared tunnel management (for copilot/agents)

- The cloudflared tunnel is managed by systemd as `cloudflared.service` and is set to always restart on failure and at boot.
- To **pause the tunnel for edits or construction** (e.g., when changing config or updating the origin):

```bash
sudo systemctl stop cloudflared
```
- To **resume/restart** after edits:
```bash
sudo systemctl start cloudflared
```
- To **reload config** after editing `/etc/cloudflared/config.yml`:
```bash
sudo systemctl restart cloudflared
```
- To check status and logs:
```bash
sudo systemctl status cloudflared
sudo journalctl -u cloudflared -f
```
- The tunnel will auto-restart on boot and after most failures. If you need it to stay down, use `sudo systemctl disable --now cloudflared`.

## 14. offshoots & external integrations

this section documents the projects and integrations that live alongside `pkm` in the workspace, how they connect to pkm, where their glue code lives, and what to look at when extending or debugging cross-project flows.

### 14.1 discord-qwen-bot (discord integration)
- location: `../Documents/docker/discord-qwen-bot` (repository bundled alongside `pkm`).
- primary files:
  - `discord-qwen-bot/index.js` — main bot process, loads environment, connects to discord via `discord.js`.
  - `discord-qwen-bot/deploy-commands.js` — registers slash commands with the discord api.
  - `discord-qwen-bot/deploy-fixes.sh`, `start_bot.sh`, `run_housebot.sh` — convenience/start scripts.
  - `discord-qwen-bot/discord-qwen-bot.service` — example systemd unit included in repo.
- key libraries: `discord.js`, `dotenv`, `node-fetch` (see `discord-qwen-bot/package.json`).
- responsibilities and flows:
  - listens to events and commands from Discord and executes command handlers defined in `index.js` and `commands` codepaths.
  - can be extended to forward messages to pkm backend (socket/http) or to call ollama for AI responses.
  - `deploy-commands.js` ensures slash commands are registered and updated when new commands are added.
- runtime: the bot expects environment variables (token, guild id, optional ollama url); review `start_bot.sh` and `deploy-fixes.sh` before launching.

### 14.2 chestray-mod (minecraft mod bridge)
- location: `discord-qwen-bot/chestray-mod/`
  - `client/ChestrayClientMod.java`
  - `common/ChestrayConfig.java`
  - `common/ChestrayPackets.java`
  - `mixin/ChestContainerMixin.java`
  - `server/ChestrayServerHandler.java`
  - `server/ChestrayPermissions.java`
- purpose: a lightweight mod and protocol glue to expose minecraft server events (chat, inventory, permission checks) to off-server tooling.
- typical flow:
  1. the mod emits/serializes events (via `ChestrayPackets`) from server or client.
 2. a handler (`ChestrayServerHandler`) can POST or send websocket messages to an external receiver (n8n webhook or pkm backend) depending on server config in `ChestrayConfig`.
 3. n8n or pkm accepts the event and broadcasts it to connected clients via socket.io (see `backend/server.js` in `pkm`).
- notes: when changing packet formats update `ChestrayPackets.java` and corresponding parsing code in the receiver(s).

### 14.3 how minecraft ↔ discord flows normally connect
- common integration points:
  - minecraft plugin -> POST webhook -> n8n workflow `minecraft-chat-bridge` -> pkm `POST /api/broadcast` -> socket.io -> frontend toast/log
  - discord bot can subscribe to the same broadcasts (either by listening to pkm socket.io endpoints or by having n8n forward messages to the bot).
- files to inspect:
  - `pkm/backend/server.js` — socket.io and `/api/broadcast` bridge
  - `discord-qwen-bot/index.js` — does the bot connect to pkm directly or via webhook forwarding? check `index.js` for http/socket code.

### 14.4 nocobase (headless cms)
- core integration points:
  - `pkm` frontend uses `src/lib/api-client.ts` / `src/types/nocobase.ts` to talk to nocobase (api base `http://localhost:1337/api`).
  - environment setup and secrets: `setup-env.cjs`, `update-api-key.sh` help bootstrap credentials and local config.
  - n8n workflows (`unified_pkm.json`) write into nocobase collections like `captures`, `headmates`, `front_history`, `documents`.
- operational notes:
  - tokens/API keys are stored client-side in localStorage under `nocobase_api_key` for single-tenant setups.
  - when modifying nocobase collection shapes, update the frontend `src/types/nocobase.ts` and any consuming hooks (`useRecords`, `useCollections`).

### 14.5 simplyplural (headmate sync)
- integration locations:
  - `src/api/member-service.ts` (frontend) contains client code to interact with SimplyPlural or member-sync endpoints.
  - some automation flows may push fronting events to SimplyPlural-compatible endpoints; check `scripts/` and `unified_pkm.json` for references.
- purpose: optional external sync of headmate profiles and front_history; used when multi-host identity sync is needed.

### 14.6 twemoji & emoji rendering
- current codebase: there is no explicit `twemoji` dependency in `pkm/package.json` (checked feb 2026). emoji pickers/rendering are implemented via `IconPickerDialog` and lucide icons.
- recommendation / how it's used:
  - frontend uses `src/components/icon-picker-dialog.tsx` and `src/components/global-command-palette.tsx` for emoji/icon selection.
  - if consistent cross-platform emoji images are required, add `twemoji` (npm) and normalize rendered emoji by replacing unicode with `twemoji.parse(node)` in render paths (captures, chat logs, toasts).

### 14.7 website builders & offshoot editors
- blog and landing builders live inside the main frontend:
  - `src/features/blog-builder/` — blog editing UI and export routines
  - `src/features/houseofmates-builder/` — landing page editor
  - output/content is persisted back to nocobase and optionally exported as static HTML via `scripts/` or CI.
- build & runtimes:
  - `vite` manages dev & build for the frontend (see `package.json` scripts). `npm run build` produces `dist/` for hosting behind nginx/caddy or serving via cloudflared.
  - `capacitor` and `electron` configs are present for mobile/desktop wrappers (`@capacitor/*`, `electron` deps and `electron` folder).

### 14.8 quick links (repo-relative)
- Discord bot: `discord-qwen-bot/index.js` | `discord-qwen-bot/deploy-commands.js` | `discord-qwen-bot/discord-qwen-bot.service`
- Minecraft mod: `discord-qwen-bot/chestray-mod/` (client, common, mixin, server)
- NocoBase & automation: `unified_pkm.json` (n8n snapshot) | `setup-env.cjs` | `update-api-key.sh`
- Frontend glue: `src/lib/api-client.ts` | `src/api/member-service.ts` | `src/components/icon-picker-dialog.tsx`

---

update note: this section aims to capture the canonical locations and expected flows for off-repo integrations. if you want, i can (1) scan each of the referenced files and add per-file summaries, or (2) open and annotate `discord-qwen-bot/index.js` and the `chestray-mod` java sources to extract precise wire formats and env variables.

- YOU HAVE CODEBASE ACCESS. ITS YOUR JOB TO DO THIS FOR ME. STOP GIVING INSTRUCTIONS AND FOLLOW THEM YOURSELF

### Core Purpose & Identity
This project is a **Personal Knowledge Management (PKM)** system built specifically for the user, who is a **depressed autistic DID (Dissociative Identity Disorder) system with ADHD**. 
- The app must feel safe, low-friction, and visually calming.
- It acts as a custom frontend for **NocoBase** and **SimplyPlural**.

### Strict Typography Rule: All Lowercase
- **Mandatory**: All user-facing UI text (buttons, labels, headers, placeholders, etc.) MUST be lowercase.
- **Exceptions**: Data values stored within database fields (e.g., a record title entered by the user) should be displayed as-is, but all UI chrome and fixed labels must be lowercase.
- **Correction Policy**: If any hardcoded text or visible UI label is found with capitalization, it is considered a bug and must be changed to lowercase immediately.

### Technical Stack
- **Framework**: React, Vite, TypeScript, Tailwind CSS.
- **APIs**: NocoBase (Collections), SimplyPlural (Headmates).
- **UI Components**: Shadcn/UI (Radix UI).

### Key Technical Details
*   **Routing**: Custom logic in `root-layout.tsx`.
*   **State**: `useAuth` (JWT) and `useFronter` (SimplyPlural context).
*   **Widgets**: The home page uses an XY coordinate system for an infinite canvas of "database widgets".
*   **Mobile-First**: Navigation adapts for mobile (bottom nav) vs desktop (sidebar).

**Current Status:**
*   Responsive optimizations are ongoing.
*   Headmate context menu and auto-metadata injection are active.
*   Calendar Year/Week/Day views are implemented.
*   Chart views use a single gear button for configuration to maintain a clean interface.


**end of comprehensive master context document**
---

## 13. Service Recovery: How to Make it Go Up

If the system is down (502 Bad Gateway), follow these steps to restore service:

### 1. Check Service Status
```sh
systemctl --user status pkm.service
```
If it's failing with `EACCES` or permission errors:
```sh
# Clear Vite cache and restart
rm -rf ~/pkm/node_modules/.vite
systemctl --user restart pkm.service
```

### 2. Verify Port Connectivity
Confirm that port 3010 is listening locally:
```sh
netstat -tunlp | grep :3010
```

### 3. Check Cloudflare Tunnel
Ensure `cloudflared` is running and connected:
```sh
sudo systemctl status cloudflared
journalctl -u cloudflared -n 50 --no-pager
```

### 4. Full Restart (The "Nuclear" Option)
If all else fails, restart the entire stack:
```sh
sudo systemctl restart pkm-fullstack.service
```

### 5. Accessing through Subdomains
All subdomains (`houseofmates.space`, `pkm.houseofmates.space`, `blog.houseofmates.space`, `dupe.houseofmates.space`) route through port 3010. If 3010 is up locally, the tunnel will handle the external routing.
