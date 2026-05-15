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
    core/        Nexus bridge engine (types, discovery, translator, bridge)
    server/      MCP server (stdio/HTTP, JSON-RPC handler)
    cli/         CLI tools (discover, call, serve)
    web/         Web dashboard
  examples/      Integration examples
```

## Running Tests

```bash
pnpm test                    # All packages
pnpm --filter nexarion-core test   # Core only
```

## Commit Style

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation
- `test:` tests
- `chore:` build/config

## Adding a New A2A Agent Transport

1. Implement the `Transport` interface in `packages/core/src/`
2. Add discovery logic
3. Add tests
4. Update README

## License

Apache-2.0. All contributions are under this license.
