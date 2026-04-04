// Tests for request validator
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateBody, validateQuery, validateParams } from '../request-validator.js';
import { z } from 'zod';

describe('Request Validator', () => {
    let mockReq, mockRes, mockNext;
    
    beforeEach(() => {
        mockReq = {
            body: {},
            query: {},
            params: {}
        };
        mockRes = {};
        mockNext = vi.fn();
    });
    
    describe('validateBody', () => {
        it('should validate valid body', () => {
            const schema = z.object({
                name: z.string(),
                age: z.number()
            });
            
            mockReq.body = { name: 'John', age: 30 };
            const middleware = validateBody(schema);
            middleware(mockReq, mockRes, mockNext);
            
            expect(mockNext).toHaveBeenCalled();
            expect(mockReq.body.name).toBe('John');
            expect(mockReq.body.age).toBe(30);
        });
        
        it('should reject invalid body', () => {
            const schema = z.object({
                name: z.string(),
                age: z.number()
            });
            
            mockReq.body = { name: 123, age: 'thirty' };
            const middleware = validateBody(schema);
            middleware(mockReq, mockRes, mockNext);
            
            expect(mockNext).toHaveBeenCalled();
            const error = mockNext.mock.calls[0][0];
            expect(error).toBeDefined();
        });
        
        it('should apply default values', () => {
            const schema = z.object({
                name: z.string(),
                age: z.number().default(18)
            });
            
            mockReq.body = { name: 'John' };
            const middleware = validateBody(schema);
            middleware(mockReq, mockRes, mockNext);
            
            expect(mockReq.body.age).toBe(18);
        });
    });
    
    describe('validateQuery', () => {
        it('should validate valid query', () => {
            const schema = z.object({
                page: z.number().default(1),
                limit: z.number().default(20)
            });
            
            mockReq.query = { page: '2', limit: '50' };
            const middleware = validateQuery(schema);
            middleware(mockReq, mockRes, mockNext);
            
            expect(mockNext).toHaveBeenCalled();
        });
        
        it('should reject invalid query', () => {
            const schema = z.object({
                page: z.number()
            });
            
            mockReq.query = { page: 'not-a-number' };
            const middleware = validateQuery(schema);
            middleware(mockReq, mockRes, mockNext);
            
            expect(mockNext).toHaveBeenCalled();
        });
    });
    
    describe('validateParams', () => {
        it('should validate valid params', () => {
            const schema = z.object({
                id: z.string().uuid()
            });
            
            mockReq.params = { id: '550e8400-e29b-41d4-a716-446655440000' };
            const middleware = validateParams(schema);
            middleware(mockReq, mockRes, mockNext);
            
            expect(mockNext).toHaveBeenCalled();
        });
        
        it('should reject invalid UUID', () => {
            const schema = z.object({
                id: z.string().uuid()
            });
            
            mockReq.params = { id: 'not-a-uuid' };
            const middleware = validateParams(schema);
            middleware(mockReq, mockRes, mockNext);
            
            expect(mockNext).toHaveBeenCalled();
        });
    });
});
