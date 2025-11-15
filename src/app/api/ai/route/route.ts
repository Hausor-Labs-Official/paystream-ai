import { NextRequest, NextResponse } from 'next/server';
import { routeAIRequest } from '@/lib/model-router';
import type { ModelRequest } from '@/types/ai-models';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ai/route
 * Intelligently route AI requests to optimal models with automatic fallback
 *
 * Body: {
 *   prompt: string,
 *   messages?: Array<{role, content}>,
 *   taskType?: 'chat' | 'vision' | 'code' | 'reasoning' | 'general',
 *   priority?: 'speed' | 'cost' | 'quality' | 'balanced',
 *   maxTokens?: number,
 *   temperature?: number,
 *   maxCost?: number,
 *   fallbackEnabled?: boolean
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      prompt,
      messages,
      taskType = 'general',
      priority = 'balanced',
      maxTokens,
      temperature,
      maxCost,
      fallbackEnabled = true,
    } = body;

    // Validation
    if (!prompt && !messages) {
      return NextResponse.json(
        {
          success: false,
          error: 'Either prompt or messages is required',
        },
        { status: 400 }
      );
    }

    console.log(`[AI Route API] Routing ${taskType} request with ${priority} priority`);

    // Create request
    const aiRequest: ModelRequest = {
      prompt,
      messages,
      taskType,
      priority,
      maxTokens,
      temperature,
      maxCost,
      fallbackEnabled,
    };

    // Route request
    const response = await routeAIRequest(aiRequest);

    return NextResponse.json({
      success: true,
      response: response.content,
      metadata: {
        model: response.model,
        provider: response.provider,
        usage: response.usage,
        cost: response.cost,
        latency: response.latency,
        fallbackUsed: response.fallbackUsed,
        attemptedModels: response.attemptedModels,
      },
    });
  } catch (error) {
    console.error('[AI Route API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to route AI request',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/route
 * Get router information and available models
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    description: 'Intelligent AI model routing with automatic fallback',
    endpoint: 'POST /api/ai/route',
    features: [
      'Automatic model selection based on task type',
      'Cost optimization with smart routing',
      'Automatic fallback when models fail',
      'Real-time health monitoring',
      'Cost tracking and analytics',
      '99.9% uptime guarantee',
    ],
    availableModels: [
      { provider: 'groq', model: 'LLaMA 3.3 70B', priority: 1, costPerM: '$0.59-0.79' },
      { provider: 'gemini', model: 'Gemini 2.0 Flash', priority: 2, costPerM: '$0.075-0.30' },
      { provider: 'aimlapi', model: 'GPT-3.5 Turbo', priority: 3, costPerM: '$0.5-1.5' },
      { provider: 'aimlapi', model: 'Claude 3 Haiku', priority: 4, costPerM: '$0.25-1.25' },
    ],
    taskTypes: ['chat', 'vision', 'code', 'reasoning', 'general', 'embedding', 'audio'],
    priorityModes: {
      speed: 'Prioritize fastest response (Groq first)',
      cost: 'Prioritize lowest cost (Gemini first)',
      quality: 'Prioritize best quality (Claude first)',
      balanced: 'Balance speed, cost, and quality (Default)',
    },
    examples: {
      simple: {
        prompt: 'What is 2 + 2?',
        taskType: 'chat',
        priority: 'balanced',
      },
      advanced: {
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: 'Explain quantum computing' },
        ],
        taskType: 'reasoning',
        priority: 'quality',
        maxTokens: 500,
        maxCost: 0.01,
      },
    },
  });
}
