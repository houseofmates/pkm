#!/bin/bash
# install-bidirectional-sync.sh
# one-command installation for 24/7 bidirectional git sync
# this enables automatic sync between local filesystem and github
# including support for jules/pr workflows

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

REPO_DIR="/home/house/pkm"
SERVICE_NAME="bidirectional-git-sync.service"
SERVICE_SRC="$REPO_DIR/scripts/$SERVICE_NAME"
SERVICE_DEST="/etc/systemd/system/$SERVICE_NAME"

log() {
    echo -e "${BLUE}[install]${NC} $1"
}

success() {
    echo -e "${GREEN}[success]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[warn]${NC} $1"
}

error() {
    echo -e "${RED}[error]${NC} $1"
}

# check if running as root for systemctl operations
check_root() {
    if [ "$EUID" -ne 0 ]; then 
        error "this script needs sudo for systemctl operations"
        echo "run: sudo $0"
        exit 1
    fi
}

# validate git repo
validate_repo() {
    log "validating git repository..."
    if [ ! -d "$REPO_DIR/.git" ]; then
        error "no git repository found at $REPO_DIR"
        exit 1
    fi
    
    cd "$REPO_DIR"
    
    # check remote exists
    if ! git remote -v > /dev/null 2>&1; then
        error "no git remote configured"
        exit 1
    fi
    
    success "git repository validated"
}

# setup git identity for auto-commits
setup_git_identity() {
    log "configuring git identity for auto-sync..."
    
    # set global git identity (if not already set)
    sudo -u house git config --global user.email "sync@houseofmates.space" 2>/dev/null || true
    sudo -u house git config --global user.name "pkm-sync" 2>/dev/null || true
    
    success "git identity configured"
}

# check for github token
check_auth() {
    log "checking authentication..."
    
    if [ -f "$REPO_DIR/.github_token" ]; then
        success "github token found (.github_token)"
    else
        warn "no .github_token file found"
        echo "      if you need authenticated pushes, create this file with your token"
    fi
    
    # test git fetch (should work with ssh or credential helper)
    cd "$REPO_DIR"
    if sudo -u house timeout 10 git fetch origin --dry-run 2>/dev/null; then
        success "git fetch works (authenticated)"
    else
        warn "git fetch test failed - you may need to setup credentials"
        echo "      options:"
        echo "      1. add ssh key: ssh-keygen + add to github"
        echo "      2. use .github_token file with personal access token"
        echo "      3. configure git credential helper"
    fi
}

# install systemd service
install_service() {
    log "installing systemd service..."
    
    if [ ! -f "$SERVICE_SRC" ]; then
        error "service file not found: $SERVICE_SRC"
        exit 1
    fi
    
    # copy service file
    cp "$SERVICE_SRC" "$SERVICE_DEST"
    
    # reload systemd
    systemctl daemon-reload
    
    success "service installed to $SERVICE_DEST"
}

# enable and start service
start_service() {
    log "enabling service (auto-start on boot)..."
    systemctl enable "$SERVICE_NAME"
    
    log "starting service..."
    systemctl start "$SERVICE_NAME"
    
    sleep 2
    
    # check status
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        success "service is running!"
    else
        error "service failed to start"
        echo "check logs: sudo journalctl -u $SERVICE_NAME -n 50"
        exit 1
    fi
}

# print usage instructions
print_instructions() {
    echo ""
    echo -e "${GREEN}=== bidirectional git sync installed ===${NC}"
    echo ""
    echo "the service will now:"
    echo "  • watch local filesystem and auto-push changes to github"
    echo "  • poll github every 30s and auto-pull changes (jules/pr support)"
    echo "  • persist across reboots (enabled on boot)"
    echo ""
    echo "management commands:"
    echo "  sudo systemctl status $SERVICE_NAME  - check status"
    echo "  sudo systemctl stop $SERVICE_NAME    - stop sync"
    echo "  sudo systemctl start $SERVICE_NAME   - start sync"
    echo "  sudo systemctl restart $SERVICE_NAME - restart sync"
    echo "  sudo journalctl -u $SERVICE_NAME -f  - view live logs"
    echo ""
    echo "or use pkm-control.sh:"
    echo "  ./pkm-control.sh sync-status"
    echo "  ./pkm-control.sh sync-logs"
    echo ""
    echo "conflict resolution:"
    echo "  if a .sync-conflict file appears in $REPO_DIR,"
    echo "  manual git intervention is needed"
    echo ""
    echo "documentation:"
    echo "  see PKM_COMPREHENSIVE_MASTER_CONTEXT.md section 15"
    echo ""
}

# main
main() {
    echo -e "${BLUE}=== bidirectional git sync installer ===${NC}"
    echo ""
    
    check_root
    validate_repo
    setup_git_identity
    check_auth
    install_service
    start_service
    print_instructions
}

main "$@"
