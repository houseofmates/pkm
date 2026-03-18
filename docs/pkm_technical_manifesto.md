# pkm technical manifesto

## why pkm exists

pkm is a bespoke local-first life operating system built specifically for a level 2 autistic did system known as house of mates. off-the-shelf tools like notion and obsidian fail to handle plural complexity:

- notion's cloud dependency creates data sovereignty issues for systems with privacy needs
- obsidian lacks structured data and relational querying for headmate tracking
- both struggle with infinite canvas + relational database hybrid ui requirements
- neither support dockerized local deployment with web/mobile/desktop sync

pkm solves these with a unified canvas-database-workflow system.

## local-first philosophy

- **dockerized deployment**: single `docker-compose up` spins full stack (nocobase backend + react frontend + nginx)
- **data ownership**: all data stored in postgres via nocobase. no vendor lock-in.
- **high performance**: vite + react 19 + tailwind. debounced saves prevent database spam.
- **multi-platform**: web, android apk, electron/tauri desktop apps
- **pwa-ready**: works offline-first with sync on reconnect

## tech stack

```
frontend: react 19 + typescript + vite + tailwind css (varela round typography)
backend: nocobase (self-hosted notion-like db) + postgres
sync: custom websocket + git-based backup
deployment: docker-compose + nginx reverse proxy
mobile: capacitor (android apk)
desktop: electron/tauri
browser extension: web clipper (tampermonkey/userscript + firefox extension)
```

## debounced save logic

pkm implements intelligent debounced persistence across all widgets:

1. **local state**: react zustand stores hold widget data (position, content, config)
2. **debounce timer**: 500ms debounce on content changes. position changes immediate.
3. **batch api**: multiple widgets batch into single nocobase transaction
4. **optimistic ui**: visual feedback shows save state (powder blue pulse → dark gray)
5. **conflict resolution**: last-write-wins with websocket conflict notifications
6. **autosave indicators**: subtle #3c9fdd border pulse during debounce window

this prevents 100+ database writes per minute during active editing while maintaining responsive ui.

```mermaid
sequenceDiagram
    participant U as user
    participant W as widget
    participant S as zustand store
    participant D as debounce
    participant N as nocobase api
    
    U->>W: type content
    W->>S: update local state
    W->>D: schedule save
    Note over D: 500ms debounce
    D->>N: batch save
    N->>S: confirm saved
    S->>W: clear pending indicator
