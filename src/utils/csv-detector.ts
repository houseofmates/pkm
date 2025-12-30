export type FieldType =
    | 'text'
    | 'email'
    | 'phone'
    | 'password'
    | 'number'
    | 'datetime'
    | 'checkbox'
    | 'url'
    | 'color'
    | 'attachment'
    | 'select'
    | 'multipleSelect'
    | 'belongsTo'
    | 'formula';

export interface DetectionResult {
    type: FieldType;
    confidence: 'high' | 'medium' | 'low';
    reason: string;
}

const HEADER_PATTERNS: Record<string, FieldType> = {
    // Color
    color: 'color',
    colour: 'color',
    background: 'color',

    // Date
    date: 'datetime',
    created: 'datetime',
    updated: 'datetime',
    due: 'datetime',
    deadline: 'datetime',
    time: 'datetime',

    // Email
    email: 'email',
    mail: 'email',

    // URL
    url: 'url',
    link: 'url',
    website: 'url',
    web: 'url',

    // Phone
    phone: 'phone',
    tel: 'phone',
    mobile: 'phone',
    cell: 'phone',

    // Number
    price: 'number',
    cost: 'number',
    amount: 'number',
    salary: 'number',
    quantity: 'number',
    count: 'number',
    rating: 'number',
    score: 'number',
    percent: 'number',

    // Attachment
    image: 'attachment',
    photo: 'attachment',
    avatar: 'attachment',
    thumbnail: 'attachment',
    file: 'attachment',
    attachment: 'attachment',

    // Select / Status
    status: 'select',
    state: 'select',
    stage: 'select',
    type: 'select',
    category: 'select',

    // Multi-select
    tags: 'multipleSelect',
    labels: 'multipleSelect',
    keywords: 'multipleSelect',
    categories: 'multipleSelect',

    // Checkbox
    checkbox: 'checkbox',
    completed: 'checkbox',
    done: 'checkbox',
    active: 'checkbox',
    is_: 'checkbox', // Matches is_active, is_valid etc
    has_: 'checkbox',

    // Text
    description: 'text',
    notes: 'text',
    content: 'text',
    body: 'text',
    summary: 'text',
    comment: 'text',
    message: 'text',
    title: 'text',
    name: 'text',
};

export function detectFieldType(header: string, values: any[]): DetectionResult {
    const normalizedHeader = header.toLowerCase().trim();
    const nonNullValues = values.filter(v => v !== null && v !== undefined && String(v).trim() !== '');

    // 1. Check Header Patterns
    for (const [pattern, type] of Object.entries(HEADER_PATTERNS)) {
        if (normalizedHeader.includes(pattern)) {
            // Additional validations for specific types to avoid false positives
            if (type === 'multipleSelect' && !validateMultiSelect(nonNullValues)) {
                continue;
            }
            if (type === 'number' && !validateNumber(nonNullValues)) {
                continue;
            }
            return { type, confidence: 'high', reason: `matched header keyword "${pattern}"` };
        }
    }

    // 2. Inference based on values
    if (nonNullValues.length === 0) {
        return { type: 'text', confidence: 'low', reason: 'empty column' };
    }

    // Check for Email
    if (nonNullValues.every(isEmail)) {
        return { type: 'email', confidence: 'high', reason: 'all values look like emails' };
    }

    // Check for URL
    if (nonNullValues.every(isUrl)) {
        return { type: 'url', confidence: 'high', reason: 'all values look like urls' };
    }

    // Check for Date
    if (nonNullValues.every(isDate)) {
        return { type: 'datetime', confidence: 'high', reason: 'values are valid dates' };
    }

    // Check for Boolean
    if (nonNullValues.every(isBoolean)) {
        return { type: 'checkbox', confidence: 'high', reason: 'values are booleans' };
    }

    // Check for Number
    if (nonNullValues.every(isNumber)) {
        return { type: 'number', confidence: 'high', reason: 'values are numbers' };
    }

    // Check for Multi-select (comma separated values)
    if (nonNullValues.some(v => String(v).includes(',') && !String(v).includes('\n'))) {
        // Heuristic: if it has commas and fits a pattern, it might be tags
        // But sentences have commas too.
        // Check if parts match known tag-like length (short items)
        const isTags = nonNullValues.every(v => {
            const parts = String(v).split(',');
            return parts.every(p => p.trim().length < 50); // Tags are usually short
        });
        if (isTags) return { type: 'multipleSelect', confidence: 'medium', reason: 'comma-separated short values' };
    }

    // Check for short repeated strings (Select)
    const uniqueValues = new Set(nonNullValues.map(String));
    if (uniqueValues.size < nonNullValues.length * 0.5 && uniqueValues.size < 20) {
        // High repetition, low cardinality
        return { type: 'select', confidence: 'medium', reason: 'low cardinality' };
    }

    // Default to text
    return { type: 'text', confidence: 'low', reason: 'default fallback' };
}

// Helpers
const isEmail = (v: any) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v));
const isUrl = (v: any) => /^(https?:\/\/[^\s]+|www\.[^\s]+)/.test(String(v));
const isDate = (v: any) => {
    const s = String(v);
    if (!isNaN(Number(s))) return false; // purely numeric strings might be numbers not dates here
    if (s.match(/^\d{4}-\d{2}-\d{2}/)) return true; // ISO
    if (s.match(/^[A-Z][a-z]+ \d{1,2}, \d{4}/)) return true; // Month DD, YYYY (Notion)
    return !isNaN(Date.parse(s));
};
const isBoolean = (v: any) => ['true', 'false', 'yes', 'no', '1', '0', 'checked', 'unchecked'].includes(String(v).toLowerCase());
const isNumber = (v: any) => {
    const s = String(v).replace(/[$,]/g, ''); // Allow currency $ and commas
    return !isNaN(Number(s)) && s.trim() !== '';
};

const validateMultiSelect = (values: any[]) => {
    // If we think it's tags, values should behave like tags (strings, maybe commas)
    // Just ensure they aren't massive blobs of text
    return values.every(v => String(v).length < 1000);
};

const validateNumber = (values: any[]) => values.every(isNumber);
