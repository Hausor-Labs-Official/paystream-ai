'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, CheckCircle2, Clock, AlertCircle, Loader2, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PayrollLottie from '../animations/PayrollLottie';

interface AgentStep {
  id: string;
  agent: string;
  action: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  timestamp?: Date;
  details?: string;
  duration?: number;
}

interface AgentMonitorProps {
  isOpen: boolean;
  onClose: () => void;
  processType?: 'payroll' | 'onboarding' | 'funding' | 'custom';
  steps?: AgentStep[];
  executeReal?: boolean; // If true, actually execute the payroll process
}

const PAYROLL_STEPS: AgentStep[] = [
  {
    id: '1',
    agent: 'Penny AI',
    action: 'Analyzing payroll requirements',
    status: 'pending',
    details: 'Reviewing pending employees and payment amounts',
  },
  {
    id: '2',
    agent: 'Payroll Agent',
    action: 'Calculating payments',
    status: 'pending',
    details: 'Computing 1 USDC per employee batch payment',
  },
  {
    id: '3',
    agent: 'Funding Agent',
    action: 'Checking USDC balance',
    status: 'pending',
    details: 'Verifying native USDC balance on Arc Testnet',
  },
  {
    id: '4',
    agent: 'Executor Agent',
    action: 'Executing batch payment',
    status: 'pending',
    details: 'Sending USDC to employee wallets via smart contract',
  },
  {
    id: '5',
    agent: 'Database Agent',
    action: 'Recording transactions',
    status: 'pending',
    details: 'Creating payment records with transaction hashes',
  },
  {
    id: '6',
    agent: 'Email Agent',
    action: 'Sending notifications',
    status: 'pending',
    details: 'Sending pay stubs with Arc Explorer links to employees',
  },
];

export default function AgentMonitor({
  isOpen,
  onClose,
  processType = 'payroll',
  steps: customSteps,
  executeReal = true,
}: AgentMonitorProps) {
  const [steps, setSteps] = useState<AgentStep[]>(customSteps || PAYROLL_STEPS);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  // Real payroll execution
  const executeRealPayroll = useCallback(async () => {
    setError(null);

    try {
      // Step 1: Analyzing payroll requirements
      setSteps((prev) =>
        prev.map((step, i) =>
          i === 0
            ? { ...step, status: 'in_progress', timestamp: new Date() }
            : step
        )
      );
      setCurrentStepIndex(0);

      await new Promise(resolve => setTimeout(resolve, 1500));

      setSteps((prev) =>
        prev.map((step, i) =>
          i === 0
            ? { ...step, status: 'completed', duration: 1.5 }
            : step
        )
      );

      // Step 2-5: Execute actual payroll via API
      setSteps((prev) =>
        prev.map((step, i) =>
          i === 1
            ? { ...step, status: 'in_progress', timestamp: new Date() }
            : step
        )
      );
      setCurrentStepIndex(1);

      const startTime = Date.now();
      const response = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();
      const duration = (Date.now() - startTime) / 1000;

      if (!response.ok || !result.success) {
        throw new Error(result.message || result.error || 'Payroll execution failed');
      }

      // Mark all remaining steps as completed
      setSteps((prev) =>
        prev.map((step, i) => ({
          ...step,
          status: 'completed',
          timestamp: new Date(),
          duration: i === 1 ? duration : 0.5,
          details:
            i === 1 ? `Calculated payments for ${result.paid} employees - ${result.totalPaid.toFixed(2)} USDC total` :
            i === 2 ? `Balance verified - Sufficient USDC available` :
            i === 3 ? `Batch payment executed - TX: ${result.tx?.slice(0, 10)}...` :
            i === 4 ? `Created ${result.paid} payment records in database` :
            i === 5 ? `Sent ${result.emailsSent || result.paid} pay stub emails` :
            step.details,
        }))
      );
      setCurrentStepIndex(steps.length - 1);

    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);

      // Mark current step as failed
      setSteps((prev) =>
        prev.map((step, i) =>
          i === currentStepIndex
            ? { ...step, status: 'failed', details: errorMessage }
            : step
        )
      );
    }
  }, [currentStepIndex, steps.length]);

  // Execute payroll when opened
  useEffect(() => {
    if (!isOpen) return;

    if (executeReal && processType === 'payroll') {
      const delay = setTimeout(() => {
        executeRealPayroll();
      }, 500);

      return () => clearTimeout(delay);
    }
  }, [isOpen, executeReal, processType, executeRealPayroll]);

  if (!isOpen) return null;

  const completedSteps = steps.filter((s) => s.status === 'completed').length;
  const progress = (completedSteps / steps.length) * 100;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Play className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Agent Execution Monitor</h2>
                <p className="text-sm text-gray-600">
                  {processType.charAt(0).toUpperCase() + processType.slice(1)} Process
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-700">
              <span>{completedSteps} of {steps.length} steps completed</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
                className="h-full bg-blue-600 rounded-full"
              />
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-200px)]">
          {/* Lottie Animation - Show when processing */}
          {progress > 0 && progress < 100 && (
            <div className="flex justify-center mb-6">
              <div className="w-32 h-32">
                <PayrollLottie />
              </div>
            </div>
          )}

          <div className="space-y-4">
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-xl border-2 transition-all ${
                  step.status === 'in_progress'
                    ? 'border-blue-500 bg-blue-50'
                    : step.status === 'completed'
                    ? 'border-green-500 bg-green-50'
                    : step.status === 'failed'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Status Icon */}
                  <div className="mt-1">
                    {step.status === 'pending' && (
                      <Clock className="w-5 h-5 text-gray-400" />
                    )}
                    {step.status === 'in_progress' && (
                      <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    )}
                    {step.status === 'completed' && (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    )}
                    {step.status === 'failed' && (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        step.status === 'in_progress'
                          ? 'gradient-text bg-gradient-to-r from-blue-100 to-indigo-100'
                          : 'text-blue-600 bg-blue-100'
                      }`}>
                        {step.agent}
                      </span>
                      {step.duration && (
                        <span className="text-xs text-gray-500">
                          {step.duration.toFixed(1)}s
                        </span>
                      )}
                    </div>
                    <h4 className={`font-medium ${
                      step.status === 'in_progress'
                        ? 'gradient-text'
                        : 'text-gray-900'
                    }`}>
                      {step.action}
                    </h4>
                    {step.details && (
                      <p className="text-sm text-gray-600 mt-1">{step.details}</p>
                    )}
                    {step.timestamp && (
                      <p className="text-xs text-gray-400 mt-2">
                        {step.timestamp.toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm">
              {error ? (
                <span className="text-red-600 font-medium">{error}</span>
              ) : progress === 100 ? (
                <span className="text-green-600 font-medium">All steps completed successfully!</span>
              ) : (
                <span className="gradient-text font-medium">Agents working autonomously...</span>
              )}
            </p>
            {(progress === 100 || error) && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
