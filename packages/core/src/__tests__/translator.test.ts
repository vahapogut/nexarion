import { describe, it, expect } from 'vitest';
import { ProtocolTranslator } from '../translator.js';

const SAMPLE_SKILL = {
  id: 'forecast', name: 'Get Forecast', description: 'Get weather forecast for a location',
  tags: ['weather', 'location'], inputModes: ['text'], outputModes: ['text'],
};

const SAMPLE_AGENT = {
  name: 'WeatherAgent', description: 'Weather info', url: 'https://weather.agent',
  version: '1.0', capabilities: { streaming: true, pushNotifications: false, stateTransitionHistory: false },
  skills: [SAMPLE_SKILL],
  endpoints: { jsonRpc: 'https://weather.agent/jsonrpc' },
};

describe('ProtocolTranslator', () => {
  it('should convert agent skills to MCP tools', () => {
    const translator = new ProtocolTranslator();
    const tools = translator.agentToMCPTools(SAMPLE_AGENT);
    expect(tools.length).toBeGreaterThanOrEqual(1);
    expect(tools[0].name).toContain('weatheragent');
    expect(tools[0].name).toContain('forecast');
    expect(tools[0].description).toContain('Weather');
    expect(tools[0].inputSchema.type).toBe('object');
  });

  it('should add a generic send_message tool', () => {
    const translator = new ProtocolTranslator();
    const tools = translator.agentToMCPTools(SAMPLE_AGENT);
    const generic = tools.find(t => t.name.includes('_send'));
    expect(generic).toBeDefined();
    expect(generic!.inputSchema.properties.message).toBeDefined();
  });

  it('should translate MCP tool call to A2A message', () => {
    const translator = new ProtocolTranslator();
    const result = translator.translateMCPtoA2A(
      { name: 'test', arguments: { message: 'Hello' } },
      'https://agent.example'
    );
    expect(result.success).toBe(true);
    expect(result.direction).toBe('mcp-to-a2a');
    const msg = result.translated as { message: { parts: Array<{ text: string }> } };
    expect(msg.message.parts[0].text).toBe('Hello');
  });

  it('should translate A2A text response to MCP', () => {
    const translator = new ProtocolTranslator();
    const result = translator.translateA2AtoMCP(
      { message: { parts: [{ type: 'text', text: '22°C in Paris' }] } },
      'forecast'
    );
    expect(result.success).toBe(true);
    expect(result.direction).toBe('a2a-to-mcp');
    const mc = result.translated as { content: Array<{ text: string }> };
    expect(mc.content[0].text).toBe('22°C in Paris');
  });

  it('should handle empty A2A response', () => {
    const translator = new ProtocolTranslator();
    const result = translator.translateA2AtoMCP(
      { status: { state: 'completed' } }
    );
    expect(result.success).toBe(true);
  });

  it('should resolve tool name to agent', () => {
    const translator = new ProtocolTranslator();
    translator.agentToMCPTools(SAMPLE_AGENT);
    const resolved = translator.resolveTool('a2a_weatheragent_forecast');
    expect(resolved).toBeDefined();
    expect(resolved!.agentName).toBe('WeatherAgent');
  });

  it('should return null for unknown tool', () => {
    const translator = new ProtocolTranslator();
    expect(translator.resolveTool('nonexistent_tool')).toBeNull();
  });
});
