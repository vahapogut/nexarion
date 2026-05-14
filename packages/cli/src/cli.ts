#!/usr/bin/env node
/**
 * Nexarion CLI — Manage your MCP ↔ A2A bridge.
 *
 * Commands:
 *   nexarion discover  — Discover A2A agents
 *   nexarion tools     — List available MCP tools
 *   nexarion call      — Call an A2A agent via MCP tool
 *   nexarion agents    — List bridged agents
 *   nexarion stats     — Show bridge statistics
 *   nexarion serve     — Start the server
 */

import { NexarionBridge } from 'nexarion-core';
import type { AgentCard } from 'nexarion-core';

const USAGE = `
Nexarion CLI — Universal MCP ↔ A2A Bridge

Commands:
  discover <url>          Discover an A2A agent
  discover-all <urls...>  Discover multiple agents
  tools                   List all MCP tools
  call <tool> <args...>   Call an MCP tool (proxies to A2A agent)
  agents                  List discovered agents
  stats                   Show bridge statistics
  serve                   Start MCP server (stdio)

Example:
  nexarion discover https://agent.ai.example.com
  nexarion tools
  nexarion call a2a_weather_agent_forecast '{"message":"What is the weather in Paris?"}'
`;

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    console.log(USAGE);
    process.exit(0);
  }

  const bridge = new NexarionBridge({
    agents: [],
    direction: 'bidirectional',
    streaming: true,
    cacheMinutes: 5,
  });

  try {
    switch (command) {
      case 'discover': {
        const url = args[1];
        if (!url) { console.error('Usage: nexarion discover <url>'); process.exit(1); }
        console.log(`Discovering ${url}...`);
        const agent = await bridge.discover([url]);
        console.log(JSON.stringify(agent[0], null, 2));
        break;
      }
      case 'discover-all': {
        const urls = args.slice(1);
        if (urls.length === 0) { console.error('Usage: nexarion discover-all <urls...>'); process.exit(1); }
        const agents = await bridge.discover(urls);
        for (const a of agents) {
          console.log(`${a.status === 'online' ? '✓' : '✗'} ${a.card.name} — ${a.card.skills.length} skills (${a.latencyMs}ms)`);
        }
        break;
      }
      case 'tools': {
        const tools = bridge.listTools();
        for (const t of tools) {
          console.log(`  ${t.name}`);
          console.log(`    ${t.description}`);
        }
        console.log(`\n${tools.length} tools exposed`);
        break;
      }
      case 'call': {
        const tool = args[1];
        const rawArgs = args.slice(2).join(' ');
        if (!tool) { console.error('Usage: nexarion call <tool> <json-args>'); process.exit(1); }
        const parsedArgs = rawArgs ? JSON.parse(rawArgs) : {};
        console.log(`Calling ${tool}...`);
        const result = await bridge.callTool(tool, parsedArgs);
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case 'agents': {
        const agents = bridge.listAgents();
        for (const a of agents) {
          console.log(`${a.status === 'online' ? '●' : '○'} ${a.card.name} (v${a.card.version})`);
          console.log(`  Skills: ${a.card.skills.map(s => s.name).join(', ') || 'none'}`);
          console.log(`  Endpoint: ${a.card.url}`);
        }
        break;
      }
      case 'stats': {
        const stats = bridge.getStats();
        console.log(JSON.stringify(stats, null, 2));
        break;
      }
      case 'serve': {
        console.error('Starting Nexarion MCP server (stdio mode)...');
        console.error('Add this to your Claude Desktop config:');
        console.error(JSON.stringify({
          mcpServers: {
            nexarion: {
              command: 'npx',
              args: ['nexarion-cli', 'serve'],
            },
          },
        }, null, 2));
        console.error('\nWaiting for MCP client connection...');
        // Keep alive for stdio
        setInterval(() => {}, 1000);
        break;
      }
      default:
        console.error(`Unknown command: ${command}`);
        console.log(USAGE);
        process.exit(1);
    }
  } catch (err) {
    console.error('Error:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
