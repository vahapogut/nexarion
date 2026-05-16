# Changelog

## v0.5.0 (2026-05-16)

- Web dashboard JS rewrite, CORS env config, ESLint+Prettier, rate limiting
- ACP client rewrite with safeFetch, schema validator expanded
- CLI serve spawns real server, graceful shutdown, hot-reload dedup
- Prompt parse fix for multi-word agent names
- All 8 packages synced to 0.5.0

## v0.4.0 (2026-05-16)

### Critical — Dead Code Elimination
All 8 previously standalone modules are now integrated into the bridge engine:
- PluginManager: beforeTranslate/afterTranslate/onError hooks fire during tool calls
- CapabilityAuth: auth.check() enforced on every callTool with clientId
- EventBridge: webhook events emitted on translation success/failure
- HTTP Transport: `--transport http` now starts real HTTP server
- Hot-Reload: config file changes trigger auto rediscovery
- MCP Resources/Prompts: `resources/list`, `resources/read`, `prompts/list`, `prompts/get` endpoints live
- Telemetry: OTEL tracing available in server package
- ACP client available for REST-native agent communication

### Added
- HTTP/SSE server transport (Streamable HTTP MCP spec compatible)
- VS Code extension (sidebar panel, TreeView, 4 commands)
- Live web dashboard (fetch + SSE, agent list, real-time stats)
- Config hot-reload (fs.watch + debounce, auto rediscovery)
- Structured JSON logger (levels, correlation ID)
- Custom error types (NexarionError hierarchy: 7 classes)
- MCP Resources & Prompts support (auto-generated from agent skills)
- OpenTelemetry wrapper (noop fallback, withTracing helper)
- `.env.example` (all environment variables documented)
- Real HMAC-SHA256 token signing (was fake base64)
- 37 unit tests across 6 test files

### Changed
- All packages synced to version 0.4.0
- Docker Compose simplified (removed broken mock-agent service)
- `@modelcontextprotocol/sdk` removed (was unused phantom dependency)
- Bridge now accepts clientId for capability checks
- MCP capabilities now include resources + prompts

## v0.2.0 (2026-05-15)
- Docker multi-stage image (Node 22 Alpine)
- Claude Desktop integration example
- Web dashboard HTML
- ASCII architecture diagram in README
- Protocol mapping examples (MCP → A2A → MCP JSON)
- Comparison matrix (MCP Only vs A2A Only vs Nexarion)

### Changed
- README overhauled with "Problem / Solution / Why" structure
- tsconfig.base.json: added `types: ["node"]`, `lib: ["ES2022"]`
- TypeScript strict type fixes across all packages

## v0.1.0 (2026-05-14)

### Initial Release
- Core bridge engine: Agent Discovery, Protocol Translator, Bridge Router
- MCP server: stdio + HTTP transports, JSON-RPC 2.0 handler
- CLI: discover, tools, call, agents, stats, serve
- Web dashboard placeholder
- Monorepo structure (core, server, cli, web)
- pnpm workspace
