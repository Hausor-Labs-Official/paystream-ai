import { NextRequest, NextResponse } from 'next/server';
import { getGeminiMultimodal, SUPPORTED_AUDIO_FORMATS } from '@/lib/gemini-multimodal';

export const dynamic = 'force-dynamic';

/**
 * POST /api/audio/transcribe
 * Transcribe audio to text using Gemini
 *
 * Body: {
 *   audio: string (base64),
 *   mimeType: string,
 *   language?: string,
 *   analysisType?: 'transcription' | 'summary' | 'sentiment' | 'keywords'
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { audio, mimeType, language, analysisType = 'transcription' } = body;

    // Validation
    if (!audio || typeof audio !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Audio data is required (base64 string)',
        },
        { status: 400 }
      );
    }

    if (!mimeType || !SUPPORTED_AUDIO_FORMATS.includes(mimeType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid or unsupported audio format. Supported: ${SUPPORTED_AUDIO_FORMATS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    console.log(`[Audio API] Processing audio (${mimeType}), type: ${analysisType}`);

    const gemini = getGeminiMultimodal();

    if (analysisType === 'transcription') {
      // Transcribe audio
      const result = await gemini.transcribeAudio(audio, mimeType, language);

      return NextResponse.json({
        success: true,
        type: 'transcription',
        transcript: result.transcript,
        language: result.language,
        confidence: result.confidence,
        message: 'Audio transcribed successfully',
      });
    } else {
      // Analyze audio (summary, sentiment, keywords)
      const result = await gemini.analyzeAudio(audio, mimeType, analysisType as any);

      return NextResponse.json({
        success: true,
        type: analysisType,
        result,
        message: `Audio ${analysisType} completed successfully`,
      });
    }
  } catch (error) {
    console.error('[Audio API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process audio',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/audio/transcribe
 * Get audio transcription information
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    description: 'Transcribe and analyze audio using Gemini AI',
    endpoint: 'POST /api/audio/transcribe',
    requiredFields: {
      audio: 'base64 encoded audio data',
      mimeType: 'audio MIME type',
    },
    optionalFields: {
      language: 'language code (e.g., en, es, fr) - auto-detected if not provided',
      analysisType: 'transcription | summary | sentiment | keywords (default: transcription)',
    },
    supportedAudioFormats: SUPPORTED_AUDIO_FORMATS,
    analysisTypes: {
      transcription: 'Convert speech to text',
      summary: 'Provide a summary of audio content',
      sentiment: 'Analyze sentiment (positive/negative/neutral)',
      keywords: 'Extract main topics and keywords',
    },
    limits: {
      maxDuration: '9.5 hours per request',
      tokenRate: '32 tokens per second of audio',
      maxFileSize: '20 MB for inline data',
    },
    useCases: [
      'Transcribe payroll meeting recordings',
      'Convert voice commands for Penny AI',
      'Analyze employee feedback calls',
      'Extract action items from discussions',
      'Sentiment analysis of team meetings',
    ],
  });
}
