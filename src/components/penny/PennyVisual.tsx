'use client';

import { useRive, useStateMachineInput } from '@rive-app/react-webgl2';
import { useEffect } from 'react';

interface PennyVisualProps {
  isListening?: boolean;
  isThinking?: boolean;
  isSpeaking?: boolean;
  colorMode?: number; // 0–8
}

export default function PennyVisual({
  isListening = false,
  isThinking = false,
  isSpeaking = false,
  colorMode = 5, // PENNY'S OFFICIAL COLOR
}: PennyVisualProps) {
  const stateMachine = 'default';

  const { rive, RiveComponent } = useRive({
    src: '/elements/orb-1.2.riv', // YOUR FILE
    stateMachines: stateMachine,
    autoplay: true,
    onLoad: () => {
      console.log('Penny Orb loaded!');
    },
  });

  const listeningInput = useStateMachineInput(rive, stateMachine, 'listening');
  const thinkingInput = useStateMachineInput(rive, stateMachine, 'thinking');
  const speakingInput = useStateMachineInput(rive, stateMachine, 'speaking');
  const colorInput = useStateMachineInput(rive, stateMachine, 'color');

  useEffect(() => {
    if (listeningInput) listeningInput.value = isListening;
    if (thinkingInput) thinkingInput.value = isThinking;
    if (speakingInput) speakingInput.value = isSpeaking;
    if (colorInput) colorInput.value = colorMode;
  }, [
    isListening,
    isThinking,
    isSpeaking,
    colorMode,
    listeningInput,
    thinkingInput,
    speakingInput,
    colorInput,
  ]);

  if (!rive) {
    return (
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-teal-600 animate-pulse" />
    );
  }

  return (
    <div className="w-16 h-16 md:w-20 md:h-20">
      <RiveComponent className="w-full h-full drop-shadow-2xl" />
    </div>
  );
}
