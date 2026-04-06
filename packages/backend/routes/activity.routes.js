// activity routes module for pkm backend// handles activity logging and retrieval
import express from 'express';
import { asyncHandler } from '../error-handler.js';
import { validateBody, validateQuery, activitySchemas } from '../request-validator.js';
import { apiLogger } from '../logger.js';

const router = express.Router();

// apply api logger to all routesrouter.use(apiLogger);

/** * post /api/activities/log
 * log a user activity
 */
router.post('/log', validateBody(activitySchemas.logActivity), asyncHandler(async (req, res) => {
    const { user_id, activity_type, description, metadata, timestamp } = req.body;
    
    // todo: implement actual activity logging    res.status(201).json({
        success: true,
        data: {
            id: 'activity-id',
            user_id,
            activity_type,
            timestamp: timestamp || new Date().toISOString()
        }
    });
}));

/** * get /api/activities/streaks
 * get user activity streaks
 */
router.get('/streaks', asyncHandler(async (req, res) => {
    const { user_id } = req.query;
    
    // todo: implement actual streak calculation    res.json({
        success: true,
        data: {
            streaks: []
        }
    });
}));

/** * get /api/activities/history
 * get user activity history
 */
router.get('/history', validateQuery(activitySchemas.getActivities), asyncHandler(async (req, res) => {
    const { user_id, start_date, end_date, limit, activity_type } = req.query;
    
    // todo: implement actual activity retrieval    res.json({
        success: true,
        data: {
            activities: [],
            total: 0,
            page: 1,
            limit: limit || 50
        }
    });
}));

export default router;
