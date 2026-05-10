// environment variable validation for pkm backend
// ensures all required environment variables are present and valid

import dotenv from 'dotenv';
import { z } from 'zod';

/**
 * load and validate environment variables
 * @returns {object} validated environment configuration
 */
export function loadEnvironment() {
    // load environment variables from .env file
    const result = dotenv.config();

    if (result.error && process.env.NODE_ENV === 'production') {
        console.warn('[Backend] Warning: .env file not found in production environment');
    }

    // define validation schema for critical environment variables
    const envSchema = z.object({
        PORT: z.string().regex(/^\d+$/).default('4100'),
        NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

        // security - required in production
        ADMIN_SECRET: z.string().min(16, 'ADMIN_SECRET must be at least 16 characters for security'),
        BROADCAST_AUTH_KEY: z.string().min(16).optional(),

        // nocobase integration - required
        NOCOBASE_URL: z.string().url('NOCOBASE_URL must be a valid URL'),
        NOCOBASE_API_KEY: z.string().min(1, 'NOCOBASE_API_KEY is required'),

        // cors configuration
        ALLOWED_ORIGINS: z.string().default('http://localhost:3010'),

        // rate limiting
        RATE_LIMIT_WINDOW_MS: z.string().regex(/^\d+$/).default('60000'),
        RATE_LIMIT_MAX_REQUESTS: z.string().regex(/^\d+$/).default('100'),
        RATE_LIMIT_AI_MAX: z.string().regex(/^\d+$/).default('20'),

        // websocket configuration
        MAX_WS_CONNECTIONS: z.string().regex(/^\d+$/).default('1000'),

        // optional configurations
        MOCK_NOTION_IMPORT: z.string().optional(),
        PROTON_ICS_URL: z.string().url().optional(),
        N8N_WEBHOOK_URL: z.string().url().optional(),
        PIECES_MCP_URL: z.string().url().optional(),
        PIECES_CONTEXT_HOURS: z.string().regex(/^\d+$/).optional(),
        PKM_BOT_MEMORY_DIR: z.string().optional(),
        OLLAMA_URL: z.string().url().optional(),
        OLLAMA_MODEL: z.string().optional(),
        GEMINI_API_KEY: z.string().optional(),
        VITE_APP_VERSION: z.string().optional(),
        VITE_SHOW_HEALTH_BAR: z.string().optional(),
        API_DOMAIN: z.string().url().optional(),
        VITE_API_URL: z.string().url().optional(),
        VITE_VECTOR_EMBEDDING_ENDPOINT: z.string().url().optional()
    });

    try {
        // validate environment variables
        const validatedEnv = envSchema.parse(process.env);

        // log validation success in development
        if (process.env.NODE_ENV === 'development') {
            console.log('[Backend] ✓ Environment variables validated successfully');
        }

        return validatedEnv;
    } catch (error) {
        console.error('[Backend] ❌ Environment validation failed:');

        if (error instanceof z.ZodError) {
            error.errors.forEach((err) => {
                console.error(`  - ${err.path.join('.')}: ${err.message}`);
            });
        } else {
            console.error(error);
        }

        // in production, exit with error code
        if (process.env.NODE_ENV === 'production') {
            console.error('\n[Backend] FATAL: Cannot start without valid environment variables');
            console.error('[Backend] Please check your .env file or environment variables');
            process.exit(1);
        }

        // in development, continue with defaults but warn
        console.warn('\n[Backend] WARNING: Continuing with default values (development mode only)');
        return process.env;
    }
}

/**
 * get validated environment variable
 * @param {string} key - environment variable name
 * @param {string} defaultvalue - default value if not set
 * @returns {string} environment variable value
 */
export function getEnv(key, defaultValue) {
    return process.env[key] || defaultValue;
}

/**
 * get validated environment variable as number
 * @param {string} key - environment variable name
 * @param {number} defaultvalue - default value if not set
 * @returns {number} environment variable value as number
 */
export function getEnvNumber(key, defaultValue) {
    const value = process.env[key];
    if (!value) return defaultValue;

    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * get validated environment variable as boolean
 * @param {string} key - environment variable name
 * @param {boolean} defaultvalue - default value if not set
 * @returns {boolean} environment variable value as boolean
 */
export function getEnvBoolean(key, defaultValue) {
    const value = process.env[key];
    if (!value) return defaultValue;

    return value.toLowerCase() === 'true' || value === '1';
}
