/**
 * Nexarion — Bridge Engine
 *
 * Main engine that orchestrates agent discovery,
 * protocol translation, and bidirectional message routing.
 */

import { AgentDiscovery } from './discovery.js';
import { ProtocolTranslator } from './translator.js';
import type {
  AgentCard, MCPTool, MCPToolCallRequest, MCPToolCallResult,
  BridgeConfig, BridgeStats, DiscoveredAgent, TranslationResult,
} from './types.js';

export class NexarionBridge {
  private discovery: AgentDiscovery;
  private translator: ProtocolTranslator;
  private config: BridgeConfig;
  private startTime: number;
  private translationsTotal = 0;
  private translationsFailed = 0;

  constructor(config: BridgeConfig) {
    this.config = config;
    this.discovery = new AgentDiscovery(config.cacheMinutes || 5);
    this.translator = new ProtocolTranslator();
    this.startTime = Date.now();

    // Register pre-configured agents
    for (const card of config.agents) {
      this.discovery.register(card);
    }
  }

  /**
   * Discover agents from URLs and expose them as MCP tools.
   */
  async discover(urls: string[]): Promise<DiscoveredAgent[]> {
    return this.discovery.discoverAll(urls);
  }

  /**
   * List all MCP tools from all discovered agents.
   */
  listTools(): MCPTool[] {
    const agents = this.discovery.listAgents()
      .filter(a => a.status === 'online')
      .map(a => a.card);
    return this.translator.getAllTools(agents);
  }

  /**
   * Call a tool (MCP → A2A translation).
   * Finds the agent, translates the call, sends to agent, translates the response back.
   */
  async callTool(
    toolName: string,
    args: Record<string, unknown>,
    agentUrl?: string
  ): Promise<MCPToolCallResult> {
    const start = performance.now();

    try {
      const resolved = this.translator.resolveTool(toolName);
      if (!resolved) {
        return {
          content: [{ type: 'text', text: `Tool "${toolName}" not found. Use listTools() to see available tools.` }],
          isError: true,
        };
      }

      // Find the agent's RPC endpoint
      const agent = this.discovery.listAgents().find(a => a.card.name === resolved.agentName);
      const endpoint = agentUrl || agent?.card.endpoints?.jsonRpc || agent?.card.url;

      if (!endpoint) {
        return {
          content: [{ type: 'text', text: `Agent "${resolved.agentName}" has no reachable endpoint.` }],
          isError: true,
        };
      }

      // Translate MCP → A2A
      const translated = this.translator.translateMCPtoA2A(
        { name: toolName, arguments: args },
        endpoint
      );

      if (!translated.success) {
        this.translationsFailed++;
        return {
          content: [{ type: 'text', text: `Translation failed: ${translated.warnings?.join(', ')}` }],
          isError: true,
        };
      }

      // Send to A2A agent
      const rpcPayload = {
        jsonrpc: '2.0',
        method: 'message/send',
        params: translated.translated,
        id: Date.now().toString(),
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.auth?.a2aToken ? { 'Authorization': `Bearer ${this.config.auth.a2aToken}` } : {}),
        },
        body: JSON.stringify(rpcPayload),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        this.translationsFailed++;
        return {
          content: [{ type: 'text', text: `A2A agent returned error: ${response.status} ${response.statusText}` }],
          isError: true,
        };
      }

      const a2aResponse = await response.json() as Record<string, unknown>;

      // Translate A2A → MCP
      const result = this.translator.translateA2AtoMCP(
        a2aResponse.result || a2aResponse,
        resolved.skill?.name
      );

      this.translationsTotal++;
      return (result.translated as { content: MCPToolCallResult['content'] }) || {
        content: [{ type: 'text', text: JSON.stringify(a2aResponse, null, 2) }],
      };

    } catch (err) {
      this.translationsFailed++;
      return {
        content: [{ type: 'text', text: `Bridge error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }

  /**
   * Register an agent manually.
   */
  registerAgent(card: AgentCard): void {
    this.discovery.register(card);
  }

  /**
   * Get bridge statistics.
   */
  getStats(): BridgeStats {
    const agents = this.discovery.listAgents();
    return {
      agentsDiscovered: agents.length,
      toolsExposed: this.listTools().length,
      translationsTotal: this.translationsTotal,
      translationsFailed: this.translationsFailed,
      uptimeMs: Date.now() - this.startTime,
      lastDiscovery: agents.length > 0
        ? agents.reduce((latest, a) =>
            a.discoveredAt > latest ? a.discoveredAt : latest, agents[0].discoveredAt)
        : null,
    };
  }

  /**
   * Get list of all discovered agents.
   */
  listAgents(): DiscoveredAgent[] {
    return this.discovery.listAgents();
  }
}
