// security headers middleware for pkm backend
// implements comprehensive security headers following owasp guidelines

import helmet from 'helmet';

/**
 * configure security headers middleware
 */
export function securityHeaders() {
    return helmet({
        // content security policy
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://challenges.cloudflare.com", "https://*.cloudflare.com"],
                stylesrc: ["'self'", "'unsafe-inline'", "https://challenges.cloudflare.com", "https://*.cloudflare.com"],
                connectsrc: ["'self'", "ws:", "wss:", "https:", "https://challenges.cloudflare.com", "https://*.cloudflare.com"],
                fontsrc: ["'self'", "data:", "https://challenges.cloudflare.com", "https://*.cloudflare.com"],
                framesrc: ["https://challenges.cloudflare.com", "https://*.cloudflare.com"],
                frameancestors: ["'self'"],
                baseuri: ["'self'"],
                formaction: ["'self'"],
                upgradeinsecurerequests: process.env.node_env === 'production' ? [] : null
            }
        },
        
        // cross-origin embedder policy
        crossoriginembedderpolicy: true,
        
        // cross-origin opener policy
        crossoriginopenerpolicy: {
            policy: "same-origin"
        },
        
        // cross-origin resource policy
        crossoriginresourcepolicy: {
            policy: "same-origin"
        },
        
        // dns prefetch control
        dnsprefetchcontrol: {
            allow: false
        },
        
        // frameguard (x-frame-options)
        frameguard: {
            action: "sameorigin"
        },
        
        // hide x-powered-by header
        hidepoweredby: true,
        
        // http strict transport security (hsts)
        hsts: {
            maxage: 31536000, // 1 year
            includesubdomains: true,
            preload: true
        },
        
        // ie no open
        ienoopen: true,
        
        // no sniff
        nosniff: true,
        
        // permitted cross-domain policies
        permittedcrossdomainpolicies: {
            permittedpolicies: "none"
        },
        
        // referrer policy
        referrerpolicy: {
            policy: "strict-origin-when-cross-origin"
        },
        
        // x-xss-protection
        xssfilter: true
    });
}

/**
 * additional security headers not covered by helmet
 */
export function additionalSecurityHeaders(req, res, next) {
    // only apply cache-control to api responses, not static assets
    if (req.path.startsWith('/api/')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
    }
    
    // prevent clickjacking
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    
    // prevent mime type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // enable xss filtering
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // permissions policy (formerly feature-policy)
    res.setHeader(
        'Permissions-Policy',
        'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), xr-spatial-tracking=()'
    );
    
    // remove server header
    res.removeHeader('Server');
    
    // remove x-aspnet-version header
    res.removeHeader('X-AspNet-Version');
    
    next();
}

/**
 * cors configuration
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
 * rate limit headers
 */
export function rateLimitHeaders(req, res, next) {
    // add security headers to rate limit responses
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
}
