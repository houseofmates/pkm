// scheduled generation service for ai fields
// runs periodic updates for stale or empty ai content

import { batchGenerateAiFields } from './ai-field-generator';
import { api } from '@/api/nocobase-client';
import { secureLogger } from '@/lib/secure-logger';

export interface ScheduledJobConfig {
  collection: string;
  fieldName: string;
  instruction: string;
  cronExpression: string;
  maxRecordsPerRun: number;
  staleThresholdDays: number;
  enabled: boolean;
}

export interface JobRunResult {
  jobId: string;
  startedAt: Date;
  completedAt: Date;
  recordsProcessed: number;
  successful: number;
  failed: number;
  errors: string[];
}

// default job configurations
export const DEFAULT_JOBS: ScheduledJobConfig[] = [
  {
    collection: 'notes',
    fieldName: 'ai',
    instruction: 'refresh synthesis with latest context and connections',
    cronExpression: '0 2 * * *', // 2am daily
    maxRecordsPerRun: 50,
    staleThresholdDays: 7,
    enabled: true,
  },
  {
    collection: 'tasks',
    fieldName: 'ai',
    instruction: 'update with current status and next steps',
    cronExpression: '0 3 * * *', // 3am daily
    maxRecordsPerRun: 30,
    staleThresholdDays: 3,
    enabled: true,
  },
  {
    collection: 'projects',
    fieldName: 'ai',
    instruction: 'synthesize current status, risks, and milestones',
    cronExpression: '0 4 * * 0', // 4am sundays
    maxRecordsPerRun: 20,
    staleThresholdDays: 14,
    enabled: true,
  },
];

// find records that need ai field generation
export async function findRecordsNeedingGeneration(
  collection: string,
  fieldName: string,
  staleThresholdDays: number,
  maxRecords: number
): Promise<(string | number)[]> {
  try {
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - staleThresholdDays);

    // find records where ai field is empty or stale
    const response: any = await api.client.post(`/${collection}:list`, {
      filter: {
        $or: [
          { [fieldName]: { $empty: true } },
          {
            $and: [
              { [fieldName]: { $notEmpty: true } },
              { updatedAt: { $lt: staleDate.toISOString() } },
            ],
          },
        ],
      },
      sort: ['-updatedAt'],
      pageSize: maxRecords,
    });

    const records = Array.isArray(response.data)
      ? response.data
      : response.data?.data || [];

    return records.map((r: any) => r.id);
  } catch (error) {
    secureLogger.error(`[ScheduledGen] failed to find records for ${collection}:`, error);
    return [];
  }
}

