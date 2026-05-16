import { describe, it, expect } from 'vitest';
import { NexarionServer } from '../index.js';

const server = new NexarionServer({
  bridge: { agents: [], direction: 'bidirectional' },
  transport: 'http',
});

describe('NexarionServer — HTTP', () => {
  it('should return health', () => {
    const h = server.getHealth();
    expect(h.status).toBe('healthy');
    expect(h.timestamp).toBeDefined();
  });

  it('should return empty tools when no agents', () => {
    const tools = server.handleListTools();
    expect(tools.tools).toEqual([]);
  });

  it('should return stats', () => {
    const s = server.getStats();
    expect(s.uptimeMs).toBeGreaterThanOrEqual(0);
    expect(s.translationsTotal).toBe(0);
  });
});
