import { AIAgent } from './ai-agent';

export interface PayrollInput {
  employee_id: string;
  employee_name: string;
  salary_annual: number;
  hours_this_period: number;
  pay_period: 'weekly' | 'biweekly' | 'monthly';
}

export interface PayrollResult {
  employee_id: string;
  employee_name: string;
  base_pay: number;
  hours_worked: number;
  ot_hours: number;
  ot_pay: number;
  gross_pay: number;
  total_tax_estimated: number;
  net_pay: number;
  pay_period: string;
}

// System prompt for the payroll AI agent
const PAYROLL_SYSTEM_PROMPT = `You are a precise payroll calculator for Paystream AI.

INSTRUCTIONS:
1. Calculate payroll based on the following rules:
   - Standard work week: 40 hours
   - Overtime (OT) rate: 1.5x base hourly rate
   - Tax rate: 20% flat (this is a mock/estimated tax for testnet purposes)
   - OT applies to hours over 40 per week

2. Calculations:
   - For biweekly: divide annual salary by 26 pay periods
   - For weekly: divide annual salary by 52 pay periods
   - For monthly: divide annual salary by 12 pay periods
   - Hourly rate = period base pay / expected hours in period
   - Regular hours = min(hours_worked, 40)
   - OT hours = max(0, hours_worked - 40)
   - OT pay = OT_hours × hourly_rate × 1.5
   - Gross pay = base_pay + OT_pay
   - Tax = gross_pay × 0.20
   - Net pay = gross_pay - tax

3. INPUT FORMAT:
   {
     "employee_id": "string",
     "employee_name": "string",
     "salary_annual": number,
     "hours_this_period": number,
     "pay_period": "weekly|biweekly|monthly"
   }

4. OUTPUT FORMAT (JSON only, no markdown):
   {
     "employee_id": "string",
     "employee_name": "string",
     "base_pay": number,
     "hours_worked": number,
     "ot_hours": number,
     "ot_pay": number,
     "gross_pay": number,
     "total_tax_estimated": number,
     "net_pay": number,
     "pay_period": "string"
   }

5. RULES:
   - Round all monetary values to 2 decimal places
   - Round hours to 1 decimal place
   - Ensure net_pay = gross_pay - total_tax_estimated
   - Return ONLY valid JSON, no explanations or markdown

EXAMPLE:
Input: {"employee_id":"E001","employee_name":"John Doe","salary_annual":52000,"hours_this_period":45,"pay_period":"biweekly"}
Output: {"employee_id":"E001","employee_name":"John Doe","base_pay":2000.00,"hours_worked":45.0,"ot_hours":5.0,"ot_pay":187.50,"gross_pay":2187.50,"total_tax_estimated":437.50,"net_pay":1750.00,"pay_period":"biweekly"}`;

/**
 * PayrollAgent - AI-powered payroll calculation agent
 */
export class PayrollAgent {
  private agent: AIAgent;

  constructor() {
    this.agent = new AIAgent(PAYROLL_SYSTEM_PROMPT);
  }

  /**
   * Calculate payroll for a single employee using AI
   * @param employee Employee payroll input data
   * @returns Calculated payroll result
   */
  async calculatePayroll(employee: PayrollInput): Promise<PayrollResult> {
    try {
      // Prepare input for AI
      const input = JSON.stringify(employee, null, 2);

      // Run AI agent
      const response = await this.agent.run(input);

      // Parse JSON response
      let result: PayrollResult;

      try {
        // Try to extract JSON from response (in case AI adds markdown)
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          result = JSON.parse(response);
        }
      } catch (parseError) {
        console.error('Failed to parse AI response:', response);
        throw new Error(`Invalid JSON response from AI: ${parseError}`);
      }

      // Validate result
      this.validatePayrollResult(result);

      return result;
    } catch (error) {
      console.error('Error calculating payroll:', error);
      throw new Error(`Payroll calculation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Calculate payroll manually (fallback if AI fails)
   * @param employee Employee payroll input data
   * @returns Calculated payroll result
   */
  calculatePayrollManual(employee: PayrollInput): PayrollResult {
    // Determine pay periods per year
    const periodsPerYear = {
      weekly: 52,
      biweekly: 26,
      monthly: 12,
    }[employee.pay_period];

    // Calculate base pay for this period
    const basePay = parseFloat((employee.salary_annual / periodsPerYear).toFixed(2));

    // Expected hours per period
    const expectedHours = employee.pay_period === 'monthly' ? 160 : employee.pay_period === 'biweekly' ? 80 : 40;

    // Hourly rate
    const hourlyRate = basePay / expectedHours;

    // Regular and OT hours
    const regularHours = Math.min(employee.hours_this_period, 40);
    const otHours = Math.max(0, employee.hours_this_period - 40);

    // OT pay (1.5x)
    const otPay = parseFloat((otHours * hourlyRate * 1.5).toFixed(2));

    // Gross pay
    const grossPay = parseFloat((basePay + otPay).toFixed(2));

    // Tax (20%)
    const totalTax = parseFloat((grossPay * 0.2).toFixed(2));

    // Net pay
    const netPay = parseFloat((grossPay - totalTax).toFixed(2));

    return {
      employee_id: employee.employee_id,
      employee_name: employee.employee_name,
      base_pay: basePay,
      hours_worked: parseFloat(employee.hours_this_period.toFixed(1)),
      ot_hours: parseFloat(otHours.toFixed(1)),
      ot_pay: otPay,
      gross_pay: grossPay,
      total_tax_estimated: totalTax,
      net_pay: netPay,
      pay_period: employee.pay_period,
    };
  }

  /**
   * Validate payroll result
   * @param result Payroll result to validate
   */
  private validatePayrollResult(result: PayrollResult): void {
    const required: (keyof PayrollResult)[] = [
      'employee_id',
      'employee_name',
      'base_pay',
      'hours_worked',
      'ot_hours',
      'ot_pay',
      'gross_pay',
      'total_tax_estimated',
      'net_pay',
      'pay_period',
    ];

    for (const field of required) {
      if (result[field] === undefined || result[field] === null) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate numeric fields
    if (result.net_pay < 0) {
      throw new Error('Net pay cannot be negative');
    }

    if (result.ot_hours < 0) {
      throw new Error('OT hours cannot be negative');
    }

    // Validate calculation
    const expectedNetPay = parseFloat((result.gross_pay - result.total_tax_estimated).toFixed(2));
    if (Math.abs(result.net_pay - expectedNetPay) > 0.01) {
      throw new Error(
        `Net pay calculation error: expected ${expectedNetPay}, got ${result.net_pay}`
      );
    }
  }
}

// Export singleton instance
export const payrollAgent = new PayrollAgent();

// Export function for easy use
export async function calculatePayroll(employee: PayrollInput): Promise<PayrollResult> {
  return payrollAgent.calculatePayroll(employee);
}