// run a single scheduled job
export async function runScheduledJob(
  config: ScheduledJobConfig
): Promise<JobRunResult> {
  const jobId = `scheduled-${config.collection}-${Date.now()}`;
  const startedAt = new Date();
  const errors: string[] = [];

  secureLogger.info(`[ScheduledGen] starting job ${jobId} for ${config.collection}`);

  try {
    // find records needing generation
    const recordIds = await findRecordsNeedingGeneration(
      config.collection,
      config.fieldName,
      config.staleThresholdDays,
      config.maxRecordsPerRun
    );

    if (recordIds.length === 0) {
      secureLogger.info(`[ScheduledGen] no records need generation for ${config.collection}`);
      return {
        jobId,
        startedAt,
        completedAt: new Date(),
        recordsProcessed: 0,
        successful: 0,
        failed: 0,
        errors: [],
      };
    }

    // run batch generation
    const results = await batchGenerateAiFields(
      config.collection,
      recordIds,
      config.fieldName,
      {
        instruction: config.instruction,
        includeRelated: true,
        topK: 5,
      },
      (completed, total, currentId) => {
        secureLogger.info(`[ScheduledGen] ${config.collection}: ${completed}/${total} (current: ${currentId})`);
      }
    );

    // calculate results
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    // collect errors
    for (const result of results) {
      if (result.error) {
        errors.push(result.error);
      }
    }

    const completedAt = new Date();

    secureLogger.info(`[ScheduledGen] job ${jobId} completed: ${successful} success, ${failed} failed`);

    return {
      jobId,
      startedAt,
      completedAt,
      recordsProcessed: recordIds.length,
      successful,
      failed,
      errors: errors.slice(0, 10), // limit error log
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'unknown error';
    secureLogger.error(`[ScheduledGen] job ${jobId} failed:`, error);

    return {
      jobId,
      startedAt,
      completedAt: new Date(),
      recordsProcessed: 0,
      successful: 0,
      failed: 0,
      errors: [errorMsg],
    };
  }
}

// job scheduler (simple interval-based, can be replaced with node-cron)
class JobScheduler {
  private jobs: Map<string, ScheduledJobConfig> = new Map();
  private intervals: Map<string, ReturnType<typeof setInterval>> = new Map();
  private jobHistory: JobRunResult[] = [];

  // add a job to the scheduler
  addJob(config: ScheduledJobConfig): void {
    this.jobs.set(config.collection, config);
    secureLogger.info(`[Scheduler] added job for ${config.collection}`);
  }

  // remove a job
  removeJob(collection: string): void {
    this.stopJob(collection);
    this.jobs.delete(collection);
    secureLogger.info(`[Scheduler] removed job for ${collection}`);
  }

  // start a specific job
  startJob(collection: string): void {
    const config = this.jobs.get(collection);
    if (!config) {
      secureLogger.warn(`[Scheduler] no job found for ${collection}`);
      return;
    }

    if (!config.enabled) {
      secureLogger.info(`[Scheduler] job for ${collection} is disabled`);
      return;
    }

    // stop existing if running
    this.stopJob(collection);

    // parse cron-like expression (simplified: just minutes for demo)
    // full cron support would use node-cron
    const intervalMs = parseCronToMs(config.cronExpression);

    const interval = setInterval(async () => {
      const result = await runScheduledJob(config);
      this.jobHistory.push(result);

      // keep history manageable
      if (this.jobHistory.length > 100) {
        this.jobHistory = this.jobHistory.slice(-50);
      }
    }, intervalMs);

    this.intervals.set(collection, interval);
    secureLogger.info(`[Scheduler] started job for ${collection} (interval: ${intervalMs}ms)`);
  }

  // stop a specific job
  stopJob(collection: string): void {
    const interval = this.intervals.get(collection);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(collection);
      secureLogger.info(`[Scheduler] stopped job for ${collection}`);
    }
  }

  // start all enabled jobs
  startAll(): void {
    for (const [collection, config] of this.jobs) {
      if (config.enabled) {
        this.startJob(collection);
      }
    }
  }

  // stop all jobs
  stopAll(): void {
    for (const collection of this.intervals.keys()) {
      this.stopJob(collection);
    }
  }

  // get job status
  getStatus(): {
    jobs: ScheduledJobConfig[];
    running: string[];
    history: JobRunResult[];
  } {
    return {
      jobs: Array.from(this.jobs.values()),
      running: Array.from(this.intervals.keys()),
      history: this.jobHistory,
    };
  }

  // run a job immediately (manual trigger)
  async runNow(collection: string): Promise<JobRunResult | null> {
    const config = this.jobs.get(collection);
    if (!config) return null;

    return runScheduledJob(config);
  }
}

// simplified cron parser (returns ms for demo - use node-cron in production)
function parseCronToMs(cron: string): number {
  // for demo purposes, return 1 hour default
  // in production, use node-cron or similar
  const hourMs = 60 * 60 * 1000;

  // simple patterns
  if (cron.includes('* * * * *')) return 60 * 1000; // every minute
  if (cron.includes('0 * * * *')) return hourMs; // every hour
  if (cron.includes('0 */6 * * *')) return 6 * hourMs; // every 6 hours
  if (cron.includes('0 2 * * *')) return 24 * hourMs; // daily at 2am

  return hourMs; // default
}

// singleton instance
export const scheduler = new JobScheduler();

// initialize with default jobs
export function initializeScheduledGeneration(): void {
  for (const job of DEFAULT_JOBS) {
    scheduler.addJob(job);
  }
  secureLogger.info('[ScheduledGen] initialized with default jobs');
}

// manual trigger for a collection
export async function triggerManualGeneration(
  collection: string,
  fieldName: string = 'ai',
  instruction?: string
): Promise<JobRunResult | null> {
  const config = scheduler['jobs'].get(collection) || {
    collection,
    fieldName,
    instruction: instruction || 'generate ai synthesis',
    cronExpression: 'manual',
    maxRecordsPerRun: 100,
    staleThresholdDays: 0, // all records
    enabled: true,
  };

  return runScheduledJob(config);
}

// get records that will be processed next
export async function previewScheduledRecords(
  collection: string,
  fieldName: string = 'ai',
  staleThresholdDays: number = 7
): Promise<{ id: string | number; title: string; lastUpdated: string }[]> {
  const recordIds = await findRecordsNeedingGeneration(
    collection,
    fieldName,
    staleThresholdDays,
    20
  );

  if (recordIds.length === 0) return [];

  // fetch record details
  try {
    const response: any = await api.client.post(`/${collection}:list`, {
      filter: { id: { $in: recordIds } },
      fields: ['id', 'title', 'name', 'updatedAt'],
    });

    const records = Array.isArray(response.data)
      ? response.data
      : response.data?.data || [];

    return records.map((r: any) => ({
      id: r.id,
      title: r.title || r.name || `record ${r.id}`,
      lastUpdated: r.updatedAt,
    }));
  } catch (error) {
    secureLogger.error('[ScheduledGen] failed to preview records:', error);
    return [];
  }
}
