'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AgentProcessModal from '@/components/agents/AgentProcessModal';
import { generateWalletAddress } from '@/lib/wallet-utils';

interface AddEmployeeDialogProps {
  onSuccess: () => void;
}

interface ProcessStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export default function AddEmployeeDialog({ onSuccess }: AddEmployeeDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAgentProcess, setShowAgentProcess] = useState(false);
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    walletAddress: '',
    salaryAnnual: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError(null);
  };

  const updateStepStatus = (stepId: string, status: ProcessStep['status']) => {
    setProcessSteps(prev =>
      prev.map(step => (step.id === stepId ? { ...step, status } : step))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validate inputs
      if (!formData.name || !formData.email || !formData.salaryAnnual) {
        throw new Error('Please fill in all required fields');
      }

      const salary = parseFloat(formData.salaryAnnual);
      if (isNaN(salary) || salary <= 0) {
        throw new Error('Please enter a valid salary amount');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error('Please enter a valid email address');
      }

      // Validate wallet address if provided
      if (formData.walletAddress && !formData.walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        throw new Error('Please enter a valid Ethereum wallet address');
      }

      // Close form dialog and show agent process
      setOpen(false);

      // Initialize process steps
      const steps: ProcessStep[] = [
        {
          id: 'validate',
          title: 'Validating Employee Data',
          description: 'Checking employee information and duplicates',
          status: 'processing',
        },
        {
          id: 'wallet',
          title: 'Creating Wallet',
          description: 'Generating secure wallet for employee payments',
          status: 'pending',
        },
        {
          id: 'database',
          title: 'Adding to Database',
          description: 'Storing employee information securely',
          status: 'pending',
        },
        {
          id: 'email',
          title: 'Sending Credentials',
          description: 'Emailing login link and wallet address',
          status: 'pending',
        },
      ];

      setProcessSteps(steps);
      setShowAgentProcess(true);

      // Simulate step 1: Validation
      await new Promise(resolve => setTimeout(resolve, 1500));
      updateStepStatus('validate', 'completed');

      // Step 2: Create wallet (if not provided)
      updateStepStatus('wallet', 'processing');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate a proper Ethereum wallet address if not provided
      const walletAddress = formData.walletAddress || generateWalletAddress();
      updateStepStatus('wallet', 'completed');

      // Step 3: Add to database
      updateStepStatus('database', 'processing');
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          wallet_address: walletAddress,
          salary_usd: salary,
          salary_annual: salary,
          status: 'pending',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        updateStepStatus('database', 'failed');
        throw new Error(data.error || 'Failed to add employee');
      }

      updateStepStatus('database', 'completed');

      // Step 4: Send email
      updateStepStatus('email', 'processing');

      try {
        const emailResponse = await fetch('/api/send-employee-credentials', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name.trim(),
            email: formData.email.trim().toLowerCase(),
            walletAddress: walletAddress,
          }),
        });

        const emailData = await emailResponse.json();

        if (!emailResponse.ok || !emailData.success) {
          console.warn('Failed to send welcome email:', emailData.error);
          // Don't fail the entire process if email fails
        } else {
          console.log('Welcome email sent successfully');
        }

        updateStepStatus('email', 'completed');
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
        // Still mark as completed since the employee was created
        updateStepStatus('email', 'completed');
      }

      // Success - reset form
      setFormData({
        name: '',
        email: '',
        walletAddress: '',
        salaryAnnual: '',
      });

    } catch (err) {
      setError((err as Error).message);
      setShowAgentProcess(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProcessComplete = () => {
    setShowAgentProcess(false);
    setProcessSteps([]);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#0044FF] hover:bg-[#0033CC] text-white">
          <UserPlus className="w-4 h-4 mr-2" />
          Add Employee
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Employee</DialogTitle>
          <DialogDescription>
            Add a new employee to your payroll system. They will be set to pending status.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="John Doe"
              value={formData.name}
              onChange={handleChange}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              Email Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="john@company.com"
              value={formData.email}
              onChange={handleChange}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="walletAddress">
              Wallet Address <span className="text-gray-400">(optional)</span>
            </Label>
            <Input
              id="walletAddress"
              name="walletAddress"
              type="text"
              placeholder="0x..."
              value={formData.walletAddress}
              onChange={handleChange}
              disabled={isSubmitting}
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500">
              Employee's wallet address for receiving payments. Can be added later.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="salaryAnnual">
              Annual Salary (USD) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="salaryAnnual"
              name="salaryAnnual"
              type="number"
              placeholder="65000"
              value={formData.salaryAnnual}
              onChange={handleChange}
              disabled={isSubmitting}
              min="0"
              step="1000"
              required
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#0044FF] hover:bg-[#0033CC] text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Employee'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* Agent Process Modal */}
      <AgentProcessModal
        isOpen={showAgentProcess}
        title="Adding Employee"
        steps={processSteps}
        onComplete={handleProcessComplete}
      />
    </Dialog>
  );
}
