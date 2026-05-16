/**
 * Nexarion — Bridge Engine
 *
 * Main engine that orchestrates agent discovery,
 * protocol translation, and bidirectional message routing.
 */

import { AgentDiscovery } from './discovery.js';
import { ProtocolTranslator } from './translator.js';
import { PluginManager } from './plugins.js';
import { CapabilityAuth } from './auth.js';
import { EventBridge } from './webhook.js';
import { createACPClient, type ACPClient } from './acp.js';
import { Logger } from './logger.js';
import { AgentUnreachableError, AuthError } from './errors.js';
import type {
  AgentCard, MCPTool, MCPToolCallRequest, MCPToolCallResult,
  BridgeConfig, BridgeStats, DiscoveredAgent,
} from './types.js';

export class NexarionBridge {
  private discovery: AgentDiscovery;
  private translator: ProtocolTranslator;
  private plugins: PluginManager;
  private auth: CapabilityAuth;
  private events: EventBridge;
  private acp: ACPClient;
  private logger: Logger;
  private config: BridgeConfig;
  private startTime: number;
  private translationsTotal = 0;
  private translationsFailed = 0;
  private maxRetries = 3;
  private retryDelay = 1000;

  constructor(config: BridgeConfig) {
    this.config = config;
    this.logger = new Logger('nexarion', config.logging?.level || 'info');
    this.discovery = new AgentDiscovery(config.cacheMinutes || 5);
    this.translator = new ProtocolTranslator();
    this.plugins = new PluginManager();
    this.auth = new CapabilityAuth();
    this.events = new EventBridge();
    this.acp = createACPClient(config.auth?.a2aToken);
    this.startTime = Date.now();

    this.logger.info('NexarionBridge initialized', { agents: config.agents.length });

    // Register pre-configured agents
    for (const card of config.agents) {
      this.discovery.register(card);
    }
  }

  /** Access the plugin manager for custom middleware */
  get pluginManager(): PluginManager { return this.plugins; }

  /** Access the auth manager for capability checks */
  get authManager(): CapabilityAuth { return this.auth; }

  /** Access the event bridge for webhook registration */
  get eventBridge(): EventBridge { return this.events; }

  /** Retry a fetch with exponential backoff. Handles 429 (Rate Limit) and 5xx errors. */
  private async fetchWithRetry(url: string, options: RequestInit, retries?: number): Promise<Response> {
    const maxRetries = retries ?? this.config.retry?.maxRetries ?? this.maxRetries;
    const baseDelay = this.config.retry?.initialDelayMs ?? this.retryDelay;
    const maxDelay = this.config.retry?.maxDelayMs ?? 30000;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);

        // Success or client error (non-rate-limit) — don't retry
        if (response.ok) return response;
        if (response.status < 500 && response.status !== 429) return response;

        // Rate limit — respect Retry-After header
        if (response.status === 429 && attempt < maxRetries) {
          const retryAfter = response.headers.get('Retry-After');
          const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        // Server error — retry with backoff
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, Math.min(baseDelay * Math.pow(2, attempt), maxDelay)));
        }
      } catch (err) {
        if (attempt === maxRetries) throw err;
        await new Promise(r => setTimeout(r, Math.min(baseDelay * Math.pow(2, attempt), maxDelay)));
      }
    }
    throw new Error(`Fetch failed after ${maxRetries} retries`);
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
    agentUrl?: string,
    clientId?: string
  ): Promise<MCPToolCallResult> {
    const start = performance.now();

    try {
      // Run beforeTranslate plugin hooks
      let ctx = await this.plugins.runBeforeTranslate({ toolName, args, agentName: undefined });

      const resolved = this.translator.resolveTool(toolName);
      if (!resolved) {
        this.translationsFailed++;
        return {
          content: [{ type: 'text', text: `Tool "${toolName}" not found. Use listTools() to see available tools.` }],
          isError: true,
        };
      }

      // Auth check
      if (clientId && !this.auth.check(clientId, resolved.agentName, toolName)) {
        this.translationsFailed++;
        return {
          content: [{ type: 'text', text: `Access denied: client "${clientId}" does not have capability "${toolName}" on agent "${resolved.agentName}".` }],
          isError: true,
        };
      }

      // Find the agent and its best endpoint
      const agent = this.discovery.listAgents().find(a => a.card.name === resolved.agentName);
      if (!agent) {
        this.translationsFailed++;
        throw new AgentUnreachableError(`Agent "${resolved.agentName}" not found`);
      }

      const useREST = agent.card.endpoints?.rest;
      const endpoint = agentUrl || agent.card.endpoints?.jsonRpc || agent.card.endpoints?.rest || agent.card.url;

      if (!endpoint) {
        this.translationsFailed++;
        throw new AgentUnreachableError(`Agent "${resolved.agentName}" has no reachable endpoint`, endpoint);
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

      // Send to A2A agent — use ACP (REST) if available, otherwise JSON-RPC
      let a2aResponse: Record<string, unknown>;

      if (useREST) {
        // ACP REST-native call — simpler, curl-compatible
        this.logger.debug('Using ACP REST transport', { agent: resolved.agentName });
        const acpMessage = {
          role: 'user' as const,
          text: (args?.message as string) || JSON.stringify(args),
          context: args?.context as Record<string, unknown> | undefined,
        };
        const acpResp = await this.acp.sendMessage(agent.card.url, acpMessage);
        a2aResponse = {
          message: { role: 'agent', parts: [{ type: 'text', text: acpResp.text }, ...(acpResp.data ? [{ type: 'data', data: acpResp.data }] : [])] },
          status: { state: acpResp.status },
        };
      } else {
        // JSON-RPC call
        const rpcPayload = {
          jsonrpc: '2.0',
          method: 'message/send',
          params: translated.translated,
          id: Date.now().toString(),
        };

        const response = await this.fetchWithRetry(endpoint, {
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
          throw new AgentUnreachableError(`A2A agent returned ${response.status}`, endpoint);
        }

        a2aResponse = await response.json() as Record<string, unknown>;
      }




      // Translate A2A → MCP
      const result = this.translator.translateA2AtoMCP(
        a2aResponse.result || a2aResponse,
        resolved.skill?.name
      );

      this.translationsTotal++;

      // Run afterTranslate plugin hooks
      await this.plugins.runAfterTranslate({ toolName, agentName: resolved.agentName, result });

      // Emit webhook event for completed translation
      this.events.emit({
        agent: resolved.agentName,
        taskId: toolName,
        status: 'completed',
        data: result,
      });

      return (result.translated as { content: MCPToolCallResult['content'] }) || {
        content: [{ type: 'text', text: JSON.stringify(a2aResponse, null, 2) }],
      };

    } catch (err) {
      this.translationsFailed++;

      // Emit webhook event for failed translation
      this.events.emit({
        agent: 'unknown',
        taskId: toolName,
        status: 'failed',
        data: { error: err instanceof Error ? err.message : String(err) },
      });

      // Run plugin error hooks
      await this.plugins.runOnError({ toolName, error: err instanceof Error ? err : new Error(String(err)) });
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
