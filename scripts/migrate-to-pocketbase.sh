#!/bin/bash
# migration helper: update nocobase-client imports to pocketbase

# find and replace imports in packages/core/src
find /home/house/pkm/packages/core/src -type f \( -name "*.ts" -o -name "*.tsx" \) | while read file; do
  # skip files we've already updated
  if [[ "$file" == *"/lib/pocketbase.ts" ]] || \
     [[ "$file" == *"/contexts/auth-context.tsx" ]] || \
     [[ "$file" == *"/contexts/fronter-context.tsx" ]] || \
     [[ "$file" == *"/pages/login.tsx" ]] || \
     [[ "$file" == *"/hooks/use-records.ts" ]] || \
     [[ "$file" == *"/services/data.service.ts" ]] || \
     [[ "$file" == *"/lib/api-client.ts" ]]; then
    continue
  fi
  
  # replace import statements
  sed -i "s|import { api } from '@/api/nocobase-client'|import { pocketBaseClient } from '@/lib/pocketbase'|g" "$file"
  sed -i 's|import api from "@/api/nocobase-client"|import { pocketBaseClient } from "@/lib/pocketbase"|g' "$file"
  sed -i 's|import { api } from "@/api/nocobase-client"|import { pocketBaseClient } from "@/lib/pocketbase"|g' "$file"
  
  # replace api usage with pocketbaseclient
  sed -i 's|\bapi\.listRecords\b|pocketBaseClient.listRecords|g' "$file"
  sed -i 's|\bapi\.getRecord\b|pocketBaseClient.getRecord|g' "$file"
  sed -i 's|\bapi\.createRecord\b|pocketBaseClient.createRecord|g' "$file"
  sed -i 's|\bapi\.updateRecord\b|pocketBaseClient.updateRecord|g' "$file"
  sed -i 's|\bapi\.deleteRecord\b|pocketBaseClient.deleteRecord|g' "$file"
  sed -i 's|\bapi\.createCollection\b|pocketBaseClient.createCollection|g' "$file"
  sed -i 's|\bapi\.listCollections\b|pocketBaseClient.listCollections|g' "$file"
  sed -i 's|\bapi\.request\b|pocketBaseClient.request|g' "$file"
  sed -i 's|\bapi\.upload\b|pocketBaseClient.upload|g' "$file"
done

echo "migration helper complete. check files for any remaining nocobase references."
