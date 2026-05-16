/**
 * Nexarion — Structured Logger
 *
 * JSON log format with levels, correlation IDs, and request tracing.
 * Falls back to console if pino is not installed.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  correlationId?: string;
  [key: string]: unknown;
}

export class Logger {
  constructor(private name: string, private minLevel: LogLevel = 'info') {}

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    const priority = { debug: 0, info: 1, warn: 2, error: 3 };
    if (priority[level] < priority[this.minLevel]) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      logger: this.name,
      ...meta,
    };

    if (level === 'error') {
      console.error(JSON.stringify(entry));
    } else if (level === 'warn') {
      console.warn(JSON.stringify(entry));
    } else {
      console.log(JSON.stringify(entry));
    }
  }

  debug(msg: string, meta?: Record<string, unknown>) { this.log('debug', msg, meta); }
  info(msg: string, meta?: Record<string, unknown>) { this.log('info', msg, meta); }
  warn(msg: string, meta?: Record<string, unknown>) { this.log('warn', msg, meta); }
  error(msg: string, meta?: Record<string, unknown>) { this.log('error', msg, meta); }

  /** Create a child logger with correlation ID */
  child(correlationId: string): Logger {
    const child = new Logger(`${this.name}[${correlationId}]`, this.minLevel);
    const origLog = (child as any).log.bind(child);
    (child as any).log = (level: LogLevel, msg: string, meta?: Record<string, unknown>) => {
      origLog(level, msg, { ...meta, correlationId });
    };
    return child;
  }
}

export const logger = new Logger('nexarion');
