/**
 * Nexarion — Universal A2A ↔ MCP Type Definitions
 */

// ─── A2A Types ───────────────────────────────────────────────────────

export interface AgentCard {
  name: string;
  description: string;
  url: string;
  version: string;
  capabilities: AgentCapability;
  skills: AgentSkill[];
  endpoints: {
    jsonRpc?: string;
    rest?: string;
    grpc?: string;
  };
  authentication?: AgentAuth;
}

export interface AgentCapability {
  streaming: boolean;
  pushNotifications: boolean;
  stateTransitionHistory: boolean;
}

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  tags: string[];
  examples?: string[];
  inputModes?: string[];
  outputModes?: string[];
}

export interface AgentAuth {
  schemes: string[];
  credentials?: string;
}

// ─── MCP Types ───────────────────────────────────────────────────────

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, MCPProperty>;
    required?: string[];
  };
}

export interface MCPProperty {
  type: string;
  description?: string;
  default?: unknown;
  enum?: string[];
}

export interface MCPToolCallRequest {
  name: string;
  arguments: Record<string, unknown>;
}

export interface MCPToolCallResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
    uri?: string;
  }>;
  isError?: boolean;
}

export interface MCPListToolsResult {
  tools: MCPTool[];
}

// ─── Bridge Types ────────────────────────────────────────────────────

export type ProtocolDirection = 'a2a-to-mcp' | 'mcp-to-a2a' | 'bidirectional';

export interface BridgeConfig {
  /** A2A agents to bridge */
  agents: AgentCard[];
  /** Protocol direction */
  direction: ProtocolDirection;
  /** Auth config */
  auth?: BridgeAuthConfig;
  /** Streaming enabled */
  streaming?: boolean;
  /** Cache agent cards for N minutes */
  cacheMinutes?: number;
  /** Retry configuration */
  retry?: { maxRetries?: number; initialDelayMs?: number; maxDelayMs?: number };
  /** Logging configuration */
  logging?: { level: 'debug' | 'info' | 'warn' | 'error' };
}

export interface BridgeAuthConfig {
  /** MCP OAuth token */
  mcpToken?: string;
  /** A2A agent auth token */
  a2aToken?: string;
  /** Auth translation map (agent → credentials) */
  agentCredentials?: Record<string, string>;
}

export interface TranslationResult {
  success: boolean;
  direction: 'a2a-to-mcp' | 'mcp-to-a2a';
  original: unknown;
  translated: unknown;
  warnings?: string[];
  latencyMs: number;
}

export interface DiscoveredAgent {
  card: AgentCard;
  discoveredAt: string;
  status: 'online' | 'offline' | 'unknown';
  latencyMs: number;
}

export interface BridgeStats {
  agentsDiscovered: number;
  toolsExposed: number;
  translationsTotal: number;
  translationsFailed: number;
  uptimeMs: number;
  lastDiscovery: string | null;
}
