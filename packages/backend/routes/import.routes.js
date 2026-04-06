// import routes module for pkm backend// handles notion and csv imports
import express from 'express';
import multer from 'multer';
import { asyncHandler } from '../error-handler.js';
import { apiLogger } from '../logger.js';

const router = express.Router();

// configure multer for file uploadsconst upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, 'uploads/');
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, file.fieldname + '-' + uniqueSuffix);
        }
    }),
    limits: {
        fileSize: 50 * 1024 * 1024 // 50mb
    }
});

// apply api logger to all routesrouter.use(apiLogger);

/** * post /api/notion-import
 * import notion workspace export
 */
router.post('/notion-import', upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            error: {
                message: 'No file uploaded',
                code: 'NO_FILE'
            }
        });
    }
    
    // todo: implement actual notion import    res.status(202).json({
        success: true,
        data: {
            task_id: 'task-id',
            status: 'processing'
        }
    });
}));

/** * get /api/notion-import/:taskid/stream
 * get sse stream for import progress
 */
router.get('/notion-import/:taskId/stream', asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    
    // set up sse headers    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // todo: implement actual progress streaming    res.write('data: {"progress": 0}\n\n');
}));

/** * post /api/csv-import
 * import csv files
 */
router.post('/csv-import', upload.array('files'), asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({
            success: false,
            error: {
                message: 'No files uploaded',
                code: 'NO_FILES'
            }
        });
    }
    
    // todo: implement actual csv import    res.status(202).json({
        success: true,
        data: {
            task_id: 'task-id',
            status: 'processing'
        }
    });
}));

export default router;
