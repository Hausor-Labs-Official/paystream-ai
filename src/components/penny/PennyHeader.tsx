'use client';

import PennyVisual from './PennyVisual';
import { useState } from 'react';

export default function PennyHeader() {
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      {/* Header with Orb */}
      <div className="flex items-center gap-4 p-6 bg-gradient-to-br from-indigo-900 via-purple-900 to-teal-900 rounded-2xl shadow-2xl border border-purple-500/30">
        <PennyVisual
          isListening={isListening}
          isThinking={isThinking}
          isSpeaking={isSpeaking}
          colorMode={5}
        />
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Penny</h2>
          <p className="text-sm text-cyan-300 flex items-center gap-1">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Online • Voice & Visual AI
          </p>
        </div>

        {/* Debug Buttons (Remove in Production) */}
        <div className="hidden md:flex gap-2 ml-auto">
          <button
            onClick={() => setIsListening(!isListening)}
            className={`text-xs px-3 py-1 rounded-lg transition-colors ${
              isListening ? 'bg-green-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            {isListening ? 'Listening...' : 'Listen'}
          </button>
          <button
            onClick={() => setIsThinking(!isThinking)}
            className={`text-xs px-3 py-1 rounded-lg transition-colors ${
              isThinking ? 'bg-yellow-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            {isThinking ? 'Thinking...' : 'Think'}
          </button>
          <button
            onClick={() => setIsSpeaking(!isSpeaking)}
            className={`text-xs px-3 py-1 rounded-lg transition-colors ${
              isSpeaking ? 'bg-blue-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            {isSpeaking ? 'Speaking...' : 'Speak'}
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mt-8 p-6 bg-black/30 backdrop-blur-md rounded-xl border border-purple-500/20">
        <p className="text-white text-center">
          Ask Penny anything about payroll, employees, or Arc transactions.
        </p>
      </div>
    </div>
  );
}
