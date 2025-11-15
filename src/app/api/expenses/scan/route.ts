import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { getGeminiMultimodal, SUPPORTED_IMAGE_FORMATS } from '@/lib/gemini-multimodal';

export const dynamic = 'force-dynamic';

/**
 * POST /api/expenses/scan
 * Scan receipt or invoice and create expense record
 *
 * Body: {
 *   image: string (base64),
 *   mimeType: string,
 *   employeeId?: string,
 *   category?: string,
 *   notes?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, mimeType, employeeId, category, notes } = body;

    // Validation
    if (!image || typeof image !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Receipt/invoice image is required (base64 string)',
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

    console.log('[Expense Scan API] Scanning receipt/invoice');

    // Scan document
    const gemini = getGeminiMultimodal();
    const scanResult = await gemini.scanInvoiceOrReceipt(image, mimeType);

    if (!scanResult.extractedData || Object.keys(scanResult.extractedData).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to extract data from receipt/invoice. Please ensure the image is clear.',
          confidence: scanResult.confidence,
        },
        { status: 400 }
      );
    }

    const extractedData: any = scanResult.extractedData;

    // Prepare expense data
    const expenseData = {
      employee_id: employeeId || null,
      vendor: extractedData.vendor || 'Unknown Vendor',
      date: extractedData.date || new Date().toISOString().split('T')[0],
      amount: extractedData.total || extractedData.subtotal || 0,
      tax: extractedData.tax || 0,
      subtotal: extractedData.subtotal || extractedData.total || 0,
      currency: extractedData.currency || 'USD',
      category: category || 'General',
      description: notes || `Expense from ${extractedData.vendor || 'vendor'}`,
      receipt_number: extractedData.invoiceNumber || null,
      payment_method: extractedData.paymentMethod || null,
      status: 'pending',
      created_at: new Date().toISOString(),
      extracted_items: extractedData.items || [],
      scan_confidence: scanResult.confidence,
      raw_scan_data: extractedData,
    };

    // Check if expenses table exists, if not just return the scanned data
    const supabase = getSupabaseClient();

    try {
      const { data: expense, error: insertError } = await supabase
        .from('expenses')
        .insert(expenseData)
        .select()
        .single();

      if (insertError) {
        // Table might not exist yet - return scanned data anyway
        console.warn('[Expense Scan API] Could not save to database:', insertError.message);

        return NextResponse.json({
          success: true,
          message: 'Receipt scanned successfully (not saved - expenses table may not exist)',
          scannedData: {
            vendor: extractedData.vendor,
            date: extractedData.date,
            total: extractedData.total,
            tax: extractedData.tax,
            items: extractedData.items || [],
            invoiceNumber: extractedData.invoiceNumber,
            paymentMethod: extractedData.paymentMethod,
          },
          confidence: scanResult.confidence,
          note: 'Data was not saved. Create expenses table to enable saving.',
        });
      }

      console.log('[Expense Scan API] Expense created:', expense.id);

      return NextResponse.json({
        success: true,
        message: 'Expense created successfully from receipt scan',
        expense: {
          id: expense.id,
          vendor: expense.vendor,
          date: expense.date,
          amount: expense.amount,
          tax: expense.tax,
          category: expense.category,
          status: expense.status,
        },
        scannedData: {
          vendor: extractedData.vendor,
          date: extractedData.date,
          total: extractedData.total,
          tax: extractedData.tax,
          items: extractedData.items || [],
          invoiceNumber: extractedData.invoiceNumber,
          paymentMethod: extractedData.paymentMethod,
        },
        confidence: scanResult.confidence,
      });
    } catch (dbError) {
      // If table doesn't exist, still return the scanned data
      console.warn('[Expense Scan API] Database error:', dbError);

      return NextResponse.json({
        success: true,
        message: 'Receipt scanned successfully (not saved to database)',
        scannedData: {
          vendor: extractedData.vendor,
          date: extractedData.date,
          total: extractedData.total,
          tax: extractedData.tax,
          items: extractedData.items || [],
          invoiceNumber: extractedData.invoiceNumber,
          paymentMethod: extractedData.paymentMethod,
        },
        confidence: scanResult.confidence,
        note: 'Expense data was scanned but not saved. Create expenses table to enable saving.',
      });
    }
  } catch (error) {
    console.error('[Expense Scan API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to scan receipt/invoice',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/expenses/scan
 * Get expense scanning information
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    description: 'Scan receipts and invoices to automatically create expense records',
    endpoint: 'POST /api/expenses/scan',
    requiredFields: {
      image: 'base64 encoded receipt/invoice image',
      mimeType: 'image MIME type (e.g., image/jpeg)',
    },
    optionalFields: {
      employeeId: 'employee ID for expense association',
      category: 'expense category (e.g., Travel, Meals, Office Supplies)',
      notes: 'additional notes about the expense',
    },
    supportedImageFormats: SUPPORTED_IMAGE_FORMATS,
    extractedFields: [
      'vendor (merchant name)',
      'date (transaction date)',
      'total (total amount)',
      'tax (tax amount)',
      'subtotal',
      'items (line items with descriptions and prices)',
      'invoiceNumber',
      'paymentMethod',
    ],
    expenseCategories: [
      'Travel',
      'Meals',
      'Office Supplies',
      'Software',
      'Equipment',
      'Marketing',
      'Professional Services',
      'General',
    ],
  });
}
