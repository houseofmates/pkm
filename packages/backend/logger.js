// Structured logging for PKM backend
// Uses Winston for production-ready logging

import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4
};

// Define log level colors
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white'
};

// Add colors to winston
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Console format with colors
const consoleFormat = winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}${info.stack ? '\n' + info.stack : ''}`
    )
);

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    levels,
    format,
    transports: [
        // Error log
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        
        // Combined log
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        
        // HTTP log
        new winston.transports.File({
            filename: path.join(logsDir, 'http.log'),
            level: 'http',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        })
    ]
});

// Add console transport in non-production environments
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: consoleFormat
    }));
}

// HTTP request logger middleware
export function httpLogger(req, res, next) {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.http({
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
    });
    
    next();
}

// API request/response logger
export function apiLogger(req, res, next) {
    const start = Date.now();
    
    logger.info({
        type: 'API_REQUEST',
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userId: req.user?.id || 'anonymous'
    });
    
    // Log response
    const originalJson = res.json.bind(res);
    res.json = (body) => {
        const duration = Date.now() - start;
        logger.info({
            type: 'API_RESPONSE',
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`
        });
        return originalJson(body);
    };
    
    next();
}

// Security event logger
export function securityLogger(event, details) {
    logger.warn({
        type: 'SECURITY_EVENT',
        event,
        ...details
    });
}

// Performance logger
export function performanceLogger(operation, duration, metadata = {}) {
    logger.info({
        type: 'PERFORMANCE',
        operation,
        duration: `${duration}ms`,
        ...metadata
    });
}

// Error logger with context
export function errorLogger(error, context = {}) {
    logger.error({
        type: 'ERROR',
        message: error.message,
        stack: error.stack,
        ...context
    });
}

// Database query logger
export function queryLogger(query, duration, metadata = {}) {
    logger.debug({
        type: 'DATABASE_QUERY',
        query,
        duration: `${duration}ms`,
        ...metadata
    });
}

export default logger;
