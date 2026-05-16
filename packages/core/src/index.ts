/**
 * Nexarion Core — Universal MCP ↔ A2A Bridge Engine
 *
 * @packageDocumentation
 */

export { NexarionBridge } from './bridge.js';
export { AgentDiscovery } from './discovery.js';
export { ProtocolTranslator } from './translator.js';
export { Validator } from './schema.js';
export { parseSSEStream, streamToMCPResult, readSSEStream, type StreamEvent } from "./streaming.js";
export { createACPClient, type ACPClient, type ACPMessage, type ACPResponse } from './acp.js';
export { CapabilityAuth, type AuthPolicy, type CapabilityToken } from './auth.js';
export { EventBridge, type AgentEvent, type WebhookRegistration } from './webhook.js';
export { PluginManager, type Plugin, type PluginContext } from './plugins.js';
export { NexarionError, DiscoveryError, TranslationError, AuthError, RateLimitError, AgentUnreachableError, ValidationError } from './errors.js';
export { Logger, logger, type LogLevel, type LogEntry } from './logger.js';
export type {
  AgentCard, AgentSkill, AgentCapability, AgentAuth,
  MCPTool, MCPProperty, MCPToolCallRequest, MCPToolCallResult,
  MCPListToolsResult, BridgeConfig, BridgeAuthConfig,
  TranslationResult, DiscoveredAgent, BridgeStats,
  ProtocolDirection,
} from './types.js';
