# Contributing to Nexarion

## Setup

```bash
git clone https://github.com/vahapogut/nexarion.git
cd nexarion
pnpm install
pnpm build
pnpm test
```

## Project Structure

```
nexarion/
  packages/
    core/      Bridge engine (types, discovery, translator, bridge, auth, plugins, webhook, acp)
    server/    MCP server (stdio/HTTP, hot-reload, telemetry, MCP resources/prompts)
    cli/       CLI tools (discover, call, serve, init wizard, validate)
    web/       Web dashboard (live fetch + SSE)
    sdk/       Agent SDK (createAgent in 50 lines)
    registry/  Agent directory (search, health-check)
    vscode/    VS Code extension (sidebar, TreeView, commands)
  examples/    E2E demo + Claude Desktop config
```

## Running Tests

```bash
pnpm test
pnpm --filter nexarion-core test
vitest run --coverage
```

## Commit Style

- `feat:` new feature
- `fix:` bug fix  
- `docs:` documentation
- `test:` tests
- `chore:` build/config

## Adding a New Transport

1. Implement `Transport` interface in `packages/core/src/`
2. Add to `TransportType`
3. Add `createTransport` case
4. Add tests
5. Update README

## License

Apache-2.0. All contributions under this license.
