// auto-suggest service for ai fields
// provides intelligent suggestions as you type

import { searchKnowledgeBase, SearchResult } from '@/lib/vector-store';
import { secureLogger } from '@/lib/secure-logger';

export interface Suggestion {
  type: 'completion' | 'reference' | 'question' | 'action';
  text: string;
  confidence: number;
  source?: string;
  context?: string;
}

// get auto-suggestions based on current input
export async function getAutoSuggestions(
  currentText: string,
  collection: string,
  recordId?: string | number,
  maxSuggestions: number = 5
): Promise<Suggestion[]> {
  if (!currentText.trim() || currentText.length < 3) {
    return [];
  }

  try {
    // search for relevant context
    const results = await searchKnowledgeBase(currentText, 10);

    // generate different types of suggestions
    const suggestions: Suggestion[] = [];

    // 1. text completions (continue the thought)
    const completions = generateCompletions(currentText, results);
    suggestions.push(...completions);

    // 2. cross-references (link to related items)
    const references = generateReferences(results, collection);
    suggestions.push(...references);

    // 3. follow-up questions
    const questions = generateQuestions(currentText, results);
    suggestions.push(...questions);

    // 4. suggested actions
    const actions = generateActions(currentText, results);
    suggestions.push(...actions);

    // sort by confidence and return top N
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxSuggestions);
  } catch (error) {
    secureLogger.error('[AutoSuggest] failed:', error);
    return [];
  }
}

// generate text completion suggestions
function generateCompletions(currentText: string, results: SearchResult[]): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const lowerText = currentText.toLowerCase();

  for (const result of results.slice(0, 3)) {
    const content = result.chunk.content;
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);

    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();

      // check if sentence continues the current thought
      if (lowerSentence.includes(lowerText.slice(-20)) ||
          sharesKeywords(lowerText, lowerSentence)) {
        // extract the continuation
        const continuation = extractContinuation(currentText, sentence);

        if (continuation && continuation.length > 10) {
          suggestions.push({
            type: 'completion',
            text: continuation,
            confidence: result.score * 0.9,
            source: `${result.chunk.collection}:${result.chunk.recordId}`,
            context: sentence.slice(0, 100),
          });
        }
      }
    }
  }

  return suggestions;
}

// generate cross-reference suggestions
function generateReferences(results: SearchResult[], currentCollection: string): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // group by collection
  const byCollection = new Map<string, SearchResult[]>();
  for (const result of results) {
    if (result.chunk.collection === currentCollection) continue; // skip same collection

    const existing = byCollection.get(result.chunk.collection) || [];
    existing.push(result);
    byCollection.set(result.chunk.collection, existing);
  }

  // suggest top references from other collections
  for (const [collection, items] of byCollection) {
    const topItem = items[0];
    if (topItem.score > 0.6) {
      const title = topItem.chunk.metadata?.recordTitle || `record ${topItem.chunk.recordId}`;
      suggestions.push({
        type: 'reference',
        text: `see also: [[${collection}:${topItem.chunk.recordId}]] (${title})`,
        confidence: topItem.score,
        source: `${collection}:${topItem.chunk.recordId}`,
        context: topItem.chunk.content.slice(0, 100),
      });
    }
  }

  return suggestions;
}

// generate follow-up question suggestions
function generateQuestions(currentText: string, results: SearchResult[]): Suggestion[] {
  const questions: Suggestion[] = [];
  const lowerText = currentText.toLowerCase();

  // question templates based on content type
  const templates = [
    { pattern: /what|how|why/, question: 'what are the implications of this?' },
    { pattern: /problem|issue|challenge/, question: 'what solutions have you considered?' },
    { pattern: /idea|concept|theory/, question: 'how does this connect to other projects?' },
    { pattern: /task|action|step/, question: 'what blockers might you encounter?' },
    { pattern: /research|study|data/, question: 'what are the key takeaways?' },
    { pattern: /meeting|call|discussion/, question: 'what are the next steps?' },
  ];

  for (const template of templates) {
    if (template.pattern.test(lowerText)) {
      questions.push({
        type: 'question',
        text: template.question,
        confidence: 0.7,
      });
    }
  }

  // add generic questions if few matches
  if (questions.length < 2) {
    questions.push(
      { type: 'question', text: 'what are the key insights here?', confidence: 0.6 },
      { type: 'question', text: 'how does this relate to your current priorities?', confidence: 0.5 },
    );
  }

  return questions.slice(0, 3);
}

// generate action item suggestions
function generateActions(currentText: string, results: SearchResult[]): Suggestion[] {
  const actions: Suggestion[] = [];
  const lowerText = currentText.toLowerCase();

  // detect intent and suggest actions
  if (lowerText.includes('need to') || lowerText.includes('should')) {
    actions.push({
      type: 'action',
      text: 'create a task for this',
      confidence: 0.85,
    });
  }

  if (lowerText.includes('research') || lowerText.includes('look into')) {
    actions.push({
      type: 'action',
      text: 'add to research collection',
      confidence: 0.8,
    });
  }

  if (lowerText.includes('meeting') || lowerText.includes('call')) {
    actions.push({
      type: 'action',
      text: 'schedule follow-up',
      confidence: 0.75,
    });
  }

  if (lowerText.includes('idea') || lowerText.includes('concept')) {
    actions.push({
      type: 'action',
      text: 'link to related project',
      confidence: 0.7,
    });
  }

  // always suggest ai generation for substantial text
  if (currentText.length > 100) {
    actions.push({
      type: 'action',
      text: 'generate ai synthesis',
      confidence: 0.9,
    });
  }

  return actions;
}

