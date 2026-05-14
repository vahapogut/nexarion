import { describe, it, expect } from 'vitest';
import { Validator } from '../schema.js';

describe('Validator — Agent Cards', () => {
  it('should validate a correct agent card', () => {
    const result = Validator.agentCard({
      name: 'Test', url: 'https://test.agent',
      skills: [{ id: 's1', name: 'Skill 1' }],
    });
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should reject missing name', () => {
    const result = Validator.agentCard({ url: 'https://test.agent', skills: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('name'))).toBe(true);
  });

  it('should reject missing url', () => {
    const result = Validator.agentCard({ name: 'Test', skills: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('url'))).toBe(true);
  });

  it('should reject missing skills array', () => {
    const result = Validator.agentCard({ name: 'Test', url: 'https://test.agent' });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('skills'))).toBe(true);
  });

  it('should reject skills with missing id', () => {
    const result = Validator.agentCard({
      name: 'Test', url: 'https://test.agent',
      skills: [{ name: 'No ID' }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('id'))).toBe(true);
  });

  it('should reject non-object', () => {
    const result = Validator.agentCard(null);
    expect(result.valid).toBe(false);
  });

  it('should validate MCP tool call params', () => {
    const result = Validator.mcpToolCall({ name: 'test_tool', arguments: {} });
    expect(result.valid).toBe(true);
  });

  it('should reject tool call without name', () => {
    const result = Validator.mcpToolCall({ arguments: {} });
    expect(result.valid).toBe(false);
  });
});
