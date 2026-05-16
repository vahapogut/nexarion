/**
 * Nexarion — A2A Agent Discovery Engine
 *
 * Discovers A2A agents via:
 * 1. Well-known endpoint: GET /.well-known/agent-card.json
 * 2. Manual registration via config
 * 3. DNS-SD / mDNS (planned)
 */

import { Validator } from './schema.js';
import type { AgentCard, DiscoveredAgent } from './types.js';

export class AgentDiscovery {
  private cache = new Map<string, DiscoveredAgent>();
  private cacheMinutes: number;

  constructor(cacheMinutes = 5) {
    this.cacheMinutes = cacheMinutes;
  }

  /**
   * Discover an agent by its base URL.
   * Fetches the Agent Card from /.well-known/agent-card.json
   */
  async discover(url: string): Promise<DiscoveredAgent> {
    const start = performance.now();

    // Check cache
    const cached = this.cache.get(url);
    if (cached) {
      const age = Date.now() - new Date(cached.discoveredAt).getTime();
      if (age < this.cacheMinutes * 60 * 1000) {
        return cached;
      }
      this.cache.delete(url);
    }

    try {
      const agentUrl = url.replace(/\/$/, '');
      const cardUrl = `${agentUrl}/.well-known/agent-card.json`;

      const response = await fetch(cardUrl, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`Agent card fetch failed: ${response.status}`);
      }

      const card = await response.json() as AgentCard;
      const validation = Validator.agentCard(card);
      if (!validation.valid) throw new Error(`Invalid Agent Card: ${validation.errors.join(", ")}`);
      if (!card.name || !card.url) {
        throw new Error('Invalid agent card: missing name or url');
      }

      const agent: DiscoveredAgent = {
        card: { ...card, url: card.url || agentUrl },
        discoveredAt: new Date().toISOString(),
        status: 'online',
        latencyMs: Math.round(performance.now() - start),
      };

      this.cache.set(url, agent);
      return agent;
    } catch (err) {
      const offline: DiscoveredAgent = {
        card: { name: url, description: 'Unreachable agent', url, version: 'unknown', capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: false }, skills: [], endpoints: {} },
        discoveredAt: new Date().toISOString(),
        status: 'offline',
        latencyMs: Math.round(performance.now() - start),
      };
      return offline;
    }
  }

  /**
   * Discover multiple agents in parallel.
   */
  async discoverAll(urls: string[]): Promise<DiscoveredAgent[]> {
    return Promise.all(urls.map(u => this.discover(u)));
  }

  /**
   * Register an agent manually (without fetching Agent Card).
   */
  register(card: AgentCard): DiscoveredAgent {
    const agent: DiscoveredAgent = {
      card,
      discoveredAt: new Date().toISOString(),
      status: 'online',
      latencyMs: 0,
    };
    this.cache.set(card.url, agent);
    return agent;
  }

  /**
   * Get all discovered/cached agents.
   */
  listAgents(): DiscoveredAgent[] {
    return Array.from(this.cache.values());
  }

  /**
   * Remove an agent from the cache.
   */
  forget(url: string): void {
    this.cache.delete(url);
  }

  /**
   * Clear all cached agents.
   */
  clear(): void {
    this.cache.clear();
  }
}
