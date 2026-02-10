# PKM (v1.0 Golden Master)

**Production-Ready Personal Knowledge Management System**

> "The reality distortion field is active."

This is the production deployment guide for PKM, combining the "Glass & Void" frontend with a NocoBase backend.

## 1. Quick Start (Pop!_OS / Linux)

Prerequisites: Docker & Docker Compose.

```bash
# 1. Clone/navigate to directory
cd /path/to/pkm

# 2. Spin up the stack
docker compose up -d

# 3. Wait for NocoBase initialization (~30s)
# 4. Access the void:
# Frontend: http://localhost:3000
# Backend: http://localhost:1337
```

## 2. Configuration & Subdomains

To truly activate **The Prism** (Phase 5), you need to route subdomains (`aphrodite.houseofmates.space`) to this container.

### Cloudflared Tunnel (Recommended)
If using Cloudflare Tunnels, map both services:

```yaml
ingress:
  - hostname: houseofmates.space
    service: http://localhost:3000
  - hostname: *.houseofmates.space
    service: http://localhost:3000  # The Prism handles routing internally via Window.location
  - hostname: api.houseofmates.space
    service: http://localhost:1337
  - service: http_status:404
```

### Nginx Reverse Proxy (Alternative)
```nginx
server {
    server_name .houseofmates.space;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
    }
}
```

## 3. The Omni-Protocols

### The Konami Code (Sanctuary Mode)
Trigger the hidden "Sanctuary Mode" (Aurora Background, UI Fade) by entering:
**↑ ↑ ↓ ↓ ← → ← → B A**

Press **ESC** to return to reality.

### The Harpoon (Web Clipper)
- **Shopping**: Paste Amazon/Steam links directly onto the canvas.
- **Result**: Creates a "Desire Bubble" or "Inventory Card".
- **Fallback**: If metadata fails, a Void Glyph is rendered.

### The Vault (Finance)
- **Legacy**: `GoldPile` visualization limited to 50 particles for performance.
- **Vampire Drain**: Tag any record with `sub` to visualize subscription decay.

---
*System Status: GOLDEN*
*Timestamp: 2026-01-21*
