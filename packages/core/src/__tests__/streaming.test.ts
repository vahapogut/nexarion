import { describe, it, expect } from 'vitest';
import { parseSSEStream, streamToMCPResult } from '../streaming.js';

describe('Streaming — SSE Parser', () => {
  it('should parse single SSE event', () => {
    const events = parseSSEStream('event: progress\ndata: {"text":"hello"}\n\n');
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('progress');
    expect(events[0].text).toBe('hello');
  });

  it('should parse multiple SSE events', () => {
    const events = parseSSEStream(
      'event: text\ndata: chunk1\n\nevent: text\ndata: chunk2\n\n'
    );
    expect(events.length).toBe(2);
  });

  it('should handle JSON data events', () => {
    const events = parseSSEStream('data: {"text":"hello","count":42}\n\n');
    expect(events.length).toBe(1);
    expect(events[0].data).toBeDefined();
  });

  it('should handle empty data', () => {
    const events = parseSSEStream('event: ping\n\n');
    expect(events.length).toBe(0);
  });

  it('should convert stream to MCP result', () => {
    const events = parseSSEStream('data: chunk1\n\ndata: chunk2\n\n');
    const result = streamToMCPResult(events);
    expect(result.content.length).toBeGreaterThanOrEqual(1);
    expect(result.isError).toBeFalsy();
  });

  it('should handle error events', () => {
    const events = parseSSEStream('event: error\ndata: {"text":"fail"}\n\n');
    const result = streamToMCPResult(events);
    expect(result.isError).toBe(true);
  });
});
