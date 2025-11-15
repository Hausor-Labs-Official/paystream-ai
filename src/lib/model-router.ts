import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAIMLAPIClient, AIMLAPI_MODELS } from './aiml-api';
import type {
  AIModel,
  AIProvider,
  TaskType,
  PriorityMode,
  ModelRequest,
  ModelResponse,
  ModelHealth,
  RouterConfig,
} from '@/types/ai-models';
import { RateLimitError, ModelUnavailableError } from '@/types/ai-models';

/**
 * Model Router
 * Intelligent model selection with fallback strategies
 */

// Available models configuration
const MODELS: AIModel[] = [
  // Primary: Groq (fastest, cheapest for chat)
  {
    id: 'llama-3.3-70b-versatile',
    name: 'LLaMA 3.3 70B',
    provider: 'groq',
    taskTypes: ['chat', 'general', 'reasoning'],
    contextWindow: 32768,
    costPerMillion: { input: 0.59, output: 0.79 },
    rateLimit: { requestsPerMinute: 30, tokensPerMinute: 14400 },
    capabilities: { streaming: true, functions: true },
    priority: 1,
  },

  // Fallback 1: Gemini (multimodal, good balance)
  {
    id: 'gemini-2.0-flash-exp',
    name: 'Gemini 2.0 Flash',
    provider: 'gemini',
    taskTypes: ['chat', 'vision', 'general', 'reasoning', 'embedding'],
    contextWindow: 32768,
    costPerMillion: { input: 0.075, output: 0.30 },
    rateLimit: { requestsPerMinute: 15, tokensPerMinute: 4000 },
    capabilities: { streaming: true, vision: true, audio: true },
    priority: 2,
  },

  // Fallback 2: OpenAI via AIML API (reliable, good quality)
  {
    id: AIMLAPI_MODELS.GPT35_TURBO,
    name: 'GPT-3.5 Turbo',
    provider: 'aimlapi',
    taskTypes: ['chat', 'general', 'code', 'reasoning'],
    contextWindow: 16384,
    costPerMillion: { input: 0.5, output: 1.5 },
    rateLimit: { requestsPerMinute: 60, tokensPerMinute: 90000 },
    capabilities: { streaming: true, functions: true },
    priority: 3,
  },

  // Fallback 3: Claude via AIML API (highest quality, most expensive)
  {
    id: AIMLAPI_MODELS.CLAUDE_3_HAIKU,
    name: 'Claude 3 Haiku',
    provider: 'aimlapi',
    taskTypes: ['chat', 'general', 'code', 'reasoning'],
    contextWindow: 200000,
    costPerMillion: { input: 0.25, output: 1.25 },
    rateLimit: { requestsPerMinute: 50, tokensPerMinute: 50000 },
    capabilities: { streaming: true },
    priority: 4,
  },
];

class ModelRouter {
  private static instance: ModelRouter;
  private groqClient?: Groq;
  private geminiClient?: GoogleGenerativeAI;
  private aimlClient?: any;
  private healthStatus: Map<string, ModelHealth> = new Map();
  private costTracking: { requests: number; totalCost: number; costByProvider: Record<string, number> } = {
    requests: 0,
    totalCost: 0,
    costByProvider: {},
  };

  private config: RouterConfig = {
    defaultPriority: 'balanced',
    enableFallback: true,
    enableCostTracking: true,
    fallbackStrategy: {
      maxRetries: 3,
      retryDelay: 1000,
      exponentialBackoff: true,
      fallbackOrder: ['groq', 'gemini', 'aimlapi'],
    },
    healthCheckInterval: 60000,
  };

  private constructor() {
    this.initializeClients();
    console.log('[Model Router] Initialized with', MODELS.length, 'models');
  }

  public static getInstance(): ModelRouter {
    if (!ModelRouter.instance) {
      ModelRouter.instance = new ModelRouter();
    }
    return ModelRouter.instance;
  }

  /**
   * Initialize AI clients
   */
  private initializeClients() {
    try {
      if (process.env.GROQ_API_KEY) {
        this.groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
      }
      if (process.env.GEMINI_API_KEY) {
        this.geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      }
      if (process.env.AIMLAPI_KEY) {
        this.aimlClient = getAIMLAPIClient();
      }
    } catch (error) {
      console.error('[Model Router] Error initializing clients:', error);
    }
  }

