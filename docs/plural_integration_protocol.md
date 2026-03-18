# plural integration protocol

## house of mates

house of mates is a level 2 autistic did system with multiple headmates (system members). pkm manages:

```
headmate profiles: avatar, pronouns, bio, roles, access levels
fronting: who is currently \"fronting\" (controlling the body)
co-fronting: multiple headmates active simultaneously
fronting history: timeline of who was fronting when
```

## simplyplural integration

pkm syncs bidirectionally with simplyplural api:

```
pull: fetch member list, fronting log, profile changes
push: update simplyplural when pkm fronting logged
webhook: real-time sync when simplyplural fronting changes
auth: oauth2 token stored in nocobase user settings
```

**sync frequency**: 30s poll + instant webhook pushes.

## fronting log

real-time fronting tracking widget:

```
input: manual log + simplyplural sync + optional system voice detect
ui: timeline slider + stacked bar chart
timeline: scrollable history (\"who fronted on dec 15\")
resolution: 15min blocks
color: headmate avatars as #3c9fdd powder blue bars
```

**stacked bar chart example**:
```
mon: 60% alice(#yellow) 30% bob(#blue) 10% co-front
tue: 80% bob 15% charlie 5% idle
```

## individual profiles

each headmate has nocobase collection record:

```
fields:
  - name: string (display name)
  - avatar: image url 
  - pronouns: string (\"she/they\")
  - bio: markdown
  - roles: array (\"frontend\", \"finances\", \"social\")
  - color: hex (#050505 yellow default)
  - access_level: enum (\"full\", \"read\", \"widget_editor\")
```

**ui management**:
- profile widget: clickable avatar grid
- edit modal: simplyplural-synced form
- permissions: role-based widget access

```mermaid
sequenceDiagram
    participant SP as simplyplural
    participant PKM as pkm db
    participant UI as canvas ui
    
    SP->>PKM: fronting update webhook
    PKM->>UI: websocket update
    UI->>PKM: manual log
    PKM->>SP: sync push
