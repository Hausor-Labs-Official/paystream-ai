'use client';

import { useState } from 'react';
import { DocumentScanner } from '@/components/DocumentScanner';
import { CheckCircle, Receipt, Loader2 } from 'lucide-react';

export default function ExpenseScanPage() {
  const [extractedData, setExtractedData] = useState<any>(null);
  const [additionalData, setAdditionalData] = useState({
    category: '',
    notes: '',
    employeeId: '',
  });
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [expense, setExpense] = useState<any>(null);

  const handleScanComplete = (data: any) => {
    setExtractedData(data);

    // Auto-fill category if available
    if (data.data.vendor) {
      const vendorLower = data.data.vendor.toLowerCase();
      if (vendorLower.includes('uber') || vendorLower.includes('lyft')) {
        setAdditionalData((prev) => ({ ...prev, category: 'Transportation' }));
      } else if (vendorLower.includes('hotel') || vendorLower.includes('airbnb')) {
        setAdditionalData((prev) => ({ ...prev, category: 'Lodging' }));
      } else if (vendorLower.includes('restaurant') || vendorLower.includes('cafe')) {
        setAdditionalData((prev) => ({ ...prev, category: 'Meals' }));
      }
    }
  };

  const handleCreateExpense = async () => {
    if (!extractedData) return;

    setCreating(true);

    try {
      // Use the base64 image from the scanner
      const base64Image = extractedData.image ? extractedData.image.split(',')[1] : '';

      const response = await fetch('/api/expenses/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image,
          mimeType: 'image/jpeg',
          employeeId: additionalData.employeeId || undefined,
          category: additionalData.category || 'Other',
          notes: additionalData.notes || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCreated(true);
        // Map the response to the expected format
        const expenseData = {
          vendor: data.expense?.vendor || data.scannedData?.vendor,
          amount: data.expense?.amount || data.scannedData?.total,
          date: data.expense?.date || data.scannedData?.date,
          category: data.expense?.category || additionalData.category,
          items: data.scannedData?.items || [],
        };
        setExpense(expenseData);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error creating expense:', error);
      alert('Failed to create expense');
    } finally {
      setCreating(false);
    }
  };

  const handleReset = () => {
    setExtractedData(null);
    setAdditionalData({
      category: '',
      notes: '',
      employeeId: '',
    });
    setCreated(false);
    setExpense(null);
  };

  if (created && expense) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            <CheckCircle className="mx-auto text-green-600 mb-4" size={64} />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Expense Recorded!</h1>
            <p className="text-gray-600 mb-6">
              Your expense has been successfully added to PayStream AI
            </p>

            <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
              <h3 className="font-semibold text-gray-900 mb-4">Expense Details:</h3>
              <div className="space-y-3">
                {expense.vendor && (
                  <div>
                    <span className="text-sm text-gray-600">Vendor:</span>
                    <p className="font-medium text-gray-900">{expense.vendor}</p>
                  </div>
                )}
                {expense.amount && (
                  <div>
                    <span className="text-sm text-gray-600">Amount:</span>
                    <p className="font-medium text-gray-900 text-2xl text-green-600">
                      ${expense.amount.toFixed(2)}
                    </p>
                  </div>
                )}
                {expense.date && (
                  <div>
                    <span className="text-sm text-gray-600">Date:</span>
                    <p className="font-medium text-gray-900">{expense.date}</p>
                  </div>
                )}
                {expense.category && (
                  <div>
                    <span className="text-sm text-gray-600">Category:</span>
                    <p className="font-medium text-gray-900">{expense.category}</p>
                  </div>
                )}
                {expense.items && expense.items.length > 0 && (
                  <div>
                    <span className="text-sm text-gray-600">Items:</span>
                    <ul className="mt-2 space-y-1">
                      {expense.items.map((item: string, idx: number) => (
                        <li key={idx} className="text-sm text-gray-700">• {item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleReset}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Scan Another Expense
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Expense Scanning with AI
          </h1>
          <p className="text-lg text-gray-600">
            Scan receipts and invoices to automatically extract expense information
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Scanner Column */}
          <div>
            <DocumentScanner
              documentType="receipt"
              onScanComplete={handleScanComplete}
              title="Scan Receipt or Invoice"
              description="Upload a photo of your receipt or invoice"
            />
          </div>

          {/* Form Column */}
          <div>
            {extractedData ? (
              <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Receipt size={24} className="text-green-600" />
                  <h3 className="text-xl font-bold text-gray-900">Complete Expense Info</h3>
                </div>

                <div className="space-y-4">
                  {/* Extracted Data Display */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <p className="text-sm font-semibold text-green-900 mb-2">✓ Extracted from Receipt:</p>
                    <div className="text-sm text-green-800 space-y-1">
                      {extractedData.data.vendor && <p>• Vendor: {extractedData.data.vendor}</p>}
                      {extractedData.data.amount && <p>• Amount: ${extractedData.data.amount}</p>}
                      {extractedData.data.date && <p>• Date: {extractedData.data.date}</p>}
                      {extractedData.data.items && extractedData.data.items.length > 0 && (
                        <p>• Items: {extractedData.data.items.length} item(s)</p>
                      )}
                    </div>
                  </div>

                  {/* Additional Fields */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      value={additionalData.category}
                      onChange={(e) => setAdditionalData({ ...additionalData, category: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    >
                      <option value="">Select category...</option>
                      <option value="Meals">Meals & Entertainment</option>
                      <option value="Transportation">Transportation</option>
                      <option value="Lodging">Lodging</option>
                      <option value="Office Supplies">Office Supplies</option>
                      <option value="Software">Software & Subscriptions</option>
                      <option value="Travel">Travel</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Employee ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={additionalData.employeeId}
                      onChange={(e) => setAdditionalData({ ...additionalData, employeeId: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="EMP-12345"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                    <textarea
                      value={additionalData.notes}
                      onChange={(e) => setAdditionalData({ ...additionalData, notes: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Add any additional notes..."
                      rows={3}
                    />
                  </div>

                  <button
                    onClick={handleCreateExpense}
                    disabled={creating || !additionalData.category}
                    className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        Recording Expense...
                      </>
                    ) : (
                      <>
                        <Receipt size={20} />
                        Record Expense
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg border-2 border-dashed border-gray-300 p-12 text-center h-full flex flex-col items-center justify-center">
                <Receipt className="text-gray-400 mb-4" size={64} />
                <p className="text-gray-600 text-lg">Scan a receipt to get started</p>
                <p className="text-gray-500 text-sm mt-2">Expense data will be extracted automatically</p>
              </div>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-6 shadow-md">
            <h4 className="font-semibold text-gray-900 mb-2">Instant Extraction</h4>
            <p className="text-sm text-gray-600">
              AI extracts vendor, amount, date, items, and tax in seconds
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-md">
            <h4 className="font-semibold text-gray-900 mb-2">Auto-Categorization</h4>
            <p className="text-sm text-gray-600">
              Automatically suggests expense categories based on vendor
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-md">
            <h4 className="font-semibold text-gray-900 mb-2">Workflow Integration</h4>
            <p className="text-sm text-gray-600">
              Expenses automatically routed for approval based on amount
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
