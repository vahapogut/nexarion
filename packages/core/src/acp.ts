/**
 * Nexarion — ACP (Agent Communication Protocol) Support
 *
 * REST-native client for simpler HTTP-based A2A agents.
 * All methods include error handling and timeouts.
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
  discover(url: string): Promise<AgentCard>;
  sendMessage(url: string, message: ACPMessage): Promise<ACPResponse>;
  submitTask(url: string, message: ACPMessage): Promise<ACPResponse>;
  getTaskStatus(url: string, taskId: string): Promise<ACPResponse>;
  cancelTask(url: string, taskId: string): Promise<void>;
}

const ACP_HEADERS = { 'Content-Type': 'application/json', 'Accept': 'application/json' } as const;

export function createACPClient(token?: string): ACPClient {
  const headers: Record<string, string> = token
    ? { ...ACP_HEADERS, 'Authorization': `Bearer ${token}` }
    : { ...ACP_HEADERS };

  async function safeFetch(url: string, options: RequestInit): Promise<unknown> {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`ACP request failed: ${res.status} ${res.statusText}`);
    return res.json();
  }

  return {
    async discover(url: string): Promise<AgentCard> {
      return safeFetch(`${url.replace(/\/$/, '')}/.well-known/agent-card.json`, {
        headers, signal: AbortSignal.timeout(10000),
      }) as Promise<AgentCard>;
    },

    async sendMessage(url: string, message: ACPMessage): Promise<ACPResponse> {
      return safeFetch(`${url.replace(/\/$/, '')}/message`, {
        method: 'POST', headers, body: JSON.stringify(message), signal: AbortSignal.timeout(15000),
      }) as Promise<ACPResponse>;
    },

    async submitTask(url: string, message: ACPMessage): Promise<ACPResponse> {
      return safeFetch(`${url.replace(/\/$/, '')}/task`, {
        method: 'POST', headers, body: JSON.stringify(message), signal: AbortSignal.timeout(15000),
      }) as Promise<ACPResponse>;
    },

    async getTaskStatus(url: string, taskId: string): Promise<ACPResponse> {
      return safeFetch(`${url.replace(/\/$/, '')}/task/${taskId}`, {
        headers, signal: AbortSignal.timeout(10000),
      }) as Promise<ACPResponse>;
    },

    async cancelTask(url: string, taskId: string): Promise<void> {
      const res = await fetch(`${url.replace(/\/$/, '')}/task/${taskId}/cancel`, {
        method: 'POST', headers, signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error(`ACP cancelTask failed: ${res.status}`);
    },
  };
}
