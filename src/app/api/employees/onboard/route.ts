import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { getGeminiMultimodal, SUPPORTED_IMAGE_FORMATS } from '@/lib/gemini-multimodal';
import { upsertEmployee, EmployeePayload } from '@/services/vector-search';

export const dynamic = 'force-dynamic';

/**
 * POST /api/employees/onboard
 * Onboard employee using ID card scan + optional additional data
 *
 * Body: {
 *   idCardImage: string (base64),
 *   idCardMimeType: string,
 *   additionalData?: {
 *     email?: string,
 *     salary_annual?: number,
 *     department?: string,
 *     role?: string,
 *     wallet_address?: string
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idCardImage, idCardMimeType, additionalData = {} } = body;

    // Validation
    if (!idCardImage || typeof idCardImage !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'ID card image is required (base64 string)',
        },
        { status: 400 }
      );
    }

    if (!idCardMimeType || !SUPPORTED_IMAGE_FORMATS.includes(idCardMimeType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid or unsupported image format. Supported: ${SUPPORTED_IMAGE_FORMATS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    console.log('[Onboard API] Starting employee onboarding with ID scan');

    // Step 1: Scan ID card
    const gemini = getGeminiMultimodal();
    const scanResult = await gemini.scanIDCard(idCardImage, idCardMimeType);

    if (!scanResult.extractedData || Object.keys(scanResult.extractedData).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to extract data from ID card. Please ensure the image is clear and readable.',
          confidence: scanResult.confidence,
        },
        { status: 400 }
      );
    }

    const extractedData: any = scanResult.extractedData;

    // Step 2: Prepare employee data
    const employeeName = extractedData.fullName || `${extractedData.firstName || ''} ${extractedData.lastName || ''}`.trim();

    if (!employeeName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Could not extract employee name from ID card',
          extractedData,
        },
        { status: 400 }
      );
    }

    // Generate email if not provided
    let email = additionalData.email;
    if (!email && employeeName) {
      // Generate email from name: "John Doe" -> "john.doe@paystream.ai"
      email = `${employeeName.toLowerCase().replace(/\s+/g, '.')}@paystream.ai`;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Valid email is required. Please provide email in additionalData.',
          suggestion: email,
        },
        { status: 400 }
      );
    }

    // Step 3: Check if employee already exists
    const supabase = getSupabaseClient();
    const { data: existingEmployee, error: checkError } = await supabase
      .from('employees')
      .select('id, email, name')
      .eq('email', email.toLowerCase())
      .single();

    if (existingEmployee) {
      return NextResponse.json(
        {
          success: false,
          error: 'Employee with this email already exists',
          existingEmployee: {
            id: existingEmployee.id,
            name: existingEmployee.name,
            email: existingEmployee.email,
          },
        },
        { status: 409 }
      );
    }

    // Step 4: Insert employee into database
    const employeeData = {
      name: employeeName,
      email: email.trim().toLowerCase(),
      date_of_birth: extractedData.dateOfBirth || null,
      address: extractedData.address || null,
      city: extractedData.city || null,
      state: extractedData.state || null,
      zip_code: extractedData.zipCode || null,
      country: extractedData.country || 'USA',
      id_number: extractedData.idNumber || null,
      wallet_address: additionalData.wallet_address?.trim() || null,
      salary_annual: additionalData.salary_annual || 0,
      salary_usd: additionalData.salary_annual || 0,
      department: additionalData.department || 'General',
      role: additionalData.role || 'Employee',
      status: 'pending',
      pay_status: 'pending',
      created_at: new Date().toISOString(),
    };

    const { data: newEmployee, error: insertError } = await supabase
      .from('employees')
      .insert(employeeData)
      .select()
      .single();

    if (insertError) {
      console.error('[Onboard API] Database insert error:', insertError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create employee record',
          details: insertError.message,
        },
        { status: 500 }
      );
    }

    // Step 5: Sync to Qdrant for semantic search (non-blocking)
    try {
      const vectorPayload: EmployeePayload = {
        employeeId: newEmployee.id.toString(),
        name: newEmployee.name,
        email: newEmployee.email,
        role: newEmployee.role || 'Employee',
        department: newEmployee.department || 'General',
        skills: [],
        walletAddress: newEmployee.wallet_address || undefined,
        text: `${newEmployee.name} ${newEmployee.email} ${newEmployee.role || ''} ${newEmployee.department || ''}`,
      };

      upsertEmployee(vectorPayload).catch((err) => {
        console.error('[Onboard API] Failed to sync to Qdrant:', err);
      });
    } catch (syncError) {
      console.error('[Onboard API] Vector sync error:', syncError);
      // Don't fail the request
    }

    console.log('[Onboard API] Employee onboarded successfully:', newEmployee.id);

    // Step 6: Return success
    return NextResponse.json({
      success: true,
      message: 'Employee onboarded successfully',
      employee: {
        id: newEmployee.id,
        name: newEmployee.name,
        email: newEmployee.email,
        dateOfBirth: newEmployee.date_of_birth,
        address: newEmployee.address,
        department: newEmployee.department,
        role: newEmployee.role,
      },
      scanConfidence: scanResult.confidence,
      extractedFromID: {
        name: extractedData.fullName,
        dateOfBirth: extractedData.dateOfBirth,
        address: extractedData.address,
        idNumber: extractedData.idNumber,
        documentType: extractedData.documentType,
      },
    });
  } catch (error) {
    console.error('[Onboard API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to onboard employee',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/employees/onboard
 * Get onboarding information
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    description: 'Onboard employees automatically using ID card scanning',
    endpoint: 'POST /api/employees/onboard',
    requiredFields: {
      idCardImage: 'base64 encoded image',
      idCardMimeType: 'image MIME type (e.g., image/jpeg)',
    },
    optionalFields: {
      additionalData: {
        email: 'employee email (auto-generated if not provided)',
        salary_annual: 'annual salary',
        department: 'department name',
        role: 'job role/title',
        wallet_address: 'blockchain wallet address',
      },
    },
    supportedImageFormats: SUPPORTED_IMAGE_FORMATS,
    workflow: [
      '1. Scan ID card using Gemini Vision API',
      '2. Extract employee data (name, DOB, address, etc.)',
      '3. Generate email if not provided',
      '4. Check for existing employee',
      '5. Create employee record in database',
      '6. Sync to vector database for semantic search',
      '7. Return employee data and scan confidence',
    ],
  });
}
