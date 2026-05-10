#!/bin/bash

# pkm service monitor
# ensures the pkm backend service remains healthy and responsive
# designed for zero-maintenance operation

set -euo pipefail

# Configuration
SERVICE_NAME="pkm-backend"
HEALTH_URL="http://localhost:4100/api/health"
LOG_FILE="/var/log/pkm-monitor.log"
MAX_RESTARTS=3
RESTART_WINDOW=300  # 5 minutes
CHECK_INTERVAL=30    # 30 seconds

# State tracking
RESTART_COUNT=0
LAST_RESTART_TIME=0

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Check if service is active
is_service_active() {
    systemctl is-active --quiet "$SERVICE_NAME"
}

# Check health endpoint
check_health() {
    local response
    local status_code
    
    response=$(curl -s -w "%{http_code}" -m 10 "$HEALTH_URL" 2>/dev/null || echo "000")
    status_code="${response: -3}"
    
    if [[ "$status_code" == "200" ]]; then
        return 0
    else
        log "Health check failed with status: $status_code"
        return 1
    fi
}

# Get service restart count in window
get_restart_count() {
    local now
    now=$(date +%s)
    
    # Count restarts in the last RESTART_WINDOW seconds
    local count
    count=$(journalctl -u "$SERVICE_NAME" --since "5 minutes ago" | grep -c "Started\|Restarting" || echo "0")
    echo "$count"
}

# Restart service with safety checks
restart_service() {
    local now
    now=$(date +%s)
    
    # Check if we're restarting too frequently
    if (( now - LAST_RESTART_TIME < RESTART_WINDOW )); then
        RESTART_COUNT=$((RESTART_COUNT + 1))
        
        if (( RESTART_COUNT >= MAX_RESTARTS )); then
            log "ERROR: Service restarted $RESTART_COUNT times in $RESTART_WINDOW seconds. Stopping automatic restarts."
            systemctl stop "$SERVICE_NAME"
            # Send alert (could be email, webhook, etc.)
            return 1
        fi
    else
        # Reset counter if window has passed
        RESTART_COUNT=1
        LAST_RESTART_TIME="$now"
    fi
    
    log "Restarting $SERVICE_NAME (attempt $RESTART_COUNT/$MAX_RESTARTS)"
    
    # Attempt graceful restart
    if systemctl restart "$SERVICE_NAME"; then
        # Wait a moment for service to start
        sleep 5
        
        # Verify it's actually running
        if is_service_active && check_health; then
            log "Service restarted successfully"
            return 0
        else
            log "ERROR: Service restart failed - service not healthy"
            return 1
        fi
    else
        log "ERROR: Failed to restart service"
        return 1
    fi
}

# Check disk space
check_disk_space() {
    local usage
    usage=$(df /home/house/pkm | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if (( usage > 90 )); then
        log "WARNING: Disk usage is ${usage}% - service may become unstable"
        # Could trigger cleanup here
    fi
}

# Check memory usage
check_memory() {
    local mem_usage
    mem_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    
    if (( mem_usage > 90 )); then
        log "WARNING: Memory usage is ${mem_usage}% - service may become unstable"
    fi
}

# Main monitoring loop
main() {
    log "PKM service monitor started"
    
    while true; do
        local service_ok=true
        
        # Check if service is active
        if ! is_service_active; then
            log "Service is not active - attempting to start"
            if systemctl start "$SERVICE_NAME"; then
                sleep 5
            else
                log "ERROR: Failed to start service"
                service_ok=false
            fi
        fi
        
        # Check health endpoint
        if ! check_health; then
            log "Health check failed - attempting restart"
            if ! restart_service; then
                service_ok=false
            fi
        fi
        
        # System resource checks
        check_disk_space
        check_memory
        
        # Log status
        if $service_ok; then
            log "Service status: OK"
        else
            log "Service status: DEGRADED"
        fi
        
        # Wait for next check
        sleep "$CHECK_INTERVAL"
    done
}

# Handle signals gracefully
cleanup() {
    log "PKM service monitor stopping"
    exit 0
}

trap cleanup SIGTERM SIGINT

# Start monitoring
main