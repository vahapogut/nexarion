/**
 * Nexarion — OpenTelemetry Integration
 *
 * Distributed tracing for MCP ↔ A2A bridge operations.
 * Traces every tools/call, discovery, and translation.
 *
 * Usage:
 * ```ts
 * const telemetry = createTelemetry({ serviceName: 'nexarion' });
 * await telemetry.trace('tools/call', { toolName: 'forecast' }, async (span) => {
 *   return bridge.callTool(name, args);
 * });
 * ```
 *
 * Requires: @opentelemetry/api, @opentelemetry/sdk-node (optional)
 */

export interface Span {
  setAttribute(key: string, value: string | number): void;
  setStatus(code: 'ok' | 'error', message?: string): void;
  end(): void;
}

export interface Tracer {
  startSpan(name: string, attributes?: Record<string, string | number>): Span;
}

export interface TelemetryConfig {
  serviceName: string;
  enabled?: boolean;
}

// ─── No-op Tracer (when OTEL is not installed) ────────────────────

class NoopSpan implements Span {
  setAttribute() {}
  setStatus() {}
  end() {}
}

class NoopTracer implements Tracer {
  startSpan(): Span { return new NoopSpan(); }
}

// ─── Real OTEL Tracer ────────────────────────────────────────────

class OTELSpan implements Span {
  constructor(private span: unknown) {}

  setAttribute(key: string, value: string | number): void {
    try { (this.span as Record<string, (...args: unknown[]) => unknown>).setAttribute?.(key, value); } catch {}
  }

  setStatus(code: 'ok' | 'error', message?: string): void {
    try {
      if (code === 'error') {
        (this.span as Record<string, (...args: unknown[]) => unknown>).recordException?.(new Error(message));
      }
      (this.span as Record<string, (...args: unknown[]) => unknown>).setStatus?.({ code: code === 'ok' ? 1 : 2, message });
    } catch {}
  }

  end(): void {
    try { (this.span as Record<string, (...args: unknown[]) => unknown>).end?.(); } catch {}
  }
}

import { createRequire } from 'node:module';

export function createTelemetry(config: TelemetryConfig): Tracer {
  if (config.enabled === false) return new NoopTracer();

  try {
    const req = createRequire(import.meta.url);
    const otel = req('@opentelemetry/api');
    if (!otel) return new NoopTracer();
    const tracer = otel.trace.getTracer(config.serviceName) as {
      startSpan(name: string, opts?: Record<string, unknown>): unknown;
    };
    return {
      startSpan(name: string, attributes?: Record<string, string | number>): Span {
        const span = tracer.startSpan(name, attributes ? { attributes } : undefined);
        return new OTELSpan(span);
      },
    };
  } catch {
    return new NoopTracer();
  }
}

// ─── Helper ──────────────────────────────────────────────────────

export async function withTracing<T>(
  tracer: Tracer,
  name: string,
  attributes: Record<string, string | number>,
  fn: (span: Span) => Promise<T>
): Promise<T> {
  const span = tracer.startSpan(name, attributes);
  try {
    const result = await fn(span);
    span.setStatus('ok');
    return result;
  } catch (err) {
    span.setStatus('error', err instanceof Error ? err.message : String(err));
    throw err;
  } finally {
    span.end();
  }
}
