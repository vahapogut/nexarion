#!/bin/bash
# Nexarion E2E Demo — Full Pipeline
# 1. Start WeatherAgent (A2A)
# 2. Discover with Nexarion CLI
# 3. List MCP tools
# 4. Call the agent through the bridge
# 5. Verify response

set -e

echo "=== Nexarion E2E Demo ==="
echo ""

# Start WeatherAgent in background
echo "[1/5] Starting WeatherAgent on port 3001..."
npx tsx weather-agent.ts &
AGENT_PID=$!
sleep 1

# Discover agent
echo "[2/5] Discovering WeatherAgent..."
npx nexarioncli discover http://localhost:3001

# List tools
echo "[3/5] Listing MCP tools..."
npx nexarioncli tools

# Call forecast
echo "[4/5] Calling forecast tool..."
npx nexarioncli call a2a_weatheragent_forecast '{"message":"Istanbul"}'

# Call alert
echo "[5/5] Calling alert tool..."
npx nexarioncli call a2a_weatheragent_alert '{"message":"Miami"}'

echo ""
echo "=== Demo Complete ==="
echo "WeatherAgent is running on http://localhost:3001"
echo "Agent Card: http://localhost:3001/.well-known/agent-card.json"

# Cleanup
kill $AGENT_PID 2>/dev/null
echo "Agent stopped."
