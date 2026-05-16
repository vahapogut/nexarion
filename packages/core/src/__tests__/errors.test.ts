import { describe, it, expect } from 'vitest';
import { NexarionError, DiscoveryError, TranslationError, AuthError, RateLimitError, AgentUnreachableError, ValidationError } from '../errors.js';

describe('Error Types', () => {
  it('NexarionError should have correct properties', () => {
    const e = new NexarionError('test', 'TEST_ERROR', 500);
    expect(e.message).toBe('test');
    expect(e.code).toBe('TEST_ERROR');
    expect(e.statusCode).toBe(500);
    expect(e.name).toBe('NexarionError');
  });

  it('DiscoveryError should default to 502', () => {
    const e = new DiscoveryError('agent not found', 'https://x.agent');
    expect(e.code).toBe('DISCOVERY_ERROR');
    expect(e.statusCode).toBe(502);
    expect(e.agentUrl).toBe('https://x.agent');
  });

  it('TranslationError should have direction', () => {
    const e = new TranslationError('bad mapping', 'mcp-to-a2a');
    expect(e.code).toBe('TRANSLATION_ERROR');
    expect(e.direction).toBe('mcp-to-a2a');
  });

  it('AuthError should default to 401', () => {
    const e = new AuthError('unauthorized');
    expect(e.code).toBe('AUTH_ERROR');
    expect(e.statusCode).toBe(401);
  });

  it('RateLimitError should have optional retryAfterMs', () => {
    const e = new RateLimitError('too many', 5000);
    expect(e.code).toBe('RATE_LIMIT');
    expect(e.statusCode).toBe(429);
    expect(e.retryAfterMs).toBe(5000);
  });

  it('AgentUnreachableError should have agentUrl', () => {
    const e = new AgentUnreachableError('down', 'https://x.agent');
    expect(e.code).toBe('AGENT_UNREACHABLE');
    expect(e.agentUrl).toBe('https://x.agent');
  });

  it('ValidationError should have errors array', () => {
    const e = new ValidationError('invalid', ['missing name', 'bad url']);
    expect(e.code).toBe('VALIDATION_ERROR');
    expect(e.errors).toEqual(['missing name', 'bad url']);
  });
});
