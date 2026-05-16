<div align="center">
  <h1>Nexarion</h1>
  <p><b>Universal interoperability runtime between MCP tools and A2A agents.</b></p>
  <p>Dynamic agent discovery · Runtime schema translation · Streaming bridge · Auth interoperability</p>

  <a href="https://github.com/vahapogut/nexarion"><img src="https://img.shields.io/badge/GitHub-nexarion-blue?style=for-the-badge&logo=github" alt="GitHub"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-green?style=for-the-badge" alt="License"></a>
  <a href="https://github.com/vahapogut/nexarion/actions"><img src="https://img.shields.io/badge/build-passing-brightgreen?style=for-the-badge" alt="Build"></a>
  <a href="https://www.npmjs.com/package/nexarion-core"><img src="https://img.shields.io/badge/npm-nexarion--core-purple?style=for-the-badge&logo=npm" alt="npm"></a>
  <a href="https://www.npmjs.com/package/nexarion-sdk"><img src="https://img.shields.io/badge/npm-nexarion--sdk-orange?style=for-the-badge&logo=npm" alt="npm"></a>
</div>

---

## Problem

The AI agent ecosystem is fragmenting into two incompatible standards:

- **MCP** (Anthropic) — tools connect to agents, but agents can't talk to other agents
- **A2A** (Google/Linux Foundation) — agents talk to agents, but not to MCP tools

There is no universal bridge. Developers must choose sides or write bespoke integrations.

## Solution

Nexarion is an **agent interoperability runtime** — a runtime layer that dynamically bridges MCP and A2A.

```
┌─────────────────────────────────────────────────────────────────┐
│                       MCP CLIENTS                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ Claude   │  │ Cursor   │  │ VS Code  │  │ Zed      │ ...   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘      │
│       │             │             │             │              │
│       └─────────────┴──────┬──────┴─────────────┘              │
│                            │  tools/list, tools/call            │
└────────────────────────────┼────────────────────────────────────┘
                             │  stdio / HTTP / SSE
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                       NEXARION RUNTIME                          │
│  ┌──────────────┐  ┌────────────────┐  ┌───────────────────┐   │
│  │ Discovery    │  │ Translator     │  │ Router            │   │
│  │ Agent Cards  │→ │ MCP ↔ A2A      │→ │ Auth passthrough  │   │
│  │ /.well-known │  │ Schema mapping │  │ Rate limiting     │   │
│  └──────────────┘  └────────────────┘  └───────────────────┘   │
└────────────────────────────┼────────────────────────────────────┘
                             │  message/send, task/submit
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                       A2A AGENTS                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ Weather  │  │ Code     │  │ Research │  │ Custom   │ ...   │
│  │ Agent    │  │ Agent    │  │ Agent    │  │ Agent    │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

### Killer Feature: Dynamic Tool Synthesis

```
1. A2A agent detected at https://weather.agent.ai
2. GET /.well-known/agent-card.json
3. Agent Card parsed → skills extracted
4. Each skill auto-converted to MCP tool with inputSchema
5. Instantly usable in Claude Desktop / Cursor / VS Code

No configuration. No manual mapping. Just discover and use.
```

## Protocol Mapping

Nexarion translates between MCP and A2A in real-time:

| MCP Concept | Nexarion | A2A Concept |
|---|---|---|
| `tools/list` | → Agent Card skills | `GET /.well-known/agent-card.json` |
| `tools/call` | → message/send | `POST /jsonrpc` with `message/send` |
| Tool `inputSchema` | → Skill parameters | Skill `description` + `tags` |
| Text response | ← Task result | `message.parts[].text` |
| Tool error | ← Task failure | `status.state = failed` |

### Real Protocol Example

**MCP Request (from Claude):**
```json
{
  "method": "tools/call",
  "params": {
    "name": "a2a_weather_agent_forecast",
    "arguments": { "message": "Weather in Paris tomorrow?" }
  }
}
```

**Nexarion translates to A2A:**
```json
{
  "jsonrpc": "2.0",
  "method": "message/send",
  "params": {
    "message": {
      "role": "user",
      "parts": [{ "type": "text", "text": "Weather in Paris tomorrow?" }]
    },
    "configuration": { "blocking": false }
  },
  "id": "1718400000000"
}
```

**A2A Response translated back to MCP:**
```json
{
  "content": [{
    "type": "text",
    "text": "Paris: Partly cloudy, 22°C, 15% chance of rain."
  }]
}
```

## Why Nexarion?

| | MCP Only | A2A Only | Nexarion |
|---|---|---|---|
| Agent ↔ Tool | ✅ | ❌ | ✅ |
| Agent ↔ Agent | ❌ | ✅ | ✅ |
| Auto-Discovery | ❌ | ✅ | ✅ |
| Dynamic Schema | ❌ | Partial | ✅ |
| Cross-Protocol | ❌ | ❌ | ✅ |
| Claude Desktop | ✅ | ❌ | ✅ |
| Streaming | ✅ | ✅ | ✅ |
| Self-Hosted | ✅ | ✅ | ✅ |

## Quick Start

```bash
npm install nexarion-core nexarion-server

# Discover an A2A agent
npx nexarion-cli discover https://agent.example.com

# List exposed MCP tools
npx nexarion-cli tools

# Call an A2A agent through MCP
npx nexarion-cli call a2a_weather_agent_forecast '{"message":"Weather in Paris?"}'
```

## Claude Desktop Integration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "nexarion": {
      "command": "npx",
      "args": ["nexarion-cli", "serve"]
    }
  }
}
```

See `examples/claude-desktop/` for full setup.

## Packages

| Package | Description |
|---|---|
| `nexarion-core` | Core bridge engine — discovery, translation, routing |
| `nexarion-server` | MCP server — stdio + HTTP, JSON-RPC handler |
| `nexarion-cli` | CLI — discover, tools, call, agents, stats, serve |
| `nexarion-web` | Web dashboard — monitor agents, tools, traffic |

## Contributing

```bash
git clone https://github.com/vahapogut/nexarion.git
cd nexarion
pnpm install
pnpm build
pnpm test
```

## License

Apache-2.0. Built by [IPEC Labs](https://ipeclabs.com).
