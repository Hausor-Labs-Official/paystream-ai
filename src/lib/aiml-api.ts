import OpenAI from 'openai';
import type { AIProvider, ModelResponse } from '@/types/ai-models';

/**
 * AI/ML API Client
 * OpenAI-compatible client for accessing 200+ models
 */

class AIMLAPIClient {
  private static instance: AIMLAPIClient;
  private client: OpenAI;
  private baseURL = 'https://api.aimlapi.com/v1';

  private constructor() {
    const apiKey = process.env.AIMLAPI_KEY;
    if (!apiKey) {
      throw new Error('AIMLAPI_KEY not found in environment variables');
    }

    this.client = new OpenAI({
      apiKey,
      baseURL: this.baseURL,
    });

    console.log('[AIML API] Client initialized');
  }

  public static getInstance(): AIMLAPIClient {
    if (!AIMLAPIClient.instance) {
      AIMLAPIClient.instance = new AIMLAPIClient();
    }
    return AIMLAPIClient.instance;
  }

  /**
   * Send chat completion request
   */
  async chatCompletion(
    model: string,
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: {
      maxTokens?: number;
      temperature?: number;
      stream?: boolean;
    } = {}
  ): Promise<{
    content: string;
    usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  }> {
    try {
      const startTime = Date.now();

      console.log(`[AIML API] Requesting model: ${model}`);

      const completion = await this.client.chat.completions.create({
        model,
        messages,
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature ?? 0.7,
        stream: false, // Explicitly disable streaming for type safety
      });

      const latency = Date.now() - startTime;
      const content = completion.choices[0]?.message?.content || '';

      const usage = {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0,
      };

      console.log(`[AIML API] Response received in ${latency}ms, tokens: ${usage.totalTokens}`);

      return {
        content,
        usage,
      };
    } catch (error) {
      console.error('[AIML API] Error:', error);
      throw error;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<Array<{ id: string; provider: string }>> {
    try {
      const models = await this.client.models.list();
      return models.data.map((model) => ({
        id: model.id,
        provider: this.extractProvider(model.id),
      }));
    } catch (error) {
      console.error('[AIML API] Error listing models:', error);
      return [];
    }
  }

  /**
   * Extract provider from model ID
   */
  private extractProvider(modelId: string): string {
    if (modelId.includes('gpt')) return 'openai';
    if (modelId.includes('claude')) return 'anthropic';
    if (modelId.includes('gemini')) return 'google';
    if (modelId.includes('llama') || modelId.includes('mixtral')) return 'meta';
    return 'unknown';
  }

  /**
   * Get client instance for advanced usage
   */
  getClient(): OpenAI {
    return this.client;
  }
}

/**
 * Available models on AI/ML API
 */
export const AIMLAPI_MODELS = {
  // OpenAI models
  GPT4_TURBO: 'gpt-4-turbo-preview',
  GPT4: 'gpt-4',
  GPT35_TURBO: 'gpt-3.5-turbo',

  // Anthropic models
  CLAUDE_3_OPUS: 'claude-3-opus-20240229',
  CLAUDE_3_SONNET: 'claude-3-sonnet-20240229',
  CLAUDE_3_HAIKU: 'claude-3-haiku-20240307',

  // Meta models
  LLAMA_3_70B: 'meta-llama/Llama-3-70b-chat-hf',
  LLAMA_3_8B: 'meta-llama/Llama-3-8b-chat-hf',

  // Mistral models
  MIXTRAL_8X7B: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
  MISTRAL_7B: 'mistralai/Mistral-7B-Instruct-v0.2',

  // Google models
  GEMINI_PRO: 'gemini-pro',
  GEMINI_PRO_VISION: 'gemini-pro-vision',
} as const;

/**
 * Get AIML API client instance
 */
export function getAIMLAPIClient(): AIMLAPIClient {
  return AIMLAPIClient.getInstance();
}

/**
 * Quick chat completion with AIML API
 */
export async function aimlChat(
  model: string,
  prompt: string,
  options: {
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<string> {
  const client = getAIMLAPIClient();

  const messages: Array<{ role: 'system' | 'user'; content: string }> = [];

  if (options.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }

  messages.push({ role: 'user', content: prompt });

  const response = await client.chatCompletion(model, messages, {
    maxTokens: options.maxTokens,
    temperature: options.temperature,
  });

  return response.content;
}
