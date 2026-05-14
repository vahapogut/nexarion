<div align="center">
  <h1>Nexarion</h1>
  <p><b>Universal MCP ↔ A2A Bridge</b></p>
  <p>Connect any MCP client to any A2A agent. Auto-discovery, dynamic tool generation, bidirectional translation.</p>

  <a href="#quick-start"><img src="https://img.shields.io/badge/npm-nexarion--core-purple?style=for-the-badge&logo=npm" alt="npm"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-green?style=for-the-badge" alt="License"></a>
  <a href="https://github.com/vahapogut/nexarion"><img src="https://img.shields.io/badge/GitHub-nexarion-blue?style=for-the-badge&logo=github" alt="GitHub"></a>
</div>

---

## What is Nexarion?

Nexarion bridges two major AI protocol standards:

- **MCP (Model Context Protocol)** — agent-to-tool (Anthropic, Claude, VS Code, Cursor)
- **A2A (Agent-to-Agent)** — agent-to-agent communication (Google, Linux Foundation)

It lets **any MCP client** (Claude Desktop, Cursor, VS Code) call **any A2A agent** as if it were a local MCP tool. No bespoke integration needed.

```
┌─────────────────┐         ┌──────────────┐         ┌─────────────────┐
│  MCP Client     │ ──►     │  Nexarion     │  ──►   │  A2A Agent      │
│  (Claude, etc)  │ ◄──     │  Bridge       │  ◄──   │  (Any provider) │
└─────────────────┘         └──────────────┘         └─────────────────┘
   tools/list                  Discovery               Agent Cards
   tools/call                  Translation             message/send
```

## Quick Start

```bash
npm install nexarion-core nexarion-server

# Discover an A2A agent
npx nexarion-cli discover https://agent.example.com

# List exposed MCP tools
npx nexarion-cli tools

# Call an A2A agent through MCP
npx nexarion-cli call a2a_agent_skill '{"message":"Hello"}'
```

## Features

- **Auto-Discovery** — Fetches Agent Cards from `/.well-known/agent-card.json`
- **Dynamic Tool Generation** — Each A2A skill becomes an MCP tool with auto-generated inputSchema
- **Bidirectional Translation** — MCP → A2A message translation and A2A → MCP response mapping
- **Stdio + HTTP** — Works as a local stdio server (Claude Desktop) or HTTP server (remote)
- **Streaming** — SSE streaming support across both protocols
- **Auth Passthrough** — MCP OAuth + A2A token support

## Packages

| Package | Description |
|---|---|
| `nexarion-core` | Core bridge engine — discovery, translation, routing |
| `nexarion-server` | MCP server that wraps A2A agents as MCP tools |
| `nexarion-cli` | CLI for managing the bridge |
| `nexarion-web` | Web dashboard for monitoring |

## Claude Desktop Integration

Add to your `claude_desktop_config.json`:

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

Restart Claude Desktop. All discovered A2A agents appear as MCP tools.

## License

Apache-2.0. Built by [IPEC Labs](https://ipeclabs.com).
