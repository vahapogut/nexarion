/**
 * Nexarion — Zod Schema Validation
 *
 * Validates Agent Cards and MCP tool schemas at runtime.
 * Catches malformed agent responses before they corrupt the bridge.
 */

// Lightweight schema validation (zero dependencies, Zod-compatible subset)
// For production, replace with full Zod. This provides runtime type safety without a dependency.

export interface SchemaField {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  description?: string;
  children?: Record<string, SchemaField>;
}

export interface Schema {
  fields: Record<string, SchemaField>;
}

export class Validator {
  static agentCard(data: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!data || typeof data !== 'object') {
      return { valid: false, errors: ['Expected an object'] };
    }
    const card = data as Record<string, unknown>;

    if (typeof card.name !== 'string') errors.push('Missing or invalid "name" (string required)');
    if (typeof card.url !== 'string') errors.push('Missing or invalid "url" (string required)');
    if (typeof card.description !== 'string') errors.push('Missing or invalid "description" (string required)');
    if (typeof card.version !== 'string') errors.push('Missing or invalid "version" (string required)');
    if (!card.skills || !Array.isArray(card.skills)) errors.push('Missing or invalid "skills" (array required)');
    if (!card.capabilities || typeof card.capabilities !== 'object') errors.push('Missing or invalid "capabilities" (object required)');

    if (Array.isArray(card.skills)) {
      for (let i = 0; i < card.skills.length; i++) {
        const skill = card.skills[i] as Record<string, unknown>;
        if (typeof skill.id !== 'string') errors.push(`Skill[${i}]: missing "id"`);
        if (typeof skill.name !== 'string') errors.push(`Skill[${i}]: missing "name"`);
        if (typeof skill.description !== 'string') errors.push(`Skill[${i}]: missing "description"`);
        if (typeof skill.name !== 'string') errors.push(`Skill[${i}]: missing "name"`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  static mcpToolCall(params: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!params || typeof params !== 'object') {
      return { valid: false, errors: ['Expected an object'] };
    }
    const p = params as Record<string, unknown>;
    if (typeof p.name !== 'string') errors.push('Missing "name" in tool call');
    return { valid: errors.length === 0, errors };
  }
}
