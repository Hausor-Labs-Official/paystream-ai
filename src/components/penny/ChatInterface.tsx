'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, Trash2, Sparkles, BarChart3 } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Pie, Line, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  chart?: any;
  timestamp: Date;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Quick prompts
  const quickPrompts = [
    'Show me a chart of employee salaries',
    'What is the total payroll?',
    'Show payment status distribution',
    'How many employees have been paid?',
  ];

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Send message
  const handleSend = async (prompt?: string) => {
    const messageText = prompt || input.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/penny', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: messageText }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from Penny');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.data.text,
        chart: data.data.chart,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
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

  // Clear chat
  const handleClear = async () => {
    setMessages([]);
    // Clear history on backend
    await fetch('/api/penny', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: '', clearHistory: true }),
    });
  };

  // Render chart
  const renderChart = (chart: any) => {
    if (!chart) return null;

    const ChartComponent =
      chart.type === 'bar' ? Bar : chart.type === 'pie' ? Pie : chart.type === 'line' ? Line : Doughnut;

    return (
      <div className="mt-4 h-[400px] bg-white dark:bg-gray-800 rounded-lg p-4">
        <ChartComponent data={chart.data} options={chart.options} />
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Penny AI</h2>
            <p className="text-sm text-gray-500">Your payroll assistant</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleClear} disabled={messages.length === 0}>
          <Trash2 className="w-4 h-4 mr-2" />
          Clear Chat
        </Button>
      </div>

      {/* Messages */}
      <Card className="flex-1 overflow-hidden">
        <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Hi! I'm Penny 👋</h3>
              <p className="text-gray-500 mb-6 max-w-md">
                I can help you analyze payroll data, visualize employee salaries, track payments, and more!
              </p>

              {/* Quick Prompts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                {quickPrompts.map((prompt, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    className="justify-start text-left h-auto py-3 px-4"
                    onClick={() => handleSend(prompt)}
                  >
                    <BarChart3 className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="text-sm">{prompt}</span>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm'
                        : 'bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm'
                    } px-4 py-3`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    {message.chart && renderChart(message.chart)}
                    <p className="text-xs opacity-70 mt-2">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Input */}
      <div className="mt-4 flex space-x-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask Penny anything about payroll..."
          disabled={isLoading}
          className="flex-1"
        />
        <Button onClick={() => handleSend()} disabled={!input.trim() || isLoading} size="icon">
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </Button>
      </div>

      {/* Footer Info */}
      <p className="text-xs text-center text-gray-500 mt-3">
        Powered by Groq • All data is read-only and secure
      </p>
    </div>
  );
}
