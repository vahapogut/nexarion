/**
 * Nexarion CLI — validate command
 *
 * Validates an A2A agent's Agent Card against the Zod schema.
 * Usage: nexarion validate https://agent.example.com
 */

import { Validator } from 'nexarion-core';

export async function validateAgent(url: string): Promise<void> {
  const agentUrl = url.replace(/\/$/, '');
  const cardUrl = `${agentUrl}/.well-known/agent-card.json`;

  console.log(`Validating ${cardUrl}...\n`);

  try {
    const res = await fetch(cardUrl, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.error(`✗ Failed to fetch Agent Card: ${res.status} ${res.statusText}`);
      process.exit(1);
    }

    const data = await res.json();
    const result = Validator.agentCard(data);

    if (result.valid) {
      const card = data as Record<string, unknown>;
      console.log(`✓ Valid Agent Card`);
      console.log(`  Name:    ${card.name}`);
      console.log(`  URL:     ${card.url}`);
      console.log(`  Version: ${card.version || 'unknown'}`);
      console.log(`  Skills:  ${Array.isArray(card.skills) ? card.skills.length : 0}`);
      console.log(`  Status:  PASSED`);
    } else {
      console.error(`✗ Invalid Agent Card — ${result.errors.length} error(s):`);
      for (const err of result.errors) {
        console.error(`  - ${err}`);
      }
      process.exit(1);
    }
  } catch (err) {
    console.error(`✗ Connection failed: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}
