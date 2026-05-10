# user manual and workflows

## sanctuary mode

**trigger**: konami code (↑↑↓↓←→←→ba) on login screen

purpose: emergency access for any headmate during distress/shutdown

```
features:
  - simplified ui (no canvas pan/zoom)
  - read-only widgets only  
  - large typography (varela round 24px+)
  - breathing animation (#3c9fdd pulse)
  - emergency contacts widget
  - 1-click \"hide all\" button
```

persists 24h or manual exit.

## the harpoon (web clipper)

universal browser extension to capture any webpage to pkm:

```
1. click harpoon icon on any webpage  
2. auto-extract: title, url, favicon, page screenshot
3. optional: structured data for amazon/steam (title, price, image)
4. canvas placement: drag to position  
5. auto-save: nocobase \"capture\" collection
6. optional price tracking: daily scrape for ecommerce links
```

works on any site - articles, social posts, documentation, products.

## the vault (finance)

personal finance dashboard widget:

```
goldpile visualization:
  - liquid assets: checking + cash (#050505 yellow bars)
  - investments: stocks, crypto (powder blue)
  - subscriptions: monthly decay tracking
  
subscription decay:
  - netflix $15 → visual bar shrinks over time  
  - spotify family $20 → alerts at renewal
  - auto-categorize: regex matching (\"amazon prime\", \"hulu\")
```

**data sources**: plaid api + manual csv import.

## wilsonchat (local llm)

james wilson from house md styled conversational body-double for autistic inertia (host is greg house introject):

```
purpose: conversational support for task initiation  
text model: qwen2.5-coder:7b-instruct-q4_K_S (ollama)
vision model: moondream:v2 
vision workflow: moondream describes user-uploaded image → qwen processes description as \"user sent this image with prompt\"
personality: encouraging, concrete, step-by-step  
canvas widget: draggable chat window

sample workflow:
  user: \"i need to do dishes but inertia\"
  wilson: \"ok. step 1: stand up from chair. step 2: walk 5 steps to sink...\"
```

**voice mode**: elevenlabs api for audio responses.

## daily workflows

```
morning: fronting log → kanban daily standup
afternoon: harpoon captures → vault price tracking  
evening: journal → simplyplural sync
weekly: goldpile review → subscription audit
```

all workflows savable as macro buttons.

```mermaid
flowchart TD
    A[sanctuary mode] --> B[harpoon capture]
    B --> C[vault finance] 
    C --> D[wilsonchat]
    D --> E[fronting log]
