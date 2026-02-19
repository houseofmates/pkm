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
  target?: string;
}

const HEADER_PATTERNS: Record<string, FieldType> = {
  // color
  color: 'color',
  colour: 'color',
  background: 'color',

  // date
  date: 'datetime',
  created: 'datetime',
  updated: 'datetime',
  due: 'datetime',
  deadline: 'datetime',
  time: 'datetime',

  // email
  email: 'email',
  mail: 'email',

  // url
  url: 'url',
  link: 'url',
  website: 'url',
  web: 'url',

  // phone
  phone: 'phone',
  tel: 'phone',
  mobile: 'phone',
  cell: 'phone',

  // number
  price: 'number',
  cost: 'number',
  amount: 'number',
  salary: 'number',
  quantity: 'number',
  count: 'number',
  rating: 'number',
  score: 'number',
  percent: 'number',
  age: 'number', // Explicit user request

  // attachment
  image: 'attachment',
  photo: 'attachment',
  avatar: 'attachment',
  thumbnail: 'attachment',
  file: 'attachment',
  attachment: 'attachment',
  img: 'attachment',
  pic: 'attachment',

  // select / status
  status: 'select',
  state: 'select',
  stage: 'select',
  type: 'select',
  category: 'select',

  // multi-select
  tags: 'multipleSelect',
  labels: 'multipleSelect',
  keywords: 'multipleSelect',
  categories: 'multipleSelect',

  // checkbox
  checkbox: 'checkbox',
  completed: 'checkbox',
  done: 'checkbox',
  active: 'checkbox',
  is_: 'checkbox', // Matches is_active, is_valid etc
  has_: 'checkbox',

  // text
  description: 'text',
  notes: 'text',
  content: 'text',
  body: 'text',
  summary: 'text',
  comment: 'text',
  message: 'text',
  // plural system special
  front: 'datetime',
  fronting: 'datetime',
  last_fronted: 'datetime', // Handles 'last fronted', 'dynamic last fronted'

  // select / demographics
  gender: 'select',
  sexuality: 'select',
  orientation: 'select',
  pronouns: 'text',
  introject: 'select', // 'introject type'
  role: 'multipleSelect', // 'role' often has multiple values

  // tracking
  frequency: 'select', // 'fronting frequency'
  communication: 'text', // 'communication style'
  boundaries: 'text', // Long text
  triggers: 'text', // 'pos. triggers'

  // interests
  likes: 'multipleSelect',
  dislikes: 'multipleSelect',
  interests: 'multipleSelect',

  // text fallbacks for specific names
  name: 'text',
  title: 'text',
  source: 'text', // 'introject/sourced from'
};

export function detectFieldType(header: string, values: any[], existingCollections: string[] = []): DetectionResult {
  const normalizedHeader = header.toLowerCase().trim();
  const nonNullValues = values.filter(v => v !== null && v !== undefined && String(v).trim() !== '');

  // 0. check for relations (user request: "obvious references to other titles")
  // we check this before patterns in case the column name literally matches a collection name
  // (e.g. column "category" matching collection "categories" should be a relation, not just a select)
  if (existingCollections.length > 0) {
  const h = normalizedHeader.replace(/_/g, ' ');

  for (const colName of existingCollections) {
  const c = colName.toLowerCase().replace(/_/g, ' ');

  // check for match
  let match = false;
  // 1. exact
  if (h === c) match = true;
  // 2. simple plural (author <-> authors)
  else if (h + 's' === c || c + 's' === h) match = true;
  // 3. ties/y (category <-> categories)
  else if (h.endsWith('y') && h.slice(0, -1) + 'ies' === c) match = true;
  else if (c.endsWith('y') && c.slice(0, -1) + 'ies' === h) match = true;

  if (match) {
 return { type: 'belongsTo', confidence: 'high', reason: `matches collection "${colName}"`, target: colName };
  }
  }
  }

  // 1. check header patterns
  // sort patterns by length (descending) to ensure specific matches (e.g. "last fronted")
  // catch before generic ones if necessary, though our map is flat.
  for (const [pattern, type] of Object.entries(HEADER_PATTERNS)) {
  if (normalizedHeader.includes(pattern)) {
  // special handling: 'front' keywords might be number (days fronted) or date (last fronted)
  // if header contains 'days', 'hours', 'count' -> number
  if (normalizedHeader.includes('days') || normalizedHeader.includes('hours') || normalizedHeader.includes('count')) {
 if (validateNumber(nonNullValues)) return { type: 'number', confidence: 'high', reason: 'matched "days/hours" keyword' };
  }
  // additional validations for specific types to avoid false positives
  if (type === 'multipleSelect' && !validateMultiSelect(nonNullValues)) {
 continue;
  }
  if (type === 'number' && !validateNumber(nonNullValues)) {
 continue;
  }
  return { type, confidence: 'high', reason: `matched header keyword "${pattern}"` };
  }
  }

  // 2. inference based on values
  if (nonNullValues.length === 0) {
  return { type: 'text', confidence: 'low', reason: 'empty column' };
  }

  // check for email
  if (nonNullValues.every(isEmail)) {
  return { type: 'email', confidence: 'high', reason: 'all values look like emails' };
  }

  // check for url
  if (nonNullValues.every(isUrl)) {
  return { type: 'url', confidence: 'high', reason: 'all values look like urls' };
  }

  // check for date
  if (nonNullValues.every(isDate)) {
  return { type: 'datetime', confidence: 'high', reason: 'values are valid dates' };
  }

  // check for boolean
  if (nonNullValues.every(isBoolean)) {
  return { type: 'checkbox', confidence: 'high', reason: 'values are booleans' };
  }

  // check for number
  if (nonNullValues.every(isNumber)) {
  return { type: 'number', confidence: 'high', reason: 'values are numbers' };
  }

  // check for multi-select (comma separated values)
  if (nonNullValues.some(v => String(v).includes(',') && !String(v).includes('\n'))) {
  // heuristic: if it has commas and fits a pattern, it might be tags
  // but sentences have commas too.
  // check if parts match known tag-like length (short items)
  const isTags = nonNullValues.every(v => {
  const parts = String(v).split(',');
  return parts.every(p => p.trim().length < 50); // Tags are usually short
  });
  if (isTags) return { type: 'multipleSelect', confidence: 'medium', reason: 'comma-separated short values' };
  }

  // check for short repeated strings (select)
  const uniqueValues = new Set(nonNullValues.map(String));
  if (uniqueValues.size < nonNullValues.length * 0.5 && uniqueValues.size < 20) {
  // high repetition, low cardinality
  return { type: 'select', confidence: 'medium', reason: 'low cardinality' };
  }

  // default to text
  return { type: 'text', confidence: 'low', reason: 'default fallback' };
}

// helpers
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
  // if we think it's tags, values should behave like tags (strings, maybe commas)
  // just ensure they aren't massive blobs of text
  return values.every(v => String(v).length < 1000);
};

const validateNumber = (values: any[]) => values.every(isNumber);