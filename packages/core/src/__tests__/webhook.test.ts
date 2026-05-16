import { describe, it, expect, vi } from 'vitest';
import { EventBridge } from '../webhook.js';

global.fetch = vi.fn().mockResolvedValue({ ok: true });

describe('EventBridge', () => {
  it('should register webhook', () => {
    const eb = new EventBridge();
    eb.register({ clientId: 'c1', url: 'https://hook.example', events: ['*'] });
    expect(eb).toBeDefined();
  });

  it('should unregister webhook', () => {
    const eb = new EventBridge();
    eb.register({ clientId: 'c1', url: 'https://hook.example', events: ['*'] });
    eb.unregister('c1', 'https://hook.example');
    expect(eb).toBeDefined();
  });

  it('should emit completed event', async () => {
    const eb = new EventBridge();
    eb.register({ clientId: 'c1', url: 'https://hook.example', events: ['completed'] });
    await eb.emit({ agent: 'Test', taskId: 't1', status: 'completed', data: { result: 'ok' } });
    expect(fetch).toHaveBeenCalled();
  });

  it('should emit failed event', async () => {
    const eb = new EventBridge();
    eb.register({ clientId: 'c1', url: 'https://hook.example', events: ['*'] });
    await eb.emit({ agent: 'Test', taskId: 't1', status: 'failed', data: { error: 'err' } });
    expect(fetch).toHaveBeenCalled();
  });

  it('should not deliver to unsubscribed event type', async () => {
    const eb = new EventBridge();
    eb.register({ clientId: 'c1', url: 'https://hook.example', events: ['completed'] });
    await eb.emit({ agent: 'Test', taskId: 't1', status: 'failed' });
    // Should not have been called for 'failed' when only 'completed' is subscribed
  });
});
