#!/bin/bash
# PKM Service Management Script
# Controls the PKM dev server (user-level) and boot service

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

show_status() {
    echo -e "${BLUE}=== PKM Services Status (User Level) ===${NC}"
    systemctl --user status pkm.service --no-pager | head -n 3
    echo ""
    echo -e "${BLUE}=== PKM Boot Service Status (System Level) ===${NC}"
    sudo systemctl status pkm-boot.service --no-pager | head -n 3
    echo ""
    echo -e "${BLUE}=== Port Status ===${NC}"
    sudo lsof -i:3010 -i:4100 2>/dev/null || echo "No processes found on ports 3010/4100"
}

start_pkm() {
    echo -e "${GREEN}Starting PKM via boot service...${NC}"
    sudo systemctl start pkm-boot.service
    sleep 2
    show_status
}

stop_pkm() {
    echo -e "${YELLOW}Stopping PKM via boot service...${NC}"
    sudo systemctl stop pkm-boot.service
    echo -e "${GREEN}Services stopped${NC}"
}

restart_pkm() {
    echo -e "${YELLOW}Restarting PKM...${NC}"
    sudo systemctl restart pkm-boot.service
    sleep 2
    show_status
}

rebuild_all() {
    echo -e "${YELLOW}Rebuilding frontend...${NC}"
    npm run build
    echo -e "${GREEN}Restarting services...${NC}"
    restart_pkm
}

view_logs() {
    echo -e "${BLUE}=== PKM Logs (Ctrl+C to exit) ===${NC}"
    journalctl --user -u pkm.service -f
}

test_api() {
    echo -e "${BLUE}Testing backend API endpoint...${NC}"
    # Using local IP as the service might be binding there
    API_KEY="$API_KEY"
    curl -X POST http://127.0.0.1:4100/api/broadcast \
        -H "x-api-key: $API_KEY" \
        -H "Content-Type: application/json" \
        -d '{"type":"test","message":"ping"}' \
        && echo -e "\n${GREEN}API is reachable!${NC}" \
        || echo -e "\n${RED}API test failed!${NC}"
}

show_sync_status() {
    echo -e "${BLUE}=== Bidirectional Git Sync Status ===${NC}"
    sudo systemctl status bidirectional-git-sync.service --no-pager | head -n 5
    echo ""
    if [ -f "/home/house/pkm/.sync-conflict" ]; then
        echo -e "${RED}⚠️  SYNC CONFLICT DETECTED${NC}"
        cat "/home/house/pkm/.sync-conflict"
    fi
}

start_sync() {
    echo -e "${GREEN}Starting bidirectional git sync...${NC}"
    sudo systemctl start bidirectional-git-sync.service
    sleep 1
    show_sync_status
}

stop_sync() {
    echo -e "${YELLOW}Stopping bidirectional git sync...${NC}"
    sudo systemctl stop bidirectional-git-sync.service
    echo -e "${GREEN}Sync service stopped${NC}"
}

view_sync_logs() {
    echo -e "${BLUE}=== Git Sync Logs (Ctrl+C to exit) ===${NC}"
    sudo journalctl -u bidirectional-git-sync.service -f
}

show_help() {
    echo -e "${BLUE}PKM Multi-Service Control${NC}"
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  status       - Show status of user and system services"
    echo "  start        - Start PKM via pkm-boot.service"
    echo "  stop         - Stop PKM via pkm-boot.service"
    echo "  restart      - Restart everything"
    echo "  rebuild      - Run npm build and restart"
    echo "  logs         - Show live logs for pkm.service"
    echo "  test         - Test backend API"
    echo ""
    echo "Git Sync Commands:"
    echo "  sync-status  - Show bidirectional sync status"
    echo "  sync-start   - Start git sync service"
    echo "  sync-stop    - Stop git sync service"
    echo "  sync-logs    - Show git sync logs"
}

case "$1" in
    status) show_status ;;
    start) start_pkm ;;
    stop) stop_pkm ;;
    restart) restart_pkm ;;
    rebuild) rebuild_all ;;
    logs) view_logs ;;
    test) test_api ;;
    sync-status) show_sync_status ;;
    sync-start) start_sync ;;
    sync-stop) stop_sync ;;
    sync-logs) view_sync_logs ;;
    *) show_help ;;
esac
