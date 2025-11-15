import { NextRequest, NextResponse } from 'next/server';
import { getGeminiMultimodal, scanDocument, SUPPORTED_IMAGE_FORMATS } from '@/lib/gemini-multimodal';

export const dynamic = 'force-dynamic';

/**
 * POST /api/scan/document
 * Scan and extract data from documents (ID cards, invoices, receipts, W-2s)
 *
 * Body: {
 *   image: string (base64),
 *   mimeType: string,
 *   documentType: 'id_card' | 'invoice' | 'receipt' | 'w2'
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, mimeType, documentType } = body;

    // Validation
    if (!image || typeof image !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Image data is required (base64 string)',
        },
        { status: 400 }
      );
    }

    if (!mimeType || !SUPPORTED_IMAGE_FORMATS.includes(mimeType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid or unsupported MIME type. Supported: ${SUPPORTED_IMAGE_FORMATS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    if (!documentType || !['id_card', 'invoice', 'receipt', 'w2'].includes(documentType)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid documentType. Must be: id_card, invoice, receipt, or w2',
        },
        { status: 400 }
      );
    }

    console.log(`[Scan API] Processing ${documentType} document`);

    // Scan document
    const result = await scanDocument(image, mimeType, documentType);

    return NextResponse.json({
      success: true,
      documentType: result.type,
      data: result.extractedData,
      confidence: result.confidence,
      message: `Successfully scanned ${documentType}`,
    });
  } catch (error) {
    console.error('[Scan API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to scan document',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/scan/document
 * Get supported document types and formats
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    supportedDocumentTypes: ['id_card', 'invoice', 'receipt', 'w2'],
    supportedImageFormats: SUPPORTED_IMAGE_FORMATS,
    usage: {
      endpoint: 'POST /api/scan/document',
      body: {
        image: 'base64 encoded image data',
        mimeType: 'image MIME type',
        documentType: 'id_card | invoice | receipt | w2',
      },
    },
    examples: [
      {
        documentType: 'id_card',
        extractedFields: ['fullName', 'dateOfBirth', 'idNumber', 'address', 'expirationDate'],
      },
      {
        documentType: 'invoice',
        extractedFields: ['vendor', 'date', 'invoiceNumber', 'items', 'total', 'tax'],
      },
      {
        documentType: 'receipt',
        extractedFields: ['vendor', 'date', 'items', 'total', 'paymentMethod'],
      },
      {
        documentType: 'w2',
        extractedFields: ['employeeName', 'wages', 'federalTaxWithheld', 'socialSecurityWages', 'year'],
      },
    ],
  });
}
