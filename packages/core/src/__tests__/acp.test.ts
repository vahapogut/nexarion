import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createACPClient } from '../acp.js';

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof global.fetch;

describe('ACP Client', () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it('should create client without token', () => {
    const client = createACPClient();
    expect(client).toBeDefined();
  });

  it('should create client with token', () => {
    const client = createACPClient('test-token');
    expect(client).toBeDefined();
  });

  it('should discover agent card', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ name: 'Test', url: 'https://t.agent' }) });
    const client = createACPClient();
    const card = await client.discover('https://test.agent');
    expect(card.name).toBe('Test');
  });

  it('should send message via ACP', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ text: 'Hello', status: 'completed' }) });
    const client = createACPClient();
    const resp = await client.sendMessage('https://test.agent', { role: 'user', text: 'Hi' });
    expect(resp.text).toBe('Hello');
    expect(resp.status).toBe('completed');
  });

  it('should throw on failed discover', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found' });
    const client = createACPClient();
    await expect(client.discover('https://test.agent')).rejects.toThrow('ACP request failed: 404');
  });
});
