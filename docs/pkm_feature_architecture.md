# pkm feature architecture

## the canvas

pkm's core ui is an **infinite, edgeless whiteboard** using xy coordinate positioning:

- **html canvas overlay**: handles panning/zooming (react-konva)
- **absolute positioning**: every widget has `{x, y, width, height}` stored in nocobase
- **collision detection**: drag-drop prevents overlap
- **infinite scroll**: viewport-based rendering (60fps smooth pan/zoom)
- **snap-to-grid**: optional 32px grid alignment

widgets persist positions across sessions/devices.

## database views

nocobase collections rendered as canvas widgets with multiple view modes:

```
kanban: drag-drop cards between swimlanes (status: todo→doing→done)
gallery: masonry grid with image-first cards  
calendar: drag-drop events (fullcalendar integration)
gantt: timeline dependencies (bryntum gantt widget)
table: editable spreadsheet view
```

**view switching**: dropdown per widget. data filtering via nocobase sql queries.

## button blocks

custom navigation buttons for public site (houseofmates.space):

- **macro buttons**: single-click workflows (\"new journal\", \"fronting log\", \"goldpile\")
- **social links**: discord, simplyplural, github
- **view toggles**: canvas ↔ kanban ↔ public garden
- **dynamic icons**: #050505 yellow accent on #3c9fdd powder blue

buttons are draggable canvas widgets with nocobase-stored `{position, label, action, icon}`.

## public site (houseofmates.space)

the public digital garden replaces the old \"void\" state:

```
removed: empty landing page spinner
added:   live canvas preview + kanban boards + fronting history graphs
audience: visitors see curated public widgets only
private: full editing canvas behind auth wall
```

**public/private toggle**: widgets tagged `is_public: true` render on both canvases.

```mermaid
graph LR
    A[private canvas] --> B{is_public?}
    B -->|yes| C[public garden]
    B -->|no| D[hidden]
    C --> E[houseofmates.space]
