// Rate limiting middleware for PKM backend
// Implements protection against API abuse and DoS attacks

import rateLimit from 'express-rate-limit';

/**
 * Creates rate limiting middleware for the PKM API
 */
export function createRateLimiters() {
    const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
    const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);
    const RATE_LIMIT_AI_MAX = parseInt(process.env.RATE_LIMIT_AI_MAX || '20', 10);

    // General API rate limiter
    const generalLimiter = rateLimit({
        windowMs: RATE_LIMIT_WINDOW_MS,
        max: RATE_LIMIT_MAX_REQUESTS,
        message: { error: 'Too many requests, please try again later' },
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => {
            return req.ip || req.headers['x-forwarded-for'] || 'unknown';
        }
    });

    // Stricter rate limit for AI endpoints (expensive operations)
    const aiLimiter = rateLimit({
        windowMs: RATE_LIMIT_WINDOW_MS,
        max: RATE_LIMIT_AI_MAX,
        message: { error: 'AI rate limit exceeded, please try again later' },
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => {
            return req.ip || req.headers['x-forwarded-for'] || 'unknown';
        }
    });

    // Very strict rate limit for authentication endpoints
    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5,
        message: { error: 'Too many authentication attempts, please try again in 15 minutes' },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: true,
        keyGenerator: (req) => {
            return req.ip || req.headers['x-forwarded-for'] || 'unknown';
        }
    });

    // File upload rate limiter
    const uploadLimiter = rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 10,
        message: { error: 'Upload limit exceeded, please try again in an hour' },
        standardHeaders: true,
        legacyHeaders: false
    });

    return {
        generalLimiter,
        aiLimiter,
        authLimiter,
        uploadLimiter
    };
}
