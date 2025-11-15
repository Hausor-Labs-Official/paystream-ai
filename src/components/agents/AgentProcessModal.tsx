'use client';

import { useEffect, useState } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, Loader2 } from 'lucide-react';

interface ProcessStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

interface AgentProcessModalProps {
  isOpen: boolean;
  title: string;
  steps: ProcessStep[];
  onComplete?: () => void;
}

const processingPhrases = [
  'Processing request...',
  'AI agents working...',
  'Analyzing data...',
  'Executing operations...',
  'Finalizing...',
  'Almost done...',
];

export default function AgentProcessModal({
  isOpen,
  title,
  steps,
  onComplete,
}: AgentProcessModalProps) {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPhraseIndex((prev) => (prev + 1) % processingPhrases.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Check if all steps are completed
    const allCompleted = steps.every(step => step.status === 'completed');
    if (allCompleted && onComplete && steps.length > 0) {
      // Wait a bit before calling onComplete to show the final state
      const timeout = setTimeout(() => {
        onComplete();
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [steps, onComplete]);

  const getStepIcon = (status: ProcessStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <div className="w-5 h-5 rounded-full bg-red-500" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-[500px] border-gray-200"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <div className="py-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-black mb-2">{title}</h2>
            <p className="text-sm text-gray-500">AI agents are processing your request</p>
          </div>

          {/* Lottie Animation with Gradient Text */}
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="w-24 h-24 mb-4">
              <DotLottieReact
                src="https://lottie.host/220ceadd-12f3-4e8a-94cb-c3b1c4b9f61e/JzjN1zfCBx.lottie"
                loop
                autoplay
                className="w-full h-full"
              />
            </div>

            {/* Animated Gradient Text */}
            <div className="relative">
              <style jsx>{`
                @keyframes shimmer {
                  0% {
                    background-position: -200% center;
                  }
                  100% {
                    background-position: 200% center;
                  }
                }

                .gradient-text {
                  background: linear-gradient(
                    90deg,
                    #93C5FD 0%,
                    #60A5FA 25%,
                    #3B82F6 50%,
                    #0044FF 75%,
                    #3B82F6 100%
                  );
                  background-size: 200% auto;
                  background-clip: text;
                  -webkit-background-clip: text;
                  -webkit-text-fill-color: transparent;
                  animation: shimmer 3s linear infinite;
                  font-weight: 500;
                  font-size: 1rem;
                }

                .fade-in {
                  animation: fadeIn 0.3s ease-in;
                }

                @keyframes fadeIn {
                  from {
                    opacity: 0;
                    transform: translateY(-2px);
                  }
                  to {
                    opacity: 1;
                    transform: translateY(0);
                  }
                }
              `}</style>
              <p className="gradient-text fade-in" key={currentPhraseIndex}>
                {processingPhrases[currentPhraseIndex]}
              </p>
            </div>
          </div>

          {/* Process Steps */}
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                  step.status === 'processing'
                    ? 'bg-blue-50 border border-blue-200'
                    : step.status === 'completed'
                    ? 'bg-green-50 border border-green-200'
                    : step.status === 'failed'
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="mt-0.5">{getStepIcon(step.status)}</div>
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium ${
                      step.status === 'completed'
                        ? 'text-green-900'
                        : step.status === 'processing'
                        ? 'text-blue-900'
                        : step.status === 'failed'
                        ? 'text-red-900'
                        : 'text-gray-700'
                    }`}
                  >
                    {step.title}
                  </p>
                  <p
                    className={`text-xs mt-0.5 ${
                      step.status === 'completed'
                        ? 'text-green-600'
                        : step.status === 'processing'
                        ? 'text-blue-600'
                        : step.status === 'failed'
                        ? 'text-red-600'
                        : 'text-gray-500'
                    }`}
                  >
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Completion Message */}
          {steps.every(step => step.status === 'completed') && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <p className="text-sm font-medium text-green-900">
                  Process completed successfully!
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
