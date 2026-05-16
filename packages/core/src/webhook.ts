/**
 * Nexarion — Event/Webhook System
 *
 * Push-based notifications from A2A agents back to MCP clients.
 * When an A2A agent completes a task, Nexarion proactively notifies
 * the MCP client via registered webhook URL.
 *
 * Usage:
 * ```ts
 * const events = new EventBridge();
 * events.register('client-1', 'https://myapp.example/webhook');
 * events.emit({ agent: 'WeatherAgent', taskId: 't1', status: 'completed', data: {...} });
 * ```
 */

export interface AgentEvent {
  agent: string;
  taskId: string;
  status: 'completed' | 'failed' | 'progress';
  data?: unknown;
  timestamp?: string;
}

export interface WebhookRegistration {
  clientId: string;
  url: string;
  events: string[]; // event types to receive
  secret?: string;   // HMAC signing secret
}

export class EventBridge {
  private registrations = new Map<string, WebhookRegistration[]>();

  /** Register a webhook URL for a client */
  register(reg: WebhookRegistration): void {
    const existing = this.registrations.get(reg.clientId) || [];
    existing.push(reg);
    this.registrations.set(reg.clientId, existing);
  }

  /** Unregister a webhook */
  unregister(clientId: string, url: string): void {
    const regs = this.registrations.get(clientId);
    if (!regs) return;
    this.registrations.set(clientId, regs.filter(r => r.url !== url));
  }

  /** Emit an event to all registered webhooks */
  async emit(event: AgentEvent): Promise<void> {
    event.timestamp = event.timestamp || new Date().toISOString();

    const promises: Promise<void>[] = [];
    for (const [_, regs] of this.registrations) {
      for (const reg of regs) {
        if (reg.events.includes(event.status) || reg.events.includes('*')) {
          promises.push(this.deliver(reg.url, event, reg.secret));
        }
      }
    }
    await Promise.allSettled(promises);
  }

  /** Deliver an event to a single webhook with retry */
  private async deliver(url: string, event: AgentEvent, secret?: string): Promise<void> {
    const body = JSON.stringify(event);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Nexarion-Event': event.status,
    };

    if (secret) {
      const crypto = require('crypto');
      const hmac = crypto.createHmac('sha256', secret).update(body).digest('hex');
      headers['X-Nexarion-Signature'] = `sha256=${hmac}`;
    }

    // Retry up to 3 times
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body,
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) return;
      } catch {
        // Retry with backoff
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
  }
}
