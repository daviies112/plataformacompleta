/**
 * Optimized Sentry Configuration
 * Stays within FREE tier limit (5K events/month)
 * Features: sample rate, filters, breadcrumbs, release tracking
 */

import * as Sentry from '@sentry/node';
import { Request, Response } from 'express';

/**
 * Sentry configuration for FREE tier
 */
export const SENTRY_CONFIG = {
  // Sample only 10% of transactions (5K events/month limit)
  tracesSampleRate: 0.1,
  
  // Sample 100% of errors (they're more important)
  sampleRate: 1.0,
  
  // Enable performance monitoring
  enableTracing: true,
  
  // Max breadcrumbs to keep in memory
  maxBreadcrumbs: 50,
  
  // Environment
  environment: process.env.NODE_ENV || 'production',
  
  // Release tracking
  release: process.env.REPLIT_DEPLOYMENT_ID || 'development',
};

/**
 * Errors to ignore (reduce noise, save quota)
 */
const IGNORED_ERRORS = [
  // Network errors (client-side, can't fix)
  'Network request failed',
  'NetworkError',
  'fetch failed',
  
  // CORS errors (configuration, not code bugs)
  'CORS',
  
  // Rate limiting (expected behavior)
  'Too many requests',
  'Rate limit exceeded',
  
  // Auth errors (user behavior)
  'Unauthorized',
  'Invalid token',
  'Token expired',
  
  // Validation errors (user input)
  'Validation failed',
  'Invalid input',
  
  // AbortError (user cancelled)
  'AbortError',
  'The user aborted a request',
];

/**
 * Initialize Sentry with optimized config
 */
export function initializeSentry(dsn: string): void {
  if (!dsn) {
    console.warn('⚠️ Sentry DSN not configured - error tracking disabled');
    return;
  }
  
  Sentry.init({
    dsn,
    ...SENTRY_CONFIG,
    
    // Integrate with Express
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app: undefined }),
    ],
    
    // Filter before sending
    beforeSend(event, hint) {
      // Check if error should be ignored
      const error = hint.originalException;
      const errorMessage = error?.toString() || '';
      
      if (IGNORED_ERRORS.some(ignored => errorMessage.includes(ignored))) {
        console.log(`🚫 Sentry: Ignored error - ${errorMessage}`);
        return null;
      }
      
      // Add custom context
      if (event.request) {
        event.tags = {
          ...event.tags,
          path: event.request.url,
          method: event.request.method,
        };
      }
      
      return event;
    },
    
    // Filter transactions
    beforeSendTransaction(event) {
      // Don't send health check transactions
      if (event.transaction?.includes('/health')) {
        return null;
      }
      
      // Don't send very fast transactions (< 100ms)
      const duration = event.timestamp! - event.start_timestamp!;
      if (duration < 0.1) {
        return null;
      }
      
      return event;
    },
  });
  
  console.log('✅ Sentry initialized with optimized config');
}

/**
 * Express request handler
 */
export function sentryRequestHandler() {
  return Sentry.Handlers.requestHandler({
    // Don't track user IP (privacy + reduces event size)
    ip: false,
    
    // Don't track request body (can be large)
    request: {
      data: false,
    },
  });
}

/**
 * Express error handler
 */
export function sentryErrorHandler() {
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Only handle 5xx errors
      const status = error.status || error.statusCode || 500;
      return status >= 500;
    },
  });
}

/**
 * Custom error logger with context
 */
export function logError(
  error: Error,
  context: {
    tenantId?: string;
    userId?: string;
    action?: string;
    metadata?: Record<string, any>;
  } = {}
): void {
  console.error('❌ Error:', error.message);
  
  Sentry.captureException(error, {
    tags: {
      tenant_id: context.tenantId,
      action: context.action,
    },
    user: context.userId ? { id: context.userId } : undefined,
    extra: context.metadata,
  });
}

/**
 * Log performance issue
 */
export function logPerformance(
  operation: string,
  duration: number,
  threshold: number = 1000
): void {
  if (duration > threshold) {
    console.warn(`⚠️ Slow operation: ${operation} took ${duration}ms`);
    
    Sentry.captureMessage(`Slow operation: ${operation}`, {
      level: 'warning',
      tags: {
        operation,
        duration_ms: duration.toString(),
      },
    });
  }
}

/**
 * Track custom event (use sparingly)
 */
export function trackEvent(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  data?: Record<string, any>
): void {
  Sentry.captureMessage(message, {
    level,
    extra: data,
  });
}

/**
 * Middleware to add breadcrumbs
 */
export function addBreadcrumb(req: Request, res: Response, next: Function): void {
  Sentry.addBreadcrumb({
    category: 'http',
    message: `${req.method} ${req.path}`,
    level: 'info',
    data: {
      method: req.method,
      url: req.path,
      query: req.query,
    },
  });
  
  next();
}

/**
 * Get Sentry statistics
 */
export function getSentryStats() {
  return {
    config: {
      dsn: Sentry.getCurrentHub().getClient()?.getDsn()?.toString() || 'not configured',
      environment: SENTRY_CONFIG.environment,
      sampleRate: SENTRY_CONFIG.sampleRate,
      tracesSampleRate: SENTRY_CONFIG.tracesSampleRate,
    },
    quota: {
      monthly_limit: 5000,
      sample_rate_applied: SENTRY_CONFIG.tracesSampleRate,
      estimated_events_per_month: '~500 (with 10% sampling)',
    },
  };
}
