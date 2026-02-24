// rag service for wilson chat and ai field generation
// orchestrates retrieval, context building, and prompt assembly

import { searchKnowledgeBase, formatChunksForPrompt, type SearchResult } from '@/lib/vector-store';
import { getWilsonRagPrompt, getAiFieldPrompt } from '@/lib/rag-prompts';
import { api } from '@/api/nocobase-client';
import { secureLogger } from '@/lib/secure-logger';

export interface RagContext {
  query: string;
  retrievedChunks: SearchResult[];
  formattedContext: string;
  sources: string[];
}

export interface RowContext {
  collection: string;
  recordId: string | number;
  data: Record<string, any>;
  relatedRecords: Record<string, any[]>;
}

// build rag context for a user query
export async function buildRagContext(
  query: string,
  topK: number = 8
): Promise<RagContext> {
  try {
    // search knowledge base
    const chunks = await searchKnowledgeBase(query, topK);

    if (chunks.length === 0) {
      return {
        query,
        retrievedChunks: [],
        formattedContext: '(no relevant context found in knowledge base)',
        sources: [],
      };
    }

    // format for prompt
    const formattedContext = formatChunksForPrompt(chunks);

    // extract unique sources
    const sources = [...new Set(chunks.map(c => `${c.chunk.collection}:${c.chunk.recordId}`))];

    return {
      query,
      retrievedChunks: chunks,
      formattedContext,
      sources,
    };
  } catch (error) {
    secureLogger.error('failed to build rag context:', error);
    return {
      query,
      retrievedChunks: [],
      formattedContext: '(error retrieving context)',
      sources: [],
    };
  }
}

// build context for a specific row/record
export async function buildRowContext(
  collection: string,
  recordId: string | number
): Promise<RowContext> {
  try {
    // fetch the record
    const recordRes: any = await api.getRecord(collection, recordId);
    const record = recordRes.data || recordRes;

    // fetch related records if relations exist
    const relatedRecords: Record<string, any[]> = {};

    // look for relation fields in the record
    for (const [key, value] of Object.entries(record)) {
      if (Array.isArray(value) && value.length > 0 && (value[0] as any)?.id) {
        // likely a has-many relation
        relatedRecords[key] = value;
      } else if (value && typeof value === 'object' && (value as any).id) {
        // likely a belongs-to relation
        relatedRecords[key] = [value];
      }
    }

    return {
      collection,
      recordId,
      data: record,
      relatedRecords,
    };
  } catch (error) {
    secureLogger.error('failed to build row context:', error);
    return {
      collection,
      recordId,
      data: {},
      relatedRecords: {},
    };
  }
}

// generate wilson prompt with rag context
export async function generateWilsonRagPrompt(
  userQuery: string,
  fronterName: string = 'friend'
): Promise<string> {
  const ragContext = await buildRagContext(userQuery, 8);

  // build the full prompt
  const prompt = getWilsonRagPrompt(fronterName, ragContext.formattedContext, userQuery);

  // log for debugging
  secureLogger.info(`[RAG] wilson query: "${userQuery}" | sources: ${ragContext.sources.length}`);

  return prompt;
}

// generate ai field content
export async function generateAiFieldContent(
  collection: string,
  recordId: string | number,
  instruction: string,
  options: {
    includeRelated?: boolean;
    topK?: number;
  } = {}
): Promise<string> {
  const { includeRelated = true, topK = 5 } = options;

  try {
    // 1. build row context
    const rowContext = await buildRowContext(collection, recordId);

    // 2. build search query from row data + instruction
    const searchQuery = buildSearchQuery(rowContext.data, instruction);

    // 3. retrieve relevant chunks
    const ragContext = await buildRagContext(searchQuery, topK);

    // 4. include related records if requested
    let relatedContext = '';
    if (includeRelated && Object.keys(rowContext.relatedRecords).length > 0) {
      relatedContext = formatRelatedRecords(rowContext.relatedRecords);
    }

    // 5. build the prompt
    const rowDataWithRelated = {
      ...rowContext.data,
      _related: includeRelated ? rowContext.relatedRecords : undefined,
    };

    const prompt = getAiFieldPrompt(rowDataWithRelated, [ragContext.formattedContext, relatedContext].filter(Boolean), instruction);

    return prompt;
  } catch (error) {
    secureLogger.error('failed to generate ai field content:', error);
    throw error;
  }
}

// build an effective search query from row data
function buildSearchQuery(rowData: Record<string, any>, instruction: string): string {
  // extract key terms from the row
  const keyFields = ['title', 'name', 'description', 'content', 'body', 'text', 'summary', 'tags', 'category'];
  const terms: string[] = [];

  for (const field of keyFields) {
    const value = rowData[field];
    if (typeof value === 'string' && value.length > 0) {
      // take first 100 chars of each key field
      terms.push(value.slice(0, 100));
    }
  }

  // combine with instruction
  const query = `${instruction} ${terms.join(' ')}`.slice(0, 500);
  return query;
}

