'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Mic, Send, Sparkles, Paperclip, FileText, Volume2, Circle, Scan, MicOff } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import PennyOrb from './PennyOrb';
import PennyThinking from './PennyThinking';
import AgentMonitor from '../agents/AgentMonitor';
import toast from 'react-hot-toast';

interface MessageAttachment {
  type: 'image' | 'file' | 'audio';
  name: string;
  url: string;
  mimeType: string;
  transcription?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: MessageAttachment[];
}

interface PennyPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const PROMPT_SUGGESTIONS = [
  'Run payroll for this month',
  'Show me employee status',
  'Search for developers',
  'Check treasury balance',
  'Review recent transactions',
];

export default function PennyPanel({ isOpen, onClose }: PennyPanelProps) {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAgentMonitor, setShowAgentMonitor] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isLiveVoiceMode, setIsLiveVoiceMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update input with transcript
  useEffect(() => {
    if (transcript && !isLiveVoiceMode) {
      setInput(transcript);
    }
  }, [transcript, isLiveVoiceMode]);

  // Live voice mode: auto-send after pause
  useEffect(() => {
    if (isLiveVoiceMode && transcript && !listening) {
      const timer = setTimeout(() => {
        if (transcript.trim()) {
          handleSend(transcript);
          resetTranscript();
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isLiveVoiceMode, transcript, listening]);

  // Initial greeting
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Hello${user?.firstName ? ` ${user.firstName}` : ''}! I'm Penny, your AI payroll assistant. I can help you with payroll, employee searches, document scanning, and more. Try using voice, text, or upload documents!`,
        timestamp: new Date(),
      };
      setMessages([greeting]);
    }
  }, [isOpen, user, messages.length]);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      setRecordingTime(0);
    }
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [isRecording]);

  const detectAgentCommand = (text: string): boolean => {
    const payrollCommands = ['run payroll', 'process payroll', 'execute payroll', 'pay employees'];
    const lowerText = text.toLowerCase();
    return payrollCommands.some(cmd => lowerText.includes(cmd));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];

          toast.loading('Transcribing audio...', { id: 'record-transcribe' });

          try {
            const response = await fetch('/api/audio/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audio: base64Audio,
                mimeType: 'audio/webm',
              }),
            });

            const data = await response.json();

            if (data.success) {
              toast.success('Audio transcribed!', { id: 'record-transcribe' });
              setInput(prev => prev ? `${prev}\n\n${data.transcription}` : data.transcription);
            } else {
              toast.error('Transcription failed', { id: 'record-transcribe' });
            }
          } catch (error) {
            console.error('Transcription error:', error);
            toast.error('Error transcribing audio', { id: 'record-transcribe' });
          }
        };
        reader.readAsDataURL(audioBlob);

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.success('Recording stopped');
    }
  };

  const toggleLiveVoiceMode = () => {
    if (isLiveVoiceMode) {
      SpeechRecognition.stopListening();
      setIsLiveVoiceMode(false);
      toast.success('Live voice mode disabled');
    } else {
      if (!browserSupportsSpeechRecognition) {
        toast.error('Your browser does not support speech recognition');
        return;
      }
      resetTranscript();
      SpeechRecognition.startListening({ continuous: true });
      setIsLiveVoiceMode(true);
      toast.success('Live voice mode enabled - speak to Penny!');
    }
  };

  const handleCameraCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const result = e.target?.result as string;
      const base64 = result.split(',')[1];

      toast.loading('Scanning document with OCR...', { id: 'ocr-scan' });

      try {
        const response = await fetch('/api/scan/document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: base64,
            mimeType: file.type,
            documentType: 'general',
          }),
        });

        const data = await response.json();

        if (data.success) {
          toast.success('Document scanned!', { id: 'ocr-scan' });

          const extractedText = data.data?.text || JSON.stringify(data.data, null, 2);
          setInput(prev => prev ? `${prev}\n\nScanned Document:\n${extractedText}` : `Scanned Document:\n${extractedText}`);

          const attachment: MessageAttachment = {
            type: 'image',
            name: file.name,
            url: result,
            mimeType: file.type,
          };
          setAttachments(prev => [...prev, attachment]);
        } else {
          toast.error('OCR failed', { id: 'ocr-scan' });
        }
      } catch (error) {
        console.error('OCR error:', error);
        toast.error('Error scanning document', { id: 'ocr-scan' });
      }
    };
    reader.readAsDataURL(file);

    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: MessageAttachment[] = [];
    let processedCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isAudio = file.type.startsWith('audio/');

      const reader = new FileReader();
      reader.onload = async (e) => {
        const result = e.target?.result as string;
        const base64 = result.split(',')[1];

        let attachment: MessageAttachment = {
          type: file.type.startsWith('image/') ? 'image' : isAudio ? 'audio' : 'file',
          name: file.name,
          url: result,
          mimeType: file.type,
        };

        if (isAudio) {
          toast.loading(`Transcribing ${file.name}...`, { id: `transcribe-${i}` });
          try {
            const response = await fetch('/api/audio/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audio: base64,
                mimeType: file.type,
              }),
            });

            const data = await response.json();

            if (data.success) {
              attachment.transcription = data.transcription;
              toast.success(`Transcribed ${file.name}`, { id: `transcribe-${i}` });
              setInput(prev => prev ? `${prev}\n\n${data.transcription}` : data.transcription);
            } else {
              toast.error(`Failed to transcribe ${file.name}`, { id: `transcribe-${i}` });
            }
          } catch (error) {
            console.error('Transcription error:', error);
            toast.error(`Error transcribing ${file.name}`, { id: `transcribe-${i}` });
          }
        }

        newAttachments.push(attachment);
        processedCount++;

        if (processedCount === files.length) {
          setAttachments(prev => [...prev, ...newAttachments]);
        }
      };

      reader.readAsDataURL(file);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (overrideText?: string) => {
    const messageText = (overrideText || input).trim();
    if ((!messageText && attachments.length === 0) || isLoading) return;

    setShowSuggestions(false);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText || '(Sent files)',
      timestamp: new Date(),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    resetTranscript();

    const currentAttachments = [...attachments];
    setAttachments([]);

    if (detectAgentCommand(messageText)) {
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I\'m initiating the payroll process now. Our AI agents will handle everything automatically. You can monitor the progress in the Agent Monitor.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, agentMessage]);

      setTimeout(() => {
        setShowAgentMonitor(true);
      }, 1000);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/penny', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: messageText,
          userId: user?.id,
          userEmail: user?.primaryEmailAddress?.emailAddress,
          attachments: currentAttachments,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from Penny');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.data?.text || data.text || 'I apologize, I encountered an error.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Play ElevenLabs audio if available, otherwise use browser TTS
      if (data.audioUrl) {
        playElevenLabsAudio(data.audioUrl);
      } else if (isLiveVoiceMode) {
        speakText(assistantMessage.content);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setShowSuggestions(false);
  };

  const playElevenLabsAudio = (audioUrl: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.onplay = () => setIsPlaying(true);
    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => {
      setIsPlaying(false);
      console.error('Error playing ElevenLabs audio');
    };

    audio.play().catch(error => {
      console.error('Failed to play audio:', error);
      setIsPlaying(false);
    });
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);

      window.speechSynthesis.speak(utterance);
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed right-0 top-0 w-[28rem] h-screen bg-white border-l border-gray-200 z-30 flex flex-col">
      {/* Header */}
      <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <PennyOrb size={40} isSpeaking={isPlaying} preset={7} />
            <div className={`absolute bottom-0 right-0 w-3 h-3 ${isPlaying ? 'bg-blue-300 animate-pulse' : isLiveVoiceMode ? 'bg-purple-400 animate-pulse' : 'bg-green-400'} rounded-full border-2 border-white`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Penny AI</h3>
            <p className="text-xs text-gray-600">
              {isLiveVoiceMode ? 'Live Voice Active' : 'Payroll Assistant'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <X className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white">
        {/* Prompt Suggestions */}
        {showSuggestions && messages.length <= 1 && (
          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Try these commands:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {PROMPT_SUGGESTIONS.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-3 py-2 bg-white hover:bg-blue-50 text-blue-700 rounded-lg text-sm font-medium transition-all border border-blue-200 hover:border-blue-300"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`px-4 py-3 rounded-2xl max-w-[85%] ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-tr-sm'
                  : 'bg-white text-gray-900 rounded-tl-sm border border-gray-200'
              }`}
            >
              {message.attachments && message.attachments.length > 0 && (
                <div className="mb-2 space-y-2">
                  {message.attachments.map((attachment, idx) => (
                    <div key={idx} className="rounded-lg overflow-hidden">
                      {attachment.type === 'image' ? (
                        <img
                          src={attachment.url}
                          alt={attachment.name}
                          className="max-w-full max-h-64 rounded-lg"
                        />
                      ) : attachment.type === 'audio' ? (
                        <div className="space-y-2">
                          <div className={`flex items-center gap-2 p-2 rounded-lg ${
                            message.role === 'user' ? 'bg-blue-700' : 'bg-gray-100'
                          }`}>
                            <Volume2 className="w-4 h-4" />
                            <span className="text-xs font-medium truncate">{attachment.name}</span>
                          </div>
                          {attachment.transcription && (
                            <div className={`p-2 rounded-lg text-xs italic ${
                              message.role === 'user' ? 'bg-blue-700/50' : 'bg-gray-50'
                            }`}>
                              {attachment.transcription}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className={`flex items-center gap-2 p-2 rounded-lg ${
                          message.role === 'user' ? 'bg-blue-700' : 'bg-gray-100'
                        }`}>
                          <FileText className="w-4 h-4" />
                          <span className="text-xs font-medium truncate">{attachment.name}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
              <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <PennyThinking />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 bg-white">
        {/* Status Indicators */}
        {isRecording && (
          <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
            <Circle className="w-3 h-3 fill-red-500 text-red-500 animate-pulse" />
            <span className="text-sm font-medium text-red-700">Recording: {formatRecordingTime(recordingTime)}</span>
          </div>
        )}

        {isLiveVoiceMode && (
          <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg">
            <Mic className="w-4 h-4 text-purple-600 animate-pulse" />
            <span className="text-sm font-medium text-purple-700">Live Voice Mode - Speak naturally</span>
            <button
              onClick={toggleLiveVoiceMode}
              className="ml-auto text-xs text-purple-600 hover:text-purple-800 font-medium px-2 py-1 hover:bg-purple-100 rounded"
            >
              Stop
            </button>
          </div>
        )}

        {/* Attachment Preview */}
        {attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachments.map((attachment, index) => (
              <div key={index} className="relative group">
                {attachment.type === 'image' ? (
                  <div className="relative">
                    <img
                      src={attachment.url}
                      alt={attachment.name}
                      className="w-16 h-16 object-cover rounded-lg border-2 border-blue-200"
                    />
                    <button
                      onClick={() => removeAttachment(index)}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : attachment.type === 'audio' ? (
                  <div className="relative px-3 py-2 bg-purple-50 border-2 border-purple-200 rounded-lg flex items-center gap-2 max-w-[200px]">
                    <Volume2 className="w-4 h-4 text-purple-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-purple-700 block truncate">
                        {attachment.name}
                      </span>
                      {attachment.transcription && (
                        <span className="text-xs text-purple-600 block truncate">
                          Transcribed
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => removeAttachment(index)}
                      className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    >
                      <X className="w-3 h-3 text-red-500" />
                    </button>
                  </div>
                ) : (
                  <div className="relative px-3 py-2 bg-blue-50 border-2 border-blue-200 rounded-lg flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-medium text-blue-700 max-w-[100px] truncate">
                      {attachment.name}
                    </span>
                    <button
                      onClick={() => removeAttachment(index)}
                      className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-red-500" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons Row */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx,audio/*,.mp3,.wav,.m4a,.ogg,.flac,.aac"
            onChange={handleFileUpload}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCameraCapture}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center h-16 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
            disabled={isLoading || isRecording}
            title="Upload files (images, audio, documents)"
          >
            <Paperclip className="w-5 h-5 text-gray-700 mb-1" />
            <span className="text-[10px] text-gray-600 font-medium">Upload</span>
          </button>

          <button
            onClick={() => cameraInputRef.current?.click()}
            className="flex flex-col items-center justify-center h-16 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
            disabled={isLoading || isRecording}
            title="Scan documents with OCR"
          >
            <Scan className="w-5 h-5 text-gray-700 mb-1" />
            <span className="text-[10px] text-gray-600 font-medium">OCR Scan</span>
          </button>

          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`flex flex-col items-center justify-center h-16 rounded-xl transition-colors ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
            disabled={isLoading || isLiveVoiceMode}
            title={isRecording ? 'Stop recording' : 'Record audio'}
          >
            {isRecording ? <Circle className="w-5 h-5 fill-current mb-1" /> : <Mic className="w-5 h-5 mb-1" />}
            <span className="text-[10px] font-medium">{isRecording ? 'Stop' : 'Record'}</span>
          </button>

          <button
            onClick={toggleLiveVoiceMode}
            className={`flex flex-col items-center justify-center h-16 rounded-xl transition-colors ${
              isLiveVoiceMode
                ? 'bg-purple-500 hover:bg-purple-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
            disabled={isLoading || isRecording || !browserSupportsSpeechRecognition}
            title={isLiveVoiceMode ? 'Disable live voice' : 'Enable live voice conversation'}
          >
            {isLiveVoiceMode ? <MicOff className="w-5 h-5 mb-1" /> : <Volume2 className="w-5 h-5 mb-1" />}
            <span className="text-[10px] font-medium">Live Voice</span>
          </button>
        </div>

        {/* Input and Send */}
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              isRecording ? 'Recording audio...' :
              listening ? 'Listening...' :
              isLiveVoiceMode ? 'Speak to Penny...' :
              'Type a message or use voice/upload...'
            }
            className="flex-1 resize-none border-2 border-gray-300 focus:border-blue-500 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-200 outline-none transition-all"
            rows={2}
            disabled={isLoading || isRecording || isLiveVoiceMode}
          />
          <button
            onClick={() => handleSend()}
            disabled={(!input.trim() && attachments.length === 0) || isLoading || isRecording || isLiveVoiceMode}
            className="w-14 h-14 bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl flex items-center justify-center hover:from-blue-700 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed self-end"
            aria-label="Send message"
          >
            <Send className="w-6 h-6 text-white" />
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-2">
          Penny can search employees, scan documents, transcribe audio & more
        </p>
      </div>
    </div>

    {/* Agent Monitor */}
    <AgentMonitor
      isOpen={showAgentMonitor}
      onClose={() => setShowAgentMonitor(false)}
      processType="payroll"
      executeReal={true}
    />
    </>
  );
}
