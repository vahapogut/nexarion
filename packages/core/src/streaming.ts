/**
 * Nexarion — Streaming Support
 *
 * A2A SSE event parser + MCP streaming response.
 * Converts A2A streaming responses into MCP progress notifications.
 */

import type { MCPToolCallResult } from './types.js';

export interface StreamEvent {
  type: 'progress' | 'text' | 'data' | 'error';
  text?: string;
  data?: unknown;
}

/** Parse an A2A SSE text/event-stream into structured events */
export function parseSSEStream(chunk: string): StreamEvent[] {
  const events: StreamEvent[] = [];
  const lines = chunk.split('\n');

  let eventType = '';
  let data = '';

  for (const line of lines) {
    if (line.startsWith('event: ')) {
      eventType = line.slice(7).trim();
    } else if (line.startsWith('data: ')) {
      data = line.slice(6).trim();
      if (data) {
        try {
          const parsed = JSON.parse(data);
          events.push({
            type: eventType as StreamEvent['type'] || 'data',
            text: parsed.text || parsed.message,
            data: parsed,
          });
        } catch {
          events.push({ type: 'text', text: data });
        }
      }
    }
  }

  return events;
}

/** Convert stream events into MCP partial results */
export function streamToMCPResult(events: StreamEvent[]): MCPToolCallResult {
  const content: MCPToolCallResult['content'] = [];

  for (const ev of events) {
    if (ev.type === 'error') {
      return { content: [{ type: 'text', text: ev.text || 'Stream error' }], isError: true };
    }
    if (ev.text) {
      content.push({ type: 'text', text: ev.text });
    }
    if (ev.data && ev.type === 'data') {
      content.push({ type: 'resource', text: JSON.stringify(ev.data), mimeType: 'application/json' });
    }
  }

  return { content: content.length > 0 ? content : [{ type: 'text', text: 'Stream complete' }] };
}

/** Read a streaming SSE response from an A2A agent */
export async function* readSSEStream(response: Response): AsyncGenerator<StreamEvent> {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = parseSSEStream(buffer);
    buffer = ''; // Reset after parsing
    for (const ev of events) yield ev;
  }
}
