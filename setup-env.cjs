#!/usr/bin/env node

/**
 * Automated environment setup script
 * Ensures .env exists before running the app
 * Priority: .env.local > .env.example
 */

const fs = require('fs');
const path = require('path');

const ENV_FILE = path.join(__dirname, '.env');
const ENV_LOCAL = path.join(__dirname, '.env.local');
const ENV_EXAMPLE = path.join(__dirname, '.env.example');

console.log('🔧 [Setup] Checking environment configuration...');

// Check if .env already exists
if (fs.existsSync(ENV_FILE)) {
    console.log('✅ [Setup] .env file found');
    process.exit(0);
}

// Priority 1: Copy from .env.local (user's private config)
if (fs.existsSync(ENV_LOCAL)) {
    console.log('📋 [Setup] Copying .env.local to .env...');
    fs.copyFileSync(ENV_LOCAL, ENV_FILE);
    console.log('✅ [Setup] Environment configured from .env.local');
    process.exit(0);
}

// Priority 2: Copy from .env.example (public template)
if (fs.existsSync(ENV_EXAMPLE)) {
    console.log('📋 [Setup] Creating .env from .env.example...');
    fs.copyFileSync(ENV_EXAMPLE, ENV_FILE);
    console.log('⚠️  [Setup] .env created with placeholder values');
    console.log('📝 [Setup] Please edit .env with your configuration');
    process.exit(0);
}

// No template found - create minimal .env
console.log('⚠️  [Setup] No .env.example found, creating minimal .env...');
const minimalEnv = `# PKM Environment Configuration
# Please configure these values

# Backend
PORT=4100
BROADCAST_AUTH_KEY=your-secret-key-here

# Frontend
VITE_API_URL=http://localhost:4100/api
VITE_PUBLIC_URL=http://localhost:3011
`;

fs.writeFileSync(ENV_FILE, minimalEnv);
console.log('✅ [Setup] Minimal .env created');
console.log('📝 [Setup] Please edit .env with your configuration');
process.exit(0);
