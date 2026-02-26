#!/bin/bash
# audit_keys.sh - Scans the project for potential exposed API keys or secrets.

echo "🔍 Scanning /home/house/pkm for potential secrets..."
echo "---------------------------------------------------"

# High-entropy strings (Generic API Keys) - filtering common code keywords
echo "Checking generic high-entropy strings..."
grep -rE "([A-Za-z0-9-_]{30,})" src/ --include="*.ts*" --include="*.js*" --include="*.tsx" | grep -vE "import|from|class|interface|function|const|let|var|return|node_modules|package-lock|yarn.lock" 

# Specific patterns
echo "Checking 'Authorization' headers..."
grep -r "Authorization" src/

echo "Checking 'Bearer' tokens..."
grep -r "Bearer" src/

echo "Checking 'API_KEY' / 'api_key' variables..."
grep -ri "api_key" src/

echo "Checking specific 'nb_' (NocoBase) patterns..."
grep -r "nb_" src/

echo "---------------------------------------------------"
echo "✅ Scan complete. Please review any matches above."
