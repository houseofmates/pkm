#!/bin/bash

# nocobase setup validation script
# ensures all required collections, fields, and configurations are properly set up
# designed for zero-maintenance operation

set -euo pipefail

# Configuration
NOCOBASE_URL="${VITE_NOCOBASE_URL:-https://db.houseofmates.space/api}"
API_TOKEN="${VITE_NOCOBASE_API_TOKEN:-}"
LOG_FILE="/var/log/nocobase-validation.log"

# Required collections and their required fields
declare -A REQUIRED_COLLECTIONS=(
    ["notes"]="title,content,ai,tags,created_at,updated_at"
    ["tasks"]="title,status,priority,content,ai,tags,created_at,updated_at"
    ["projects"]="title,description,status,ai,tags,created_at,updated_at"
    ["journal_entries"]="title,content,ai,mood,tags,created_at,updated_at"
    ["canvas_drawings"]="title,content,ai,drawing_id,tags,created_at,updated_at"
    ["front_history"]="sp_id,member_id,starttime,endtime,customstatus,live,tags,created_at,updated_at"
)

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# API helper functions
api_request() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    
    local curl_cmd="curl -s -w '%{http_code}' -X $method"
    
    if [[ -n "$API_TOKEN" ]]; then
        curl_cmd="$curl_cmd -H 'Authorization: Bearer $API_TOKEN'"
    fi
    
    curl_cmd="$curl_cmd -H 'Content-Type: application/json'"
    
    if [[ -n "$data" ]]; then
        curl_cmd="$curl_cmd -d '$data'"
    fi
    
    curl_cmd="$curl_cmd --connect-timeout 10 --max-time 30 '$NOCOBASE_URL$endpoint'"
    
    local response
    response=$(eval "$curl_cmd")
    local status_code="${response: -3}"
    local body="${response%???}"
    
    echo "$status_code:$body"
}

