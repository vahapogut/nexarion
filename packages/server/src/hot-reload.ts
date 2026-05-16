import { Logger } from "nexarion-core";
const log = new Logger("nexarion");
/**
 * Nexarion — Config Hot-Reload
 *
 * Watches nexarion.config.json for changes and reloads
 * the bridge without restarting the server.
 *
 * Usage:
 * ```ts
 * const watcher = createConfigWatcher('./nexarion.config.json', bridge);
 * watcher.start();
 * // Edit config → agents are re-discovered automatically
 * ```
 */

import { watch, type FSWatcher } from 'fs';
import { readFileSync } from 'fs';
import type { NexarionBridge } from 'nexarion-core';

export interface ConfigWatcher {
  start(): void;
  stop(): void;
}

export function createConfigWatcher(
  configPath: string,
  bridge: NexarionBridge,
  onReload?: (agents: string[]) => void
): ConfigWatcher {
  let watcher: FSWatcher | null = null;

  async function reload() {
    try {
      const raw = readFileSync(configPath, 'utf-8');
      const config = JSON.parse(raw);

      if (config.agents && Array.isArray(config.agents)) {
        const urls = config.agents.map((a: { url: string }) => a.url).filter(Boolean);
        if (urls.length > 0) {
          log.info(`[Nexarion] Hot-reload: discovering ${urls.length} agents...`);
          const agents = await bridge.discover(urls);
          const online = agents.filter(a => a.status === 'online');
          log.info(`[Nexarion] Hot-reload complete: ${online.length}/${agents.length} online`);
          onReload?.(urls);
        }
      }
    } catch (err) {
      log.error('[Nexarion] Hot-reload failed:', { error: err instanceof Error ? err.message : err });
    }
  }

  return {
    start() {
      watcher = watch(configPath, async (eventType) => {
        if (eventType === 'change') {
          log.info('[Nexarion] Config changed, reloading...');
          // Debounce: wait 200ms for file write to complete
          await new Promise(r => setTimeout(r, 200));
          await reload();
        }
      });
      log.info(`[Nexarion] Watching ${configPath} for changes`);
    },
    stop() {
      if (watcher) { watcher.close(); watcher = null; }
    },
  };
}
