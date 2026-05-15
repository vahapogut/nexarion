/**
 * Nexarion — Plugin / Middleware System
 *
 * Hook-based extensibility for the bridge engine.
 * Plugins can intercept and transform messages at multiple points.
 *
 * Hooks:
 * - beforeTranslate — Called before MCP→A2A translation
 * - afterTranslate  — Called after A2A→MCP translation
 * - onDiscover       — Called when an agent is discovered
 * - onError          — Called when a bridge error occurs
 *
 * Usage:
 * ```ts
 * bridge.use({
 *   name: 'logger',
 *   beforeTranslate: (ctx) => { console.log('Translating:', ctx.toolName); return ctx; },
 * });
 * ```
 */

import type { TranslationResult, AgentCard } from './types.js';

export interface PluginContext {
  toolName?: string;
  agentName?: string;
  args?: Record<string, unknown>;
  result?: unknown;
  agent?: AgentCard;
  error?: Error;
}

export interface Plugin {
  name: string;
  beforeTranslate?: (ctx: PluginContext) => PluginContext | Promise<PluginContext>;
  afterTranslate?: (ctx: PluginContext) => PluginContext | Promise<PluginContext>;
  onDiscover?: (agent: AgentCard) => AgentCard | Promise<AgentCard>;
  onError?: (ctx: PluginContext) => void | Promise<void>;
}

export class PluginManager {
  private plugins: Plugin[] = [];

  /** Register a plugin */
  use(plugin: Plugin): void {
    this.plugins.push(plugin);
  }

  /** Remove a plugin by name */
  remove(name: string): void {
    this.plugins = this.plugins.filter(p => p.name !== name);
  }

  /** List registered plugins */
  list(): string[] {
    return this.plugins.map(p => p.name);
  }

  /** Run beforeTranslate hooks */
  async runBeforeTranslate(ctx: PluginContext): Promise<PluginContext> {
    let current = ctx;
    for (const p of this.plugins) {
      if (p.beforeTranslate) {
        current = await p.beforeTranslate(current);
      }
    }
    return current;
  }

  /** Run afterTranslate hooks */
  async runAfterTranslate(ctx: PluginContext): Promise<PluginContext> {
    let current = ctx;
    for (const p of this.plugins) {
      if (p.afterTranslate) {
        current = await p.afterTranslate(current);
      }
    }
    return current;
  }

  /** Run onDiscover hooks */
  async runOnDiscover(agent: AgentCard): Promise<AgentCard> {
    let current = agent;
    for (const p of this.plugins) {
      if (p.onDiscover) {
        current = await p.onDiscover(current);
      }
    }
    return current;
  }

  /** Run onError hooks */
  async runOnError(ctx: PluginContext): Promise<void> {
    for (const p of this.plugins) {
      if (p.onError) {
        await p.onError(ctx);
      }
    }
  }
}
