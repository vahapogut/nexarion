import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NexarionBridge } from '../bridge.js';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof global.fetch;

function createBridge() {
  return new NexarionBridge({
    agents: [{ name: 'Test', description: '', url: 'https://test.agent', version: '1.0',
      capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: false },
      skills: [{ id: 'test', name: 'Test', description: 'Test skill', tags: [], inputModes: ['text'], outputModes: ['text'] }],
      endpoints: { jsonRpc: 'https://test.agent/jsonrpc' } }],
    direction: 'bidirectional',
    retry: { maxRetries: 2, initialDelayMs: 10, maxDelayMs: 100 },
  });
}

describe('NexarionBridge — fetchWithRetry', () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it('should return response on success', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({}) });
    const bridge = createBridge();
    const res = await (bridge as any).fetchWithRetry('https://test.agent', {});
    expect(res.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should retry on 500 error', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500, headers: new Map() } as any)
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({}) });
    const bridge = createBridge();
    const res = await (bridge as any).fetchWithRetry('https://test.agent', {});
    expect(res.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should retry on 429 with Retry-After header', async () => {
    const headers = new Map(); headers.set('Retry-After', '0');
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 429, headers } as any)
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({}) });
    const bridge = createBridge();
    const res = await (bridge as any).fetchWithRetry('https://test.agent', {});
    expect(res.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should NOT retry on 400 client error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 400, headers: new Map() } as any);
    const bridge = createBridge();
    const res = await (bridge as any).fetchWithRetry('https://test.agent', {});
    expect(res.status).toBe(400);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should throw after maxRetries exhausted', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, headers: new Map() } as any);
    const bridge = createBridge();
    await expect((bridge as any).fetchWithRetry('https://test.agent', {})).rejects.toThrow('Fetch failed');
    expect(mockFetch).toHaveBeenCalledTimes(3); // maxRetries=2 → 3 attempts (0,1,2)
  });
});

describe('NexarionBridge — tools', () => {
  it('should list tools from registered agents', () => {
    const bridge = createBridge();
    const tools = bridge.listTools();
    expect(tools.length).toBeGreaterThanOrEqual(1);
  });

  it('should return stats', () => {
    const bridge = createBridge();
    const stats = bridge.getStats();
    expect(stats.agentsDiscovered).toBeGreaterThanOrEqual(0);
    expect(stats.uptimeMs).toBeGreaterThanOrEqual(0);
  });
});
