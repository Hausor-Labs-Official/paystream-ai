'use client';

import { useState } from 'react';
import { DocumentScanner } from '@/components/DocumentScanner';
import { CheckCircle, UserPlus, Loader2 } from 'lucide-react';

export default function IDScanOnboardingPage() {
  const [extractedData, setExtractedData] = useState<any>(null);
  const [additionalData, setAdditionalData] = useState({
    email: '',
    salary_annual: '',
    department: '',
    role: '',
  });
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [employee, setEmployee] = useState<any>(null);

  const handleScanComplete = (data: any) => {
    setExtractedData(data);

    // Auto-fill email if name is available
    if (data.data.fullName) {
      const email = data.data.fullName.toLowerCase().replace(/\s+/g, '.') + '@company.com';
      setAdditionalData((prev) => ({ ...prev, email }));
    }
  };

  const handleCreateEmployee = async () => {
    if (!extractedData) return;

    setCreating(true);

    try {
      const response = await fetch('/api/employees/onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idCardImage: extractedData.image, // This would need to be passed from scanner
          idCardMimeType: 'image/jpeg',
          additionalData: {
            email: additionalData.email,
            salary_annual: parseFloat(additionalData.salary_annual) || 0,
            department: additionalData.department || 'General',
            role: additionalData.role || 'Employee',
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCreated(true);
        setEmployee(data.employee);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error creating employee:', error);
      alert('Failed to create employee');
    } finally {
      setCreating(false);
    }
  };

  const handleReset = () => {
    setExtractedData(null);
    setAdditionalData({
      email: '',
      salary_annual: '',
      department: '',
      role: '',
    });
    setCreated(false);
    setEmployee(null);
  };

  if (created && employee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            <CheckCircle className="mx-auto text-green-600 mb-4" size={64} />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Onboarded!</h1>
            <p className="text-gray-600 mb-6">
              {employee.name} has been successfully added to PayStream AI
            </p>

            <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
              <h3 className="font-semibold text-gray-900 mb-4">Employee Details:</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">Name:</span>
                  <p className="font-medium text-gray-900">{employee.name}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Email:</span>
                  <p className="font-medium text-gray-900">{employee.email}</p>
                </div>
                {employee.dateOfBirth && (
                  <div>
                    <span className="text-sm text-gray-600">Date of Birth:</span>
                    <p className="font-medium text-gray-900">{employee.dateOfBirth}</p>
                  </div>
                )}
                {employee.address && (
                  <div>
                    <span className="text-sm text-gray-600">Address:</span>
                    <p className="font-medium text-gray-900">{employee.address}</p>
                  </div>
                )}
                <div>
                  <span className="text-sm text-gray-600">Department:</span>
                  <p className="font-medium text-gray-900">{employee.department}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Role:</span>
                  <p className="font-medium text-gray-900">{employee.role}</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Onboard Another Employee
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Employee Onboarding with ID Scan
          </h1>
          <p className="text-lg text-gray-600">
            Scan an ID card to automatically extract employee information
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Scanner Column */}
          <div>
            <DocumentScanner
              documentType="id_card"
              onScanComplete={handleScanComplete}
              title="Scan ID Card"
              description="Upload a driver's license, passport, or national ID"
            />
          </div>

          {/* Form Column */}
          <div>
            {extractedData ? (
              <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <UserPlus size={24} className="text-blue-600" />
                  <h3 className="text-xl font-bold text-gray-900">Complete Employee Info</h3>
                </div>

                <div className="space-y-4">
                  {/* Extracted Data Display */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <p className="text-sm font-semibold text-green-900 mb-2">✓ Extracted from ID:</p>
                    <div className="text-sm text-green-800 space-y-1">
                      {extractedData.data.fullName && <p>• Name: {extractedData.data.fullName}</p>}
                      {extractedData.data.dateOfBirth && <p>• DOB: {extractedData.data.dateOfBirth}</p>}
                      {extractedData.data.address && <p>• Address: {extractedData.data.address}</p>}
                    </div>
                  </div>

                  {/* Additional Fields */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={additionalData.email}
                      onChange={(e) => setAdditionalData({ ...additionalData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="john.doe@company.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Annual Salary *
                    </label>
                    <input
                      type="number"
                      value={additionalData.salary_annual}
                      onChange={(e) => setAdditionalData({ ...additionalData, salary_annual: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="75000"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                    <input
                      type="text"
                      value={additionalData.department}
                      onChange={(e) => setAdditionalData({ ...additionalData, department: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Engineering"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Role / Title</label>
                    <input
                      type="text"
                      value={additionalData.role}
                      onChange={(e) => setAdditionalData({ ...additionalData, role: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Software Engineer"
                    />
                  </div>

                  <button
                    onClick={handleCreateEmployee}
                    disabled={creating || !additionalData.email || !additionalData.salary_annual}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        Creating Employee...
                      </>
                    ) : (
                      <>
                        <UserPlus size={20} />
                        Create Employee
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg border-2 border-dashed border-gray-300 p-12 text-center h-full flex flex-col items-center justify-center">
                <UserPlus className="text-gray-400 mb-4" size={64} />
                <p className="text-gray-600 text-lg">Scan an ID card to get started</p>
                <p className="text-gray-500 text-sm mt-2">Employee data will be extracted automatically</p>
              </div>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-6 shadow-md">
            <h4 className="font-semibold text-gray-900 mb-2">⚡ Instant Extraction</h4>
            <p className="text-sm text-gray-600">
              AI extracts name, DOB, address, and ID number in seconds
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-md">
            <h4 className="font-semibold text-gray-900 mb-2">✅ Auto-Validation</h4>
            <p className="text-sm text-gray-600">
              Automatically validates email format, salary ranges, and duplicates
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-md">
            <h4 className="font-semibold text-gray-900 mb-2">🔍 Semantic Search</h4>
            <p className="text-sm text-gray-600">
              Employee synced to vector database for intelligent search
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
