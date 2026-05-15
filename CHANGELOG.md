# Changelog

## v0.2.0 (2026-05-15)

### Added
- 19 unit tests: discovery (4), translator (7), schema validation (8)
- Zod-lightweight schema validation for Agent Cards and MCP tool calls
- Agent Card caching with configurable TTL
- Exponential backoff retry for A2A agent calls
- GitHub Actions CI/CD pipeline (build + test, Node 20/22)
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
