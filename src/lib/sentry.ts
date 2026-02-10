/**
 * Sentry integration for error tracking and performance monitoring (Frontend)
 */

import * as Sentry from '@sentry/react';

let sentryInitialized = false;

/**
 * Initialize Sentry for frontend
 */
export async function initializeSentry(): Promise<boolean> {
  if (sentryInitialized) {
    console.log('⚠️ Sentry já inicializado');
    return true;
  }

  try {
    // Try to fetch Sentry config from backend
    const response = await fetch('/api/config/sentry', {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.log('⚠️ Sentry não configurado - Monitoramento desativado');
      return false;
    }

    const config = await response.json();
    
    if (!config.configured || !config.dsn) {
      console.log('⚠️ Sentry não configurado - Monitoramento desativado');
      return false;
    }

    const tracesSampleRate = parseFloat(config.tracesSampleRate || '0.1');

    Sentry.init({
      dsn: config.dsn,
      environment: config.environment || import.meta.env.MODE || 'production',
      tracesSampleRate: tracesSampleRate,
      
      // Performance monitoring (UPDATED for Sentry v8+ API)
      integrations: [
        Sentry.browserTracingIntegration({
          tracePropagationTargets: ['localhost', window.location.origin, /^\//],
        }),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],

      // Session Replay - only in production with low sample rate
      replaysSessionSampleRate: 0.01, // 1% of sessions
      replaysOnErrorSampleRate: 0.5, // 50% of sessions with errors

      // Filters
      beforeSend(event, hint) {
        // Don't send errors in development
        if (import.meta.env.MODE === 'development') {
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
            errorMessage.includes('script error') ||
            errorMessage.includes('non-error promise rejection')
          ) {
            return null;
          }
        }

        return event;
      },

      // Breadcrumbs
      beforeBreadcrumb(breadcrumb, hint) {
        // Filter sensitive data from breadcrumbs
        if (breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch') {
          // Remove sensitive headers
          if (breadcrumb.data?.headers) {
            const headers = breadcrumb.data.headers;
            delete headers.authorization;
            delete headers.cookie;
          }
          
          // Mask sensitive data in URLs
          if (breadcrumb.data?.url) {
            breadcrumb.data.url = breadcrumb.data.url.replace(/token=[^&]+/, 'token=***');
          }
        }
        
        if (breadcrumb.category === 'console') {
          // Skip debug console logs
          return null;
        }
        
        return breadcrumb;
      },
    });

    sentryInitialized = true;
    console.log('✅ Sentry (Frontend) inicializado com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro ao inicializar Sentry (Frontend):', error);
    return false;
  }
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
 * Create ErrorBoundary component
 */
export const ErrorBoundary = Sentry.ErrorBoundary;

export { Sentry };
export default Sentry;
