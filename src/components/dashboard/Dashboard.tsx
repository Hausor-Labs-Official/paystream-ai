'use client';

import { useState } from 'react';
import { Employee } from '@/lib/supabase';

interface DashboardProps {
  initialEmployees: Employee[];
}

export default function Dashboard({ initialEmployees }: DashboardProps) {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [processingResult, setProcessingResult] = useState<any>(null);

  const handleRunPayroll = async () => {
    if (!confirm('Are you sure you want to process payroll for all pending employees?')) {
      return;
    }

    setIsProcessing(true);
    setProcessingResult(null);

    try {
      const response = await fetch('/api/payroll', {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        setProcessingResult(result);
        // Refresh employees
        const refreshResponse = await fetch('/api/employees');
        const refreshData = await refreshResponse.json();
        setEmployees(refreshData.employees || []);
      } else {
        alert(`Payroll processing failed: ${result.error || result.message}`);
      }
    } catch (error) {
      alert(`Error: ${(error as Error).message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/onboard', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        alert(`Successfully onboarded ${result.count} employees!`);
        // Refresh employees
        const refreshResponse = await fetch('/api/employees');
        const refreshData = await refreshResponse.json();
        setEmployees(refreshData.employees || []);
        setShowOnboardModal(false);
      } else {
        alert(`Onboarding failed: ${result.error}`);
      }
    } catch (error) {
      alert(`Error: ${(error as Error).message}`);
    }
  };

  const pendingCount = employees.filter((e) => e.status === 'pending').length;
  const paidCount = employees.filter((e) => e.status === 'paid').length;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          Paystream AI Dashboard
        </h1>
        <p style={{ color: '#666' }}>AI-powered payroll on Arc Testnet with USDC</p>
      </div>

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div
          style={{
            padding: '1.5rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderRadius: '10px',
          }}
        >
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{employees.length}</div>
          <div style={{ opacity: 0.9 }}>Total Employees</div>
        </div>

        <div
          style={{
            padding: '1.5rem',
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white',
            borderRadius: '10px',
          }}
        >
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{pendingCount}</div>
          <div style={{ opacity: 0.9 }}>Pending Payment</div>
        </div>

        <div
          style={{
            padding: '1.5rem',
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            color: 'white',
            borderRadius: '10px',
          }}
        >
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{paidCount}</div>
          <div style={{ opacity: 0.9 }}>Paid</div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button
          onClick={() => setShowOnboardModal(true)}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Onboard CSV
        </button>

        <button
          onClick={handleRunPayroll}
          disabled={isProcessing || pendingCount === 0}
          style={{
            padding: '0.75rem 1.5rem',
            background: pendingCount === 0 ? '#ccc' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: pendingCount === 0 ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
          }}
        >
          {isProcessing ? 'Processing...' : `Run Payroll (${pendingCount})`}
        </button>
      </div>

      {/* Processing Result */}
      {processingResult && (
        <div
          style={{
            padding: '1.5rem',
            background: '#f0fdf4',
            border: '2px solid #10b981',
            borderRadius: '10px',
            marginBottom: '2rem',
          }}
        >
          <h3 style={{ color: '#10b981', marginBottom: '1rem' }}>
            Payroll Processing Complete!
          </h3>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>Paid:</strong> {processingResult.paid} employees
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>Total Amount:</strong> ${processingResult.totalPaid?.toFixed(2)} USDC
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>Transaction:</strong>{' '}
            <code style={{ fontSize: '0.9em' }}>{processingResult.tx}</code>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>Block:</strong> {processingResult.blockNumber}
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <strong>Emails Sent:</strong> {processingResult.emailsSent}
          </div>
          <a
            href={processingResult.explorer}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              padding: '0.5rem 1rem',
              background: '#10b981',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '5px',
            }}
          >
            View on Arc Explorer →
          </a>
        </div>
      )}

      {/* Employees Table */}
      <div style={{ background: 'white', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Name</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Email</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Wallet</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Salary</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
                  No employees yet. Upload a CSV to get started.
                </td>
              </tr>
            ) : (
              employees.map((employee) => (
                <tr
                  key={employee.id}
                  className="border-b border-border"
                >
                  <td style={{ padding: '1rem' }}>{employee.name}</td>
                  <td style={{ padding: '1rem', fontSize: '0.9em' }}>{employee.email}</td>
                  <td style={{ padding: '1rem', fontSize: '0.8em', fontFamily: 'monospace' }}>
                    {employee.wallet_address ? (
                      <span title={employee.wallet_address}>
                        {employee.wallet_address.slice(0, 6)}...{employee.wallet_address.slice(-4)}
                      </span>
                    ) : (
                      <span style={{ color: '#999' }}>No wallet</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    ${employee.salary_usd?.toLocaleString() || '—'}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '999px',
                        fontSize: '0.85em',
                        fontWeight: 'bold',
                        background:
                          employee.status === 'paid'
                            ? '#d1fae5'
                            : employee.status === 'pending'
                            ? '#fee2e2'
                            : '#e5e7eb',
                        color:
                          employee.status === 'paid'
                            ? '#065f46'
                            : employee.status === 'pending'
                            ? '#991b1b'
                            : '#374151',
                      }}
                    >
                      {employee.status || 'unknown'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Onboard Modal */}
      {showOnboardModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowOnboardModal(false)}
        >
          <div
            style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '10px',
              maxWidth: '500px',
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: '1rem' }}>Onboard Employees</h2>
            <p style={{ marginBottom: '1.5rem', color: '#666' }}>
              Upload a CSV file with employee data. Required columns: name, email, salary_usd
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px dashed #667eea',
                borderRadius: '5px',
                cursor: 'pointer',
              }}
            />
            <div style={{ marginTop: '1rem', textAlign: 'right' }}>
              <button
                onClick={() => setShowOnboardModal(false)}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#e5e7eb',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
