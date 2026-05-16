import { describe, it, expect, vi } from 'vitest';
import { createConfigWatcher } from '../hot-reload.js';

describe('ConfigWatcher', () => {
  it('should create watcher', () => {
    const bridge = { discover: vi.fn().mockResolvedValue([]) } as any;
    const watcher = createConfigWatcher('./nonexistent.json', bridge);
    expect(watcher).toBeDefined();
    expect(watcher.start).toBeDefined();
    expect(watcher.stop).toBeDefined();
  });
});
