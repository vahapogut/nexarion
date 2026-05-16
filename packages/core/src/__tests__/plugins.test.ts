import { describe, it, expect } from 'vitest';
import { PluginManager } from '../plugins.js';

describe('PluginManager', () => {
  it('should register and list plugins', () => {
    const pm = new PluginManager();
    pm.use({ name: 'p1' });
    pm.use({ name: 'p2' });
    expect(pm.list()).toEqual(['p1', 'p2']);
  });

  it('should remove plugin by name', () => {
    const pm = new PluginManager();
    pm.use({ name: 'p1' });
    pm.use({ name: 'p2' });
    pm.remove('p1');
    expect(pm.list()).toEqual(['p2']);
  });

  it('should run beforeTranslate hooks', async () => {
    const pm = new PluginManager();
    const calls: string[] = [];
    pm.use({ name: 'logger', beforeTranslate: (ctx) => { calls.push('before'); return ctx; } });
    await pm.runBeforeTranslate({ toolName: 'test' });
    expect(calls).toContain('before');
  });

  it('should run afterTranslate hooks', async () => {
    const pm = new PluginManager();
    const calls: string[] = [];
    pm.use({ name: 'logger', afterTranslate: (ctx) => { calls.push('after'); return ctx; } });
    await pm.runAfterTranslate({ toolName: 'test' });
    expect(calls).toContain('after');
  });

  it('should run onError hooks', async () => {
    const pm = new PluginManager();
    let caught = false;
    pm.use({ name: 'err', onError: () => { caught = true; } });
    await pm.runOnError({ error: new Error('test') });
    expect(caught).toBe(true);
  });
});
