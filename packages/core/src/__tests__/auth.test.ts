import { describe, it, expect } from 'vitest';
import { CapabilityAuth } from '../auth.js';

describe('CapabilityAuth', () => {
  it('should grant and check capabilities', () => {
    const auth = new CapabilityAuth();
    auth.grant({ clientId: 'c1', agent: 'WeatherAgent', allowedCapabilities: ['forecast'] });
    expect(auth.check('c1', 'WeatherAgent', 'forecast')).toBe(true);
    expect(auth.check('c1', 'WeatherAgent', 'admin')).toBe(false);
  });

  it('should revoke all capabilities', () => {
    const auth = new CapabilityAuth();
    auth.grant({ clientId: 'c1', agent: 'W', allowedCapabilities: ['f'] });
    auth.revoke('c1');
    expect(auth.check('c1', 'W', 'f')).toBe(false);
  });

  it('should list capabilities', () => {
    const auth = new CapabilityAuth();
    auth.grant({ clientId: 'c1', agent: 'A', allowedCapabilities: ['a', 'b'] });
    auth.grant({ clientId: 'c1', agent: 'B', allowedCapabilities: ['c'] });
    const caps = auth.listCapabilities('c1');
    expect(caps.length).toBe(2);
  });

  it('should sign and verify HMAC tokens', () => {
    const auth = new CapabilityAuth();
    const token = auth.signToken(
      { clientId: 'c1', agent: 'A', allowedCapabilities: ['x'] }, 'my-secret-123'
    );
    expect(token).toContain('.');
    const verified = auth.verifyToken(token, 'my-secret-123');
    expect(verified).not.toBeNull();
    expect(verified!.clientId).toBe('c1');
    expect(verified!.capabilities).toEqual(['x']);
  });

  it('should reject token with wrong secret', () => {
    const auth = new CapabilityAuth();
    const token = auth.signToken(
      { clientId: 'c1', agent: 'A', allowedCapabilities: ['x'] }, 'secret-a'
    );
    expect(auth.verifyToken(token, 'secret-b')).toBeNull();
  });

  it('should reject expired token', async () => {
    const auth = new CapabilityAuth();
    const token = auth.signToken(
      { clientId: 'c1', agent: 'A', allowedCapabilities: ['x'], expiresAt: Date.now() - 1000 }, 'secret'
    );
    expect(auth.verifyToken(token, 'secret')).toBeNull();
  });
});
