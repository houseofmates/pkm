// JWT Authentication middleware for PKM backend
// Implements secure token-based authentication

import jwt from 'jsonwebtoken';
import { APIError } from './error-handler.js';

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

if (!JWT_SECRET) {
    console.error('[Auth] FATAL: JWT_SECRET or ADMIN_SECRET must be set');
    process.exit(1);
}

/**
 * Generate access token
 */
export function generateAccessToken(user) {
    const payload = {
        sub: user.id,
        email: user.email,
        role: user.role || 'user',
        iat: Date.now(),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };
    
    return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(user) {
    const payload = {
        sub: user.id,
        type: 'refresh',
        iat: Date.now(),
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
    };
    
    return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });
}

/**
 * Verify and decode token
 */
export function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new APIError('Token expired', 401, 'TOKEN_EXPIRED');
        }
        if (error.name === 'JsonWebTokenError') {
            throw new APIError('Invalid token', 401, 'INVALID_TOKEN');
        }
        throw error;
    }
}

/**
 * Authentication middleware
 */
export function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new APIError('Authorization header required', 401, 'MISSING_AUTH');
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
        const decoded = verifyToken(token);
        req.user = {
            id: decoded.sub,
            email: decoded.email,
            role: decoded.role
        };
        next();
    } catch (error) {
        next(error);
    }
}

/**
 * Role-based authorization middleware
 */
export function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            throw new APIError('Authentication required', 401, 'NOT_AUTHENTICATED');
        }
        
        if (!roles.includes(req.user.role)) {
            throw new APIError('Insufficient permissions', 403, 'INSUFFICIENT_PERMISSIONS');
        }
        
        next();
    };
}

/**
 * Optional authentication (doesn't fail if no token)
 */
export function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.user = null;
        return next();
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
        const decoded = verifyToken(token);
        req.user = {
            id: decoded.sub,
            email: decoded.email,
            role: decoded.role
        };
    } catch (error) {
        req.user = null;
    }
    
    next();
}

/**
 * Generate CSRF token
 */
export function generateCsrfToken(sessionId) {
    return jwt.sign(
        { sessionId, type: 'csrf' },
        JWT_SECRET,
        { algorithm: 'HS256', expiresIn: '1h' }
    );
}

/**
 * Verify CSRF token
 */
export function verifyCsrfToken(token, sessionId) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
        return decoded.sessionId === sessionId && decoded.type === 'csrf';
    } catch (error) {
        return false;
    }
}
