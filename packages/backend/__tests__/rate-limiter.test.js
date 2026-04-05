// tests for rate limiter middleware
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRateLimiters } from '../rate-limiter.js';

describe('Rate Limiter', () => {
    let limiters;
    
    beforeEach(() => {
        // reset environment variables for testing
        process.env.RATE_LIMIT_WINDOW_MS = '60000';
        process.env.RATE_LIMIT_MAX_REQUESTS = '100';
        process.env.RATE_LIMIT_AI_MAX = '20';
        limiters = createRateLimiters();
    });
    
    describe('createRateLimiters', () => {
        it('should create all four rate limiters', () => {
            expect(limiters).toHaveProperty('generalLimiter');
            expect(limiters).toHaveProperty('aiLimiter');
            expect(limiters).toHaveProperty('authLimiter');
            expect(limiters).toHaveProperty('uploadLimiter');
        });
        
        it('should have correct window_ms for general limiter', () => {
            expect(limiters.generalLimiter.windowMs).toBe(60000);
        });
        
        it('should have correct max requests for general limiter', () => {
            expect(limiters.generalLimiter.max).toBe(100);
        });
        
        it('should have correct max requests for AI limiter', () => {
            expect(limiters.aiLimiter.max).toBe(20);
        });
        
        it('should have correct window_ms for auth limiter (15 minutes)', () => {
            expect(limiters.authLimiter.windowMs).toBe(15 * 60 * 1000);
        });
        
        it('should have correct max requests for auth limiter', () => {
            expect(limiters.authLimiter.max).toBe(5);
        });
        
        it('should have correct window_ms for upload limiter (1 hour)', () => {
            expect(limiters.uploadLimiter.windowMs).toBe(60 * 60 * 1000);
        });
        
        it('should have correct max requests for upload limiter', () => {
            expect(limiters.uploadLimiter.max).toBe(10);
        });
    });
    
    describe('Environment Variable Parsing', () => {
        it('should use default values when env vars not set', () => {
            delete process.env.RATE_LIMIT_WINDOW_MS;
            delete process.env.RATE_LIMIT_MAX_REQUESTS;
            delete process.env.RATE_LIMIT_AI_MAX;
            
            const newLimiters = createRateLimiters();
            expect(newLimiters.generalLimiter.windowMs).toBe(60000);
            expect(newLimiters.generalLimiter.max).toBe(100);
            expect(newLimiters.aiLimiter.max).toBe(20);
        });
        
        it('should parse custom values from environment', () => {
            process.env.RATE_LIMIT_WINDOW_MS = '120000';
            process.env.RATE_LIMIT_MAX_REQUESTS = '200';
            process.env.RATE_LIMIT_AI_MAX = '50';
            
            const newLimiters = createRateLimiters();
            expect(newLimiters.generalLimiter.windowMs).toBe(120000);
            expect(newLimiters.generalLimiter.max).toBe(200);
            expect(newLimiters.aiLimiter.max).toBe(50);
        });
    });
});
