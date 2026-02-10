/**
 * Sentry integration for error tracking and performance monitoring (Backend)
 */

import * as Sentry from '@sentry/node';
import { Express } from 'express';
import { getSentryCredentials } from './credentialsDb';

let sentryInitialized = false;

/**
 * Initialize Sentry with credentials from database
 */
export async function initializeSentry(app?: Express): Promise<boolean> {
  if (sentryInitialized) {
    console.log('⚠️ Sentry já inicializado');
    return true;
  }

  try {
    const credentials = await getSentryCredentials();
    
    if (!credentials || !credentials.dsn) {
      console.log('⚠️ Sentry não configurado - Monitoramento desativado');
      return false;
    }

    const tracesSampleRate = parseFloat(credentials.tracesSampleRate || '0.1');

    Sentry.init({
      dsn: credentials.dsn,
      environment: credentials.environment || process.env.NODE_ENV || 'production',
      tracesSampleRate: tracesSampleRate,
      
      // Performance monitoring - integrations are automatic in newer versions
      integrations: app ? [
        Sentry.expressIntegration({ app }),
        Sentry.httpIntegration(),
      ] : [
        Sentry.httpIntegration(),
      ],

      // Filters
      beforeSend(event, hint) {
        // Don't send errors in development unless explicitly enabled
        if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_ENABLE_DEV) {
          return null;
        }

        // Filter out common/expected errors
        const error = hint.originalException;
        if (error && typeof error === 'object') {
          const errorMessage = (error as Error).message?.toLowerCase() || '';
          
          // Skip common client errors
          if (
            errorMessage.includes('network request failed') ||
            errorMessage.includes('failed to fetch') ||
            errorMessage.includes('aborted')
          ) {
            return null;
          }
        }

        return event;
      },

      // Breadcrumbs
      beforeBreadcrumb(breadcrumb, hint) {
        // Filter sensitive data from breadcrumbs
        if (breadcrumb.category === 'http') {
          // Remove sensitive headers
          if (breadcrumb.data?.headers) {
            const headers = breadcrumb.data.headers;
            delete headers.authorization;
            delete headers.cookie;
          }
        }
        return breadcrumb;
      },
    });

    sentryInitialized = true;
    console.log('✅ Sentry inicializado com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro ao inicializar Sentry:', error);
    return false;
  }
}

/**
 * Setup Sentry middleware for Express
 */
export function setupSentryMiddleware(app: Express) {
  if (!sentryInitialized) {
    console.log('⚠️ Sentry não inicializado, pulando middleware');
    return;
  }

  // Middleware setup is handled by expressIntegration in init
  console.log('✅ Sentry middleware configurado');
}

/**
 * Setup Sentry error handler (must be after all routes)
 */
export function setupSentryErrorHandler(app: Express) {
  if (!sentryInitialized) {
    return;
  }

  // Error handling is automatically configured by expressIntegration
  console.log('✅ Sentry error handler configurado');
}

/**
 * Capture exception manually
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (!sentryInitialized) {
    console.error('Error (Sentry not configured):', error);
    return;
  }

  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext('additional_info', context);
    }
    Sentry.captureException(error);
  });
}

/**
 * Capture message manually
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>) {
  if (!sentryInitialized) {
    console.log(`Message (Sentry not configured) [${level}]:`, message);
    return;
  }

  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext('additional_info', context);
    }
    scope.setLevel(level);
    Sentry.captureMessage(message);
  });
}

/**
 * Set user context for Sentry
 */
export function setUser(user: { id: string; email?: string; username?: string } | null) {
  if (!sentryInitialized) return;
  
  Sentry.setUser(user);
}

/**
 * Add breadcrumb
 */
export function addBreadcrumb(breadcrumb: Sentry.Breadcrumb) {
  if (!sentryInitialized) return;
  
  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * Start a transaction for performance monitoring
 */
export function startTransaction(name: string, op: string) {
  if (!sentryInitialized) return null;
  
  return Sentry.startTransaction({ name, op });
}

export { Sentry };
export default Sentry;
