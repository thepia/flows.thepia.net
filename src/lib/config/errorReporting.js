/**
 * Error Reporting Configuration for flows.thepia.net
 *
 * Purpose: Configures error reporting to use the local demo server endpoint
 * Context: This enables debugging of admin dashboard issues, Supabase errors, and UI problems during development
 */

// Use browser detection without Svelte-specific import for build compatibility
const browser = typeof window !== 'undefined';

/**
 * Error reporting endpoints for different environments
 * Default to local demo server, fallback to disabled
 */
// Unused error reporting endpoints - keeping for future implementation
// const _ERROR_REPORTING_ENDPOINTS = {
//   // Local demo server (default for development)
//   localDemo: null, // Will be set dynamically to current dev server
//   // Production: Intentionally not implemented yet (needs throttling/protection design)
//   productionApi: null, // Not implemented - requires throttling and protection strategy
// };

/**
 * Get the local demo server error reporting endpoint
 */
function getLocalDemoEndpoint() {
  if (!browser) return null;

  const { protocol, hostname, port } = window.location;
  return `${protocol}//${hostname}:${port}/dev/error-reports`;
}

/**
 * Check if a server endpoint is responding
 */
async function checkServerHealth(endpoint) {
  if (!endpoint) return false;

  try {
    // Create abort controller for timeout (AbortSignal.timeout is not widely supported)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (_error) {
    // Return false for any error (timeout, network, etc)
    return false;
  }
}

/**
 * Detect environment and available servers
 */
async function detectEnvironmentAndServers() {
  if (!browser) {
    return {
      environment: 'server',
      useLocalDemo: false,
      fallbackDisabled: true,
    };
  }

  const isDev =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === 'dev.thepia.net';
  const environment = isDev ? 'development' : 'production';

  // Check local demo server (current dev server)
  const localDemoEndpoint = getLocalDemoEndpoint();
  const useLocalDemo = localDemoEndpoint && (await checkServerHealth(localDemoEndpoint));

  const fallbackDisabled = !useLocalDemo;

  return {
    environment,
    useLocalDemo,
    fallbackDisabled,
  };
}

/**
 * Get error reporting configuration with smart server detection
 */
export async function getFlowsErrorReportingConfig() {
  const { environment, useLocalDemo, fallbackDisabled } = await detectEnvironmentAndServers();
  const isDev = environment === 'development';

  let endpoint;
  let serverType;

  if (isDev && useLocalDemo) {
    endpoint = getLocalDemoEndpoint();
    serverType = 'Local Demo Server (/dev/error-reports)';
  } else {
    // Production frontend error reporting not implemented yet
    endpoint = null;
    serverType = fallbackDisabled
      ? 'Disabled (no local servers available)'
      : 'Disabled (dev-only feature)';
  }

  return {
    enabled: !!endpoint,
    endpoint,
    debug: isDev,
    maxRetries: 3,
    retryDelay: 1000,
    environment,
    serverType,
    appName: 'flows.thepia.net',
    appVersion: '1.0.0',
  };
}

/**
 * Initialize error reporting for flows.thepia.net
 */
export async function initializeFlowsErrorReporting() {
  if (!browser) return false;

  try {
    const { initializeFlowsErrorReporter } = await import('../utils/errorReporter.ts');
    const config = await getFlowsErrorReportingConfig();

    initializeFlowsErrorReporter(config);

    console.log('[flows.thepia.net] Error reporting initialized:', {
      endpoint: config.endpoint,
      serverType: config.serverType,
      enabled: config.enabled,
    });

    return true;
  } catch (error) {
    console.error('[flows.thepia.net] Failed to initialize error reporting:', error);
    return false;
  }
}

/**
 * Enable global error reporting for unhandled errors
 */
export function enableGlobalFlowsErrorReporting() {
  if (!browser) return;

  // Global error handler
  window.addEventListener('error', async (event) => {
    console.error('[flows.thepia.net] Unhandled error:', event.error);

    try {
      const { reportFlowsError } = await import('../utils/errorReporter.ts');
      reportFlowsError('ui-interaction', event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'uncaught-error',
      });
    } catch (reportingError) {
      console.error('[flows.thepia.net] Failed to report uncaught error:', reportingError);
    }
  });

  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', async (event) => {
    console.error('[flows.thepia.net] Unhandled promise rejection:', event.reason);

    try {
      const { reportFlowsError } = await import('../utils/errorReporter.ts');
      reportFlowsError('api-call', event.reason, {
        type: 'unhandled-promise-rejection',
      });
    } catch (reportingError) {
      console.error('[flows.thepia.net] Failed to report promise rejection:', reportingError);
    }
  });
}

/**
 * Report admin-related errors in flows context
 */
export async function reportFlowsAdminError(operation, error, context = {}) {
  if (!browser) return;

  try {
    const { reportFlowsError } = await import('../utils/errorReporter.ts');

    reportFlowsError(operation, error, {
      adminInterface: true,
      ...context,
    });
  } catch (reportingError) {
    console.error('[flows.thepia.net] Failed to report admin error:', reportingError);
  }
}

/**
 * Report Supabase data loading errors
 */
export async function reportSupabaseError(table, operation, error, context = {}) {
  if (!browser) return;

  try {
    const { reportDataError } = await import('../utils/errorReporter.ts');

    reportDataError(table, operation, error, {
      supabase: true,
      ...context,
    });
  } catch (reportingError) {
    console.error('[flows.thepia.net] Failed to report Supabase error:', reportingError);
  }
}

/**
 * Report UI component errors
 */
export async function reportComponentError(component, action, error, context = {}) {
  if (!browser) return;

  try {
    const { reportUiError } = await import('../utils/errorReporter.ts');

    reportUiError(component, action, error, {
      ui: true,
      ...context,
    });
  } catch (reportingError) {
    console.error('[flows.thepia.net] Failed to report UI error:', reportingError);
  }
}

/**
 * Flush any pending error reports
 */
export async function flushFlowsErrorReports() {
  if (!browser) return;

  try {
    const { flushFlowsErrorReports } = await import('../utils/errorReporter.ts');
    flushFlowsErrorReports();
  } catch (error) {
    console.error('[flows.thepia.net] Failed to flush error reports:', error);
  }
}
