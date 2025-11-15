import { NextRequest, NextResponse } from 'next/server';
import { getGeminiMultimodal, verifyDocumentImage, SUPPORTED_IMAGE_FORMATS } from '@/lib/gemini-multimodal';

export const dynamic = 'force-dynamic';

/**
 * POST /api/verify/document
 * Verify document authenticity and detect tampering
 *
 * Body: {
 *   image: string (base64),
 *   mimeType: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, mimeType } = body;

    // Validation
    if (!image || typeof image !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Document image is required (base64 string)',
        },
        { status: 400 }
      );
    }

    if (!mimeType || !SUPPORTED_IMAGE_FORMATS.includes(mimeType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid or unsupported image format. Supported: ${SUPPORTED_IMAGE_FORMATS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    console.log('[Verify API] Verifying document authenticity');

    // Verify document
    const result = await verifyDocumentImage(image, mimeType);

    return NextResponse.json({
      success: true,
      verification: {
        isValid: result.isValid,
        documentType: result.documentType,
        confidence: result.confidence,
        warnings: result.warnings,
      },
      details: result.details,
      recommendation: result.isValid
        ? 'Document appears authentic and can be processed'
        : 'Document verification failed. Manual review recommended.',
    });
  } catch (error) {
    console.error('[Verify API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to verify document',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/verify/face-match
 * Compare two images to verify they show the same person
 *
 * Body: {
 *   image1: string (base64),
 *   image1MimeType: string,
 *   image2: string (base64),
 *   image2MimeType: string
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { image1, image1MimeType, image2, image2MimeType } = body;

    // Validation
    if (!image1 || !image2) {
      return NextResponse.json(
        {
          success: false,
          error: 'Both images are required for face matching',
        },
        { status: 400 }
      );
    }

    if (!SUPPORTED_IMAGE_FORMATS.includes(image1MimeType) || !SUPPORTED_IMAGE_FORMATS.includes(image2MimeType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid or unsupported image format. Supported: ${SUPPORTED_IMAGE_FORMATS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    console.log('[Verify API] Comparing faces for identity verification');

    const gemini = getGeminiMultimodal();
    const result = await gemini.compareFaces(image1, image1MimeType, image2, image2MimeType);

    return NextResponse.json({
      success: true,
      faceMatch: {
        match: result.match,
        confidence: result.confidence,
        details: result.details,
      },
      recommendation: result.match && result.confidence > 70
        ? 'Faces match with high confidence'
        : result.match
        ? 'Faces may match but confidence is low. Manual review recommended.'
        : 'Faces do not appear to match',
    });
  } catch (error) {
    console.error('[Verify API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to compare faces',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/verify/document
 * Get verification information
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    description: 'Verify document authenticity and perform identity checks',
    endpoints: {
      documentVerification: {
        method: 'POST',
        path: '/api/verify/document',
        description: 'Verify document authenticity, detect tampering',
        body: {
          image: 'base64 encoded document image',
          mimeType: 'image MIME type',
        },
      },
      faceMatching: {
        method: 'PUT',
        path: '/api/verify/document',
        description: 'Compare two face images for identity verification',
        body: {
          image1: 'base64 encoded first image',
          image1MimeType: 'first image MIME type',
          image2: 'base64 encoded second image',
          image2MimeType: 'second image MIME type',
        },
      },
    },
    supportedImageFormats: SUPPORTED_IMAGE_FORMATS,
    verificationChecks: [
      'Image quality and clarity',
      'Signs of tampering or manipulation',
      'Security features (watermarks, holograms)',
      'Text alignment and consistency',
      'Document structure integrity',
    ],
    useCases: [
      'Verify employee ID cards during onboarding',
      'Detect fraudulent expense receipts',
      'Validate W-2 forms authenticity',
      'Compare employee photo with ID card photo',
      'Check document integrity before processing',
    ],
  });
}
