/**
 * Nexarion — HTTP/SSE Server Transport
 *
 * Streamable HTTP server with SSE support for remote deployment.
 * Works without stdio — deploy on Railway, Render, Fly.io, or any VPS.
 *
 * Endpoints:
 * - GET  /health          → Health check
 * - POST /mcp             → MCP JSON-RPC (stateless)
 * - GET  /sse             → SSE event stream for real-time updates
 * - GET  /agents          → List bridged agents
 * - GET  /stats           → Bridge statistics
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import type { NexarionServer } from './index.js';

export interface HTTPServerConfig {
  port: number;
  host?: string;
  nexarion: NexarionServer;
}

export function createHTTPServer(config: HTTPServerConfig) {
  const { port, host = '0.0.0.0', nexarion } = config;

  // Track SSE clients
  const sseClients: Set<ServerResponse> = new Set();

  const server = createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

    if (req.method === 'OPTIONS') {
      res.writeHead(204); res.end(); return;
    }

    const url = req.url || '/';

    // Health check
    if (url === '/health') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(nexarion.getHealth()));
      return;
    }

    // Agent list
    if (url === '/agents') {
      const agents = nexarion.listAgents().map(a => ({
        name: a.card.name,
        status: a.status,
        skills: a.card.skills.length,
        latency: a.latencyMs,
        discovered: a.discoveredAt,
      }));
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(agents));
      return;
    }

    // Registry search
    if (url === '/registry/search' || url.startsWith('/registry/search?q=')) {
      const query = new URL(url, `http://${config.host || 'localhost'}`).searchParams.get('q') || '';
      const agents = nexarion.listAgents()
        .filter(a => !query || a.card.name.toLowerCase().includes(query.toLowerCase())
          || a.card.description.toLowerCase().includes(query.toLowerCase()));
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ results: agents.map(a => ({ name: a.card.name, description: a.card.description, status: a.status, skills: a.card.skills.length })), total: agents.length }));
      return;
    }

    // Health check all registered agents
    if (url === '/registry/health-check') {
      const agents = nexarion.listAgents();
      const results = await Promise.all(agents.map(async (a) => {
        try {
          const r = await fetch(`${a.card.url}/health`, { signal: AbortSignal.timeout(3000) });
          return { name: a.card.name, status: r.ok ? 'healthy' : 'degraded', code: r.status };
        } catch { return { name: a.card.name, status: 'down' }; }
      }));
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(results));
      return;
    }

    // Stats
    if (url === '/stats') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(nexarion.getStats()));
      return;
    }

    // SSE stream
    if (url === '/sse') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
      res.write('event: connected\ndata: {"status":"connected"}\n\n');
      sseClients.add(res);

      // Heartbeat
      const heartbeat = setInterval(() => {
        res.write(': heartbeat\n\n');
      }, 15000);

      req.on('close', () => {
        sseClients.delete(res);
        clearInterval(heartbeat);
      });
      return;
    }

    // MCP JSON-RPC (stateless)
    if (url === '/mcp' && req.method === 'POST') {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      const body = JSON.parse(Buffer.concat(chunks).toString());

      const { method, params, id } = body;
      res.setHeader('Content-Type', 'application/json');

      try {
        switch (method) {
          case 'initialize':
            res.end(JSON.stringify({
              jsonrpc: '2.0',
              result: {
                protocolVersion: '2024-11-05',
                capabilities: { tools: {}, resources: {}, prompts: {} },
                serverInfo: { name: 'nexarion-server', version: '0.4.0' },
              },
              id,
            }));
            break;

          case 'tools/list':
            res.end(JSON.stringify({ jsonrpc: '2.0', result: nexarion.handleListTools(), id }));
            break;

          case 'tools/call': {
            const { name, arguments: args } = params || {};
            const result = await nexarion.handleCallTool(name, args || {});
            res.end(JSON.stringify({ jsonrpc: '2.0', result, id }));
            break;
          }

          case 'resources/list': {
            const { agentsToResources } = await import('./mcp-resources.js');
            const agents = nexarion.listAgents().filter(a => a.status === 'online').map(a => a.card);
            const resources = agentsToResources(agents);
            res.end(JSON.stringify({ jsonrpc: '2.0', result: { resources }, id }));
            break;
          }

          case 'resources/read': {
            const { readResource } = await import('./mcp-resources.js');
            const { uri } = (params as { uri: string }) || {};
            const agents = nexarion.listAgents().filter(a => a.status === 'online').map(a => a.card);
            const content = readResource(uri, agents);
            res.end(content
              ? JSON.stringify({ jsonrpc: '2.0', result: { contents: [content] }, id })
              : JSON.stringify({ jsonrpc: '2.0', error: { code: -32602, message: `Resource not found: ${uri}` }, id }));
            break;
          }

          case 'prompts/list': {
            const { agentsToPrompts } = await import('./mcp-resources.js');
            const agents = nexarion.listAgents().filter(a => a.status === 'online').map(a => a.card);
            const prompts = agentsToPrompts(agents);
            res.end(JSON.stringify({ jsonrpc: '2.0', result: { prompts }, id }));
            break;
          }

          case 'prompts/get': {
            const { getPromptMessages } = await import('./mcp-resources.js');
            const { name, arguments: args } = (params as { name: string; arguments: Record<string, unknown> }) || {};
            const agents = nexarion.listAgents().filter(a => a.status === 'online').map(a => a.card);
            const messages = getPromptMessages(name, args || {}, agents);
            res.end(messages
              ? JSON.stringify({ jsonrpc: '2.0', result: { messages }, id })
              : JSON.stringify({ jsonrpc: '2.0', error: { code: -32602, message: `Prompt not found: ${name}` }, id }));
            break;
          }

          case 'ping':
            res.end(JSON.stringify({ jsonrpc: '2.0', result: {}, id }));
            break;

          default:
            res.end(JSON.stringify({
              jsonrpc: '2.0', error: { code: -32601, message: `Method not found: ${method}` }, id,
            }));
        }
      } catch (err) {
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32603, message: err instanceof Error ? err.message : 'Internal error' },
          id,
        }));
      }
      return;
    }

    // 404
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found', endpoints: ['/health', '/agents', '/stats', '/sse', '/mcp', '/registry/search', '/registry/health-check'] }));
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('[Nexarion HTTP] Shutting down gracefully...');
    for (const client of sseClients) client.end();
    sseClients.clear();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return {
    start() {
      return new Promise<void>((resolve) => {
        server.listen(port, host, () => {
          console.log(`[Nexarion HTTP] Server on http://${host}:${port}`);
          console.log(`[Nexarion HTTP] SSE: http://localhost:${port}/sse`);
          console.log(`[Nexarion HTTP] MCP: http://localhost:${port}/mcp`);
          resolve();
        });
      });
    },
    stop() {
      for (const client of sseClients) client.end();
      sseClients.clear();
      return new Promise<void>((resolve) => {
        server.close(() => resolve());
        setTimeout(() => resolve(), 5000); // Force close after 5s
      });
    },
    /** Broadcast an event to all SSE clients */
    broadcast(event: string, data: unknown) {
      const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      for (const client of sseClients) {
        client.write(payload);
      }
    },
  };
}
