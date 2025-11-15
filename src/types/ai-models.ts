/**
 * AI Model Types and Interfaces
 * Defines types for multi-model AI routing system
 */

export type AIProvider = 'groq' | 'openai' | 'anthropic' | 'gemini' | 'aimlapi';

export type TaskType = 'chat' | 'vision' | 'code' | 'reasoning' | 'embedding' | 'audio' | 'general';

export type PriorityMode = 'speed' | 'cost' | 'quality' | 'balanced';

/**
 * AI Model configuration
 */
export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
  taskTypes: TaskType[];
  contextWindow: number;
  costPerMillion: {
    input: number;
    output: number;
  };
  rateLimit: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  capabilities: {
    streaming?: boolean;
    functions?: boolean;
    vision?: boolean;
    audio?: boolean;
  };
  priority: number; // Lower = higher priority
}

/**
 * Model request parameters
 */
export interface ModelRequest {
  prompt: string;
  messages?: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  taskType?: TaskType;
  priority?: PriorityMode;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  fallbackEnabled?: boolean;
  maxCost?: number; // Maximum cost per request in dollars
}

/**
 * Model response
 */
export interface ModelResponse {
  content: string;
  model: string;
  provider: AIProvider;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: number; // Cost in dollars
  latency: number; // Response time in milliseconds
  fallbackUsed: boolean;
  attemptedModels: string[];
}

/**
 * Fallback strategy configuration
 */
export interface FallbackStrategy {
  maxRetries: number;
  retryDelay: number; // Base delay in milliseconds
  exponentialBackoff: boolean;
  fallbackOrder: AIProvider[];
  skipOnErrors?: string[]; // Error types to not retry
}

/**
 * Model health status
 */
export interface ModelHealth {
  provider: AIProvider;
  model: string;
  isHealthy: boolean;
  lastChecked: Date;
  failureCount: number;
  successRate: number; // 0-1
  averageLatency: number;
  rateLimitHit: boolean;
  rateLimitResetAt?: Date;
}

/**
 * Router configuration
 */
export interface RouterConfig {
  defaultPriority: PriorityMode;
  enableFallback: boolean;
  enableCostTracking: boolean;
  fallbackStrategy: FallbackStrategy;
  healthCheckInterval: number; // in milliseconds
}

/**
 * Cost analytics
 */
export interface CostAnalytics {
  totalRequests: number;
  totalCost: number;
  costByProvider: Record<AIProvider, number>;
  costByTaskType: Record<TaskType, number>;
  averageCostPerRequest: number;
  period: {
    start: Date;
    end: Date;
  };
}

/**
 * Rate limit error
 */
export class RateLimitError extends Error {
  constructor(
    message: string,
    public provider: AIProvider,
    public resetAt?: Date
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * Model unavailable error
 */
export class ModelUnavailableError extends Error {
  constructor(
    message: string,
    public provider: AIProvider,
    public model: string
  ) {
    super(message);
    this.name = 'ModelUnavailableError';
  }
}

/**
 * All models failed error
 */
export class AllModelsFailedError extends Error {
  constructor(
    message: string,
    public attemptedProviders: AIProvider[],
    public errors: Error[]
  ) {
    super(message);
    this.name = 'AllModelsFailedError';
  }
}
