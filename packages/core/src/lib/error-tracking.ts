import * as Sentry from '@sentry/browser';
import { Integrations } from '@sentry/tracing';

// initialize sentry for error tracking
export const initSentry = () => {
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      integrations: [
        new Integrations.BrowserTracing(),
      ],
      tracesSampleRate: 0.1, // adjust based on production volume
      environment: import.meta.env.VITE_APP_ENV || 'production',
      release: import.meta.env.VITE_APP_VERSION || 'unknown',
      attachStacktrace: true,
    });
  }
};

// capture exception with context
export const captureException = (error: unknown, context?: Record<string, unknown>) => {
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.captureException(error, { contexts: { custom: context } });
  }
};

// capture message with context
export const captureMessage = (message: string, level: Sentry.Severity = 'info', context?: Record<string, unknown>) => {
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.captureMessage(message, { level, contexts: { custom: context } });
  }
};

// start performance monitoring transaction
export const startTransaction = (name: string, operation: string) => {
  if (import.meta.env.VITE_SENTRY_DSN) {
    return Sentry.startTransaction({ name, operation });
  }
  return null;
};

// finish transaction
export const finishTransaction = (transaction: ReturnType<typeof Sentry.startTransaction> | null) => {
  if (transaction) {
    transaction.finish();
  }
};