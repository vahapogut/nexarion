/**
 * Nexarion SDK — build an A2A agent in under 50 lines.
 *
 * Usage:
 * ```ts
 * import { createAgent } from 'nexarion-sdk';
 *
 * const agent = createAgent({
 *   name: 'WeatherAgent',
 *   description: 'Provides weather forecasts',
 *   skills: [{
 *     id: 'forecast',
 *     name: 'Get Forecast',
 *     description: 'Get weather forecast for a city',
 *     handler: async ({ message }) => {
 *       return { text: `Weather in ${message}: 22°C, sunny` };
 *     },
 *   }],
 * });
 *
 * agent.start({ port: 3000 });
 * ```
 */

import type { AgentCard, AgentSkill } from 'nexarion-core';
import { createServer, type RequestListener } from 'node:http';

// ─── Types ───────────────────────────────────────────────────────────

export interface SkillHandler {
  (input: SkillInput): Promise<SkillOutput>;
}

export interface SkillInput {
  message: string;
  context?: Record<string, unknown>;
}

export interface SkillOutput {
  text: string;
  data?: unknown;
}

export interface AgentConfig {
  name: string;
  description: string;
  version?: string;
  skills: AgentSkillConfig[];
  /** Auth token required to call this agent */
  authToken?: string;
}

export interface AgentSkillConfig {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  handler: SkillHandler;
}

// ─── Agent Builder ──────────────────────────────────────────────────

export function createAgent(config: AgentConfig) {
  const skills: AgentSkill[] = config.skills.map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
    tags: s.tags || [],
    inputModes: ['text'],
    outputModes: ['text'],
    examples: [],
  }));

  const skillMap = new Map<string, SkillHandler>();
  for (const s of config.skills) {
    skillMap.set(s.id, s.handler);
  }

  const agentCard: AgentCard = {
    name: config.name,
    description: config.description,
    url: '', // Set at runtime
    version: config.version || '1.0',
    capabilities: {
      streaming: false,
      pushNotifications: false,
      stateTransitionHistory: false,
    },
    skills,
    endpoints: {},
  };

  return {
    card: agentCard,

    async start(options: { port?: number; host?: string } = {}) {
      const port = options.port || 3000;
      const host = options.host || '0.0.0.0';

      agentCard.url = `http://localhost:${port}`;
      agentCard.endpoints = {
        jsonRpc: `http://localhost:${port}/jsonrpc`,
      };

      const handler = createAgentHandler(agentCard, skillMap, config.authToken);

      const server = createServer(async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

        // Agent Card endpoint
        if (req.url === '/.well-known/agent-card.json') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(agentCard, null, 2));
          return;
        }

        // JSON-RPC endpoint
        if (req.url === '/jsonrpc' && req.method === 'POST') {
          handler(req, res);
          return;
        }

        // Health check
        if (req.url === '/health') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ status: 'ok', agent: config.name }));
          return;
        }

        res.writeHead(404);
        res.end('Not found');
      });

      return new Promise<void>((resolve) => {
        server.listen(port, host, () => {
          console.log(`[Nexarion SDK] ${config.name} running on http://${host}:${port}`);
          console.log(`[Nexarion SDK] Agent Card: http://localhost:${port}/.well-known/agent-card.json`);
          resolve();
        });
      });
    },
  };
}

// ─── HTTP Handler ───────────────────────────────────────────────────

function createAgentHandler(
  card: AgentCard,
  skills: Map<string, SkillHandler>,
  authToken?: string
): RequestListener {
  return async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const body = JSON.parse(Buffer.concat(chunks).toString());

    // Auth check
    if (authToken) {
      const provided = req.headers.authorization?.replace('Bearer ', '');
      if (provided !== authToken) {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(401);
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32001, message: 'Unauthorized' },
          id: body.id,
        }));
        return;
      }
    }

    const { method, params, id } = body;
    res.setHeader('Content-Type', 'application/json');

    if (method === 'message/send') {
      const message = params?.message?.parts?.[0]?.text || '';
      const skillId = params?.message?.context?.skill;

      // Find matching skill
      let skillName = skillId;
      let handler: SkillHandler | undefined;

      if (skillId) {
        handler = skills.get(skillId);
      }

      if (!handler) {
        // Try to match skill from message content
        for (const [id, h] of skills) {
          if (message.toLowerCase().includes(id.toLowerCase())) {
            skillName = id;
            handler = h;
            break;
          }
        }
      }

      if (!handler) {
        // Use first skill as default
        const first = skills.entries().next().value;
        if (first) {
          skillName = first[0];
          handler = first[1];
        }
      }

      if (handler) {
        try {
          const result = await handler({ message });
          res.end(JSON.stringify({
            jsonrpc: '2.0',
            result: {
              message: {
                role: 'agent',
                parts: [
                  { type: 'text', text: result.text },
                  ...(result.data ? [{ type: 'data', data: result.data }] : []),
                ],
              },
              status: { state: 'completed' },
            },
            id,
          }));
        } catch (err) {
          res.end(JSON.stringify({
            jsonrpc: '2.0',
            error: { code: -32000, message: err instanceof Error ? err.message : 'Skill error' },
            id,
          }));
        }
      } else {
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          result: {
            message: {
              role: 'agent',
              parts: [{ type: 'text', text: `Agent ${card.name} received: "${message}". No matching skill found. Available skills: ${card.skills.map(s => s.id).join(', ')}` }],
            },
            status: { state: 'completed' },
          },
          id,
        }));
      }
    } else {
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32601, message: `Method not found: ${method}` },
        id,
      }));
    }
  };
}
