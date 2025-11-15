'use client';

import { useRive, useStateMachineInput, Layout, Fit, Alignment } from '@rive-app/react-canvas';
import { useEffect } from 'react';

interface PennyOrbProps {
  size?: number;
  isSpeaking?: boolean;
  preset?: number;
  className?: string;
}

export default function PennyOrb({
  size = 40,
  isSpeaking = false,
  preset = 7,
  className = ''
}: PennyOrbProps) {
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
    if (colorInput) colorInput.value = preset;
  }, [isSpeaking, speakingInput, colorInput, preset]);

  return (
    <div className={className} style={{ width: size, height: size }}>
      <RiveComponent className="w-full h-full" />
    </div>
  );
}
