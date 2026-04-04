// Input validation schemas for PKM API endpoints
// Uses Zod for type-safe validation

import { z } from 'zod';

/**
 * Common validation schemas
 */
export const commonSchemas = {
    // UUID v4 validation
    uuid: z.string().uuid('Invalid UUID format'),
    
    // Email validation
    email: z.string().email('Invalid email format'),
    
    // URL validation
    url: z.string().url('Invalid URL format'),
    
    // Positive integer
    positiveInt: z.number().int().positive(),
    
    // Non-empty string
    nonEmptyString: z.string().min(1, 'Field cannot be empty'),
    
    // Date string in ISO format
    isoDate: z.string().datetime().optional(),
    
    // Pagination parameters
    pagination: z.object({
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().max(100).default(20)
    })
};

/**
 * Player/User validation schemas
 */
export const playerSchemas = {
    createPlayer: z.object({
        name: z.string().min(2).max(100),
        email: z.string().email().optional(),
        metadata: z.record(z.any()).optional()
    }),
    
    updatePlayer: z.object({
        name: z.string().min(2).max(100).optional(),
        email: z.string().email().optional(),
        metadata: z.record(z.any()).optional()
    }),
    
    playerId: z.object({
        player_id: commonSchemas.uuid
    })
};

/**
 * Activity logging validation schemas
 */
export const activitySchemas = {
    logActivity: z.object({
        user_id: commonSchemas.uuid,
        activity_type: z.string().min(1).max(50),
        description: z.string().max(500).optional(),
        metadata: z.record(z.any()).optional(),
        timestamp: z.string().datetime().optional()
    }),
    
    getActivities: z.object({
        user_id: commonSchemas.uuid,
        start_date: z.string().datetime().optional(),
        end_date: z.string().datetime().optional(),
        limit: z.number().int().positive().max(100).default(50),
        activity_type: z.string().optional()
    })
};

/**
 * AI/Chat validation schemas
 */
export const aiSchemas = {
    chatMessage: z.object({
        message: z.string().min(1).max(10000),
        context: z.record(z.any()).optional(),
        model: z.string().optional().default('default')
    }),
    
    describeImage: z.object({
        image_url: commonSchemas.url,
        prompt: z.string().max(500).optional()
    }),
    
    generateHabits: z.object({
        user_data: z.record(z.any()),
        preferences: z.record(z.any()).optional()
    })
};

/**
 * Notion import validation schemas
 */
export const notionSchemas = {
    importNotion: z.object({
        file: z.any(), // Multer file object
        options: z.object({
            create_collections: z.boolean().default(true),
            import_relations: z.boolean().default(true)
        }).optional()
    })
};

/**
 * CSV import validation schemas
 */
export const csvSchemas = {
    importCSV: z.object({
        files: z.array(z.any()).min(1),
        collection_name: z.string().min(1).max(100).optional(),
        options: z.object({
            delimiter: z.string().length(1).default(','),
            has_header: z.boolean().default(true)
        }).optional()
    })
};

/**
 * Gamification validation schemas
 */
export const gamificationSchemas = {
    awardXP: z.object({
        user_id: commonSchemas.uuid,
        amount: z.number().int().positive(),
        reason: z.string().max(200),
        metadata: z.record(z.any()).optional()
    }),
    
    unlockAchievement: z.object({
        user_id: commonSchemas.uuid,
        achievement_id: commonSchemas.uuid,
        metadata: z.record(z.any()).optional()
    }),
    
    getStats: z.object({
        user_id: commonSchemas.uuid
    })
};

/**
 * Collection/Database validation schemas
 */
export const collectionSchemas = {
    createCollection: z.object({
        name: z.string().min(1).max(100),
        schema: z.record(z.any()),
        options: z.record(z.any()).optional()
    }),
    
    updateCollection: z.object({
        collection_id: commonSchemas.uuid,
        name: z.string().min(1).max(100).optional(),
        schema: z.record(z.any()).optional()
    }),
    
    getRecords: z.object({
        collection_id: commonSchemas.uuid,
        filter: z.record(z.any()).optional(),
        sort: z.string().optional(),
        ...commonSchemas.pagination.shape
    })
};

/**
 * Middleware to validate request body against schema
 */
export function validateBody(schema) {
    return (req, res, next) => {
        try {
            req.body = schema.parse(req.body);
            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Middleware to validate request query against schema
 */
export function validateQuery(schema) {
    return (req, res, next) => {
        try {
            req.query = schema.parse(req.query);
            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Middleware to validate request params against schema
 */
export function validateParams(schema) {
    return (req, res, next) => {
        try {
            req.params = schema.parse(req.params);
            next();
        } catch (error) {
            next(error);
        }
    };
}
