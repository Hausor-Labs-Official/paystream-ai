'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2, CheckCircle, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface OnRampButtonProps {
  amount: number; // USD amount to fund
  onSuccess?: () => void; // Callback when funding completes
  onError?: (error: string) => void; // Callback on error
  disabled?: boolean;
  className?: string;
}

export default function OnRampButton({
  amount,
  onSuccess,
  onError,
  disabled = false,
  className = '',
}: OnRampButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [onRampUrl, setOnRampUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  /**
   * Generate on-ramp URL and open modal
   */
  const handleFundClick = async () => {
    setIsLoading(true);
    setError(null);
    setStatus('loading');

    try {
      // Call API to generate on-ramp URL
      const response = await fetch(`/api/onramp?amount=${amount.toFixed(2)}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate on-ramp URL');
      }

      const data = await response.json();

      if (!data.success || !data.data.url) {
        throw new Error('Invalid response from on-ramp API');
      }

      // Set URL and open modal
      setOnRampUrl(data.data.url);
      setShowModal(true);
      setStatus('idle');
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      setStatus('error');
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle iframe message events from Circle
   */
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Security: Only accept messages from Circle domains
      if (!event.origin.includes('circle.com')) {
        return;
      }

      const { type, data } = event.data;

      console.log('Circle On-Ramp Event:', type, data);

      switch (type) {
        case 'onramp_success':
        case 'onramp_completed':
          setStatus('success');
          setShowModal(false);
          if (onSuccess) {
            // Delay slightly to allow blockchain confirmation
            setTimeout(() => {
              onSuccess();
            }, 2000);
          }
          break;

        case 'onramp_error':
        case 'onramp_failed':
          setStatus('error');
          setError(data?.message || 'On-ramp transaction failed');
          if (onError) {
            onError(data?.message || 'Transaction failed');
          }
          break;

        case 'onramp_close':
        case 'onramp_cancelled':
          setShowModal(false);
          setStatus('idle');
          break;

        default:
          console.log('Unhandled on-ramp event:', type);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [onSuccess, onError]);

  /**
   * Close modal and reset
   */
  const handleCloseModal = () => {
    setShowModal(false);
    setOnRampUrl(null);
    setStatus('idle');
  };

  return (
    <>
      <Button
        onClick={handleFundClick}
        disabled={disabled || isLoading || amount <= 0}
        className={`${className}`}
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </>
        ) : status === 'success' ? (
          <>
            <CheckCircle className="mr-2 h-4 w-4" />
            Funded Successfully
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Fund Payroll with Card
          </>
        )}
      </Button>

      {/* Error Alert */}
      {error && status === 'error' && (
        <Alert variant="destructive" className="mt-4">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Alert */}
      {status === 'success' && (
        <Alert className="mt-4 border-green-500 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Funding successful! Refreshing balance...
          </AlertDescription>
        </Alert>
      )}

      {/* On-Ramp Modal */}
      <Dialog open={showModal} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-4xl h-[80vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Fund Payroll with Credit Card</DialogTitle>
            <DialogDescription>
              Amount: ${amount.toFixed(2)} USDC • Destination: Arc Testnet
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 w-full h-full p-6">
            {onRampUrl ? (
              <iframe
                src={onRampUrl}
                className="w-full h-full border-0 rounded-lg"
                title="Circle On-Ramp"
                allow="payment"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </div>

          <div className="p-6 pt-0 border-t bg-gray-50">
            <div className="flex items-start space-x-2 text-sm text-gray-600">
              <div className="flex-shrink-0 mt-0.5">ℹ️</div>
              <div>
                <p className="font-medium">Test Mode</p>
                <p className="text-xs">
                  Use test card: <code className="bg-white px-1 py-0.5 rounded">4242 4242 4242 4242</code>
                  {' • '}Any future expiry date • Any CVC
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