// check if two strings share significant keywords
function sharesKeywords(a: string, b: string): boolean {
  const stopWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'she', 'use', 'her', 'way', 'many', 'oil', 'sit', 'set', 'run', 'eat', 'far', 'sea', 'eye', 'ago', 'off', 'too', 'any', 'say', 'man', 'try', 'ask', 'end', 'why', 'let', 'put', 'say', 'she', 'try', 'way', 'own', 'say', 'too', 'old', 'tell', 'very', 'when', 'much', 'would', 'there', 'their', 'what', 'said', 'each', 'which', 'will', 'about', 'could', 'other', 'after', 'first', 'never', 'these', 'think', 'where', 'being', 'every', 'great', 'might', 'shall', 'still', 'those', 'while', 'this', 'that', 'with', 'have', 'from', 'they', 'been', 'were', 'said', 'time', 'than', 'them', 'into', 'just', 'like', 'over', 'also', 'back', 'only', 'know', 'take', 'year', 'good', 'some', 'come', 'make', 'well', 'work', 'life', 'even', 'more', 'want', 'here', 'look', 'down', 'most', 'long', 'last', 'find', 'give', 'does', 'made', 'part', 'such', 'keep', 'call', 'came', 'need', 'feel', 'seem', 'turn', 'hand', 'high', 'sure', 'upon', 'head', 'help', 'home', 'side', 'move', 'both', 'five', 'once', 'same', 'must', 'name', 'left', 'each', 'done', 'open', 'case', 'show', 'live', 'play', 'went', 'told', 'seen', 'hear', 'talk', 'soon', 'read', 'stop', 'face', 'fact', 'land', 'line', 'kind', 'next', 'word']);

  const wordsA = a.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w));
  const wordsB = b.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w));

  const setA = new Set(wordsA);
  const common = wordsB.filter(w => setA.has(w));

  return common.length >= 2; // at least 2 shared keywords
}

// extract a natural continuation from a sentence
function extractContinuation(currentText: string, sentence: string): string | null {
  const currentLower = currentText.toLowerCase();
  const sentenceLower = sentence.toLowerCase();

  // find where current text appears in sentence
  let matchIndex = -1;
  for (let i = 0; i <= sentenceLower.length - currentText.length; i++) {
    if (sentenceLower.slice(i, i + currentText.length) === currentLower) {
      matchIndex = i;
      break;
    }
  }

  if (matchIndex === -1) {
    // partial match - find longest common substring ending
    for (let len = Math.min(currentText.length, 30); len > 5; len--) {
      const endOfCurrent = currentLower.slice(-len);
      const index = sentenceLower.indexOf(endOfCurrent);
      if (index !== -1) {
        const continuation = sentence.slice(index + endOfCurrent.length).trim();
        return continuation || null;
      }
    }
    return null;
  }

  // return everything after the match
  const continuation = sentence.slice(matchIndex + currentText.length).trim();
  return continuation || null;
}

// debounced suggestion fetcher for UI
export function createDebouncedSuggestions(
  callback: (suggestions: Suggestion[]) => void,
  delay: number = 300
) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastQuery: string = '';

  return (currentText: string, collection: string, recordId?: string | number) => {
    // clear previous timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // don't fetch if text hasn't changed meaningfully
    if (currentText === lastQuery) return;
    lastQuery = currentText;

    // debounce
    timeoutId = setTimeout(async () => {
      const suggestions = await getAutoSuggestions(currentText, collection, recordId);
      callback(suggestions);
    }, delay);
  };
}

// get suggestions for empty/new records (starter ideas)
export async function getStarterSuggestions(collection: string): Promise<Suggestion[]> {
  const starters: Record<string, Suggestion[]> = {
    notes: [
      { type: 'question', text: 'what are you thinking about today?', confidence: 1 },
      { type: 'question', text: 'what problem are you trying to solve?', confidence: 0.9 },
      { type: 'action', text: 'start with a brain dump', confidence: 0.8 },
    ],
    tasks: [
      { type: 'question', text: 'what needs to get done?', confidence: 1 },
      { type: 'question', text: 'what is the priority?', confidence: 0.9 },
      { type: 'action', text: 'break into subtasks', confidence: 0.8 },
    ],
    projects: [
      { type: 'question', text: 'what is the goal of this project?', confidence: 1 },
      { type: 'question', text: 'what are the key milestones?', confidence: 0.9 },
      { type: 'action', text: 'define success criteria', confidence: 0.8 },
    ],
    research: [
      { type: 'question', text: 'what are you researching?', confidence: 1 },
      { type: 'question', text: 'what questions need answers?', confidence: 0.9 },
      { type: 'action', text: 'collect source materials', confidence: 0.8 },
    ],
  };

  return starters[collection] || [
    { type: 'question', text: 'what would you like to capture?', confidence: 1 },
    { type: 'action', text: 'generate ai synthesis when ready', confidence: 0.7 },
  ];
}