// format related records for context
function formatRelatedRecords(related: Record<string, any[]>): string {
  const parts: string[] = ['\n## related records'];

  for (const [relationName, records] of Object.entries(related)) {
    parts.push(`\n### ${relationName}`);
    for (const record of records.slice(0, 3)) { // limit to 3 per relation
      const summary = summarizeRecord(record);
      parts.push(`- [[${record.id}]] ${summary}`);
    }
  }

  return parts.join('\n');
}

// create a brief summary of a record
function summarizeRecord(record: Record<string, any>): string {
  const titleFields = ['title', 'name', 'subject', 'headline', 'summary'];
  for (const field of titleFields) {
    if (record[field] && typeof record[field] === 'string') {
      return record[field].slice(0, 100);
    }
  }

  // fallback: use first string field
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'string' && value.length > 10 && !key.includes('id')) {
      return `${key}: ${value.slice(0, 80)}`;
    }
  }

  return 'record';
}

// smart query expansion for better retrieval
export function expandQuery(query: string): string[] {
  const expansions: string[] = [query];

  // add variations
  const lower = query.toLowerCase();

  // temporal expansions
  if (lower.includes('recent') || lower.includes('latest')) {
    expansions.push(query.replace(/recent|latest/gi, 'new'));
    expansions.push(query.replace(/recent|latest/gi, 'last week'));
  }

  // task/project expansions
  if (lower.includes('task') || lower.includes('todo')) {
    expansions.push(query.replace(/task|todo/gi, 'action item'));
    expansions.push(query.replace(/task|todo/gi, 'next step'));
  }

  // note/document expansions
  if (lower.includes('note') || lower.includes('document')) {
    expansions.push(query.replace(/note|document/gi, 'page'));
    expansions.push(query.replace(/note|document/gi, 'entry'));
  }

  // deduplicate
  return [...new Set(expansions)];
}

// batch retrieve context for multiple queries
export async function batchRetrieveContext(
  queries: string[],
  topK: number = 5
): Promise<Map<string, RagContext>> {
  const results = new Map<string, RagContext>();

  for (const query of queries) {
    const context = await buildRagContext(query, topK);
    results.set(query, context);
  }

  return results;
}

// get suggested follow-up questions based on retrieved context
export async function getSuggestedQuestions(context: RagContext): Promise<string[]> {
  if (context.retrievedChunks.length === 0) {
    return [
      'what would you like to know about?',
      'try asking about a specific project or note',
    ];
  }

  // extract key topics from chunks
  const topics = new Set<string>();
  for (const chunk of context.retrievedChunks) {
    const words = chunk.chunk.content.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (word.length > 6 && !isStopWord(word)) {
        topics.add(word);
      }
    }
  }

  // generate questions based on topics
  const topicList = Array.from(topics).slice(0, 5);
  const suggestions: string[] = [];

  if (topicList.length > 0) {
    suggestions.push(`tell me more about ${topicList[0]}`);
    if (topicList.length > 1) {
      suggestions.push(`how does ${topicList[0]} relate to ${topicList[1]}?`);
    }
  }

  suggestions.push('what are the key takeaways here?');
  suggestions.push('what should i do next?');

  return suggestions.slice(0, 3);
}

// simple stop word check
function isStopWord(word: string): boolean {
  const stopWords = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'she', 'use', 'her', 'way', 'many', 'oil', 'sit', 'set', 'run', 'eat', 'far', 'sea', 'eye', 'ago', 'off', 'too', 'any', 'say', 'man', 'try', 'ask', 'end', 'why', 'let', 'put', 'say', 'she', 'try', 'way', 'own', 'say', 'too', 'old', 'tell', 'very', 'when', 'much', 'would', 'there', 'their', 'what', 'said', 'each', 'which', 'will', 'about', 'could', 'other', 'after', 'first', 'never', 'these', 'think', 'where', 'being', 'every', 'great', 'might', 'shall', 'still', 'those', 'while', 'this', 'that', 'with', 'have', 'from', 'they', 'been', 'were', 'said', 'time', 'than', 'them', 'into', 'just', 'like', 'over', 'also', 'back', 'only', 'know', 'take', 'year', 'good', 'some', 'come', 'make', 'well', 'work', 'life', 'even', 'more', 'want', 'here', 'look', 'down', 'most', 'long', 'last', 'find', 'give', 'does', 'made', 'part', 'such', 'keep', 'call', 'came', 'need', 'feel', 'seem', 'turn', 'hand', 'high', 'sure', 'upon', 'head', 'help', 'home', 'side', 'move', 'both', 'five', 'once', 'same', 'must', 'name', 'left', 'each', 'done', 'open', 'case', 'show', 'live', 'play', 'went', 'told', 'seen', 'hear', 'talk', 'soon', 'read', 'stop', 'face', 'fact', 'land', 'line', 'kind', 'next', 'word', 'came', 'went', 'told', 'seen', 'hear', 'talk', 'soon', 'read', 'stop', 'face', 'fact', 'land', 'line', 'kind', 'next', 'word',
  ]);
  return stopWords.has(word.toLowerCase());
}
