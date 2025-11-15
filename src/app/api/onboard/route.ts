import { NextResponse } from 'next/server';
import { insertEmployee } from '@/lib/supabase';
import { createEmployeeWallet } from '@/lib/circle';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    // Read CSV
    const text = await file.text();
    const lines = text.split('\n').filter((line) => line.trim());

    if (lines.length < 2) {
      return NextResponse.json({ success: false, error: 'CSV file is empty' }, { status: 400 });
    }

    // Parse header
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

    const nameIndex = headers.indexOf('name');
    const emailIndex = headers.indexOf('email');
    const salaryIndex = headers.indexOf('salary_usd');

    if (nameIndex === -1 || emailIndex === -1 || salaryIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'CSV must have name, email, and salary_usd columns' },
        { status: 400 }
      );
    }

    // Process employees
    let successCount = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map((v) => v.trim());

        const name = values[nameIndex];
        const email = values[emailIndex];
        const salaryUsd = parseFloat(values[salaryIndex]);

        if (!name || !email || isNaN(salaryUsd)) {
          errors.push(`Line ${i + 1}: Invalid data`);
          continue;
        }

        // Create wallet for employee
        const { walletId, address } = await createEmployeeWallet(email);

        // Insert into database
        await insertEmployee({
          name,
          email,
          wallet_id: walletId,
          wallet_address: address,
          salary_usd: salaryUsd,
          status: 'pending',
        });

        successCount++;
      } catch (error) {
        errors.push(`Line ${i + 1}: ${(error as Error).message}`);
      }
    }

    return NextResponse.json({
      success: true,
      count: successCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
