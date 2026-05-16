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
                capabilities: { tools: {} },
                serverInfo: { name: 'nexarion-server', version: '0.3.2' },
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
    res.end(JSON.stringify({ error: 'Not found', endpoints: ['/health', '/agents', '/stats', '/sse', '/mcp'] }));
  });

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
      return new Promise<void>((resolve) => server.close(() => resolve()));
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
