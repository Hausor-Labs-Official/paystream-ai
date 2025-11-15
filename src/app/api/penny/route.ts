import { NextRequest, NextResponse } from 'next/server';
import { askPenny, getPennyAgent } from '@/lib/penny-agent';

/**
 * POST /api/penny
 * Chat with Penny - AI assistant for payroll queries
 *
 * Body: { prompt: string, userId?: string, clearHistory?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, userId, clearHistory, enableVoice = true } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid prompt' },
        { status: 400 }
      );
    }

    // Clear history if requested
    if (clearHistory) {
      getPennyAgent().clearHistory();
    }

    // Query Penny with userId for conversation memory
    const response = await getPennyAgent().query(prompt, userId);

    // Generate voice response using ElevenLabs if enabled
    let audioUrl = null;
    if (enableVoice && process.env.ELEVENLABS_API_KEY) {
      try {
        const elevenLabsResponse = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID || 'FGY2WhTYpPnrIDTdsKH5'}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'xi-api-key': process.env.ELEVENLABS_API_KEY,
            },
            body: JSON.stringify({
              text: response.text || response,
              model_id: 'eleven_turbo_v2',
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
                style: 0.5,
                use_speaker_boost: true,
              },
            }),
          }
        );

        if (elevenLabsResponse.ok) {
          const audioBlob = await elevenLabsResponse.arrayBuffer();
          const base64Audio = Buffer.from(audioBlob).toString('base64');
          audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
        }
      } catch (voiceError) {
        console.error('ElevenLabs TTS error:', voiceError);
        // Continue without voice - don't fail the whole request
      }
    }

    return NextResponse.json({
      success: true,
      data: response,
      audioUrl,
    });
  } catch (error) {
    console.error('Penny API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process query',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/penny
 * Get Penny's status and capabilities
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    agent: 'Penny',
    version: '1.0.0',
    model: 'Groq LLaMA 3.3 70B',
    capabilities: [
      'Employee salary queries and charts',
      'Payment status tracking',
      'Payroll statistics and analytics',
      'Transaction history',
      'Arc blockchain balance',
      'Natural language conversation',
      'Semantic employee search',
      'Conversation memory (remembers context)',
    ],
    examples: [
      'Show me a chart of employee salaries',
      'What is the total payroll?',
      'How many employees have been paid?',
      'Show payment status distribution',
      'What is the Arc wallet balance?',
    ],
  });
}
