import { detectFieldType } from './csv-detector';
import { describe, it, expect } from 'vitest';

describe('detectFieldType', () => {
    // 1. Header Pattern Matching
    it('detects types based on header keywords', () => {
        expect(detectFieldType('User Email', ['test@example.com']).type).toBe('email');
        expect(detectFieldType('Phone Number', ['1234567890']).type).toBe('phone');
        expect(detectFieldType('Sale Price', ['100']).type).toBe('number');
        expect(detectFieldType('Product URL', ['http://example.com']).type).toBe('url');
        expect(detectFieldType('Created Date', ['2023-01-01']).type).toBe('datetime');
        expect(detectFieldType('Is Active', ['true']).type).toBe('checkbox');
        expect(detectFieldType('Tags', ['tag1, tag2']).type).toBe('multipleSelect');
        expect(detectFieldType('Status', ['Active']).type).toBe('select');
        expect(detectFieldType('Avatar Image', ['image.png']).type).toBe('attachment');
        expect(detectFieldType('Background Color', ['#fff']).type).toBe('color');
    });

    // 2. Notion Special Cases
    it('handles Notion multi-select format', () => {
        const result = detectFieldType('Keywords', ['productivity, work', 'life, balance']);
        expect(result.type).toBe('multipleSelect');
        expect(result.confidence).toBe('high');
    });

    it('handles Notion date format (Month DD, YYYY)', () => {
        const result = detectFieldType('Date', ['January 1, 2023', 'February 14, 2023']);
        expect(result.type).toBe('datetime');
    });

    it('handles Notion rollup/formula patterns if detectable via header', () => {
        // Though formula detection is tricky without metadata, we map 'count', 'roll' etc if possible
        // Currently 'count' -> number
        expect(detectFieldType('Task Count', ['1', '5']).type).toBe('number');
    });

    // 3. Value Inference (Fallback)
    it('infers email type from values when header is generic', () => {
        expect(detectFieldType('Contact', ['test@example.com', 'foo@bar.com']).type).toBe('email');
    });

    it('infers boolean from values', () => {
        expect(detectFieldType('Flag', ['Yes', 'No', 'Yes']).type).toBe('checkbox');
    });

    it('infers number from meaningful string numbers', () => {
        expect(detectFieldType('Metric', ['10.5', '20', '33']).type).toBe('number');
    });

    it('infers currency as number', () => {
        expect(detectFieldType('Cost', ['$10.00', '$500,000']).type).toBe('number');
    });

    it('infers url from values', () => {
        expect(detectFieldType('Website', ['https://google.com', 'http://test.com']).type).toBe('url');
    });

    // 4. Edge Cases
    it('defaults to text for empty columns', () => {
        expect(detectFieldType('Mystery', []).type).toBe('text');
        expect(detectFieldType('Mystery', [null, undefined, '']).type).toBe('text');
    });

    it('falls back to text for mixed garbage', () => {
        expect(detectFieldType('Mixed', ['123', 'abc', 'true']).type).toBe('text');
    });
});
