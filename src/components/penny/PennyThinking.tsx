'use client';

import { useEffect, useState } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const thinkingPhrases = [
  'Thinking...',
  'Analyzing data...',
  'Crunching numbers...',
  'Processing request...',
  'Calculating...',
  'Checking records...',
  'Fetching insights...',
];

export default function PennyThinking() {
  const [currentPhrase, setCurrentPhrase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPhrase((prev) => (prev + 1) % thinkingPhrases.length);
    }, 2000); // Change phrase every 2 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-3">
      {/* Lottie Animation */}
      <div className="w-12 h-12 flex-shrink-0">
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
            font-size: 0.875rem;
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
        <p className="gradient-text fade-in" key={currentPhrase}>
          {thinkingPhrases[currentPhrase]}
        </p>
      </div>
    </div>
  );
}
