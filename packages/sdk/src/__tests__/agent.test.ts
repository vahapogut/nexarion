import { describe, it, expect } from 'vitest';
import { createAgent } from '../agent.js';

describe('createAgent (SDK)', () => {
  it('should create an agent with card', () => {
    const agent = createAgent({
      name: 'TestAgent',
      description: 'Test agent',
      skills: [{ id: 'echo', name: 'Echo', description: 'Echoes input', handler: async (input) => ({ text: input.message }) }],
    });
    expect(agent.card.name).toBe('TestAgent');
    expect(agent.card.skills.length).toBe(1);
    expect(agent.card.skills[0].id).toBe('echo');
  });

  it('should generate agent card with multiple skills', () => {
    const agent = createAgent({
      name: 'MultiSkill',
      description: 'Multiple skills',
      skills: [
        { id: 's1', name: 'Skill 1', description: 'First', handler: async () => ({ text: 'ok' }) },
        { id: 's2', name: 'Skill 2', description: 'Second', handler: async () => ({ text: 'ok' }) },
      ],
    });
    expect(agent.card.skills.length).toBe(2);
    expect(agent.card.capabilities.streaming).toBe(false);
  });

  it('should set version from config', () => {
    const agent = createAgent({
      name: 'V', description: 'd', version: '2.0',
      skills: [{ id: 'x', name: 'X', description: 'x', handler: async () => ({ text: 'ok' }) }],
    });
    expect(agent.card.version).toBe('2.0');
  });
});
