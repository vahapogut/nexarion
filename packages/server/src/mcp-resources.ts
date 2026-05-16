/**
 * Nexarion — MCP Resources & Prompts Support
 *
 * Extends the bridge to support MCP's three primitives:
 * - Tools (already done — A2A skills → MCP tools)
 * - Resources (A2A agent metadata → MCP resources)
 * - Prompts (A2A skills + examples → MCP prompt templates)
 *
 * MCP Spec: modelcontextprotocol.io
 */

import type { AgentCard, AgentSkill } from 'nexarion-core';

// ─── Resources ───────────────────────────────────────────────────

export interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export interface MCPResourceContent {
  uri: string;
  mimeType: string;
  text?: string;
  blob?: string;
}

/**
 * Convert agent metadata to MCP resources.
 * Each agent becomes a resource, each skill becomes a sub-resource.
 */
export function agentsToResources(agents: AgentCard[]): MCPResource[] {
  const resources: MCPResource[] = [];

  for (const agent of agents) {
    resources.push({
      uri: `nexarion://agents/${agent.name}`,
      name: agent.name,
      description: agent.description,
      mimeType: 'application/json',
    });

    for (const skill of agent.skills) {
      resources.push({
        uri: `nexarion://agents/${agent.name}/skills/${skill.id}`,
        name: `${agent.name}/${skill.id}`,
        description: skill.description,
        mimeType: 'application/json',
      });
    }
  }

  return resources;
}

/**
 * Read a resource by URI.
 */
export function readResource(uri: string, agents: AgentCard[]): MCPResourceContent | null {
  const parts = uri.replace('nexarion://agents/', '').split('/');

  const agentName = parts[0];
  const agent = agents.find(a => a.name === agentName);
  if (!agent) return null;

  if (parts.length === 1) {
    return {
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(agent, null, 2),
    };
  }

  if (parts[1] === 'skills' && parts[2]) {
    const skill = agent.skills.find(s => s.id === parts[2]);
    if (!skill) return null;
    return {
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(skill, null, 2),
    };
  }

  return null;
}

// ─── Prompts ─────────────────────────────────────────────────────

export interface MCPPrompt {
  name: string;
  description: string;
  arguments?: MCPPromptArgument[];
}

export interface MCPPromptArgument {
  name: string;
  description: string;
  required: boolean;
}

export interface MCPPromptMessage {
  role: 'user' | 'assistant';
  content: { type: 'text'; text: string };
}

/**
 * Convert A2A agent skills to MCP prompt templates.
 * Each skill with examples becomes a prompt.
 */
export function agentsToPrompts(agents: AgentCard[]): MCPPrompt[] {
  const prompts: MCPPrompt[] = [];

  for (const agent of agents) {
    for (const skill of agent.skills) {
      prompts.push({
        name: `${agent.name}_${skill.id}`,
        description: `${skill.description} (via ${agent.name})`,
        arguments: [
          { name: 'message', description: 'Input for the agent', required: true },
          { name: 'agent_url', description: 'Agent URL', required: false },
        ],
      });
    }

    // Generic agent prompt
    prompts.push({
      name: `${agent.name}_chat`,
      description: `Chat with ${agent.name}: ${agent.description}`,
      arguments: [
        { name: 'message', description: 'Message to send', required: true },
      ],
    });
  }

  return prompts;
}

/**
 * Generate prompt messages from a template and arguments.
 */
export function getPromptMessages(
  promptName: string,
  args: Record<string, unknown>,
  agents: AgentCard[]
): MCPPromptMessage[] | null {
  // Find agent by matching prompt name prefix (handles agents with underscores in name)
  const agent = agents.find(a => promptName.startsWith(a.name + '_')) || agents.find(a => promptName.startsWith(a.name.split('_')[0] + '_'));
  const skillId = agent ? promptName.slice(agent.name.length + 1) : promptName;
  if (!agent) return null;

  const message = (args.message as string) || 'Hello';

  return [{
    role: 'user',
    content: { type: 'text', text: `You are the "${agent.name}" agent. ${agent.description}\n\nUser message: ${message}` },
  }];
}
