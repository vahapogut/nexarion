import { describe, it, expect, vi } from 'vitest';
import { AgentDiscovery } from '../discovery.js';

describe('AgentDiscovery', () => {
  it('should register an agent manually', () => {
    const discovery = new AgentDiscovery();
    const agent = discovery.register({
      name: 'TestAgent', description: 'Test', url: 'https://test.agent',
      version: '1.0', capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: false },
      skills: [], endpoints: {},
    });
    expect(agent.card.name).toBe('TestAgent');
    expect(agent.status).toBe('online');
  });

  it('should list registered agents', () => {
    const discovery = new AgentDiscovery();
    discovery.register({
      name: 'Agent1', description: '', url: 'https://a1.agent',
      version: '1.0', capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: false },
      skills: [], endpoints: {},
    });
    const agents = discovery.listAgents();
    expect(agents.length).toBe(1);
  });

  it('should forget an agent', () => {
    const discovery = new AgentDiscovery();
    discovery.register({
      name: 'Tmp', description: '', url: 'https://tmp.agent',
      version: '1.0', capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: false },
      skills: [], endpoints: {},
    });
    discovery.forget('https://tmp.agent');
    expect(discovery.listAgents().length).toBe(0);
  });

  it('should clear all cached agents', () => {
    const discovery = new AgentDiscovery();
    discovery.register({
      name: 'A', description: '', url: 'https://a.agent',
      version: '1.0', capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: false },
      skills: [], endpoints: {},
    });
    discovery.register({
      name: 'B', description: '', url: 'https://b.agent',
      version: '1.0', capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: false },
      skills: [], endpoints: {},
    });
    discovery.clear();
    expect(discovery.listAgents().length).toBe(0);
  });
});
