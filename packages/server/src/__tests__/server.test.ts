import { describe, it, expect } from 'vitest';
import { NexarionServer, type NexarionServerConfig } from '../index.js';

const testConfig: NexarionServerConfig = {
  bridge: {
    agents: [{
      name: 'TestAgent', description: 'Test', url: 'https://test.agent', version: '1.0',
      capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: false },
      skills: [{ id: 'test', name: 'Test', description: 'Test skill', tags: [], inputModes: ['text'], outputModes: ['text'] }],
      endpoints: {},
    }],
    direction: 'bidirectional',
  },
  transport: 'stdio',
};

describe('NexarionServer', () => {
  it('should create a server instance', () => {
    const server = new NexarionServer(testConfig);
    expect(server).toBeDefined();
  });

  it('should list tools', () => {
    const server = new NexarionServer(testConfig);
    const tools = server.handleListTools();
    expect(tools.tools.length).toBeGreaterThanOrEqual(1);
  });

  it('should get health status', () => {
    const server = new NexarionServer(testConfig);
    const health = server.getHealth();
    expect(health.status).toBe('healthy');
    expect(health.tools).toBeGreaterThanOrEqual(1);
    expect(health.timestamp).toBeDefined();
  });

  it('should get stats', () => {
    const server = new NexarionServer(testConfig);
    const stats = server.getStats();
    expect(stats.uptimeMs).toBeGreaterThanOrEqual(0);
    expect(stats.toolsExposed).toBeGreaterThanOrEqual(1);
  });

  it('should list agents', () => {
    const server = new NexarionServer(testConfig);
    const agents = server.listAgents();
    expect(agents.length).toBeGreaterThanOrEqual(1);
    expect(agents[0].card.name).toBe('TestAgent');
  });

  it('should have bridge accessor', () => {
    const server = new NexarionServer(testConfig);
    expect(server.bridge).toBeDefined();
  });
});
