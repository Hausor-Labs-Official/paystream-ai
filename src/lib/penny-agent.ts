import Groq from 'groq-sdk';
import { getSupabaseClient } from './supabase';
import { ethers } from 'ethers';
import { storeConversation, retrieveConversationContext } from '@/services/vector-search';

/**
 * Penny - AI-powered NLP agent for Paystream AI
 * Uses Groq with GPT model for natural language queries on payroll data
 */

export interface PennyResponse {
  text: string;
  chart?: ChartConfig;
  data?: any;
  sql?: string;
}

export interface ChartConfig {
  type: 'bar' | 'pie' | 'line' | 'doughnut';
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor?: string[];
      borderColor?: string[];
      borderWidth?: number;
    }[];
  };
  options?: any;
}

// Color palettes for charts
const CHART_COLORS = {
  primary: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'],
  background: ['rgba(59, 130, 246, 0.8)', 'rgba(16, 185, 129, 0.8)', 'rgba(245, 158, 11, 0.8)', 'rgba(239, 68, 68, 0.8)', 'rgba(139, 92, 246, 0.8)', 'rgba(236, 72, 153, 0.8)', 'rgba(6, 182, 212, 0.8)', 'rgba(132, 204, 22, 0.8)'],
  border: ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777', '#0891b2', '#65a30d'],
};

