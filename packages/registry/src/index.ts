/**
 * Nexarion Agent Registry — Public directory of verified A2A agents.
 *
 * Usage:
 * ```ts
 * const registry = new AgentRegistry();
 * registry.register({ name: 'WeatherAgent', url: 'https://weather.agent.ai', ... });
 * const agents = registry.search('weather'); // → [WeatherAgent]
 * ```
 */

import type { AgentCard, DiscoveredAgent } from 'nexarion-core';

export interface RegistryEntry {
  card: AgentCard;
  verified: boolean;
  registeredAt: string;
  lastSeen: string;
  healthStatus: 'healthy' | 'degraded' | 'down';
  category: string;
  tags: string[];
}

export class AgentRegistry {
  private agents = new Map<string, RegistryEntry>();

  register(entry: RegistryEntry): void {
    this.agents.set(entry.card.url, entry);
  }

  unregister(url: string): void {
    this.agents.delete(url);
  }

  search(query: string): RegistryEntry[] {
    const q = query.toLowerCase();
    return Array.from(this.agents.values()).filter(a =>
      a.card.name.toLowerCase().includes(q) ||
      a.card.description.toLowerCase().includes(q) ||
      a.tags.some(t => t.toLowerCase().includes(q)) ||
      a.category.toLowerCase().includes(q)
    );
  }

  list(): RegistryEntry[] {
    return Array.from(this.agents.values());
  }

  get(url: string): RegistryEntry | undefined {
    return this.agents.get(url);
  }

  get healthy(): RegistryEntry[] {
    return Array.from(this.agents.values()).filter(a => a.healthStatus === 'healthy');
  }

  async healthCheck(): Promise<void> {
    const promises = Array.from(this.agents.values()).map(async (entry) => {
      try {
        const res = await fetch(`${entry.card.url}/health`, { signal: AbortSignal.timeout(5000) });
        entry.lastSeen = new Date().toISOString();
        entry.healthStatus = res.ok ? 'healthy' : 'degraded';
      } catch {
        entry.healthStatus = 'down';
      }
    });
    await Promise.allSettled(promises);
  }

  count(): number {
    return this.agents.size;
  }
}
