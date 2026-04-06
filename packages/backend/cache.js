// redis caching layer for pkm backend// provides high-performance caching for frequently accessed data
import { createClient } from 'redis';

let redisClient = null;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const CACHE_TTL = parseInt(process.env.CACHE_TTL || '3600', 10); // 1 hour default

/** * initialize redis connection
 */
export async function initializeCache() {
    if (redisClient) {
        return redisClient;
    }
    
    try {
        redisClient = createClient({
            url: REDIS_URL,
            socket: {
                reconnectStrategy: (retries) => {
                    if (retries > 10) {
                        console.error('[Cache] Max reconnection attempts reached');
                        return new Error('Max reconnection attempts');
                    }
                    return Math.min(retries * 100, 3000);
                }
            }
        });
        
        redisClient.on('error', (err) => {
            console.error('[Cache] Redis error:', err.message);
        });
        
        redisClient.on('connect', () => {
            console.log('[Cache] Connected to Redis');
        });
        
        await redisClient.connect();
        return redisClient;
    } catch (error) {
        console.error('[Cache] Failed to connect to Redis:', error.message);
        redisClient = null;
        return null;
    }
}

/** * get value from cache
 */
export async function cacheGet(key) {
    if (!redisClient) {
        await initializeCache();
        if (!redisClient) return null;
    }
    
    try {
        const value = await redisClient.get(key);
        return value ? JSON.parse(value) : null;
    } catch (error) {
        console.error(`[Cache] Error getting key ${key}:`, error.message);
        return null;
    }
}

/** * set value in cache
 */
export async function cacheSet(key, value, ttl = CACHE_TTL) {
    if (!redisClient) {
        await initializeCache();
        if (!redisClient) return false;
    }
    
    try {
        const serialized = JSON.stringify(value);
        await redisClient.setEx(key, ttl, serialized);
        return true;
    } catch (error) {
        console.error(`[Cache] Error setting key ${key}:`, error.message);
        return false;
    }
}

/** * delete value from cache
 */
export async function cacheDelete(key) {
    if (!redisClient) {
        await initializeCache();
        if (!redisClient) return false;
    }
    
    try {
        await redisClient.del(key);
        return true;
    } catch (error) {
        console.error(`[Cache] Error deleting key ${key}:`, error.message);
        return false;
    }
}

/** * delete multiple keys by pattern
 */
export async function cacheDeletePattern(pattern) {
    if (!redisClient) {
        await initializeCache();
        if (!redisClient) return false;
    }
    
    try {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
            await redisClient.del(keys);
        }
        return true;
    } catch (error) {
        console.error(`[Cache] Error deleting pattern ${pattern}:`, error.message);
        return false;
    }
}

/** * cache middleware for api routes
 */
export function cacheMiddleware(ttl = CACHE_TTL) {
    return async (req, res, next) => {
        // only cache get requests        if (req.method !== 'GET') {
            return next();
        }
        
        // skip if user is authenticated (personalized data)        if (req.user) {
            return next();
        }
        
        const cacheKey = `api:${req.originalUrl}`;
        
        try {
            const cached = await cacheGet(cacheKey);
            
            if (cached) {
                return res.json(cached);
            }
        } catch (error) {
            console.error('[Cache] Middleware error:', error.message);
        }
        
        // store original json method        const originalJson = res.json.bind(res);
        
        // override json to cache response        res.json = (body) => {
            // only cache successful responses            if (res.statusCode === 200) {
                cacheSet(cacheKey, body, ttl).catch(err => {
                    console.error('[Cache] Failed to cache response:', err.message);
                });
            }
            return originalJson(body);
        };
        
        next();
    };
}

/** * invalidate cache for a collection
 */
export async function invalidateCollection(collectionName) {
    return cacheDeletePattern(`api:*${collectionName}*`);
}

/** * get cache statistics
 */
export async function getCacheStats() {
    if (!redisClient) {
        return { connected: false };
    }
    
    try {
        const info = await redisClient.info();
        const keys = await redisClient.dbSize();
        
        return {
            connected: true,
            keys: keys,
            info: info
        };
    } catch (error) {
        console.error('[Cache] Error getting stats:', error.message);
        return { connected: false, error: error.message };
    }
}

/** * clear all cache
 */
export async function clearCache() {
    if (!redisClient) {
        await initializeCache();
        if (!redisClient) return false;
    }
    
    try {
        await redisClient.flushDb();
        return true;
    } catch (error) {
        console.error('[Cache] Error clearing cache:', error.message);
        return false;
    }
}
