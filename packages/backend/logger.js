// structured logging for pkm backend// uses winston for production-ready logging
import winston from 'winston';
import path from 'path';
import fs from 'fs';

// ensure logs directory existsconst logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// define log levelsconst levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4
};

// define log level colorsconst colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white'
};

// add colors to winstonwinston.addColors(colors);

// define log formatconst format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// console format with colorsconst consoleFormat = winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}${info.stack ? '\n' + info.stack : ''}`
    )
);

// create logger instanceconst logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    levels,
    format,
    transports: [
        // error log        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5mb
            maxFiles: 5
        }),
        
        // combined log        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 5242880, // 5mb
            maxFiles: 5
        }),
        
        // http log        new winston.transports.File({
            filename: path.join(logsDir, 'http.log'),
            level: 'http',
            maxsize: 5242880, // 5mb
            maxFiles: 5
        })
    ]
});

// add console transport in non-production environmentsif (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: consoleFormat
    }));
}

// http request logger middlewareexport function httpLogger(req, res, next) {
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

// api request/response loggerexport function apiLogger(req, res, next) {
    const start = Date.now();
    
    logger.info({
        type: 'API_REQUEST',
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userId: req.user?.id || 'anonymous'
    });
    
    // log response    const originalJson = res.json.bind(res);
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

// security event loggerexport function securityLogger(event, details) {
    logger.warn({
        type: 'SECURITY_EVENT',
        event,
        ...details
    });
}

// performance loggerexport function performanceLogger(operation, duration, metadata = {}) {
    logger.info({
        type: 'PERFORMANCE',
        operation,
        duration: `${duration}ms`,
        ...metadata
    });
}

// error logger with contextexport function errorLogger(error, context = {}) {
    logger.error({
        type: 'ERROR',
        message: error.message,
        stack: error.stack,
        ...context
    });
}

// database query loggerexport function queryLogger(query, duration, metadata = {}) {
    logger.debug({
        type: 'DATABASE_QUERY',
        query,
        duration: `${duration}ms`,
        ...metadata
    });
}

export default logger;
