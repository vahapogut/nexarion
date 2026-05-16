import { describe, it, expect } from 'vitest';
import { AgentRegistry } from '../index.js';

const mockCard = {
  name: 'WeatherAgent', description: 'Weather forecasts', url: 'https://weather.agent', version: '1.0',
  capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: false },
  skills: [], endpoints: {},
};

describe('AgentRegistry', () => {
  it('should register an agent', () => {
    const registry = new AgentRegistry();
    registry.register({
      card: mockCard, verified: true, registeredAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(), healthStatus: 'healthy', category: 'weather', tags: ['weather'],
    });
    expect(registry.count()).toBe(1);
  });

  it('should search by name', () => {
    const registry = new AgentRegistry();
    registry.register({
      card: mockCard, verified: true, registeredAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(), healthStatus: 'healthy', category: 'weather', tags: ['weather'],
    });
    expect(registry.search('weather').length).toBe(1);
    expect(registry.search('xyz').length).toBe(0);
  });

  it('should search by category', () => {
    const registry = new AgentRegistry();
    registry.register({
      card: mockCard, verified: true, registeredAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(), healthStatus: 'healthy', category: 'weather', tags: ['weather'],
    });
    expect(registry.search('weather').length).toBe(1);
  });

  it('should unregister an agent', () => {
    const registry = new AgentRegistry();
    registry.register({
      card: mockCard, verified: true, registeredAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(), healthStatus: 'healthy', category: 'weather', tags: ['weather'],
    });
    registry.unregister('https://weather.agent');
    expect(registry.count()).toBe(0);
  });

  it('should list healthy agents', () => {
    const registry = new AgentRegistry();
    registry.register({
      card: { ...mockCard, name: 'Healthy', url: 'https://h.agent' },
      verified: true, registeredAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(), healthStatus: 'healthy', category: 'test', tags: [],
    });
    expect(registry.healthy.length).toBe(1);
  });

  it('should count agents', () => {
    const registry = new AgentRegistry();
    expect(registry.count()).toBe(0);
    registry.register({
      card: mockCard, verified: true, registeredAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(), healthStatus: 'healthy', category: 'w', tags: [],
    });
    expect(registry.count()).toBe(1);
  });
});