  /**
   * Route request to best available model
   */
  async routeRequest(request: ModelRequest): Promise<ModelResponse> {
    const startTime = Date.now();
    const attemptedModels: string[] = [];
    const taskType = request.taskType || 'general';
    const priority = request.priority || this.config.defaultPriority;

    // Select models based on task type and priority
    const availableModels = this.selectModels(taskType, priority, request.maxCost);

    if (availableModels.length === 0) {
      throw new ModelUnavailableError('No models available for this task', 'groq', 'none');
    }

    // Try each model in order
    for (const model of availableModels) {
      attemptedModels.push(model.id);

      try {
        console.log(`[Model Router] Trying ${model.provider}:${model.name}`);

        const result = await this.executeRequest(model, request);

        const latency = Date.now() - startTime;
        const cost = this.calculateCost(model, result.usage.promptTokens, result.usage.completionTokens);

        // Track cost
        if (this.config.enableCostTracking) {
          this.trackCost(model.provider, cost);
        }

        // Update health status
        this.updateHealth(model, true, latency);

        return {
          content: result.content,
          model: model.id,
          provider: model.provider,
          usage: result.usage,
          cost,
          latency,
          fallbackUsed: attemptedModels.length > 1,
          attemptedModels,
        };
      } catch (error) {
        console.error(`[Model Router] ${model.provider} failed:`, (error as Error).message);

        // Update health status
        this.updateHealth(model, false, 0);

        // Check if this is a rate limit error
        if (this.isRateLimitError(error)) {
          console.log(`[Model Router] Rate limit hit for ${model.provider}`);
        }

        // If fallback is disabled or this is the last model, throw error
        if (!this.config.enableFallback || attemptedModels.length >= availableModels.length) {
          throw error;
        }

        // Otherwise, continue to next model
        continue;
      }
    }

    // All models failed
    throw new ModelUnavailableError(
      `All ${attemptedModels.length} models failed`,
      'aimlapi',
      attemptedModels.join(', ')
    );
  }

  /**
   * Select models based on task type, priority, and cost
   */
  private selectModels(taskType: TaskType, priority: PriorityMode, maxCost?: number): AIModel[] {
    let candidates = MODELS.filter((model) => model.taskTypes.includes(taskType));

    // Filter by max cost if specified
    if (maxCost !== undefined) {
      candidates = candidates.filter((model) => {
        const estimatedCost = ((model.costPerMillion.input + model.costPerMillion.output) / 1000000) * 1000; // Estimate for 1K tokens
        return estimatedCost <= maxCost;
      });
    }

    // Sort by priority mode
    candidates.sort((a, b) => {
      switch (priority) {
        case 'speed':
          return a.priority - b.priority; // Groq first (fastest)
        case 'cost':
          return a.costPerMillion.input + a.costPerMillion.output - (b.costPerMillion.input + b.costPerMillion.output);
        case 'quality':
          return b.priority - a.priority; // Claude first (best quality)
        case 'balanced':
        default:
          return a.priority - b.priority;
      }
    });

    return candidates;
  }

  /**
   * Execute request on specific model
   */
  private async executeRequest(
    model: AIModel,
    request: ModelRequest
  ): Promise<{ content: string; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
    const messages = request.messages || [{ role: 'user' as const, content: request.prompt }];

    switch (model.provider) {
      case 'groq':
        return this.executeGroq(model, messages, request);
      case 'gemini':
        return this.executeGemini(model, messages, request);
      case 'aimlapi':
        return this.executeAIML(model, messages, request);
      default:
        throw new Error(`Unsupported provider: ${model.provider}`);
    }
  }

  /**
   * Execute request on Groq
   */
  private async executeGroq(
    model: AIModel,
    messages: any[],
    request: ModelRequest
  ): Promise<{ content: string; usage: any }> {
    if (!this.groqClient) {
      throw new ModelUnavailableError('Groq client not initialized', 'groq', model.id);
    }

    const completion = await this.groqClient.chat.completions.create({
      model: model.id,
      messages,
      max_tokens: request.maxTokens || 1000,
      temperature: request.temperature ?? 0.7,
    });

    return {
      content: completion.choices[0]?.message?.content || '',
      usage: {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0,
      },
    };
  }

