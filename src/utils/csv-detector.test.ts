import { detectFieldType } from './csv-detector';
import { describe, it, expect } from 'vitest';

describe('detectFieldType', () => {
  // 1. header pattern matching
  it('detects types based on header keywords', () => {
  expect(detectFieldType('User Email', ['test@example.com']).type).toBe('email');
  expect(detectFieldType('Phone Number', ['1234567890']).type).toBe('phone');
  expect(detectFieldType('Sale Price', ['100']).type).toBe('number');
  expect(detectFieldType('Product URL', ['http://example.com']).type).toBe('url');
  expect(detectFieldType('Created Date', ['2023-01-01']).type).toBe('datetime');
  expect(detectFieldType('Is Active', ['true']).type).toBe('checkbox');
  expect(detectFieldType('Tags', ['tag1, tag2']).type).toBe('multipleSelect');
  expect(detectFieldType('Background Color', ['#fff']).type).toBe('color');
  expect(detectFieldType('Age', ['25']).type).toBe('number'); // Explicit user request
  expect(detectFieldType('Profile Pic', ['img.png']).type).toBe('attachment');
  expect(detectFieldType('Img', ['img.png']).type).toBe('attachment');

  // system specific
  expect(detectFieldType('Pronouns', ['she/her']).type).toBe('text'); // Override default?
  expect(detectFieldType('Gender', ['Non-binary']).type).toBe('select');
  expect(detectFieldType('Introject Type', ['Fictive']).type).toBe('select');
  expect(detectFieldType('Role', ['Protector, Caretaker']).type).toBe('multipleSelect');
  expect(detectFieldType('Likes', ['Pizza, Games']).type).toBe('multipleSelect');
  expect(detectFieldType('Last Fronted', ['2023-01-01']).type).toBe('datetime');
  expect(detectFieldType('Days Fronted', ['5', '10']).type).toBe('number'); // Test collision with 'front' -> datetime
  });

  it('detects relations matches against existing collections', () => {
  const collections = ['authors', 'books', 'categories'];

  // exact singular match
  const result1 = detectFieldType('Author', ['Alice'], collections);
  expect(result1.type).toBe('belongsTo');
  expect(result1.target).toBe('authors');

  // plural match
  const result2 = detectFieldType('Books', ['123'], collections);
  expect(result2.type).toBe('belongsTo');
  expect(result2.target).toBe('books');

  // case insensitive match
  const result3 = detectFieldType('category', ['Fiction'], collections);
  expect(result3.type).toBe('belongsTo');
  expect(result3.target).toBe('categories');
  });

  // 2. notion special cases
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
  // though formula detection is tricky without metadata, we map 'count', 'roll' etc if possible
  // currently 'count' -> number
  expect(detectFieldType('Task Count', ['1', '5']).type).toBe('number');
  });

  // 3. value inference (fallback)
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

  // 4. edge cases
  it('defaults to text for empty columns', () => {
  expect(detectFieldType('Mystery', []).type).toBe('text');
  expect(detectFieldType('Mystery', [null, undefined, '']).type).toBe('text');
  });

  it('falls back to text for mixed garbage', () => {
  expect(detectFieldType('Mixed', ['123', 'abc', 'true']).type).toBe('text');
  });
});
