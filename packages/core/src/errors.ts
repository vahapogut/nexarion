/**
 * Nexarion — Error Hierarchy
 *
 * Typed errors for better debugging, monitoring, and error recovery.
 */

export class NexarionError extends Error {
  constructor(message: string, public code: string, public statusCode = 500) {
    super(message); this.name = 'NexarionError';
  }
}

export class DiscoveryError extends NexarionError {
  constructor(message: string, public agentUrl?: string) {
    super(message, 'DISCOVERY_ERROR', 502);
    this.name = 'DiscoveryError';
  }
}

export class TranslationError extends NexarionError {
  constructor(message: string, public direction?: string) {
    super(message, 'TRANSLATION_ERROR', 500);
    this.name = 'TranslationError';
  }
}

export class AuthError extends NexarionError {
  constructor(message: string) {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthError';
  }
}

export class RateLimitError extends NexarionError {
  constructor(message: string, public retryAfterMs?: number) {
    super(message, 'RATE_LIMIT', 429);
    this.name = 'RateLimitError';
  }
}

export class AgentUnreachableError extends NexarionError {
  constructor(message: string, public agentUrl?: string) {
    super(message, 'AGENT_UNREACHABLE', 502);
    this.name = 'AgentUnreachableError';
  }
}

export class ValidationError extends NexarionError {
  constructor(message: string, public errors: string[]) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}
