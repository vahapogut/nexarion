#!/usr/bin/env node
/**
 * Nexarion MCP Server — CLI Entry Point
 *
 * Start the bridge server. Compatible with:
 * - Claude Desktop (stdio transport)
 * - Any MCP client (HTTP transport)
 *
 * Usage:
 *   nexarion-server --agents https://agent1.example.com,https://agent2.example.com
 *   nexarion-server --config ./nexarion.config.json
 *   nexarion-server --transport stdio
 */

import { createNexarionServer } from './index.js';
import type { BridgeConfig } from 'nexarion-core';
import { readFileSync } from 'fs';

async function main() {
  const args = process.argv.slice(2);
  const flags: Record<string, string> = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].replace('--', '');
      flags[key] = args[i + 1] || 'true';
      if (args[i + 1]) i++;
    }
  }

  // ── Config ─────────────────────────────────────────────────────────

  let bridgeConfig: BridgeConfig = {
    agents: [],
    direction: 'bidirectional',
    streaming: true,
    cacheMinutes: 5,
  };

  // Load from config file
  if (flags.config) {
    try {
      const raw = readFileSync(flags.config, 'utf-8');
      const cfg = JSON.parse(raw);
      bridgeConfig = { ...bridgeConfig, ...cfg };
    } catch (err) {
      console.error(`Failed to load config: ${err}`);
      process.exit(1);
    }
  }

  // Add agents from CLI flag
  if (flags.agents) {
    for (const url of flags.agents.split(',')) {
      bridgeConfig.agents.push({
        name: url, description: 'Auto-discovered agent', url: url.trim(),
        version: 'unknown',
        capabilities: { streaming: true, pushNotifications: false, stateTransitionHistory: false },
        skills: [], endpoints: {},
      });
    }
  }

  const discover = flags.discover?.split(',').map(s => s.trim()) || [];

  // Auth from env
  if (process.env.A2A_AUTH_TOKEN) {
    bridgeConfig.auth = { a2aToken: process.env.A2A_AUTH_TOKEN };
  }

  const transport = (flags.transport || 'stdio') as 'stdio' | 'http';
  const port = parseInt(flags.port || '0');

  // ── Start ──────────────────────────────────────────────────────────

  console.error('[Nexarion] Starting MCP ↔ A2A Bridge...');

  const server = await createNexarionServer({
    bridge: bridgeConfig,
    discover,
    transport,
    port,
    debug: flags.debug !== undefined,
  });

  const stats = server.getStats();
  console.error(`[Nexarion] ✓ ${stats.agentsDiscovered} agents bridged`);
  console.error(`[Nexarion] ✓ ${stats.toolsExposed} MCP tools exposed`);

  // stdio mode — handle JSON-RPC from stdin
  if (transport === 'stdio') {
    process.stdin.setEncoding('utf-8');
    let buffer = '';

    process.stdin.on('data', async (chunk) => {
      buffer += chunk;

      // Parse complete JSON-RPC messages
      while (buffer.includes('\n')) {
        const newline = buffer.indexOf('\n');
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);

        if (!line) continue;

        try {
          const request = JSON.parse(line);
          const response = await handleStdioRequest(server, request);
          process.stdout.write(JSON.stringify(response) + '\n');
        } catch (err) {
          const errorResponse = {
            jsonrpc: '2.0',
            error: { code: -32700, message: 'Parse error' },
            id: null,
          };
          process.stdout.write(JSON.stringify(errorResponse) + '\n');
        }
      }
    });

    // Keep process alive
    process.stdin.resume();
  }
}

async function handleStdioRequest(server: Awaited<ReturnType<typeof createNexarionServer>>, request: { method: string; params?: unknown; id: string | number }) {
  const { method, params, id } = request;

  switch (method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: {
            name: 'nexarion-server',
            version: '0.1.0',
          },
        },
        id,
      };

    case 'tools/list': {
      const result = server.handleListTools();
      return { jsonrpc: '2.0', result, id };
    }

    case 'tools/call': {
      const { name, arguments: args } = (params as { name: string; arguments: Record<string, unknown> }) || {};
      const result = await server.handleCallTool(name, args || {});
      return { jsonrpc: '2.0', result, id };
    }

    case 'notifications/initialized':
      return { jsonrpc: '2.0', result: {}, id };

    default:
      return {
        jsonrpc: '2.0',
        error: { code: -32601, message: `Method not found: ${method}` },
        id,
      };
  }
}

main().catch(console.error);