export class PennyAgent {
  private groq: Groq;
  private supabase: any;
  private conversationHistory: any[] = [];

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY not set in environment variables');
    }

    this.groq = new Groq({ apiKey });
    this.supabase = getSupabaseClient();
  }

  /**
   * Main query method - processes natural language queries
   */
  async query(prompt: string, userId?: string): Promise<PennyResponse> {
    try {
      // Retrieve conversation context from Qdrant if userId provided
      let contextMessages: string[] = [];
      if (userId) {
        try {
          const context = await retrieveConversationContext(userId, prompt, { limit: 3 });
          contextMessages = context.map((c) => `Previous: ${c.payload.message} - ${c.payload.response}`);

          if (contextMessages.length > 0) {
            console.log(`[Penny] Retrieved ${contextMessages.length} context messages`);
          }
        } catch (err) {
          console.error('[Penny] Failed to retrieve context:', err);
          // Continue without context
        }
      }

      // Add user message to history
      this.conversationHistory.push({
        role: 'user',
        content: prompt,
      });

      // Analyze the query to determine intent and extract data
      const analysis = await this.analyzeQuery(prompt, contextMessages);

      // Execute appropriate actions based on intent
      let response: PennyResponse;

      switch (analysis.intent) {
        case 'chart':
          response = await this.handleChartQuery(prompt, analysis);
          break;
        case 'stats':
          response = await this.handleStatsQuery(prompt, analysis);
          break;
        case 'transaction':
          response = await this.handleTransactionQuery(prompt, analysis);
          break;
        case 'employee':
          response = await this.handleEmployeeQuery(prompt, analysis);
          break;
        default:
          response = await this.handleGeneralQuery(prompt);
      }

      // Add assistant response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: response.text,
      });

      // Store conversation in Qdrant for future context (non-blocking)
      if (userId) {
        storeConversation(userId, prompt, response.text).catch((err) => {
          console.error('[Penny] Failed to store conversation:', err);
        });
      }

      return response;
    } catch (error) {
      console.error('Penny query error:', error);
      throw new Error(`Penny failed to process query: ${(error as Error).message}`);
    }
  }

  /**
   * Analyze query to determine intent
   */
  private async analyzeQuery(prompt: string, contextMessages: string[] = []): Promise<any> {
    const systemContent = `You are Penny, an AI assistant for Paystream AI payroll system. Analyze the user's query and determine:
1. Intent: chart, stats, transaction, employee, or general
2. Data needed: employees, transactions, salaries, etc.
3. Chart type if applicable: bar, pie, line, doughnut

${contextMessages.length > 0 ? `\nConversation Context:\n${contextMessages.join('\n')}` : ''}

Respond in JSON format:
{
  "intent": "chart|stats|transaction|employee|general",
  "dataType": "employees|transactions|salaries|payments",
  "chartType": "bar|pie|line|doughnut",
  "filters": {}
}`;

    const completion = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile', // Using available model
      messages: [
        {
          role: 'system',
          content: systemContent,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const result = completion.choices[0]?.message?.content;
    return result ? JSON.parse(result) : { intent: 'general' };
  }

  /**
   * Handle chart visualization queries
   */
  private async handleChartQuery(prompt: string, analysis: any): Promise<PennyResponse> {
    // Get data based on query
    let data: any;
    let sql = '';

    if (analysis.dataType === 'salaries' || analysis.dataType === 'employees') {
      sql = 'SELECT name, salary_annual FROM employees ORDER BY salary_annual DESC LIMIT 10';
      const { data: employees, error } = await this.supabase
        .from('employees')
        .select('name, salary_annual')
        .order('salary_annual', { ascending: false })
        .limit(10);

      if (error) throw error;
      data = employees;

      // Generate chart config
      const chartType = analysis.chartType || 'bar';
      const chart = this.generateChart(
        chartType,
        data.map((e: any) => e.name),
        data.map((e: any) => e.salary_annual),
        'Annual Salary (USD)'
      );

      return {
        text: `Here's a ${chartType} chart showing employee salaries. I found ${data.length} employees in the system.`,
        chart,
        data,
        sql,
      };
    } else if (analysis.dataType === 'payments' || analysis.dataType === 'transactions') {
      // Get payment status distribution
      sql = 'SELECT pay_status, COUNT(*) as count FROM employees GROUP BY pay_status';
      const { data: statusData, error } = await this.supabase
        .from('employees')
        .select('pay_status');

      if (error) throw error;

      // Count by status
      const statusCounts: any = {};
      statusData.forEach((row: any) => {
        const status = row.pay_status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      const labels = Object.keys(statusCounts);
      const values = Object.values(statusCounts) as number[];

      const chart = this.generateChart('pie', labels, values, 'Payment Status Distribution');

      return {
        text: `Here's the payment status distribution. Total employees: ${statusData.length}`,
        chart,
        data: statusCounts,
        sql,
      };
    }

    return {
      text: 'I can create charts for salaries, payment status, and more. What would you like to visualize?',
    };
  }

  /**
   * Handle statistical queries
   */
  private async handleStatsQuery(prompt: string, analysis: any): Promise<PennyResponse> {
    const sql = 'SELECT COUNT(*) as total, AVG(salary_annual) as avg_salary, SUM(salary_annual) as total_salary FROM employees';

    const { data, error } = await this.supabase
      .from('employees')
      .select('salary_annual');

    if (error) throw error;

    const total = data.length;
    const salaries = data.map((e: any) => e.salary_annual || 0);
    const avgSalary = salaries.reduce((a: number, b: number) => a + b, 0) / total;
    const totalPayroll = salaries.reduce((a: number, b: number) => a + b, 0);
    const minSalary = Math.min(...salaries);
    const maxSalary = Math.max(...salaries);

    const stats = {
      total,
      avgSalary,
      totalPayroll,
      minSalary,
      maxSalary,
    };

    return {
      text: `Payroll Statistics:
• Total Employees: ${total}
• Average Salary: $${avgSalary.toFixed(2)}
• Total Annual Payroll: $${totalPayroll.toLocaleString()}
• Salary Range: $${minSalary.toLocaleString()} - $${maxSalary.toLocaleString()}`,
      data: stats,
      sql,
    };
  }

  /**
   * Handle transaction queries
   */
  private async handleTransactionQuery(prompt: string, analysis: any): Promise<PennyResponse> {
    try {
      // Check for on-ramp transactions
      const { data: onrampTxs, error } = await this.supabase
        .from('onramp_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (!error && onrampTxs && onrampTxs.length > 0) {
        const totalFunded = onrampTxs.reduce((sum: number, tx: any) => sum + (tx.amount_usd || 0), 0);

        return {
          text: `Recent Transactions:
• Total Transactions: ${onrampTxs.length}
• Total Funded: $${totalFunded.toFixed(2)}
• Latest: ${onrampTxs[0].status} - $${onrampTxs[0].amount_usd}`,
          data: onrampTxs,
        };
      }

      // Check Arc blockchain balance
      const privateKey = process.env.ETHER_PRIVATE_KEY;
      const rpcUrl = process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.network';

      if (privateKey) {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const wallet = new ethers.Wallet(privateKey, provider);
        const balance = await provider.getBalance(wallet.address);
        const balanceFormatted = parseFloat(ethers.formatEther(balance));

        return {
          text: `Arc Testnet Balance:
• Address: ${wallet.address}
• Balance: ${balanceFormatted.toFixed(2)} USDC
• Network: Arc Testnet`,
          data: {
            address: wallet.address,
            balance: balanceFormatted,
            network: 'Arc Testnet',
          },
        };
      }

      return {
        text: 'No transaction data available yet.',
      };
    } catch (error) {
      console.error('Transaction query error:', error);
      return {
        text: 'Unable to fetch transaction data at the moment.',
      };
    }
  }

  /**
   * Handle employee queries
   */
  private async handleEmployeeQuery(prompt: string, analysis: any): Promise<PennyResponse> {
    const sql = 'SELECT * FROM employees ORDER BY created_at DESC LIMIT 10';
    const { data: employees, error } = await this.supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    const employeeList = employees
      .map((e: any, i: number) => `${i + 1}. ${e.name} - $${e.salary_annual?.toLocaleString() || 0} (${e.pay_status || 'pending'})`)
      .join('\n');

    return {
      text: `Recent Employees:\n\n${employeeList}`,
      data: employees,
      sql,
    };
  }

  /**
   * Handle general conversational queries
   */
  private async handleGeneralQuery(prompt: string): Promise<PennyResponse> {
    // Fetch context data for more intelligent responses
    const { data: employees } = await this.supabase
      .from('employees')
      .select('*')
      .limit(100);

    const totalEmployees = employees?.length || 0;
    const totalPayroll = employees?.reduce((sum: number, e: any) => sum + (e.salary_annual || 0), 0) || 0;
    const pendingCount = employees?.filter((e: any) => e.pay_status === 'pending').length || 0;
    const paidCount = employees?.filter((e: any) => e.pay_status === 'paid' || e.pay_status === 'active').length || 0;

    const completion = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are Penny, a highly intelligent and friendly AI assistant for Paystream AI - a blockchain-based payroll system built on Arc Testnet.

Your Personality:
- Warm, conversational, and genuinely helpful
- Use natural language without emojis
- Explain things clearly without being overly technical unless asked
- Proactive in suggesting insights and actions

Current System Context:
- Total Employees: ${totalEmployees}
- Total Annual Payroll: $${totalPayroll.toLocaleString()}
- Pending Payments: ${pendingCount} employees
- Paid/Active: ${paidCount} employees

You can help with:
- Employee salary queries and visualizations
- Payment status tracking and history
- Payroll statistics and analytics
- Arc blockchain wallet balance
- Transaction history and on-ramp funding
- Running payroll and managing payments

Be conversational, provide context, and when appropriate, suggest related actions the user might want to take. Keep responses concise (2-4 sentences) unless more detail is requested.`,
        },
        ...this.conversationHistory,
      ],
      temperature: 0.8,
      max_tokens: 600,
    });

    const text = completion.choices[0]?.message?.content || "I'm here to help with your payroll! Ask me anything.";

    return { text };
  }

  /**
   * Generate Chart.js configuration
   */
  private generateChart(
    type: 'bar' | 'pie' | 'line' | 'doughnut',
    labels: string[],
    data: number[],
    label: string
  ): ChartConfig {
    const isPieType = type === 'pie' || type === 'doughnut';

    return {
      type,
      data: {
        labels,
        datasets: [
          {
            label,
            data,
            backgroundColor: isPieType ? CHART_COLORS.background : [CHART_COLORS.background[0]],
            borderColor: isPieType ? CHART_COLORS.border : [CHART_COLORS.border[0]],
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top' as const,
          },
          title: {
            display: true,
            text: label,
            font: {
              size: 16,
              weight: 'bold',
            },
          },
        },
        scales: isPieType
          ? undefined
          : {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: function (value: any) {
                    return '$' + value.toLocaleString();
                  },
                },
              },
            },
      },
    };
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }
}

// Singleton instance
let pennyInstance: PennyAgent | null = null;

export function getPennyAgent(): PennyAgent {
  if (!pennyInstance) {
    pennyInstance = new PennyAgent();
  }
  return pennyInstance;
}

// Export for easy use
export async function askPenny(prompt: string): Promise<PennyResponse> {
  return getPennyAgent().query(prompt);
}
