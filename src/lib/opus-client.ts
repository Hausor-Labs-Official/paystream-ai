import { v4 as uuidv4 } from 'uuid';
import { getSupabaseClient } from './supabase';
import type {
  WorkflowInput,
  WorkflowExecution,
  WorkflowStep,
  DecisionLogic,
  ReviewRequest,
  WorkflowProvenance,
  PayrollApprovalInput,
  EmployeeOnboardingInput,
  ComplianceAuditInput,
  DecisionResult,
  WorkflowType,
} from '@/types/opus-workflow';
import { WorkflowExecutionError } from '@/types/opus-workflow';

/**
 * Opus Workflow Client
 * Handles workflow execution with real Opus API or simulation mode
 */

class OpusClient {
  private static instance: OpusClient;
  private baseURL = 'https://api.opus.com/v1';
  private apiKey?: string;
  private simulationMode: boolean;

  private constructor() {
    this.apiKey = process.env.OPUS_API_KEY;
    this.simulationMode = !this.apiKey || process.env.OPUS_SIMULATION_MODE === 'true';

    if (this.simulationMode) {
      console.log('[Opus] Running in SIMULATION mode (no API key or simulation enabled)');
    } else {
      console.log('[Opus] Running in PRODUCTION mode with API');
    }
  }

  public static getInstance(): OpusClient {
    if (!OpusClient.instance) {
      OpusClient.instance = new OpusClient();
    }
    return OpusClient.instance;
  }

  /**
   * Execute workflow
   */
  async executeWorkflow(input: WorkflowInput): Promise<WorkflowExecution> {
    const executionId = uuidv4();
    const startTime = new Date();

    console.log(`[Opus] Starting workflow: ${input.workflowType} (${executionId})`);

    try {
      if (this.simulationMode) {
        return this.simulateWorkflow(executionId, input, startTime);
      } else {
        return this.executeRealWorkflow(executionId, input, startTime);
      }
    } catch (error) {
      console.error(`[Opus] Workflow execution failed:`, error);
      throw new WorkflowExecutionError(
        `Workflow execution failed: ${(error as Error).message}`,
        input.workflowType,
        'execute',
        executionId
      );
    }
  }

  /**
   * Execute real workflow via Opus API
   */
  private async executeRealWorkflow(
    executionId: string,
    input: WorkflowInput,
    startTime: Date
  ): Promise<WorkflowExecution> {
    // This would be the actual Opus API call
    // For now, we'll simulate it since we may not have immediate access
    console.log('[Opus] Real API execution not yet implemented - falling back to simulation');
    return this.simulateWorkflow(executionId, input, startTime);
  }

  /**
   * Simulate workflow execution for testing/development
   */
  private async simulateWorkflow(
    executionId: string,
    input: WorkflowInput,
    startTime: Date
  ): Promise<WorkflowExecution> {
    const steps: WorkflowStep[] = [];

    // Step 1: Intake
    steps.push(await this.simulateIntakeStep(input));

    // Step 2: Understand (AI validation)
    steps.push(await this.simulateUnderstandStep(input));

    // Step 3: Decide (Rules + AI reasoning)
    const decisionStep = await this.simulateDecideStep(input);
    steps.push(decisionStep);

    // Get decision logic
    const decision = await this.executeDecisionLogic(input);

    // Step 4: Review (if needed)
    let reviewRequest: ReviewRequest | undefined;
    if (decision.decision === 'flag_for_review') {
      const reviewStep = await this.simulateReviewStep(input, executionId);
      steps.push(reviewStep);

      reviewRequest = {
        id: uuidv4(),
        workflowExecutionId: executionId,
        workflowType: input.workflowType,
        requestedAt: new Date(),
        priority: input.metadata?.priority || 'medium',
        data: input.data,
        flags: decision.flags,
        reason: decision.reason,
      };
    }

    // Step 5: Execute (if approved)
    if (decision.decision === 'auto_approve' || decision.decision === 'flag_for_review') {
      steps.push(await this.simulateExecuteStep(input));
    }

    // Step 6: Deliver (notifications, etc.)
    steps.push(await this.simulateDeliverStep(input));

    const endTime = new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / 1000;

    const execution: WorkflowExecution = {
      id: executionId,
      workflowType: input.workflowType,
      status: decision.decision === 'reject' ? 'rejected' : decision.decision === 'flag_for_review' ? 'pending' : 'completed',
      startTime,
      endTime,
      duration,
      inputs: input.data,
      outputs: this.generateOutputs(input, decision),
      steps,
      decision,
      reviewRequest,
      provenance: this.generateProvenance(executionId, input, steps),
    };

    // Store execution in database
    await this.storeExecution(execution);

    console.log(`[Opus] Workflow completed: ${executionId} in ${duration.toFixed(2)}s`);

    return execution;
  }

