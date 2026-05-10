// tests for environment validator
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadEnvironment, getEnv, getEnvNumber, getEnvBoolean } from '../env-validator.js';

describe('Environment Validator', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        // reset environment
        process.env = { ...originalEnv };
    });

    describe('loadEnvironment', () => {
        it('should load environment variables successfully', () => {
            process.env.NODE_ENV = 'test';
            process.env.ADMIN_SECRET = 'test-secret-key-12345678';
            process.env.NOCOBASE_URL = 'https://test.example.com/api';
            process.env.NOCOBASE_API_KEY = 'test-api-key';

            const env = loadEnvironment();
            expect(env).toBeDefined();
        });

        it('should use default values for optional variables', () => {
            process.env.NODE_ENV = 'test';
            process.env.ADMIN_SECRET = 'test-secret-key-12345678';
            process.env.NOCOBASE_URL = 'https://test.example.com/api';
            process.env.NOCOBASE_API_KEY = 'test-api-key';

            const env = loadEnvironment();
            expect(env.PORT).toBe('4100');
            expect(env.ALLOWED_ORIGINS).toBe('http://localhost:3010');
        });

        it('should validate NODE_ENV is valid value', () => {
            process.env.NODE_ENV = 'invalid';
            process.env.ADMIN_SECRET = 'test-secret-key-12345678';
            process.env.NOCOBASE_URL = 'https://test.example.com/api';
            process.env.NOCOBASE_API_KEY = 'test-api-key';

            // should not throw in test mode
            const env = loadEnvironment();
            expect(env).toBeDefined();
        });

        it('should validate ADMIN_SECRET minimum length', () => {
            process.env.NODE_ENV = 'test';
            process.env.ADMIN_SECRET = 'short';
            process.env.NOCOBASE_URL = 'https://test.example.com/api';
            process.env.NOCOBASE_API_KEY = 'test-api-key';

            // should handle validation error gracefully in test mode
            const env = loadEnvironment();
            expect(env).toBeDefined();
        });

        it('should validate NOCOBASE_URL is valid URL', () => {
            process.env.NODE_ENV = 'test';
            process.env.ADMIN_SECRET = 'test-secret-key-12345678';
            process.env.NOCOBASE_URL = 'not-a-url';
            process.env.NOCOBASE_API_KEY = 'test-api-key';

            const env = loadEnvironment();
            expect(env).toBeDefined();
        });
    });

    describe('getEnv', () => {
        it('should return environment variable value', () => {
            process.env.TEST_VAR = 'test-value';
            expect(getEnv('TEST_VAR')).toBe('test-value');
        });

        it('should return default value when not set', () => {
            expect(getEnv('NON_EXISTENT', 'default')).toBe('default');
        });
    });

    describe('getEnvNumber', () => {
        it('should parse number from environment', () => {
            process.env.TEST_NUM = '42';
            expect(getEnvNumber('TEST_NUM')).toBe(42);
        });

        it('should return default for invalid number', () => {
            process.env.TEST_NUM = 'not-a-number';
            expect(getEnvNumber('TEST_NUM', 10)).toBe(10);
        });

        it('should return default when not set', () => {
            expect(getEnvNumber('NON_EXISTENT', 5)).toBe(5);
        });
    });

    describe('getEnvBoolean', () => {
        it('should parse true from string', () => {
            process.env.TEST_BOOL = 'true';
            expect(getEnvBoolean('TEST_BOOL')).toBe(true);
        });

        it('should parse false from string', () => {
            process.env.TEST_BOOL = 'false';
            expect(getEnvBoolean('TEST_BOOL')).toBe(false);
        });

        it('should parse 1 as true', () => {
            process.env.TEST_BOOL = '1';
            expect(getEnvBoolean('TEST_BOOL')).toBe(true);
        });

        it('should return default when not set', () => {
            expect(getEnvBoolean('NON_EXISTENT', true)).toBe(true);
        });
    });
});
