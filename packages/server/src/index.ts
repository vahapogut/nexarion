/**
 * Nexarion MCP Server
 *
 * Creates an MCP server that wraps A2A agents as dynamic MCP tools.
 * Works with Claude Desktop, VS Code, Cursor, and any MCP client.
 *
 * Supports: stdio (local) and Streamable HTTP (remote) transports.
 */

import { NexarionBridge } from 'nexarion-core';
import type { BridgeConfig, AgentCard, MCPTool } from 'nexarion-core';

// ─── Server Config ─────────────────────────────────────────────────────

export interface NexarionServerConfig {
  bridge: BridgeConfig;
  /** Agent URLs to auto-discover */
  discover?: string[];
  /** Transport: 'stdio' for local, 'http' for remote */
  transport?: 'stdio' | 'http';
  /** HTTP port (only for http transport) */
  port?: number;
  /** Verbose logging */
  debug?: boolean;
}

// ─── MCP Server Implementation ────────────────────────────────────────

export class NexarionServer {
  private bridge: NexarionBridge;
  private config: NexarionServerConfig;

  constructor(config: NexarionServerConfig) {
    this.config = config;
    this.bridge = new NexarionBridge(config.bridge);
  }

  /**
   * Start the server. Discovers agents and exposes them as MCP tools.
   */
  async start(): Promise<void> {
    // Auto-discover agents
    if (this.config.discover && this.config.discover.length > 0) {
      if (this.config.debug) console.log(`[Nexarion] Discovering ${this.config.discover.length} agents...`);
      const agents = await this.bridge.discover(this.config.discover);
      for (const agent of agents) {
        if (this.config.debug) {
          console.log(`[Nexarion] Discovered: ${agent.card.name} (${agent.status}) — ${agent.card.skills.length} skills`);
        }
      }
    }

    const stats = this.bridge.getStats();
    if (this.config.debug) {
      console.log(`[Nexarion] Ready — ${stats.agentsDiscovered} agents, ${stats.toolsExposed} MCP tools exposed`);
    }
  }

  /**
   * Handle MCP `tools/list` request.
   */
  handleListTools(): { tools: MCPTool[] } {
    return { tools: this.bridge.listTools() };
  }

  /**
   * Handle MCP `tools/call` request.
   */
  async handleCallTool(name: string, args: Record<string, unknown>) {
    return this.bridge.callTool(name, args);
  }

  /**
   * Get server health status.
   */
  getHealth() {
    const stats = this.bridge.getStats();
    return {
      status: 'healthy', agents: stats.agentsDiscovered, tools: stats.toolsExposed,
      translations: stats.translationsTotal, errors: stats.translationsFailed,
      uptimeMs: stats.uptimeMs, timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get server statistics.
   */
  getStats() {
    return this.bridge.getStats();
  }

  /**
   * List all discovered agents.
   */
  listAgents() {
    return this.bridge.listAgents();
  }
}

/**
 * Create and start a Nexarion server (simplified entry point).
 */
export async function createNexarionServer(config: NexarionServerConfig): Promise<NexarionServer> {
  const server = new NexarionServer(config);
  await server.start();
  return server;
}
