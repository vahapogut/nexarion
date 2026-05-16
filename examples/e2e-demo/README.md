# Nexarion E2E Demo

Full pipeline: **SDK Agent → Nexarion Bridge → MCP Client**

## Quick Run

```bash
cd examples/e2e-demo
bash run.sh
```

## Step by Step

1. **Start the WeatherAgent** (A2A agent built with `nexarion-sdk`)
   ```bash
   npx tsx weather-agent.ts
   ```

2. **Discover the agent**
   ```bash
   npx nexarioncli discover http://localhost:3001
   ```

3. **List MCP tools** (agent skills appear as tools)
   ```bash
   npx nexarioncli tools
   ```

4. **Call the agent through the bridge**
   ```bash
   npx nexarioncli call a2a_weatheragent_forecast '{"message":"Istanbul"}'
   ```

## What This Demonstrates

- 50-line A2A agent created with `nexarion-sdk`'s `createAgent()`
- Agent Card auto-generated at `/.well-known/agent-card.json`
- Nexarion discovers the agent and converts its skills to MCP tools
- MCP tool calls are translated to A2A messages and back
- The entire flow happens in under 1 second