# Test connectivity
test_connectivity() {
    log "Testing NocoBase connectivity..."
    
    local response
    response=$(api_request "GET" "/app/info" "")
    
    local status_code="${response%%:*}"
    local body="${response#*:}"
    
    if [[ "$status_code" == "200" ]]; then
        log "✓ NocoBase is accessible"
        
        # Extract version if available
        local version
        version=$(echo "$body" | grep -o '"version":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
        log "  Version: $version"
        return 0
    else
        log "✗ NocoBase connectivity failed (HTTP $status_code)"
        return 1
    fi
}

# Test authentication
test_authentication() {
    log "Testing API authentication..."
    
    if [[ -z "$API_TOKEN" ]]; then
        log "✗ No API token provided"
        return 1
    fi
    
    local response
    response=$(api_request "GET" "/users/me" "")
    
    local status_code="${response%%:*}"
    
    if [[ "$status_code" == "200" ]]; then
        log "✓ API authentication successful"
        return 0
    else
        log "✗ API authentication failed (HTTP $status_code)"
        return 1
    fi
}

# Check collections exist
check_collections() {
    log "Checking required collections..."
    
    local response
    response=$(api_request "GET" "/collections:list" "")
    
    local status_code="${response%%:*}"
    local body="${response#*:}"
    
    if [[ "$status_code" != "200" ]]; then
        log "✗ Failed to fetch collections (HTTP $status_code)"
        return 1
    fi
    
    local available_collections
    available_collections=$(echo "$body" | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | tr '\n' ' ')
    
    local missing_collections=()
    local all_valid=true
    
    for collection in "${!REQUIRED_COLLECTIONS[@]}"; do
        if [[ " $available_collections " =~ " $collection " ]]; then
            log "✓ Collection '$collection' exists"
        else
            log "✗ Collection '$collection' missing"
            missing_collections+=("$collection")
            all_valid=false
        fi
    done
    
    if [[ ${#missing_collections[@]} -gt 0 ]]; then
        log "Missing collections: ${missing_collections[*]}"
        log "To create missing collections, use the NocoBase admin interface or API"
    fi
    
    return $([[ "$all_valid" == true ]] && echo 0 || echo 1)
}

# Check collection fields
check_fields() {
    log "Checking collection fields..."
    
    local all_valid=true
    
    for collection in "${!REQUIRED_COLLECTIONS[@]}"; do
        local required_fields="${REQUIRED_COLLECTIONS[$collection]}"
        
        log "  Checking fields for '$collection'..."
        
        local response
        response=$(api_request "GET" "/collections:$collection" "")
        
        local status_code="${response%%:*}"
        local body="${response#*:}"
        
        if [[ "$status_code" != "200" ]]; then
            log "    ✗ Failed to get collection details (HTTP $status_code)"
            all_valid=false
            continue
        fi
        
        local available_fields
        available_fields=$(echo "$body" | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | tr '\n' ' ')
        
        local missing_fields=()
        
        IFS=',' read -ra fields_array <<< "$required_fields"
        for field in "${fields_array[@]}"; do
            field=$(echo "$field" | xargs) # trim whitespace
            if [[ " $available_fields " =~ " $field " ]]; then
                log "    ✓ Field '$field' exists"
            else
                log "    ✗ Field '$field' missing"
                missing_fields+=("$field")
                all_valid=false
            fi
        done
        
        if [[ ${#missing_fields[@]} -gt 0 ]]; then
            log "    Missing fields: ${missing_fields[*]}"
        fi
    done
    
    return $([[ "$all_valid" == true ]] && echo 0 || echo 1)
}

# Test basic CRUD operations
test_crud_operations() {
    log "Testing basic CRUD operations..."
    
    # Test creating a record in notes collection
    local test_data='{"title":"PKM Validation Test","content":"Automated validation test entry","ai":"","tags":["test"],"created_at":"'$(date -Iseconds)'","updated_at":"'$(date -Iseconds)'"}'
    
    local response
    response=$(api_request "POST" "/notes:create" "$test_data")
    
    local status_code="${response%%:*}"
    local body="${response#*:}"
    
    if [[ "$status_code" == "200" || "$status_code" == "201" ]]; then
        log "✓ Record creation successful"
        
        # Extract record ID for cleanup
        local record_id
        record_id=$(echo "$body" | grep -o '"id":[0-9]*' | cut -d':' -f2 | head -1)
        
        if [[ -n "$record_id" ]]; then
            # Test reading the record
            response=$(api_request "GET" "/notes:get?filterByTk=$record_id" "")
            status_code="${response%%:*}"
            
            if [[ "$status_code" == "200" ]]; then
                log "✓ Record retrieval successful"
                
                # Test updating the record
                local update_data='{"content":"Updated validation test entry","updated_at":"'$(date -Iseconds)'"}'
                response=$(api_request "POST" "/notes:update?filterByTk=$record_id" "$update_data")
                status_code="${response%%:*}"
                
                if [[ "$status_code" == "200" ]]; then
                    log "✓ Record update successful"
                    
                    # Test deleting the record
                    response=$(api_request "POST" "/notes:destroy?filterByTk=$record_id" "")
                    status_code="${response%%:*}"
                    
                    if [[ "$status_code" == "200" ]]; then
                        log "✓ Record deletion successful"
                    else
                        log "✗ Record deletion failed (HTTP $status_code)"
                        return 1
                    fi
                else
                    log "✗ Record update failed (HTTP $status_code)"
                    return 1
                fi
            else
                log "✗ Record retrieval failed (HTTP $status_code)"
                return 1
            fi
        else
            log "✗ Could not extract record ID from response"
            return 1
        fi
    else
        log "✗ Record creation failed (HTTP $status_code)"
        return 1
    fi
    
    return 0
}

# Generate setup instructions
generate_setup_instructions() {
    log "Generating setup instructions..."
    
    cat << 'EOF'

# NocoBase Setup Instructions

## 1. Create Required Collections

Use the NocoBase admin interface to create these collections:

### Notes Collection
- Fields: title, content, ai, tags, created_at, updated_at
- Field Types: 
  - title: Text (required)
  - content: Text (Long)
  - ai: Text (Long) 
  - tags: Text (Multiple)
  - created_at: DateTime
  - updated_at: DateTime

### Tasks Collection  
- Fields: title, status, priority, content, ai, tags, created_at, updated_at
- Field Types:
  - title: Text (required)
  - status: Select (todo, in_progress, done)
  - priority: Select (low, medium, high)
  - content: Text (Long)
  - ai: Text (Long)
  - tags: Text (Multiple)
  - created_at: DateTime
  - updated_at: DateTime

### Projects Collection
- Fields: title, description, status, ai, tags, created_at, updated_at
- Field Types:
  - title: Text (required)
  - description: Text (Long)
  - status: Select (planning, active, completed, archived)
  - ai: Text (Long)
  - tags: Text (Multiple)
  - created_at: DateTime
  - updated_at: DateTime

### Journal Entries Collection
- Fields: title, content, ai, mood, tags, created_at, updated_at
- Field Types:
  - title: Text (required)
  - content: Text (Long)
  - ai: Text (Long)
  - mood: Select (happy, sad, neutral, anxious, excited)
  - tags: Text (Multiple)
  - created_at: DateTime
  - updated_at: DateTime

### Canvas Drawings Collection
- Fields: title, content, ai, drawing_id, tags, created_at, updated_at
- Field Types:
  - title: Text (required)
  - content: Text (Long)
  - ai: Text (Long)
  - drawing_id: Text (unique)
  - tags: Text (Multiple)
  - created_at: DateTime
  - updated_at: DateTime

### Front History Collection
- Fields: sp_id, member_id, starttime, endtime, customstatus, live, tags, created_at, updated_at
- Field Types:
  - sp_id: Text (unique, required)
  - member_id: Text (required)
  - starttime: DateTime (required)
  - endtime: DateTime
  - customstatus: Text
  - live: Boolean
  - tags: Text (Multiple)
  - created_at: DateTime
  - updated_at: DateTime

## 2. Configure API Access

1. Generate an API token in NocoBase admin
2. Set environment variables:
   - VITE_NOCOBASE_URL (your NocoBase API URL)
   - VITE_NOCOBASE_API_TOKEN (your API token)

## 3. Test the Setup

Run this validation script again to verify everything is working.

EOF
}

# Main validation function
main() {
    log "Starting NocoBase setup validation..."
    log "URL: $NOCOBASE_URL"
    log "API Token: ${API_TOKEN:0:10}..."
    
    local all_valid=true
    
    # Run all validation checks
    if ! test_connectivity; then
        all_valid=false
    fi
    
    if ! test_authentication; then
        all_valid=false
    fi
    
    if ! check_collections; then
        all_valid=false
    fi
    
    if ! check_fields; then
        all_valid=false
    fi
    
    if ! test_crud_operations; then
        all_valid=false
    fi
    
    # Final result
    if [[ "$all_valid" == true ]]; then
        log "✓ All validations passed! NocoBase setup is complete."
        exit 0
    else
        log "✗ Some validations failed. Please review the setup instructions:"
        generate_setup_instructions
        exit 1
    fi
}

# Handle signals gracefully
cleanup() {
    log "NocoBase validation stopping"
    exit 0
}

trap cleanup SIGTERM SIGINT

# Run validation
main