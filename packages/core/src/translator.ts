/**
 * Nexarion — Protocol Translator
 *
 * Translates between MCP and A2A protocols:
 * - A2A Agent Skills → MCP Tools (discovery → tool list)
 * - MCP tool calls → A2A messages (execution)
 * - A2A responses → MCP tool results (response mapping)
 * - Streaming: A2A SSE events → MCP streaming responses
 */

import type {
  AgentCard, AgentSkill, MCPTool, MCPToolCallRequest,
  MCPToolCallResult, TranslationResult, BridgeConfig, MCPProperty,
} from './types.js';

export class ProtocolTranslator {
  private agentToolMap = new Map<string, Map<string, AgentSkill>>();

  /**
   * Convert an A2A agent's skills to MCP tools.
   * Each skill becomes an MCP tool with auto-generated inputSchema.
   */
  agentToMCPTools(agent: AgentCard): MCPTool[] {
    const tools: MCPTool[] = [];
    const skillMap = new Map<string, AgentSkill>();

    for (const skill of agent.skills) {
      const toolName = `a2a_${agent.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${skill.id}`;

      const tool: MCPTool = {
        name: toolName,
        description: `[A2A Agent: ${agent.name}] ${skill.description}`,
        inputSchema: this.skillToInputSchema(skill),
      };

      tools.push(tool);
      skillMap.set(toolName, skill);
    }

    // Add a generic "send_message" tool for the agent
    const genericName = `a2a_${agent.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_send`;
    tools.push({
      name: genericName,
      description: `Send a message to the "${agent.name}" A2A agent. Agent capabilities: ${agent.skills.map(s => s.name).join(', ') || 'general conversation'}`,
      inputSchema: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Message to send to the agent' },
          skill: { type: 'string', description: `Skill to use: ${agent.skills.map(s => s.id).join(', ')}`, enum: agent.skills.map(s => s.id) },
        },
        required: ['message'],
      },
    });

    this.agentToolMap.set(agent.name, skillMap);
    return tools;
  }

  /**
   * Generate MCP input schema from an A2A skill definition.
   */
  private skillToInputSchema(skill: AgentSkill): { type: 'object'; properties: Record<string, MCPProperty>; required?: string[] } {
    const properties: Record<string, MCPProperty> = {
      message: { type: 'string', description: skill.description || 'Input for this skill' },
    };

    if (skill.tags && skill.tags.length > 0) {
      properties.context = {
        type: 'string',
        description: `Context tags: ${skill.tags.join(', ')}`,
      };
    }

    return { type: 'object', properties, required: ['message'] };
  }

  /**
   * Translate an MCP tool call to an A2A message format.
   */
  translateMCPtoA2A(toolCall: MCPToolCallRequest, agentUrl: string): TranslationResult {
    const start = performance.now();

    const a2aMessage = {
      message: {
        role: 'user',
        parts: [
          { type: 'text', text: toolCall.arguments?.message || JSON.stringify(toolCall.arguments) },
        ],
        context: toolCall.arguments?.context || undefined,
      },
      configuration: {
        blocking: false,
      },
    };

    return {
      success: true,
      direction: 'mcp-to-a2a',
      original: toolCall,
      translated: a2aMessage,
      latencyMs: Math.round(performance.now() - start),
    };
  }

  /**
   * Translate an A2A response back to MCP tool call result format.
   */
  translateA2AtoMCP(a2aResponse: { message?: { parts?: Array<{ type: string; text?: string; data?: unknown }> }; status?: { state: string } }, skillName?: string): TranslationResult {
    const start = performance.now();

    const parts = a2aResponse.message?.parts || [];
    const content: MCPToolCallResult['content'] = [];

    for (const part of parts) {
      if (part.type === 'text' && part.text) {
        content.push({ type: 'text', text: part.text });
      } else if (part.type === 'data' && part.data) {
        content.push({
          type: 'resource',
          text: typeof part.data === 'string' ? part.data : JSON.stringify(part.data, null, 2),
          mimeType: 'application/json',
        });
      }
    }

    if (content.length === 0) {
      content.push({
        type: 'text',
        text: a2aResponse.status?.state
          ? `Task status: ${a2aResponse.status.state}`
          : 'A2A agent returned empty response',
      });
    }

    return {
      success: true,
      direction: 'a2a-to-mcp',
      original: a2aResponse,
      translated: { content },
      latencyMs: Math.round(performance.now() - start),
    };
  }

  /**
   * Get all MCP tools for a set of agents.
   */
  getAllTools(agents: AgentCard[]): MCPTool[] {
    const allTools: MCPTool[] = [];
    for (const agent of agents) {
      allTools.push(...this.agentToMCPTools(agent));
    }
    return allTools;
  }

  /**
   * Find which agent a tool name belongs to.
   */
  resolveTool(toolName: string): { agentName: string; skill: AgentSkill | null } | null {
    for (const [agentName, skills] of this.agentToolMap) {
      if (skills.has(toolName)) {
        return { agentName, skill: skills.get(toolName)! };
      }
      // Check generic send tool
      const genericName = `a2a_${agentName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_send`;
      if (toolName === genericName) {
        return { agentName, skill: null };
      }
    }
    return null;
  }
}