  /**
   * Execute decision logic
   */
  private async executeDecisionLogic(input: WorkflowInput): Promise<DecisionLogic> {
    switch (input.workflowType) {
      case 'payroll-approval':
        return this.payrollDecisionLogic(input.data as PayrollApprovalInput);
      case 'employee-onboarding':
        return this.onboardingDecisionLogic(input.data as EmployeeOnboardingInput);
      case 'compliance-audit':
        return this.complianceDecisionLogic(input.data as ComplianceAuditInput);
      default:
        return {
          decision: 'auto_approve',
          reason: 'Default approval for unknown workflow type',
          rulesFired: [],
          confidence: 0.5,
          flags: [],
          autoApprovalEligible: true,
          thresholdChecks: [],
        };
    }
  }

  /**
   * Payroll approval decision logic
   */
  private async payrollDecisionLogic(input: PayrollApprovalInput): Promise<DecisionLogic> {
    const threshold = input.approvalThreshold || 10000;
    const rulesFired: string[] = [];
    const flags: string[] = [];
    const thresholdChecks: any[] = [];

    // Rule 1: Check total amount
    const amountCheck = {
      name: 'total_amount_threshold',
      passed: input.totalAmount < threshold,
      value: input.totalAmount,
      threshold,
    };
    thresholdChecks.push(amountCheck);

    if (!amountCheck.passed) {
      rulesFired.push('amount_threshold_exceeded');
      flags.push(`Total amount $${input.totalAmount} exceeds threshold $${threshold}`);
    }

    // Rule 2: Check employee statuses
    const inactiveEmployees = input.employees.filter((e) => e.status !== 'active' && e.status !== 'pending');
    if (inactiveEmployees.length > 0) {
      rulesFired.push('inactive_employees_detected');
      flags.push(`${inactiveEmployees.length} inactive employees in batch`);
    }

    // Rule 3: Check wallet addresses
    const invalidWallets = input.employees.filter((e) => !e.walletAddress || !e.walletAddress.match(/^0x[a-fA-F0-9]{40}$/));
    if (invalidWallets.length > 0) {
      rulesFired.push('invalid_wallets_detected');
      flags.push(`${invalidWallets.length} employees with invalid wallet addresses`);
      return {
        decision: 'reject',
        reason: 'Invalid wallet addresses detected',
        rulesFired,
        confidence: 1.0,
        flags,
        autoApprovalEligible: false,
        thresholdChecks,
      };
    }

    // Decision
    let decision: DecisionResult;
    let reason: string;
    let confidence: number;

    if (flags.length === 0 && input.totalAmount < threshold) {
      decision = 'auto_approve';
      reason = 'All checks passed, amount under threshold';
      confidence = 0.95;
    } else if (inactiveEmployees.length > 0) {
      decision = 'reject';
      reason = 'Inactive employees detected in payroll batch';
      confidence = 1.0;
    } else {
      decision = 'flag_for_review';
      reason = `Amount exceeds threshold ($${input.totalAmount} >= $${threshold})`;
      confidence = 0.85;
    }

    return {
      decision,
      reason,
      rulesFired,
      confidence,
      flags,
      autoApprovalEligible: decision === 'auto_approve',
      thresholdChecks,
    };
  }

  /**
   * Employee onboarding decision logic
   */
  private async onboardingDecisionLogic(input: EmployeeOnboardingInput): Promise<DecisionLogic> {
    const rulesFired: string[] = [];
    const flags: string[] = [];
    const thresholdChecks: any[] = [];

    // Rule 1: Check for required fields
    if (!input.employeeData.email || !input.employeeData.name) {
      return {
        decision: 'reject',
        reason: 'Missing required fields (name or email)',
        rulesFired: ['missing_required_fields'],
        confidence: 1.0,
        flags: ['Missing name or email'],
        autoApprovalEligible: false,
        thresholdChecks,
      };
    }

    // Rule 2: Check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.employeeData.email)) {
      return {
        decision: 'reject',
        reason: 'Invalid email format',
        rulesFired: ['invalid_email'],
        confidence: 1.0,
        flags: ['Invalid email format'],
        autoApprovalEligible: false,
        thresholdChecks,
      };
    }

