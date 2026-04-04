// Error handling middleware for PKM backend
// Provides consistent error responses and proper logging

/**
 * Custom error class for API errors
 */
export class APIError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
        super(message);
        this.name = 'APIError';
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
    }
}

/**
 * Not found error handler
 */
export function notFoundHandler(req, res, next) {
    const error = new APIError(
        `Route ${req.originalUrl} not found`,
        404,
        'ROUTE_NOT_FOUND'
    );
    next(error);
}

/**
 * Global error handling middleware
 */
export function errorHandler(err, req, res, next) {
    // Log error details
    const errorLog = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl,
        statusCode: err.statusCode || 500,
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        code: err.code || 'INTERNAL_ERROR'
    };

    // Log appropriately based on error type
    if (err.statusCode && err.statusCode < 500) {
        console.warn('[API Error]', errorLog);
    } else {
        console.error('[API Error]', errorLog);
        // In production, you might want to send to error tracking service
        // e.g., Sentry.captureException(err);
    }

    // Send error response
    res.status(err.statusCode || 500).json({
        success: false,
        error: {
            message: err.message || 'Internal server error',
            code: err.code || 'INTERNAL_ERROR',
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        }
    });
}

/**
 * Async handler wrapper to catch async errors
 * Usage: app.get('/', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Validation error handler for Zod/Joi validation errors
 */
export function validationErrorHandler(err, req, res, next) {
    if (err.name === 'ZodError' || err.name === 'ValidationError') {
        const errors = err.errors || err.details;
        return res.status(400).json({
            success: false,
            error: {
                message: 'Validation failed',
                code: 'VALIDATION_ERROR',
                details: errors.map(e => ({
                    field: e.path?.join('.') || e.context?.key,
                    message: e.message
                }))
            }
        });
    }
    next(err);
}

/**
 * Rate limit exceeded handler
 */
export function rateLimitHandler(req, res, next) {
    res.status(429).json({
        success: false,
        error: {
            message: 'Too many requests, please try again later',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: req.rateLimit?.resetTime || 60
        }
    });
}

/**
 * Authentication error handler
 */
export function authErrorHandler(err, req, res, next) {
    if (err.name === 'UnauthorizedError' || err.message.includes('auth')) {
        return res.status(401).json({
            success: false,
            error: {
                message: 'Authentication required',
                code: 'UNAUTHORIZED'
            }
        });
    }
    next(err);
}
