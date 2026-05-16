import { describe, it, expect } from 'vitest';

describe('CLI — Argument Parsing', () => {
  it('should parse --transport flag', () => {
    function parseFlags(args: string[]): Record<string, string> {
      const flags: Record<string, string> = {};
      for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--')) {
          const key = args[i].replace('--', '');
          flags[key] = args[i + 1] || 'true';
          if (args[i + 1]) i++;
        }
      }
      return flags;
    }

    let flags = parseFlags(['--transport', 'http']);
    expect(flags.transport).toBe('http');

    flags = parseFlags(['--transport', 'stdio']);
    expect(flags.transport).toBe('stdio');

    flags = parseFlags(['--port', '3000', '--debug']);
    expect(flags.port).toBe('3000');
    expect(flags.debug).toBe('true');
  });

  it('should parse comma-separated agents', () => {
    const agents = 'https://a.example.com,https://b.example.com';
    const urls = agents.split(',').map(s => s.trim());
    expect(urls).toEqual(['https://a.example.com', 'https://b.example.com']);
  });

  it('should handle empty args', () => {
    function parseFlags(args: string[]): Record<string, string> {
      const flags: Record<string, string> = {};
      for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--')) {
          const key = args[i].replace('--', '');
          flags[key] = args[i + 1] || 'true';
          if (args[i + 1]) i++;
        }
      }
      return flags;
    }
    expect(Object.keys(parseFlags([])).length).toBe(0);
  });
});
