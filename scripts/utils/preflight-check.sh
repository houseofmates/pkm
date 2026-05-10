#!/bin/bash
# pre-migration system check — quick validations before upgrades

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║        PKM Stack Pre-Migration System Check                    ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

PASS=0
FAIL=0
WARN=0

check() {
    if [ $? -eq 0 ]; then
        echo "  ✓ $1"
        ((PASS++))
    else
        echo "  ✗ $1"
        ((FAIL++))
    fi
}

warn() {
    echo "  ⚠ $1"
    ((WARN++))
}

# 1. Check if running as correct user
echo "[1] User & Permissions"
if [ "$USER" = "house" ]; then
    check "Running as house user"
else
    warn "Not running as house user (current: $USER)"
fi

# 2. Check if in correct directory
if [ "$PWD" = "/home/house/pkm" ]; then
    check "In /home/house/pkm directory"
else
    warn "Not in /home/house/pkm (current: $PWD)"
fi
echo ""

# 3. Check required files exist
echo "[2] Required Files"
[ -f "/home/house/pkm/packages/backend/server.js" ]
check "packages/backend/server.js exists"

[ -f "/home/house/pkm/src/api/nocobase-client.ts" ]
check "src/api/nocobase-client.ts exists"

[ -f "/home/house/pkm/package.json" ]
check "package.json exists"
echo ""

# 4. Check services status
echo "[3] Service Status"
if curl -s http://localhost:4100/api/status >/dev/null 2>&1; then
    check "Backend responding on :4100"
else
    warn "Backend not responding (will start during migration)"
fi

if curl -s http://localhost:3010 >/dev/null 2>&1; then
    check "Frontend responding on :3010"
else
    warn "Frontend not responding"
fi

if curl -s http://localhost:5678/healthz >/dev/null 2>&1; then
    check "n8n responding on :5678"
else
    echo "  ✗ n8n not responding (CRITICAL)"
    ((FAIL++))
fi
echo ""

# 5. Check dependencies
echo "[4] Dependencies"
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node -v)
    check "Node.js installed ($NODE_VERSION)"
else
    echo "  ✗ Node.js not found (CRITICAL)"
    ((FAIL++))
fi

if command -v npm >/dev/null 2>&1; then
    NPM_VERSION=$(npm -v)
    check "npm installed ($NPM_VERSION)"
else
    echo "  ✗ npm not found (CRITICAL)"
    ((FAIL++))
fi

if command -v docker >/dev/null 2>&1; then
    check "Docker installed"
else
    echo "  ✗ Docker not found (CRITICAL)"
    ((FAIL++))
fi

if command -v jq >/dev/null 2>&1; then
    check "jq installed"
else
    warn "jq not installed (optional, for testing)"
fi
echo ""

# 6. Check disk space
echo "[5] Disk Space"
DISK_AVAIL=$(df -h /home/house/pkm | awk 'NR==2 {print $4}')
DISK_AVAIL_MB=$(df -m /home/house/pkm | awk 'NR==2 {print $4}')
if [ "$DISK_AVAIL_MB" -gt 100 ]; then
    check "Sufficient disk space ($DISK_AVAIL available)"
else
    warn "Low disk space ($DISK_AVAIL available, recommend >100MB)"
fi
echo ""

# 7. Check write permissions
echo "[6] Write Permissions"
if [ -w "/home/house/pkm" ]; then
    check "Can write to /home/house/pkm"
else
    echo "  ✗ Cannot write to /home/house/pkm (CRITICAL)"
    ((FAIL++))
fi

if [ -d "/home/house/pkm/public" ]; then
    if [ -w "/home/house/pkm/public" ]; then
        check "public/ directory exists and writable"
    else
        warn "public/ exists but not writable"
    fi
else
    check "public/ will be created during migration"
fi
echo ""

# 8. Check if files will be backed up
echo "[7] Backups"
if [ -f "/home/house/pkm/server-data.json.backup" ]; then
    check "server-data.json.backup exists"
else
    warn "No server-data.json.backup found"
fi

if git -C /home/house/pkm status >/dev/null 2>&1; then
    check "Git repository detected (can rollback)"
else
    warn "Not a git repo (manual backup recommended)"
fi
echo ""

# 9. Check current workflow status
echo "[8] n8n Workflows"
if curl -s http://localhost:5678/healthz >/dev/null 2>&1; then
    echo "  ℹ Check manually in n8n UI:"
    echo "    - Are workflows active?"
    echo "    - Any execution errors?"
else
    warn "Cannot check n8n status (service not running)"
fi
echo ""

# Summary
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                        RESULTS                                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "  Passed:   $PASS"
echo "  Warnings: $WARN"
echo "  Failed:   $FAIL"
echo ""

if [ $FAIL -eq 0 ]; then
    echo "✅ System is ready for migration!"
    echo ""
    echo "Next steps:"
    echo "  1. Review warnings above (if any)"
    echo "  2. Backup server-data.json manually (optional)"
    echo "  3. Run: sudo ./migrate-stack.sh"
    exit 0
else
    echo "❌ Critical issues detected - fix before migrating"
    echo ""
    echo "Required actions:"
    [ $FAIL -gt 0 ] && echo "  - Fix failed checks marked with ✗"
    echo "  - Ensure all services are installed"
    echo "  - Check permissions"
    exit 1
fi
