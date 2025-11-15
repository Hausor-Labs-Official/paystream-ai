/**
 * Opus Workflow Types and Interfaces
 * Defines types for workflow automation system
 */

export type WorkflowType = 'payroll-approval' | 'employee-onboarding' | 'compliance-audit' | 'expense-approval';

export type WorkflowStatus = 'pending' | 'in_progress' | 'approved' | 'rejected' | 'completed' | 'failed';

export type StepType = 'intake' | 'understand' | 'decide' | 'review' | 'execute' | 'deliver';

export type DecisionResult = 'auto_approve' | 'flag_for_review' | 'reject' | 'escalate';

/**
 * Workflow input
 */
export interface WorkflowInput {
  workflowType: WorkflowType;
  data: Record<string, any>;
  metadata?: {
    requestedBy?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    dueDate?: string;
  };
}

/**
 * Workflow step execution
 */
export interface WorkflowStep {
  step: StepType;
  name: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in seconds
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: any;
  confidence?: number; // 0-1 for AI decisions
  error?: string;
}

/**
 * Decision logic result
 */
export interface DecisionLogic {
  decision: DecisionResult;
  reason: string;
  rulesFired: string[];
  confidence: number;
  flags: string[];
  autoApprovalEligible: boolean;
  thresholdChecks: {
    name: string;
    passed: boolean;
    value?: any;
    threshold?: any;
  }[];
}

/**
 * Human review request
 */
export interface ReviewRequest {
  id: string;
  workflowExecutionId: string;
  workflowType: WorkflowType;
  requestedAt: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  reviewer?: string;
  reviewedAt?: Date;
  decision?: 'approved' | 'rejected' | 'escalated';
  notes?: string;
  data: any;
  flags: string[];
  reason: string;
}

/**
 * Workflow execution
 */
export interface WorkflowExecution {
  id: string;
  workflowType: WorkflowType;
  status: WorkflowStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  inputs: Record<string, any>;
  outputs?: Record<string, any>;
  steps: WorkflowStep[];
  decision?: DecisionLogic;
  reviewRequest?: ReviewRequest;
  provenance: WorkflowProvenance;
  error?: string;
}

/**
 * Workflow provenance (audit trail)
 */
export interface WorkflowProvenance {
  executionId: string;
  workflowType: WorkflowType;
  version: string;
  timestamp: Date;
  dataSource: string[];
  aiModels: string[];
  approvers: string[];
  complianceChecks: string[];
  artifacts: {
    type: string;
    location: string;
    hash?: string;
  }[];
}

/**
 * Payroll approval workflow input
 */
export interface PayrollApprovalInput {
  employees: Array<{
    id: string;
    name: string;
    email: string;
    amount: number;
    walletAddress: string;
    status: string;
  }>;
  totalAmount: number;
  payPeriod: {
    start: string;
    end: string;
  };
  approvalThreshold?: number;
}

/**
 * Employee onboarding workflow input
 */
export interface EmployeeOnboardingInput {
  employeeData: {
    name: string;
    email: string;
    dateOfBirth?: string;
    address?: string;
    department?: string;
    role?: string;
    salaryAnnual: number;
  };
  documents?: {
    idCard?: string; // base64
    w2?: string; // base64
  };
  createWallet?: boolean;
}

/**
 * Compliance audit workflow input
 */
export interface ComplianceAuditInput {
  period: {
    start: string;
    end: string;
  };
  scope: 'payroll' | 'expenses' | 'all';
  checkTypes: string[];
}

/**
 * Workflow configuration
 */
export interface WorkflowConfig {
  workflowType: WorkflowType;
  enabled: boolean;
  autoApprovalThreshold?: number;
  requireHumanReview: boolean;
  notificationEmails: string[];
  timeoutMinutes: number;
  retryAttempts: number;
  rules: WorkflowRule[];
}

/**
 * Workflow rule
 */
export interface WorkflowRule {
  id: string;
  name: string;
  description: string;
  condition: string; // e.g., "totalAmount > 10000"
  action: DecisionResult;
  priority: number;
  enabled: boolean;
}

/**
 * Workflow statistics
 */
export interface WorkflowStatistics {
  workflowType: WorkflowType;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageDuration: number;
  autoApprovedCount: number;
  reviewedCount: number;
  rejectedCount: number;
  costMetrics: {
    totalManHours: number;
    averageManHoursPerExecution: number;
  };
}

/**
 * Workflow notification
 */
export interface WorkflowNotification {
  id: string;
  workflowExecutionId: string;
  type: 'review_required' | 'approved' | 'rejected' | 'completed' | 'failed';
  recipient: string;
  subject: string;
  message: string;
  sentAt: Date;
  read: boolean;
}

/**
 * Workflow error
 */
export class WorkflowExecutionError extends Error {
  constructor(
    message: string,
    public workflowType: WorkflowType,
    public step: StepType,
    public executionId?: string
  ) {
    super(message);
    this.name = 'WorkflowExecutionError';
  }
}

/**
 * Review timeout error
 */
export class ReviewTimeoutError extends Error {
  constructor(
    message: string,
    public reviewRequestId: string,
    public timeoutMinutes: number
  ) {
    super(message);
    this.name = 'ReviewTimeoutError';
  }
}
