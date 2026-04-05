// Security headers middleware for PKM backend
// Implements comprehensive security headers following OWASP guidelines

import helmet from 'helmet';

/**
 * Configure security headers middleware
 */
export function securityHeaders() {
    return helmet({
        // Content Security Policy
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://challenges.cloudflare.com", "https://*.cloudflare.com"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://challenges.cloudflare.com", "https://*.cloudflare.com"],
                connectSrc: ["'self'", "ws:", "wss:", "https:", "https://challenges.cloudflare.com", "https://*.cloudflare.com"],
                fontSrc: ["'self'", "data:", "https://challenges.cloudflare.com", "https://*.cloudflare.com"],
                frameSrc: ["https://challenges.cloudflare.com", "https://*.cloudflare.com"],
                frameAncestors: ["'self'"],
                baseUri: ["'self'"],
                formAction: ["'self'"],
                upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
            }
        },
        
        // Cross-Origin Embedder Policy
        crossOriginEmbedderPolicy: true,
        
        // Cross-Origin Opener Policy
        crossOriginOpenerPolicy: {
            policy: "same-origin"
        },
        
        // Cross-Origin Resource Policy
        crossOriginResourcePolicy: {
            policy: "same-origin"
        },
        
        // DNS Prefetch Control
        dnsPrefetchControl: {
            allow: false
        },
        
        // Frameguard (X-Frame-Options)
        frameguard: {
            action: "sameorigin"
        },
        
        // Hide X-Powered-By header
        hidePoweredBy: true,
        
        // HTTP Strict Transport Security (HSTS)
        hsts: {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true
        },
        
        // IE No Open
        ieNoOpen: true,
        
        // No Sniff
        noSniff: true,
        
        // Permitted Cross-Domain Policies
        permittedCrossDomainPolicies: {
            permittedPolicies: "none"
        },
        
        // Referrer Policy
        referrerPolicy: {
            policy: "strict-origin-when-cross-origin"
        },
        
        // X-XSS-Protection
        xssFilter: true
    });
}

/**
 * Additional security headers not covered by Helmet
 */
export function additionalSecurityHeaders(req, res, next) {
    // Prevent caching of sensitive data
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Enable XSS filtering
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Permissions Policy (formerly Feature-Policy)
    res.setHeader(
        'Permissions-Policy',
        'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), xr-spatial-tracking=()'
    );
    
    // Remove Server header
    res.removeHeader('Server');
    
    // Remove X-AspNet-Version header
    res.removeHeader('X-AspNet-Version');
    
    next();
}

/**
 * CORS configuration
 */
export function corsConfig() {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    
    return {
        origin: allowedOrigins.length > 0 ? allowedOrigins : ['http://localhost:3010'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
        maxAge: 600 // 10 minutes
    };
}

/**
 * Rate limit headers
 */
export function rateLimitHeaders(req, res, next) {
    // Add security headers to rate limit responses
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
}
