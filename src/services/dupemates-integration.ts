// dupemates integration hooks for rag
// indexes dupemate interactions and provides relationship context

import { indexRecord, deleteRecordFromIndex, searchKnowledgeBase } from '@/lib/vector-store';
import { api } from '@/api/nocobase-client';
import { secureLogger } from '@/lib/secure-logger';

export interface DupemateInteraction {
  id: string;
  dupemateId: string;
  type: 'conversation' | 'activity' | 'mood' | 'conflict' | 'support';
  content: string;
  timestamp: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  topics?: string[];
  fronter?: string;
}

export interface DupemateContext {
  dupemateId: string;
  name: string;
  relationshipHealth: number; // 0-100
  recentInteractions: DupemateInteraction[];
  commonTopics: string[];
  lastContact: string;
  insights: string[];
}

// index a dupemate interaction to the knowledge base
export async function indexDupemateInteraction(
  dupemateId: string,
  interaction: DupemateInteraction
): Promise<boolean> {
  try {
    // format interaction for indexing
    const content = formatInteractionForIndexing(interaction);

    // index to knowledge base
    const success = await indexRecord('dupemates', dupemateId, {
      interactions: content,
      lastInteraction: interaction.timestamp,
      relationshipHealth: String(calculateHealthScore(interaction)),
    });

    if (success) {
      secureLogger.info(`[Dupemates] indexed interaction for ${dupemateId}`);
    }

    return success;
  } catch (error) {
    secureLogger.error(`[Dupemates] failed to index interaction:`, error);
    return false;
  }
}

// batch index all dupemate interactions
export async function indexAllDupemateInteractions(): Promise<{
  indexed: number;
  failed: number;
}> {
  const result = { indexed: 0, failed: 0 };

  try {
    // fetch all dupemates
    const response: any = await api.listRecords('dupemates', { paginate: false });
    const dupemates = Array.isArray(response.data)
      ? response.data
      : response.data?.data || [];

    for (const dupemate of dupemates) {
      try {
        // extract interaction data
        const interactions = dupemate.interactions || [];
        const formattedInteractions = interactions
          .map((i: any) => formatInteractionForIndexing(i))
          .join('\n\n');

        // index dupemate data
        const success = await indexRecord('dupemates', dupemate.id, {
          name: dupemate.name,
          description: dupemate.description || '',
          interactions: formattedInteractions,
          traits: dupemate.traits || '',
          preferences: dupemate.preferences || '',
          boundaries: dupemate.boundaries || '',
          relationshipHealth: dupemate.relationshipHealth || 50,
        });

        if (success) {
          result.indexed++;
        } else {
          result.failed++;
        }
      } catch (e) {
        result.failed++;
        secureLogger.warn(`[Dupemates] failed to index ${dupemate.id}:`, e);
      }
    }
  } catch (error) {
    secureLogger.error('[Dupemates] failed to fetch dupemates:', error);
  }

  return result;
}

// get relationship context for a dupemate (for wilson chat)
export async function getDupemateContext(dupemateId: string): Promise<DupemateContext | null> {
  try {
    // fetch dupemate record
    const response: any = await api.getRecord('dupemates', dupemateId);
    const dupemate = response.data || response;

    if (!dupemate) return null;

    // fetch recent interactions
    const interactions = (dupemate.interactions || [])
      .slice(-10) // last 10
      .map((i: any) => ({
        id: i.id || String(Math.random()),
        dupemateId,
        type: i.type || 'conversation',
        content: i.content || i.notes || '',
        timestamp: i.timestamp || i.createdAt || new Date().toISOString(),
        sentiment: analyzeSentiment(i.content || ''),
        topics: extractTopics(i.content || ''),
        fronter: i.fronter || i.createdBy,
      }));

    // calculate relationship health
    const health = calculateRelationshipHealth(interactions);

    // extract common topics
    const allTopics = interactions.flatMap((i: DupemateInteraction) => i.topics || []);
    const topicCounts = new Map<string, number>();
    for (const topic of allTopics) {
      topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
    }
    const commonTopics = Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic]) => topic);

    // generate insights
    const insights = generateDupemateInsights(dupemate, interactions);

    return {
      dupemateId,
      name: dupemate.name,
      relationshipHealth: health,
      recentInteractions: interactions,
      commonTopics,
      lastContact: interactions[0]?.timestamp || dupemate.updatedAt,
      insights,
    };
  } catch (error) {
    secureLogger.error(`[Dupemates] failed to get context for ${dupemateId}:`, error);
    return null;
  }
}

