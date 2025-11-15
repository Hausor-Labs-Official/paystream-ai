import ChatInterface from '@/components/penny/ChatInterface';
import PennyHeader from '@/components/penny/PennyHeader';
import { Sparkles, Database, TrendingUp, DollarSign } from 'lucide-react';

export default function PennyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Penny Orb Header */}
        <div className="mb-8 max-w-5xl mx-auto">
          <PennyHeader />
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-border">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Data Queries</h3>
                <p className="text-xs text-gray-500">Employee & payment data</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-border">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-300" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Visualizations</h3>
                <p className="text-xs text-gray-500">Charts & analytics</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-border">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-300" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Transactions</h3>
                <p className="text-xs text-gray-500">Arc blockchain data</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <ChatInterface />

        {/* Info Footer */}
        <div className="mt-8 max-w-5xl mx-auto">
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-6 border border-border">
            <h3 className="font-semibold mb-3 flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
              What can Penny do?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700 dark:text-gray-300">
              <div className="flex items-start">
                <span className="text-purple-600 mr-2">•</span>
                <span>Create salary charts and visualizations</span>
              </div>
              <div className="flex items-start">
                <span className="text-purple-600 mr-2">•</span>
                <span>Calculate payroll statistics</span>
              </div>
              <div className="flex items-start">
                <span className="text-purple-600 mr-2">•</span>
                <span>Track payment statuses</span>
              </div>
              <div className="flex items-start">
                <span className="text-purple-600 mr-2">•</span>
                <span>View transaction history</span>
              </div>
              <div className="flex items-start">
                <span className="text-purple-600 mr-2">•</span>
                <span>Check Arc blockchain balances</span>
              </div>
              <div className="flex items-start">
                <span className="text-purple-600 mr-2">•</span>
                <span>Answer general payroll questions</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