  /**
   * Execute request on Gemini
   */
  private async executeGemini(
    model: AIModel,
    messages: any[],
    request: ModelRequest
  ): Promise<{ content: string; usage: any }> {
    if (!this.geminiClient) {
      throw new ModelUnavailableError('Gemini client not initialized', 'gemini', model.id);
    }

    const geminiModel = this.geminiClient.getGenerativeModel({ model: model.id });

    // Convert messages to Gemini format
    const prompt = messages.map((m) => `${m.role}: ${m.content}`).join('\n');

    const result = await geminiModel.generateContent(prompt);
    const response = result.response;
    const content = response.text();

    // Gemini doesn't provide token usage, estimate it
    const estimatedTokens = Math.ceil(content.length / 4);

    return {
      content,
      usage: {
        promptTokens: Math.ceil(prompt.length / 4),
        completionTokens: estimatedTokens,
        totalTokens: Math.ceil(prompt.length / 4) + estimatedTokens,
      },
    };
  }

  /**
   * Execute request on AIML API
   */
  private async executeAIML(
    model: AIModel,
    messages: any[],
    request: ModelRequest
  ): Promise<{ content: string; usage: any }> {
    if (!this.aimlClient) {
      throw new ModelUnavailableError('AIML API client not initialized', 'aimlapi', model.id);
    }

    return this.aimlClient.chatCompletion(model.id, messages, {
      maxTokens: request.maxTokens,
      temperature: request.temperature,
    });
  }

  /**
   * Calculate cost for request
   */
  private calculateCost(model: AIModel, promptTokens: number, completionTokens: number): number {
    const inputCost = (promptTokens / 1000000) * model.costPerMillion.input;
    const outputCost = (completionTokens / 1000000) * model.costPerMillion.output;
    return inputCost + outputCost;
  }

  /**
   * Track cost
   */
  private trackCost(provider: string, cost: number) {
    this.costTracking.requests++;
    this.costTracking.totalCost += cost;
    this.costTracking.costByProvider[provider] = (this.costTracking.costByProvider[provider] || 0) + cost;
  }

  /**
   * Update model health status
   */
  private updateHealth(model: AIModel, success: boolean, latency: number) {
    const key = `${model.provider}:${model.id}`;
    const current = this.healthStatus.get(key);

    if (current) {
      current.lastChecked = new Date();
      current.failureCount = success ? Math.max(0, current.failureCount - 1) : current.failureCount + 1;
      current.isHealthy = current.failureCount < 3;
      current.averageLatency = success ? (current.averageLatency + latency) / 2 : current.averageLatency;
    } else {
      this.healthStatus.set(key, {
        provider: model.provider,
        model: model.id,
        isHealthy: success,
        lastChecked: new Date(),
        failureCount: success ? 0 : 1,
        successRate: success ? 1 : 0,
        averageLatency: latency,
        rateLimitHit: false,
      });
    }
  }

  /**
   * Check if error is rate limit
   */
  private isRateLimitError(error: any): boolean {
    const message = error?.message?.toLowerCase() || '';
    return message.includes('rate limit') || message.includes('429') || message.includes('quota');
  }

  /**
   * Get cost analytics
   */
  getCostAnalytics() {
    return {
      ...this.costTracking,
      averageCostPerRequest: this.costTracking.requests > 0 ? this.costTracking.totalCost / this.costTracking.requests : 0,
    };
  }

  /**
   * Get health status
   */
  getHealthStatus(): ModelHealth[] {
    return Array.from(this.healthStatus.values());
  }

  /**
   * Get available models
   */
  getAvailableModels(): AIModel[] {
    return MODELS;
  }
}

// Export singleton instance
export function getModelRouter(): ModelRouter {
  return ModelRouter.getInstance();
}

// Convenience function for quick routing
export async function routeAIRequest(request: ModelRequest): Promise<ModelResponse> {
  return getModelRouter().routeRequest(request);
}