// search for dupemates related to a query
export async function findRelatedDupemates(query: string, topK: number = 3): Promise<{
  dupemateId: string;
  name: string;
  relevance: number;
  context: string;
}[]> {
  try {
    const results = await searchKnowledgeBase(query, topK * 2); // get extra to filter

    // filter to dupemates only
    const dupemateResults = results.filter(r => r.chunk.collection === 'dupemates');

    return dupemateResults.slice(0, topK).map(r => ({
      dupemateId: String(r.chunk.recordId),
      name: r.chunk.metadata?.recordTitle || `dupemate ${r.chunk.recordId}`,
      relevance: r.score,
      context: r.chunk.content.slice(0, 200),
    }));
  } catch (error) {
    secureLogger.error('[Dupemates] failed to find related:', error);
    return [];
  }
}

// get relationship summary for all dupemates
export async function getAllDupematesSummary(): Promise<{
  total: number;
  healthy: number;
  needsAttention: number;
  recentActivity: number;
}> {
  try {
    const response: any = await api.listRecords('dupemates', { paginate: false });
    const dupemates = Array.isArray(response.data)
      ? response.data
      : response.data?.data || [];

    let healthy = 0;
    let needsAttention = 0;
    let recentActivity = 0;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    for (const dupemate of dupemates) {
      const health = dupemate.relationshipHealth || 50;
      if (health >= 70) healthy++;
      else if (health < 40) needsAttention++;

      const lastInteraction = dupemate.lastInteraction || dupemate.updatedAt;
      if (lastInteraction && new Date(lastInteraction) > oneWeekAgo) {
        recentActivity++;
      }
    }

    return {
      total: dupemates.length,
      healthy,
      needsAttention,
      recentActivity,
    };
  } catch (error) {
    secureLogger.error('[Dupemates] failed to get summary:', error);
    return { total: 0, healthy: 0, needsAttention: 0, recentActivity: 0 };
  }
}

// format interaction for knowledge base indexing
function formatInteractionForIndexing(interaction: DupemateInteraction): string {
  const parts: string[] = [];

  parts.push(`[${interaction.type}] ${new Date(interaction.timestamp).toLocaleDateString()}`);

  if (interaction.fronter) {
    parts.push(`fronter: ${interaction.fronter}`);
  }

  if (interaction.sentiment) {
    parts.push(`sentiment: ${interaction.sentiment}`);
  }

  if (interaction.topics?.length) {
    parts.push(`topics: ${interaction.topics.join(', ')}`);
  }

  parts.push(`content: ${interaction.content}`);

  return parts.join(' | ');
}

// simple sentiment analysis
function analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
  const positiveWords = ['happy', 'good', 'great', 'excellent', 'love', 'enjoy', 'fun', 'positive', 'success', 'win', 'better', 'best', 'amazing', 'wonderful', 'awesome', 'fantastic', 'perfect', 'beautiful', 'joy', 'laugh', 'smile'];
  const negativeWords = ['sad', 'bad', 'terrible', 'hate', 'angry', 'upset', 'frustrated', 'disappointed', 'fail', 'problem', 'issue', 'conflict', 'stress', 'anxiety', 'worried', 'concern', 'difficult', 'hard', 'pain', 'hurt', 'cry', 'tears'];

  const lower = text.toLowerCase();
  let positive = 0;
  let negative = 0;

  for (const word of positiveWords) {
    if (lower.includes(word)) positive++;
  }

  for (const word of negativeWords) {
    if (lower.includes(word)) negative++;
  }

  if (positive > negative) return 'positive';
  if (negative > positive) return 'negative';
  return 'neutral';
}

