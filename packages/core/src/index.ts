/**
 * Nexarion Core — Universal MCP ↔ A2A Bridge Engine
 *
 * @packageDocumentation
 */

export { NexarionBridge } from './bridge.js';
export { AgentDiscovery } from './discovery.js';
export { ProtocolTranslator } from './translator.js';
export type {
  AgentCard, AgentSkill, AgentCapability, AgentAuth,
  MCPTool, MCPProperty, MCPToolCallRequest, MCPToolCallResult,
  MCPListToolsResult, BridgeConfig, BridgeAuthConfig,
  TranslationResult, DiscoveredAgent, BridgeStats,
  ProtocolDirection,
} from './types.js';