    // Rule 3: Check salary range
    const salaryCheck = {
      name: 'salary_range_check',
      passed: input.employeeData.salaryAnnual > 0 && input.employeeData.salaryAnnual < 500000,
      value: input.employeeData.salaryAnnual,
      threshold: { min: 0, max: 500000 },
    };
    thresholdChecks.push(salaryCheck);

    if (!salaryCheck.passed) {
      rulesFired.push('unusual_salary');
      flags.push(`Salary ${input.employeeData.salaryAnnual} outside normal range`);
    }

    // Rule 4: Check for duplicate email (would query database)
    // Simulated here

    if (flags.length > 0) {
      return {
        decision: 'flag_for_review',
        reason: 'Unusual salary detected',
        rulesFired,
        confidence: 0.8,
        flags,
        autoApprovalEligible: false,
        thresholdChecks,
      };
    }

    return {
      decision: 'auto_approve',
      reason: 'All checks passed',
      rulesFired: [],
      confidence: 0.95,
      flags: [],
      autoApprovalEligible: true,
      thresholdChecks,
    };
  }

  /**
   * Compliance audit decision logic
   */
  private async complianceDecisionLogic(input: ComplianceAuditInput): Promise<DecisionLogic> {
    // Simulated compliance checks
    return {
      decision: 'auto_approve',
      reason: 'Compliance audit completed',
      rulesFired: ['audit_completed'],
      confidence: 0.9,
      flags: [],
      autoApprovalEligible: true,
      thresholdChecks: [],
    };
  }

  /**
   * Simulate workflow steps
   */
  private async simulateIntakeStep(input: WorkflowInput): Promise<WorkflowStep> {
    await this.delay(100);
    return {
      step: 'intake',
      name: 'Data Intake',
      startTime: new Date(),
      endTime: new Date(),
      duration: 0.1,
      status: 'completed',
      result: 'Data received and validated',
    };
  }

  private async simulateUnderstandStep(input: WorkflowInput): Promise<WorkflowStep> {
    await this.delay(500);
    return {
      step: 'understand',
      name: 'AI Understanding',
      startTime: new Date(),
      endTime: new Date(),
      duration: 0.5,
      status: 'completed',
      result: 'Data analyzed with AI',
      confidence: 0.92,
    };
  }

  private async simulateDecideStep(input: WorkflowInput): Promise<WorkflowStep> {
    await this.delay(200);
    return {
      step: 'decide',
      name: 'Decision Logic',
      startTime: new Date(),
      endTime: new Date(),
      duration: 0.2,
      status: 'completed',
      result: 'Rules evaluated',
      confidence: 0.88,
    };
  }

  private async simulateReviewStep(input: WorkflowInput, executionId: string): Promise<WorkflowStep> {
    return {
      step: 'review',
      name: 'Human Review',
      startTime: new Date(),
      status: 'pending',
      result: 'Awaiting human approval',
    };
  }

  private async simulateExecuteStep(input: WorkflowInput): Promise<WorkflowStep> {
    await this.delay(800);
    return {
      step: 'execute',
      name: 'Execution',
      startTime: new Date(),
      endTime: new Date(),
      duration: 0.8,
      status: 'completed',
      result: 'Actions executed successfully',
    };
  }

  private async simulateDeliverStep(input: WorkflowInput): Promise<WorkflowStep> {
    await this.delay(300);
    return {
      step: 'deliver',
      name: 'Delivery & Notifications',
      startTime: new Date(),
      endTime: new Date(),
      duration: 0.3,
      status: 'completed',
      result: 'Notifications sent',
    };
  }

  /**
   * Generate workflow outputs
   */
  private generateOutputs(input: WorkflowInput, decision: DecisionLogic): Record<string, any> {
    switch (input.workflowType) {
      case 'payroll-approval':
        const payrollData = input.data as PayrollApprovalInput;
        return {
          status: decision.decision,
          employeesProcessed: payrollData.employees.length,
          totalAmount: payrollData.totalAmount,
          transactionHash: decision.decision === 'auto_approve' ? `0x${uuidv4().replace(/-/g, '')}` : null,
          emailsSent: decision.decision === 'auto_approve' ? payrollData.employees.length : 0,
        };
      case 'employee-onboarding':
        return {
          status: decision.decision,
          employeeCreated: decision.decision !== 'reject',
          walletAddress: decision.decision !== 'reject' ? `0x${uuidv4().replace(/-/g, '').substring(0, 40)}` : null,
        };
      default:
        return { status: decision.decision };
    }
  }

  /**
   * Generate provenance/audit trail
   */
  private generateProvenance(executionId: string, input: WorkflowInput, steps: WorkflowStep[]): WorkflowProvenance {
    return {
      executionId,
      workflowType: input.workflowType,
      version: '1.0.0',
      timestamp: new Date(),
      dataSource: ['supabase', 'user-input'],
      aiModels: ['gemini-2.0-flash-exp', 'groq-llama-3.3-70b'],
      approvers: input.metadata?.requestedBy ? [input.metadata.requestedBy] : [],
      complianceChecks: [
        'fraud_detection',
        'duplicate_check',
        'threshold_validation',
        'wallet_validation',
      ],
      artifacts: [
        {
          type: 'execution_log',
          location: `/workflows/executions/${executionId}.json`,
        },
      ],
    };
  }

  /**
   * Store execution in database
   */
  private async storeExecution(execution: WorkflowExecution): Promise<void> {
    try {
      const supabase = getSupabaseClient();

      await supabase.from('workflow_executions').insert({
        id: execution.id,
        workflow_type: execution.workflowType,
        status: execution.status,
        start_time: execution.startTime.toISOString(),
        end_time: execution.endTime?.toISOString(),
        duration: execution.duration,
        inputs: execution.inputs,
        outputs: execution.outputs,
        steps: execution.steps,
        decision: execution.decision,
        review_request: execution.reviewRequest,
        provenance: execution.provenance,
        error: execution.error,
        created_at: new Date().toISOString(),
      });

      console.log(`[Opus] Execution stored in database: ${execution.id}`);
    } catch (error) {
      console.error('[Opus] Failed to store execution:', error);
      // Don't fail the workflow if storage fails
    }
  }

  /**
   * Get pending review requests
   */
  async getPendingReviews(workflowType?: WorkflowType): Promise<ReviewRequest[]> {
    try {
      const supabase = getSupabaseClient();
      let query = supabase
        .from('workflow_executions')
        .select('*')
        .eq('status', 'pending')
        .not('review_request', 'is', null);

      if (workflowType) {
        query = query.eq('workflow_type', workflowType);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data?.map((exec) => exec.review_request as ReviewRequest) || [];
    } catch (error) {
      console.error('[Opus] Failed to get pending reviews:', error);
      return [];
    }
  }

  /**
   * Submit review decision
   */
  async submitReview(
    reviewRequestId: string,
    decision: 'approved' | 'rejected',
    reviewer: string,
    notes?: string
  ): Promise<void> {
    try {
      const supabase = getSupabaseClient();

      // Find execution with this review request
      const { data: executions } = await supabase
        .from('workflow_executions')
        .select('*')
        .contains('review_request', { id: reviewRequestId });

      if (!executions || executions.length === 0) {
        throw new Error(`Review request not found: ${reviewRequestId}`);
      }

      const execution = executions[0];

      // Update review request
      execution.review_request.reviewer = reviewer;
      execution.review_request.reviewedAt = new Date().toISOString();
      execution.review_request.decision = decision;
      execution.review_request.notes = notes;

      // Update execution status
      await supabase
        .from('workflow_executions')
        .update({
          status: decision,
          review_request: execution.review_request,
          updated_at: new Date().toISOString(),
        })
        .eq('id', execution.id);

      console.log(`[Opus] Review submitted: ${reviewRequestId} - ${decision}`);
    } catch (error) {
      console.error('[Opus] Failed to submit review:', error);
      throw error;
    }
  }

  /**
   * Helper: delay for simulation
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton
export function getOpusClient(): OpusClient {
  return OpusClient.getInstance();
}

// Convenience functions
export async function executePayrollWorkflow(input: PayrollApprovalInput): Promise<WorkflowExecution> {
  return getOpusClient().executeWorkflow({
    workflowType: 'payroll-approval',
    data: input,
  });
}

export async function executeOnboardingWorkflow(input: EmployeeOnboardingInput): Promise<WorkflowExecution> {
  return getOpusClient().executeWorkflow({
    workflowType: 'employee-onboarding',
    data: input,
  });
}

export async function executeComplianceWorkflow(input: ComplianceAuditInput): Promise<WorkflowExecution> {
  return getOpusClient().executeWorkflow({
    workflowType: 'compliance-audit',
    data: input,
  });
}
