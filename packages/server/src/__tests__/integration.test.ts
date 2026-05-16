import { describe, it, expect } from 'vitest';
import { NexarionBridge } from 'nexarion-core';

describe('Integration — Bridge Pipeline', () => {
  const testAgent = {
    name: 'TestAgent', description: 'Integration test', url: 'https://test.local', version: '1.0',
    capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: false },
    skills: [{ id: 'echo', name: 'Echo', description: 'Echo skill', tags: [], inputModes: ['text'], outputModes: ['text'] }],
    endpoints: {},
  };

  it('should register agent and list tools', () => {
    const bridge = new NexarionBridge({
      agents: [testAgent],
      direction: 'bidirectional',
      logging: { level: 'error' },
    });
    const tools = bridge.listTools();
    expect(tools.length).toBeGreaterThanOrEqual(1);
    expect(tools.some(t => t.name.includes('echo'))).toBe(true);
  });

  it('should return error for non-existent tool', async () => {
    const bridge = new NexarionBridge({
      agents: [testAgent],
      direction: 'bidirectional',
      logging: { level: 'error' },
    });
    const result = await bridge.callTool('nonexistent_tool', {});
    expect(result.isError).toBe(true);
  });

  it('should discover agents (empty list)', async () => {
    const bridge = new NexarionBridge({
      agents: [],
      direction: 'bidirectional',
      logging: { level: 'error' },
    });
    const agents = await bridge.discover([]);
    expect(agents.length).toBe(0);
  });

  it('should access plugin manager', () => {
    const bridge = new NexarionBridge({
      agents: [testAgent],
      direction: 'bidirectional',
      logging: { level: 'error' },
    });
    const pm = bridge.pluginManager;
    expect(pm.list().length).toBe(0);
    pm.use({ name: 'test' });
    expect(pm.list()).toEqual(['test']);
  });

  it('should access auth manager', () => {
    const bridge = new NexarionBridge({
      agents: [testAgent],
      direction: 'bidirectional',
      logging: { level: 'error' },
    });
    const auth = bridge.authManager;
    auth.grant({ clientId: 'c1', agent: 'TestAgent', allowedCapabilities: ['echo'] });
    expect(auth.check('c1', 'TestAgent', 'echo')).toBe(true);
  });

  it('should access event bridge', () => {
    const bridge = new NexarionBridge({
      agents: [testAgent],
      direction: 'bidirectional',
      logging: { level: 'error' },
    });
    const events = bridge.eventBridge;
    events.register({ clientId: 'c1', url: 'https://webhook.example', events: ['*'] });
    expect(events).toBeDefined();
  });
});
