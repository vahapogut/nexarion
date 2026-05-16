import { describe, it, expect } from 'vitest';
import { Logger } from '../logger.js';

describe('Logger', () => {
  it('should create logger with defaults', () => {
    const log = new Logger('test');
    expect(log).toBeDefined();
    expect((log as any).name).toBe('test');
    expect((log as any).minLevel).toBe('info');
  });

  it('should create logger with debug level', () => {
    const log = new Logger('debug-logger', 'debug');
    expect((log as any).minLevel).toBe('debug');
  });

  it('should create child logger', () => {
    const log = new Logger('test');
    const child = log.child('corr-123');
    expect(child).toBeDefined();
  });

  it('should use stderr when enabled', () => {
    const log = new Logger('test');
    log.useStderr = true;
    expect(log.useStderr).toBe(true);
  });

  it('should log info without throwing', () => {
    const log = new Logger('test');
    expect(() => log.info('test message')).not.toThrow();
  });

  it('should log error without throwing', () => {
    const log = new Logger('test');
    expect(() => log.error('error message')).not.toThrow();
  });
});
