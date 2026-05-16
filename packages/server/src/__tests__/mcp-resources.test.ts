import { describe, it, expect } from 'vitest';
import { agentsToResources, agentsToPrompts, readResource, getPromptMessages } from '../mcp-resources.js';

const mockAgent = {
  name: 'TestAgent', description: 'Test', url: 'https://test.agent', version: '1.0',
  capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: false },
  skills: [{ id: 'echo', name: 'Echo', description: 'Echoes input', tags: ['test'], inputModes: ['text'], outputModes: ['text'] }],
  endpoints: {},
};

describe('MCP Resources', () => {
  it('should generate resources from agents', () => {
    const res = agentsToResources([mockAgent]);
    expect(res.length).toBeGreaterThanOrEqual(1);
    expect(res[0].name).toBe('TestAgent');
  });

  it('should generate skill resources', () => {
    const res = agentsToResources([mockAgent]);
    const skillRes = res.find(r => r.uri.includes('skills'));
    expect(skillRes).toBeDefined();
  });

  it('should read agent resource by URI', () => {
    const content = readResource('nexarion://agents/TestAgent', [mockAgent]);
    expect(content).toBeDefined();
    expect(content!.text).toBeDefined();
  });

  it('should read skill resource by URI', () => {
    const content = readResource('nexarion://agents/TestAgent/skills/echo', [mockAgent]);
    expect(content).toBeDefined();
  });

  it('should return null for unknown URI', () => {
    expect(readResource('nexarion://agents/Unknown', [mockAgent])).toBeNull();
  });
});

describe('MCP Prompts', () => {
  it('should generate prompts from agents', () => {
    const prompts = agentsToPrompts([mockAgent]);
    expect(prompts.length).toBeGreaterThanOrEqual(1);
  });

  it('should get prompt messages', () => {
    const messages = getPromptMessages('TestAgent_echo', { message: 'Hello' }, [mockAgent]);
    expect(messages).toBeDefined();
    expect(messages![0].content.type).toBe('text');
  });

  it('should return null for unknown prompt', () => {
    expect(getPromptMessages('Unknown_skill', {}, [mockAgent])).toBeNull();
  });
});
