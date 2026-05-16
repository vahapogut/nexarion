/**
 * Nexarion — Fine-Grained Authorization
 *
 * Capability-level access control for MCP ↔ A2A bridges.
 * Maps OAuth 2.1 tokens to specific agent capabilities.
 *
 * Usage:
 * ```ts
 * const auth = new CapabilityAuth();
 * auth.grant('client-1', 'WeatherAgent', ['forecast']);
 * const allowed = auth.check('client-1', 'WeatherAgent', 'forecast'); // true
 * const denied = auth.check('client-1', 'WeatherAgent', 'admin');    // false
 * ```
 */

export interface CapabilityToken {
  clientId: string;
  agent: string;
  capabilities: string[];
  expiresAt: number;
  issuer: string;
}

export interface AuthPolicy {
  clientId: string;
  agent: string;
  allowedCapabilities: string[];
  rateLimit?: { maxRequests: number; windowMs: number };
  expiresAt?: number;
}

export class CapabilityAuth {
  private policies = new Map<string, AuthPolicy[]>();
  private requestCounts = new Map<string, { count: number; windowStart: number }>();

  /** Grant capabilities to a client for a specific agent */
  grant(policy: AuthPolicy): void {
    const key = policy.clientId;
    const existing = this.policies.get(key) || [];
    // Remove existing policy for same agent
    const filtered = existing.filter(p => p.agent !== policy.agent);
    filtered.push(policy);
    this.policies.set(key, filtered);
  }

  /** Revoke all capabilities for a client */
  revoke(clientId: string): void {
    this.policies.delete(clientId);
  }

  /** Check if a client has a specific capability on an agent */
  check(clientId: string, agent: string, capability: string): boolean {
    const policies = this.policies.get(clientId);
    if (!policies) return false;

    for (const policy of policies) {
      if (policy.agent !== agent) continue;
      if (policy.expiresAt && Date.now() > policy.expiresAt) return false;
      if (!policy.allowedCapabilities.includes(capability) && !policy.allowedCapabilities.includes('*')) return false;

      // Rate limit check
      if (policy.rateLimit) {
        const rk = `${clientId}:${agent}:${capability}`;
        const rc = this.requestCounts.get(rk);
        const now = Date.now();
        if (!rc || now - rc.windowStart > policy.rateLimit.windowMs) {
          this.requestCounts.set(rk, { count: 1, windowStart: now });
        } else {
          rc.count++;
          if (rc.count > policy.rateLimit.maxRequests) return false;
        }
      }

      return true;
    }
    return false;
  }

  /** List all capabilities for a client */
  listCapabilities(clientId: string): { agent: string; capabilities: string[] }[] {
    const policies = this.policies.get(clientId);
    if (!policies) return [];
    return policies
      .filter(p => !p.expiresAt || Date.now() <= p.expiresAt)
      .map(p => ({ agent: p.agent, capabilities: p.allowedCapabilities }));
  }

  /** Sign a capability token with HMAC-SHA256 */
  async signToken(policy: AuthPolicy, secret: string): Promise<string> {
    const { createHmac } = await import('node:crypto');
    const token: CapabilityToken = {
      clientId: policy.clientId,
      agent: policy.agent,
      capabilities: policy.allowedCapabilities,
      expiresAt: policy.expiresAt || Date.now() + 3600000,
      issuer: 'nexarion',
    };
    const payload = Buffer.from(JSON.stringify(token)).toString('base64url');
    const sig = createHmac('sha256', secret).update(payload).digest('base64url');
    return `${payload}.${sig}`;
  }

  /** Verify a capability token with HMAC-SHA256 */
  async verifyToken(tokenStr: string, secret: string): Promise<CapabilityToken | null> {
    const { createHmac: vCreateHmac, timingSafeEqual: vTSE } = await import('node:crypto');
    const [payload, sig] = tokenStr.split('.');
    if (!payload || !sig) return null;
    const expected = vCreateHmac('sha256', secret).update(payload).digest('base64url');
    if (!vTSE(Buffer.from(sig), Buffer.from(expected))) return null;
    try {
      const token = JSON.parse(Buffer.from(payload, 'base64url').toString()) as CapabilityToken;
      if (token.expiresAt < Date.now()) return null;
      return token;
    } catch {
      return null;
    }
  }
}
