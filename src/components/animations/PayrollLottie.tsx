'use client';

import Lottie from 'lottie-react';
import { useEffect, useState } from 'react';

interface PayrollLottieProps {
  className?: string;
}

export default function PayrollLottie({ className = '' }: PayrollLottieProps) {
  const [animationData, setAnimationData] = useState<any>(null);

  useEffect(() => {
    // Fetch the Lottie animation from the hosted URL
    fetch('https://lottie.host/220ceadd-12f3-4e8a-94cb-c3b1c4b9f61e/JzjN1zfCBx.lottie')
      .then((response) => response.json())
      .then((data) => setAnimationData(data))
      .catch((error) => console.error('Failed to load Lottie animation:', error));
  }, []);

  if (!animationData) {
    return null;
  }

  return (
    <Lottie
      animationData={animationData}
      loop={true}
      autoplay={true}
      className={className}
    />
  );
}
