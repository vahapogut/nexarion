/**
 * Nexarion — ACP (Agent Communication Protocol) Support
 *
 * ACP is a REST-native subset of A2A, designed for simpler HTTP-based agents.
 * Works with plain curl requests — no JSON-RPC knowledge needed.
 *
 * Endpoints:
 * - GET  /.well-known/agent-card.json  → Agent Card
 * - POST /message                      → Send message (REST)
 * - POST /task                         → Submit task (REST)
 * - GET  /task/:id                     → Get task status
 * - POST /task/:id/cancel              → Cancel task
 */

import type { AgentCard } from './types.js';

export interface ACPMessage {
  role: 'user' | 'agent';
  text: string;
  context?: Record<string, unknown>;
}

export interface ACPResponse {
  text: string;
  data?: unknown;
  status: 'completed' | 'failed' | 'working';
  taskId?: string;
}

export interface ACPClient {
  /** Discover an agent via ACP (REST) */
  discover(url: string): Promise<AgentCard>;
  /** Send a REST message to an ACP agent */
  sendMessage(url: string, message: ACPMessage): Promise<ACPResponse>;
  /** Submit a task to an ACP agent */
  submitTask(url: string, message: ACPMessage): Promise<ACPResponse>;
  /** Get task status */
  getTaskStatus(url: string, taskId: string): Promise<ACPResponse>;
  /** Cancel a task */
  cancelTask(url: string, taskId: string): Promise<void>;
}

export function createACPClient(token?: string): ACPClient {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  return {
    async discover(url: string): Promise<AgentCard> {
      const agentUrl = url.replace(/\/$/, '');
      const res = await fetch(`${agentUrl}/.well-known/agent-card.json`, { headers });
      return res.json() as Promise<AgentCard>;
    },

    async sendMessage(url: string, message: ACPMessage): Promise<ACPResponse> {
      const res = await fetch(`${url.replace(/\/$/, '')}/message`, {
        method: 'POST',
        headers,
        body: JSON.stringify(message),
      });
      return res.json() as Promise<ACPResponse>;
    },

    async submitTask(url: string, message: ACPMessage): Promise<ACPResponse> {
      const res = await fetch(`${url.replace(/\/$/, '')}/task`, {
        method: 'POST',
        headers,
        body: JSON.stringify(message),
      });
      return res.json() as Promise<ACPResponse>;
    },

    async getTaskStatus(url: string, taskId: string): Promise<ACPResponse> {
      const res = await fetch(`${url.replace(/\/$/, '')}/task/${taskId}`, { headers });
      return res.json() as Promise<ACPResponse>;
    },

    async cancelTask(url: string, taskId: string): Promise<void> {
      await fetch(`${url.replace(/\/$/, '')}/task/${taskId}/cancel`, {
        method: 'POST',
        headers,
      });
    },
  };
}