// extract topics from text (simple keyword extraction)
function extractTopics(text: string): string[] {
  const topics: string[] = [];

  // common dupemate-related topics
  const topicKeywords: Record<string, string[]> = {
    'fronting': ['front', 'fronting', 'switch', 'switched', 'co-con'],
    'communication': ['talk', 'chat', 'conversation', 'discuss', 'communicate'],
    'conflict': ['argue', 'fight', 'disagree', 'conflict', 'tension'],
    'support': ['help', 'support', 'care', 'comfort', 'there for'],
    'activities': ['game', 'play', 'activity', 'fun', 'hobby', 'interest'],
    'system': ['system', 'collective', 'plural', 'headmates', 'alters'],
    'trauma': ['trigger', 'flashback', 'memory', 'trauma', 'past'],
    'daily life': ['work', 'school', 'chore', 'routine', 'daily'],
    'mental health': ['anxiety', 'depression', 'therapy', 'medication', 'coping'],
    'relationships': ['friend', 'partner', 'family', 'relationship', 'connection'],
  };

  const lower = text.toLowerCase();

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        topics.push(topic);
        break;
      }
    }
  }

  return [...new Set(topics)];
}

// calculate health score from a single interaction
function calculateHealthScore(interaction: DupemateInteraction): number {
  let score = 50; // baseline

  // sentiment adjustment
  if (interaction.sentiment === 'positive') score += 10;
  if (interaction.sentiment === 'negative') score -= 10;

  // recency boost
  const daysSince = (Date.now() - new Date(interaction.timestamp).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince < 7) score += 5;
  if (daysSince > 30) score -= 5;

  // clamp to 0-100
  return Math.max(0, Math.min(100, score));
}

// calculate overall relationship health from interactions
function calculateRelationshipHealth(interactions: DupemateInteraction[]): number {
  if (interactions.length === 0) return 50;

  const scores = interactions.map(i => calculateHealthScore(i));
  const average = scores.reduce((a, b) => a + b, 0) / scores.length;

  // boost for recent positive interactions
  const recentPositive = interactions
    .slice(-3)
    .filter(i => i.sentiment === 'positive').length;

  return Math.min(100, average + recentPositive * 5);
}

// generate insights about dupemate relationship
function generateDupemateInsights(
  dupemate: any,
  interactions: DupemateInteraction[]
): string[] {
  const insights: string[] = [];

  if (interactions.length === 0) {
    insights.push('no recent interactions recorded');
    return insights;
  }

  // sentiment trend
  const recentSentiments = interactions.slice(-5).map(i => i.sentiment);
  const positiveCount = recentSentiments.filter(s => s === 'positive').length;
  const negativeCount = recentSentiments.filter(s => s === 'negative').length;

  if (positiveCount >= 3) {
    insights.push('relationship trending positive');
  } else if (negativeCount >= 2) {
    insights.push('some tension detected - may need attention');
  }

  // activity level
  const daysSinceLast = (Date.now() - new Date(interactions[0].timestamp).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceLast > 14) {
    insights.push('no contact in 2+ weeks - consider reaching out');
  } else if (daysSinceLast < 3) {
    insights.push('recently active - good connection');
  }

  // common topics
  const allTopics = interactions.flatMap(i => i.topics || []);
  if (allTopics.length > 0) {
    const uniqueTopics = [...new Set(allTopics)];
    insights.push(`frequent topics: ${uniqueTopics.slice(0, 3).join(', ')}`);
  }

  return insights;
}

// hook for when dupemate data changes (call from your dupemate components)
export async function onDupemateUpdated(
  dupemateId: string,
  changes: Partial<DupemateInteraction>
): Promise<void> {
  // reindex the dupemate
  await indexDupemateInteraction(dupemateId, {
    id: changes.id || String(Date.now()),
    dupemateId,
    type: changes.type || 'activity',
    content: changes.content || '',
    timestamp: changes.timestamp || new Date().toISOString(),
    sentiment: changes.sentiment,
    topics: changes.topics,
    fronter: changes.fronter,
  });

  // notify wilson context that dupemate data changed
  window.dispatchEvent(new CustomEvent('pkm:dupemate-updated', {
    detail: { dupemateId, changes },
  }));
}

// delete dupemate from index
export async function onDupemateDeleted(dupemateId: string): Promise<void> {
  await deleteRecordFromIndex('dupemates', dupemateId);
  secureLogger.info(`[Dupemates] removed ${dupemateId} from index`);
}
