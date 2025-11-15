import { NextResponse } from 'next/server';
import { getPendingEmployees, updateEmployee } from '@/lib/supabase';
import { PayrollAgent, PayrollInput, PayrollResult } from '@/lib/payroll-agent';
import { executeBatchPay, BatchPaymentEmployee } from '@/lib/executor-agent';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

/**
 * POST /api/payroll
 * Process payroll for all pending employees
 */
export async function POST(request: Request) {
  try {
    console.log('Starting payroll processing...\n');

    // Step 1: Get pending employees
    const pendingEmployees = await getPendingEmployees();

    if (pendingEmployees.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No pending employees to process',
      });
    }

    console.log(`Found ${pendingEmployees.length} pending employees`);

    // Step 1.5: Calculate total payroll needed and check USDC balance
    // Fixed payroll: 1.0 USDC per employee
    const FIXED_PAY_PER_EMPLOYEE = 1.0;
    const estimatedTotalPayroll = pendingEmployees.length * FIXED_PAY_PER_EMPLOYEE;

    console.log(`Estimated total payroll: $${estimatedTotalPayroll.toFixed(2)} USDC`);

    // Import dynamically to avoid circular dependencies
    const { ExecutorAgent } = await import('@/lib/executor-agent');
    const executorAgent = new ExecutorAgent();

    try {
      const usdcBalance = await executorAgent.getUSDCBalance();
      console.log(`Current USDC balance: $${usdcBalance.toFixed(2)}`);

      if (usdcBalance < estimatedTotalPayroll) {
        const shortfall = estimatedTotalPayroll - usdcBalance;
        return NextResponse.json({
          success: false,
          error: 'INSUFFICIENT_BALANCE',
          message: `Insufficient USDC balance. Need $${estimatedTotalPayroll.toFixed(2)}, have $${usdcBalance.toFixed(2)}. Shortfall: $${shortfall.toFixed(2)}`,
          details: {
            required: estimatedTotalPayroll,
            available: usdcBalance,
            shortfall: shortfall,
            employeeCount: pendingEmployees.length,
          }
        }, { status: 400 });
      }

      console.log(`USDC balance sufficient for payroll`);
    } catch (balanceError) {
      console.warn(`Could not verify USDC balance: ${(balanceError as Error).message}`);
      // Continue processing but log the warning
    }

    // Step 2: Calculate payroll for each employee using AI
    const payrollAgent = new PayrollAgent();
    const payrollResults: PayrollResult[] = [];
    const batchPaymentEmployees: BatchPaymentEmployee[] = [];

    console.log('\nCalculating payroll...');

    for (const employee of pendingEmployees) {
      try {
        console.log(`   Calculating for ${employee.name}...`);

        // Fixed pay: 0.9 USDC per employee
        const basePay = FIXED_PAY_PER_EMPLOYEE;
        const hoursWorked = 80; // Standard biweekly hours
        const overtimeHours = 0;
        const overtimePay = 0;
        const grossPay = basePay + overtimePay;
        const estimatedTax = 0; // No tax for fixed payment
        const netPay = grossPay;

        console.log(`   ${employee.name}: $${netPay.toFixed(2)} USDC (fixed payment)`);

        // Create payroll result with fixed payment amounts
        const payrollResult: PayrollResult = {
          employee_id: String(employee.id),
          employee_name: employee.name,
          base_pay: basePay,
          hours_worked: hoursWorked,
          ot_hours: overtimeHours,
          ot_pay: overtimePay,
          gross_pay: grossPay,
          total_tax_estimated: estimatedTax,
          net_pay: netPay,
          pay_period: 'biweekly',
        };

        payrollResults.push(payrollResult);

        // Prepare for batch payment
        if (employee.wallet_address) {
          batchPaymentEmployees.push({
            id: employee.id!,
            employee_id: String(employee.id),
            wallet_address: employee.wallet_address,
            net_pay: netPay,
          });
        } else {
          console.warn(`   Employee ${employee.name} has no wallet address`);
        }
      } catch (error) {
        console.error(`   Failed to calculate payroll for ${employee.name}:`, error);
      }
    }

    console.log(`   Calculated payroll for ${payrollResults.length} employees`);

    // Step 3: Execute batch payment
    if (batchPaymentEmployees.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No employees with wallet addresses to pay',
        payrollResults,
      });
    }

    console.log(`\nExecuting batch payment...`);

    const paymentResult = await executeBatchPay(batchPaymentEmployees);

    console.log(`   Payment successful!`);

    // Step 3.5: Create payment records in database
    console.log(`\nCreating payment records...`);

    const { getSupabaseClient } = await import('@/lib/supabase');
    const supabase = getSupabaseClient();

    for (const emp of batchPaymentEmployees) {
      try {
        const { error } = await supabase
          .from('payments')
          .insert({
            employee_id: emp.employee_id,
            amount: emp.net_pay,
            currency: 'USDC',
            status: 'confirmed',
            tx_hash: paymentResult.txHash,
            block_number: paymentResult.blockNumber,
            gas_used: paymentResult.gasUsed,
          });

        if (error) {
          console.error(`   Failed to create payment record for ${emp.employee_id}:`, error);
        } else {
          console.log(`   Payment record created for employee ID: ${emp.employee_id}`);
        }
      } catch (dbError) {
        console.error(`   Database error for ${emp.employee_id}:`, dbError);
      }
    }

    // Step 4: Send email pay stubs
    console.log(`\nSending pay stubs...`);

    let emailsSent = 0;
    for (let i = 0; i < pendingEmployees.length; i++) {
      const employee = pendingEmployees[i];
      const payroll = payrollResults[i];

      if (payroll && employee.email) {
        try {
          await sendPayStub(employee, payroll, paymentResult.txHash, paymentResult.explorerUrl);
          emailsSent++;
          console.log(`   Sent to ${employee.email}`);
        } catch (emailError) {
          console.error(`   Failed to send to ${employee.email}:`, emailError);
        }
      }
    }

    console.log(`   Sent ${emailsSent} emails`);

    console.log(`\nPayroll processing complete!`);

    // Return success response
    return NextResponse.json({
      success: true,
      paid: paymentResult.employeeCount,
      tx: paymentResult.txHash,
      explorer: paymentResult.explorerUrl,
      totalPaid: paymentResult.totalPaid,
      blockNumber: paymentResult.blockNumber,
      gasUsed: paymentResult.gasUsed,
      emailsSent,
      payrollResults,
    });
  } catch (error) {
    console.error('\nPayroll processing failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

/**
 * Send pay stub email to employee
 */
async function sendPayStub(
  employee: any,
  payroll: PayrollResult,
  txHash: string,
  explorerUrl: string
): Promise<void> {
  // Check if email is configured
  const emailConfigured = process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS;

  // Create email transporter
  const transporter = emailConfigured
    ? nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_PORT === '465',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      })
    : null;

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .pay-detail { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #667eea; }
    .amount { font-size: 24px; font-weight: bold; color: #667eea; }
    .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Pay Stub - Paystream AI</h1>
      <p>Your payment has been processed!</p>
    </div>

    <div class="content">
      <h2>Hello ${employee.name}!</h2>

      <p>Your payroll for this period has been successfully processed and paid via USDC on Arc Testnet.</p>

      <div class="pay-detail">
        <strong>Base Pay:</strong> $${payroll.base_pay.toFixed(2)}
      </div>

      <div class="pay-detail">
        <strong>Hours Worked:</strong> ${payroll.hours_worked} hours
      </div>

      <div class="pay-detail">
        <strong>Overtime Hours:</strong> ${payroll.ot_hours} hours
      </div>

      <div class="pay-detail">
        <strong>Overtime Pay:</strong> $${payroll.ot_pay.toFixed(2)}
      </div>

      <div class="pay-detail">
        <strong>Gross Pay:</strong> $${payroll.gross_pay.toFixed(2)}
      </div>

      <div class="pay-detail">
        <strong>Tax (Estimated):</strong> -$${payroll.total_tax_estimated.toFixed(2)}
      </div>

      <div class="pay-detail">
        <strong class="amount">Net Pay: $${payroll.net_pay.toFixed(2)} USDC</strong>
      </div>

      <h3>Blockchain Transaction</h3>
      <p>Your payment was processed on Arc Testnet blockchain:</p>

      <div class="pay-detail">
        <strong>Transaction Hash:</strong><br/>
        <code style="font-size: 11px; word-break: break-all;">${txHash}</code>
      </div>

      <div class="pay-detail">
        <strong>Wallet Address:</strong><br/>
        <code style="font-size: 11px;">${employee.wallet_address}</code>
      </div>

      <a href="${explorerUrl}" class="button">View on Arc Explorer →</a>

      <div class="footer">
        <p>This is an automated email from Paystream AI</p>
        <p>Powered by Circle, Arc Testnet, and Google Gemini AI</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

  // Log email details
  console.log(`\nPay Stub Email for ${employee.email}:`);
  console.log(`   Subject: Your Paystream AI Pay Stub - $${payroll.net_pay.toFixed(2)} USDC`);
  console.log(`   Net Pay: $${payroll.net_pay.toFixed(2)}`);
  console.log(`   TX: ${txHash}`);
  console.log(`   Explorer: ${explorerUrl}`);

  // Send email if configured
  if (transporter && emailConfigured) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"Paystream AI" <payroll@paystream.ai>',
        to: employee.email,
        subject: `Pay Stub - Paystream AI - $${payroll.net_pay.toFixed(2)} USDC`,
        html: emailHtml,
      });
      console.log(`   Email sent successfully to ${employee.email}`);
    } catch (error) {
      console.error(`   Failed to send email:`, error);
      throw error;
    }
  } else {
    console.log(`   Email not configured - set EMAIL_HOST, EMAIL_USER, EMAIL_PASS in .env.local`);
  }
}

/**
 * GET /api/payroll
 * Get payroll processing status
 */
export async function GET() {
  try {
    const pendingEmployees = await getPendingEmployees();

    return NextResponse.json({
      pendingCount: pendingEmployees.length,
      employees: pendingEmployees,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
