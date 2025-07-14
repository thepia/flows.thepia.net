/**
 * Error Reporting Utilities for flows.thepia.net
 *
 * Purpose: Configurable error reporting for flows admin interface issues during development
 * Context: This enables debugging of Supabase data loading, UI errors, and admin flow issues
 */

export interface FlowsErrorEvent {
  type: 'flows-error';
  operation: 'data-load' | 'api-call' | 'ui-interaction' | 'auth-error' | 'validation-error';
  error: any;
  context?: Record<string, any>;
}

export interface DataErrorEvent {
  type: 'data-error';
  table: string;
  operation: 'select' | 'insert' | 'update' | 'delete';
  error: any;
  context?: Record<string, any>;
}

export interface UiErrorEvent {
  type: 'ui-error';
  component: string;
  action: string;
  error: any;
  context?: Record<string, any>;
}

export type FlowsErrorReportEvent = FlowsErrorEvent | DataErrorEvent | UiErrorEvent;

export interface ErrorReporterConfig {
  enabled: boolean;
  endpoint?: string;
  debug?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

class FlowsErrorReporter {
  private config: ErrorReporterConfig;
  private queue: FlowsErrorReportEvent[] = [];
  private retryQueue: { event: FlowsErrorReportEvent; attempts: number }[] = [];

  constructor(config: ErrorReporterConfig = { enabled: false }) {
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      debug: false,
      ...config,
    };
  }

  updateConfig(config: Partial<ErrorReporterConfig>) {
    this.config = { ...this.config, ...config };
  }

  async report(event: FlowsErrorReportEvent) {
    if (!this.config.enabled) {
      if (this.config.debug) {
        console.log('📊 [FlowsErrorReporter] Event (reporting disabled):', event);
      }
      return;
    }

    if (this.config.debug) {
      console.log('📊 [FlowsErrorReporter] Reporting event:', event);
    }

    if (!this.config.endpoint) {
      this.queue.push(event);
      if (this.config.debug) {
        console.warn('📊 [FlowsErrorReporter] No endpoint configured, queuing event');
      }
      return;
    }

    try {
      await this.sendEvent(event);
    } catch (error) {
      console.warn('📊 [FlowsErrorReporter] Failed to send event:', error);
      this.retryQueue.push({ event, attempts: 0 });
      this.scheduleRetry();
    }
  }

  private async sendEvent(event: FlowsErrorReportEvent) {
    const payload = {
      ...event,
      timestamp: Date.now(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      app: 'flows.thepia.net',
      version: '1.0.0',
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    let response: Response;
    try {
      response = await fetch(this.config.endpoint as string, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    } catch (error) {
      throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    if (this.config.debug) {
      console.log('📊 [FlowsErrorReporter] Event sent successfully');
    }
  }

  private scheduleRetry() {
    setTimeout(() => {
      this.processRetryQueue();
    }, this.config.retryDelay);
  }

  private async processRetryQueue() {
    const failedRetries: { event: FlowsErrorReportEvent; attempts: number }[] = [];

    for (const { event, attempts } of this.retryQueue) {
      if (attempts >= (this.config.maxRetries as number)) {
        if (this.config.debug) {
          console.warn('📊 [FlowsErrorReporter] Max retries reached for event:', event);
        }
        continue;
      }

      try {
        await this.sendEvent(event);
      } catch (_error) {
        failedRetries.push({ event, attempts: attempts + 1 });
      }
    }

    this.retryQueue = failedRetries;

    if (this.retryQueue.length > 0) {
      this.scheduleRetry();
    }
  }

  flushQueue() {
    if (!this.config.endpoint) {
      console.warn('📊 [FlowsErrorReporter] Cannot flush queue: no endpoint configured');
      return;
    }

    const queuedEvents = [...this.queue];
    this.queue = [];

    queuedEvents.forEach((event) => this.report(event));
  }

  getQueueSize() {
    return this.queue.length + this.retryQueue.length;
  }
}

// Global reporter instance
let reporter: FlowsErrorReporter | null = null;

export function initializeFlowsErrorReporter(config: ErrorReporterConfig) {
  reporter = new FlowsErrorReporter(config);

  if (config.debug) {
    console.log('📊 [FlowsErrorReporter] Initialized with config:', config);
  }
}

export function updateFlowsErrorReporterConfig(config: Partial<ErrorReporterConfig>) {
  if (!reporter) {
    console.warn(
      '📊 [FlowsErrorReporter] Not initialized. Call initializeFlowsErrorReporter first.'
    );
    return;
  }

  reporter.updateConfig(config);
}

export function reportFlowsError(
  operation: FlowsErrorEvent['operation'],
  error: any,
  context?: Record<string, any>
) {
  if (!reporter) return;

  reporter.report({
    type: 'flows-error',
    operation,
    error: {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    },
    context,
  });
}

export function reportDataError(
  table: string,
  operation: DataErrorEvent['operation'],
  error: any,
  context?: Record<string, any>
) {
  if (!reporter) return;

  reporter.report({
    type: 'data-error',
    table,
    operation,
    error: {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    },
    context,
  });
}

export function reportUiError(
  component: string,
  action: string,
  error: any,
  context?: Record<string, any>
) {
  if (!reporter) return;

  reporter.report({
    type: 'ui-error',
    component,
    action,
    error: {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
    },
    context,
  });
}

export function flushFlowsErrorReports() {
  if (!reporter) return;
  reporter.flushQueue();
}

export function getFlowsErrorReportQueueSize() {
  if (!reporter) return 0;
  return reporter.getQueueSize();
}
