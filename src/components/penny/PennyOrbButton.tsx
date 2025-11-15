'use client';

import { useRive, useStateMachineInput, Layout, Fit, Alignment } from '@rive-app/react-webgl2';
import { useEffect, useState } from 'react';

interface PennyOrbButtonProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function PennyOrbButton({ isOpen, onToggle }: PennyOrbButtonProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const stateMachine = 'default';

  const { rive, RiveComponent } = useRive({
    src: '/elements/orb-1.2.riv',
    stateMachines: stateMachine,
    autoplay: true,
    layout: new Layout({
      fit: Fit.Cover,
      alignment: Alignment.Center,
    }),
  });

  const speakingInput = useStateMachineInput(rive, stateMachine, 'speaking');
  const colorInput = useStateMachineInput(rive, stateMachine, 'color');

  useEffect(() => {
    if (speakingInput) speakingInput.value = isSpeaking;
    if (colorInput) colorInput.value = 7; // PENNY COLOR #7
  }, [isSpeaking, speakingInput, colorInput]);

  // Simulate speaking when panel opens
  useEffect(() => {
    if (isOpen) {
      setIsSpeaking(true);
      const timer = setTimeout(() => setIsSpeaking(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <button
      onClick={onToggle}
      className={`
        fixed bottom-6 right-6 z-40
        w-16 h-16
        transition-all duration-300 ease-in-out
        hover:scale-110
        ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}
      `}
      aria-label="Chat with Penny"
    >
      <RiveComponent className="w-full h-full" />
      <span className="sr-only">Open Penny AI</span>
    </button>
  );
}
