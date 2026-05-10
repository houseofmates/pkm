// error handling middleware for pkm backend
// provides consistent error responses and proper logging

/**
 * custom error class for api errors
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
 * not found error handler
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
 * global error handling middleware
 */
export function errorHandler(err, req, res, next) {
    // log error details
    const errorLog = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl,
        statusCode: err.statusCode || 500,
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        code: err.code || 'INTERNAL_ERROR'
    };

    // log appropriately based on error type
    if (err.statusCode && err.statusCode < 500) {
        console.warn('[API Error]', errorLog);
    } else {
        console.error('[API Error]', errorLog);
        // in production, you might want to send to error tracking service
        // e.g., sentry.captureexception(err);
    }

    // send error response
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
 * async handler wrapper to catch async errors
 * usage: app.get('/', asynchandler(async (req, res) => { ... }))
 */
export function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * validation error handler for zod/joi validation errors
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
 * rate limit exceeded handler
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
 * authentication error handler
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
