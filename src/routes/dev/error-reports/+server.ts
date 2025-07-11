/**
 * Error reporting endpoint for the flows.thepia.net server
 * Logs error reports to console during development
 *
 * Purpose: Provides a development endpoint for flows admin interface error reporting
 * Context: This enables debugging of Supabase issues, UI errors, and admin flow problems
 */

import type { APIRoute } from 'astro';

interface ErrorReport {
  type: string;
  operation?: string;
  table?: string;
  component?: string;
  action?: string;
  error?: {
    message?: string;
    name?: string;
    code?: string;
    stack?: string;
    details?: string;
    hint?: string;
  };
  context?: Record<string, any>;
  userAgent?: string;
  url?: string;
  app?: string;
  version?: string;
  timestamp?: number;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const errorReport: ErrorReport = await request.json();

    // Log the error report with timestamp and formatting
    const timestamp = new Date().toISOString();
    const reportType = errorReport.type || 'unknown';

    console.log(`\n🚨 [${timestamp}] flows.thepia.net Error Report - ${reportType.toUpperCase()}`);
    console.log('═'.repeat(70));

    // Format different types of error reports
    switch (errorReport.type) {
      case 'flows-error':
        console.log(`🔧 Flows Error - ${errorReport.operation}`);
        if (errorReport.error) {
          console.log(`❌ Error: ${errorReport.error.message || errorReport.error}`);
          if (errorReport.error.name) console.log(`🏷️  Type: ${errorReport.error.name}`);
          if (errorReport.error.code) console.log(`🔢 Code: ${errorReport.error.code}`);
          if (errorReport.error.stack)
            console.log(`📚 Stack: ${errorReport.error.stack.split('\n')[0]}`);
        }
        break;

      case 'data-error':
        console.log(`🗄️  Database Error - ${errorReport.table}.${errorReport.operation}`);
        if (errorReport.error) {
          console.log(`❌ Error: ${errorReport.error.message || errorReport.error}`);
          if (errorReport.error.code) console.log(`🔢 Code: ${errorReport.error.code}`);
          if (errorReport.error.details) console.log(`📝 Details: ${errorReport.error.details}`);
          if (errorReport.error.hint) console.log(`💡 Hint: ${errorReport.error.hint}`);
        }
        console.log(
          `🏗️  Operation: ${errorReport.operation?.toUpperCase()} on ${errorReport.table}`
        );
        break;

      case 'ui-error':
        console.log(`🎨 UI Error - ${errorReport.component}.${errorReport.action}`);
        if (errorReport.error) {
          console.log(`❌ Error: ${errorReport.error.message || errorReport.error}`);
          if (errorReport.error.name) console.log(`🏷️  Type: ${errorReport.error.name}`);
          if (errorReport.error.stack)
            console.log(`📚 Stack: ${errorReport.error.stack.split('\n')[0]}`);
        }
        console.log(`🧩 Component: ${errorReport.component}`);
        console.log(`⚡ Action: ${errorReport.action}`);
        break;

      default:
        console.log('📋 Unknown Report Type:', errorReport);
    }

    // Log context if available
    if (errorReport.context && Object.keys(errorReport.context).length > 0) {
      console.log('🔍 Context:', errorReport.context);
    }

    // Log technical details
    if (errorReport.userAgent) {
      const uaShort = errorReport.userAgent.includes('Chrome')
        ? 'Chrome'
        : errorReport.userAgent.includes('Firefox')
          ? 'Firefox'
          : errorReport.userAgent.includes('Safari')
            ? 'Safari'
            : 'Unknown';
      console.log(`🌐 Browser: ${uaShort}`);
    }
    if (errorReport.url) {
      console.log(`📍 URL: ${errorReport.url}`);
    }
    if (errorReport.app) {
      console.log(`📱 App: ${errorReport.app} v${errorReport.version || '1.0.0'}`);
    }

    console.log('═'.repeat(70));

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Flows error report logged successfully',
        timestamp,
        type: reportType,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  } catch (error) {
    console.error('❌ [Flows Error Reporting] Failed to process error report:', error);

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Failed to process flows error report',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  }
};

// GET endpoint for health check
export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      status: 'healthy',
      service: 'flows.thepia.net-error-reporting',
      timestamp: new Date().toISOString(),
      endpoints: {
        POST: 'Submit flows error reports',
        GET: 'Health check',
        OPTIONS: 'CORS preflight',
      },
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  );
};

// OPTIONS endpoint for CORS preflight
export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
