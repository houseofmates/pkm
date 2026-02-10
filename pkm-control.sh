#!/bin/bash
# PKM Service Management Script
# Controls both frontend and backend services

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

show_status() {
    echo -e "${BLUE}=== PKM Services Status ===${NC}"
    echo ""
    echo -e "${YELLOW}Frontend (port 3010):${NC}"
    sudo systemctl status pkm-frontend --no-pager | head -3
    echo ""
    echo -e "${YELLOW}Backend (port 4100):${NC}"
    sudo systemctl status pkm-server --no-pager | head -3
    echo ""
    echo -e "${BLUE}=== Port Status ===${NC}"
    sudo lsof -i:3010 -i:4100 2>/dev/null || echo "No processes found"
}

start_all() {
    echo -e "${GREEN}Starting all PKM services...${NC}"
    sudo systemctl start pkm-frontend
    sudo systemctl start pkm-server
    sleep 2
    show_status
}

stop_all() {
    echo -e "${YELLOW}Stopping all PKM services...${NC}"
    sudo systemctl stop pkm-frontend
    sudo systemctl stop pkm-server
    sleep 1
    echo -e "${GREEN}Services stopped${NC}"
}

restart_all() {
    echo -e "${YELLOW}Restarting all PKM services...${NC}"
    sudo systemctl restart pkm-frontend
    sudo systemctl restart pkm-server
    sleep 2
    show_status
}

enable_boot() {
    echo -e "${GREEN}Enabling services to start on boot...${NC}"
    sudo systemctl enable pkm-frontend
    sudo systemctl enable pkm-server
    echo -e "${GREEN}Services will now start automatically on boot${NC}"
}

disable_boot() {
    echo -e "${YELLOW}Disabling services from starting on boot...${NC}"
    sudo systemctl disable pkm-frontend
    sudo systemctl disable pkm-server
    echo -e "${GREEN}Services will no longer start automatically on boot${NC}"
}

rebuild_frontend() {
    echo -e "${YELLOW}Rebuilding frontend...${NC}"
    cd /home/house/pkm
    npm run build
    echo -e "${GREEN}Restarting frontend service...${NC}"
    sudo systemctl restart pkm-frontend
    sleep 2
    show_status
}

logs_frontend() {
    echo -e "${BLUE}=== Frontend Logs (Ctrl+C to exit) ===${NC}"
    sudo journalctl -u pkm-frontend -f
}

logs_backend() {
    echo -e "${BLUE}=== Backend Logs (Ctrl+C to exit) ===${NC}"
    sudo journalctl -u pkm-server -f
}

test_backend() {
    echo -e "${BLUE}Testing backend API endpoint...${NC}"
    curl -X POST http://172.17.0.1:4100/api/broadcast \
        -H "x-api-key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGVOYW1lIjoicm9vdCIsImlhdCI6MTc3MDY2OTc4OCwiZXhwIjozMzMyODI2OTc4OH0.V9CJrXXKRi9-B-RYKpqRxZSXTm3w1aKLjv8nRMv96UE" \
        -H "Content-Type: application/json" \
        -d '{"type":"test","player":"system","message":"api-test","online":true,"count":0}' \
        && echo -e "\n${GREEN}Backend API is working!${NC}" \
        || echo -e "\n${RED}Backend API test failed!${NC}"
}

show_help() {
    echo -e "${BLUE}PKM Service Control${NC}"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  status          - Show status of all services"
    echo "  start           - Start all services"
    echo "  stop            - Stop all services"
    echo "  restart         - Restart all services"
    echo "  enable          - Enable services to start on boot"
    echo "  disable         - Disable services from starting on boot"
    echo "  rebuild         - Rebuild frontend and restart"
    echo "  logs-frontend   - Show frontend logs (live)"
    echo "  logs-backend    - Show backend logs (live)"
    echo "  test            - Test backend API endpoint"
    echo ""
    echo "Examples:"
    echo "  $0 status       # Check if services are running"
    echo "  $0 restart      # Restart both services"
    echo "  $0 rebuild      # Rebuild frontend after code changes"
}

case "$1" in
    status)
        show_status
        ;;
    start)
        start_all
        ;;
    stop)
        stop_all
        ;;
    restart)
        restart_all
        ;;
    enable)
        enable_boot
        ;;
    disable)
        disable_boot
        ;;
    rebuild)
        rebuild_frontend
        ;;
    logs-frontend)
        logs_frontend
        ;;
    logs-backend)
        logs_backend
        ;;
    test)
        test_backend
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        if [ -z "$1" ]; then
            show_status
        else
            echo -e "${RED}Unknown command: $1${NC}"
            echo ""
            show_help
            exit 1
        fi
        ;;
esac
