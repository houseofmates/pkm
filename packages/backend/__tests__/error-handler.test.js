// tests for error handler middleware
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APIError, notFoundHandler, errorHandler, asyncHandler } from '../error-handler.js';

describe('Error Handler', () => {
    let mockReq, mockRes, mockNext;
    
    beforeEach(() => {
        mockReq = {
            method: 'GET',
            originalUrl: '/test'
        };
        mockRes = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
        mockNext = vi.fn();
    });
    
    describe('APIError', () => {
        it('should create error with default values', () => {
            const error = new APIError('Test error');
            expect(error.name).toBe('APIError');
            expect(error.statusCode).toBe(500);
            expect(error.code).toBe('INTERNAL_ERROR');
            expect(error.isOperational).toBe(true);
        });
        
        it('should create error with custom values', () => {
            const error = new APIError('Not found', 404, 'NOT_FOUND');
            expect(error.statusCode).toBe(404);
            expect(error.code).toBe('NOT_FOUND');
        });
    });
    
    describe('notFoundHandler', () => {
        it('should call next with 404 error', () => {
            notFoundHandler(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
            const error = mockNext.mock.calls[0][0];
            expect(error.statusCode).toBe(404);
            expect(error.code).toBe('ROUTE_NOT_FOUND');
        });
    });
    
    describe('errorHandler', () => {
        it('should handle 404 errors', () => {
            const error = new APIError('Not found', 404, 'NOT_FOUND');
            errorHandler(error, mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: {
                    message: 'Not found',
                    code: 'NOT_FOUND'
                }
            });
        });
        
        it('should handle 500 errors', () => {
            const error = new APIError('Internal error');
            errorHandler(error, mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalled();
        });
        
        it('should include stack trace in development', () => {
            process.env.NODE_ENV = 'development';
            const error = new Error('Test error');
            errorHandler(error, mockReq, mockRes, mockNext);
            const response = mockRes.json.mock.calls[0][0];
            expect(response.error.stack).toBeDefined();
        });
        
        it('should not include stack trace in production', () => {
            process.env.NODE_ENV = 'production';
            const error = new Error('Test error');
            errorHandler(error, mockReq, mockRes, mockNext);
            const response = mockRes.json.mock.calls[0][0];
            expect(response.error.stack).toBeUndefined();
        });
    });
    
    describe('asyncHandler', () => {
        it('should handle successful async operations', async () => {
            const handler = asyncHandler(async (req, res, next) => {
                res.json({ success: true });
            });
            
            await handler(mockReq, mockRes, mockNext);
            expect(mockRes.json).toHaveBeenCalledWith({ success: true });
        });
        
        it('should catch async errors', async () => {
            const error = new Error('Async error');
            const handler = asyncHandler(async (req, res, next) => {
                throw error;
            });
            
            await handler(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });
});
