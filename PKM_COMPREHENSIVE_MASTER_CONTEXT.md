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

**canvas**: infinite whiteboard for spatial thinking  
**capture**: web clipping with ai summarization  
**collection**: nocobase table/database  
**fronter**: currently active headmate/alter  
**simple & void**: design aesthetic (dark + modern/opaque)  
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
2. preserve lowercase convention and simple void aesthetic
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
- **mine**: fully self-hosted, no cloud dependency.
- **lowercase**: a calm, non-basic yet simple interface using the "varela round" font.
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
