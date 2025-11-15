'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Clock, Users, DollarSign, Loader2 } from 'lucide-react';

interface ReviewRequest {
  id: string;
  workflowExecutionId: string;
  workflowType: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  data: any;
  flags: string[];
  reason: string;
  confidence?: number;
}

export default function WorkflowApprovalsPage() {
  const [reviews, setReviews] = useState<ReviewRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedReview, setSelectedReview] = useState<ReviewRequest | null>(null);

  useEffect(() => {
    loadPendingReviews();
  }, []);

  const loadPendingReviews = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/workflows/reviews');
      const data = await response.json();

      if (data.success) {
        setReviews(data.reviews);
      }
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (reviewId: string) => {
    setProcessing(reviewId);

    try {
      const response = await fetch('/api/workflows/reviews/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewId,
          decision: 'approved',
          reviewer: 'admin@company.com',
          notes: 'Approved via dashboard',
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Remove from list
        setReviews(reviews.filter((r) => r.id !== reviewId));
        setSelectedReview(null);
        alert('Workflow approved and executed successfully!');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Approval failed:', error);
      alert('Failed to approve workflow');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (reviewId: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    setProcessing(reviewId);

    try {
      const response = await fetch('/api/workflows/reviews/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewId,
          decision: 'rejected',
          reviewer: 'admin@company.com',
          notes: reason,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Remove from list
        setReviews(reviews.filter((r) => r.id !== reviewId));
        setSelectedReview(null);
        alert('Workflow rejected successfully!');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Rejection failed:', error);
      alert('Failed to reject workflow');
    } finally {
      setProcessing(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getWorkflowTypeLabel = (type: string) => {
    switch (type) {
      case 'payroll-approval':
        return 'Payroll Approval';
      case 'employee-onboarding':
        return 'Employee Onboarding';
      case 'expense-approval':
        return 'Expense Approval';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <Loader2 className="inline animate-spin text-purple-600 mb-4" size={48} />
            <p className="text-gray-600">Loading pending approvals...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Workflow Approvals Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Review and approve pending workflows with AI-powered decision support
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="flex items-center gap-3">
              <Clock className="text-purple-600" size={32} />
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{reviews.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-orange-600" size={32} />
              <div>
                <p className="text-sm text-gray-600">High Priority</p>
                <p className="text-2xl font-bold text-gray-900">
                  {reviews.filter((r) => r.priority === 'high' || r.priority === 'critical').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="flex items-center gap-3">
              <DollarSign className="text-green-600" size={32} />
              <div>
                <p className="text-sm text-gray-600">Payroll</p>
                <p className="text-2xl font-bold text-gray-900">
                  {reviews.filter((r) => r.workflowType === 'payroll-approval').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="flex items-center gap-3">
              <Users className="text-blue-600" size={32} />
              <div>
                <p className="text-sm text-gray-600">Onboarding</p>
                <p className="text-2xl font-bold text-gray-900">
                  {reviews.filter((r) => r.workflowType === 'employee-onboarding').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {reviews.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <CheckCircle className="mx-auto text-green-600 mb-4" size={64} />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">All Clear!</h2>
            <p className="text-gray-600">No pending workflow approvals at this time.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Reviews List */}
            <div className="lg:col-span-1 space-y-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Pending Reviews</h2>
              {reviews.map((review) => (
                <div
                  key={review.id}
                  onClick={() => setSelectedReview(review)}
                  className={`bg-white rounded-lg shadow-md p-4 cursor-pointer transition-all hover:shadow-lg border-2 ${
                    selectedReview?.id === review.id ? 'border-purple-500' : 'border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {getWorkflowTypeLabel(review.workflowType)}
                      </h3>
                      <p className="text-sm text-gray-600">{review.reason}</p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(review.priority)}`}
                    >
                      {review.priority.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                    <Clock size={12} />
                    {new Date(review.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            {/* Review Details */}
            <div className="lg:col-span-2">
              {selectedReview ? (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        {getWorkflowTypeLabel(selectedReview.workflowType)}
                      </h2>
                      <p className="text-gray-600">{selectedReview.reason}</p>
                    </div>
                    <span
                      className={`px-3 py-1 text-sm font-medium rounded-full border ${getPriorityColor(
                        selectedReview.priority
                      )}`}
                    >
                      {selectedReview.priority.toUpperCase()}
                    </span>
                  </div>

                  {/* Flags */}
                  {selectedReview.flags && selectedReview.flags.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-gray-900 mb-3">Flags Raised:</h3>
                      <div className="space-y-2">
                        {selectedReview.flags.map((flag, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                          >
                            <AlertTriangle className="text-yellow-600" size={16} />
                            <span className="text-sm text-yellow-900">{flag}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Confidence Score */}
                  {selectedReview.confidence !== undefined && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-gray-900 mb-3">AI Confidence Score:</h3>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 bg-gray-200 rounded-full h-4">
                          <div
                            className="bg-purple-600 h-4 rounded-full transition-all"
                            style={{ width: `${selectedReview.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-lg font-bold text-purple-600">
                          {(selectedReview.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Data Details */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-3">Workflow Data:</h3>
                    {selectedReview.workflowType === 'payroll-approval' && selectedReview.data.employees && (
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <span className="text-sm text-gray-600">Total Amount:</span>
                            <p className="text-xl font-bold text-green-600">
                              ${selectedReview.data.totalAmount?.toLocaleString() || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">Employees:</span>
                            <p className="text-xl font-bold text-gray-900">
                              {selectedReview.data.employees.length}
                            </p>
                          </div>
                        </div>
                        {selectedReview.data.payPeriod && (
                          <div>
                            <span className="text-sm text-gray-600">Pay Period:</span>
                            <p className="text-sm font-medium text-gray-900">
                              {selectedReview.data.payPeriod.start} to {selectedReview.data.payPeriod.end}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {selectedReview.workflowType === 'employee-onboarding' && (
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="space-y-2">
                          {selectedReview.data.employeeData?.name && (
                            <div>
                              <span className="text-sm text-gray-600">Name:</span>
                              <p className="font-medium text-gray-900">
                                {selectedReview.data.employeeData.name}
                              </p>
                            </div>
                          )}
                          {selectedReview.data.employeeData?.email && (
                            <div>
                              <span className="text-sm text-gray-600">Email:</span>
                              <p className="font-medium text-gray-900">
                                {selectedReview.data.employeeData.email}
                              </p>
                            </div>
                          )}
                          {selectedReview.data.employeeData?.role && (
                            <div>
                              <span className="text-sm text-gray-600">Role:</span>
                              <p className="font-medium text-gray-900">
                                {selectedReview.data.employeeData.role}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleApprove(selectedReview.id)}
                      disabled={processing !== null}
                      className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      {processing === selectedReview.id ? (
                        <>
                          <Loader2 className="animate-spin" size={20} />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={20} />
                          Approve & Execute
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleReject(selectedReview.id)}
                      disabled={processing !== null}
                      className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      <XCircle size={20} />
                      Reject
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                  <AlertTriangle className="mx-auto text-gray-400 mb-4" size={64} />
                  <p className="text-gray-600 text-lg">Select a review to view details</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="mt-12 bg-white rounded-lg shadow-md p-6">
          <h3 className="font-semibold text-gray-900 mb-4">How Workflow Approvals Work:</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium text-purple-600 mb-2">1. AI Analysis</h4>
              <p className="text-sm text-gray-600">
                Workflows are analyzed by AI decision logic that checks thresholds, validates data, and
                identifies potential issues
              </p>
            </div>
            <div>
              <h4 className="font-medium text-purple-600 mb-2">2. Human Review</h4>
              <p className="text-sm text-gray-600">
                Flagged workflows require human approval before execution. You can see exactly why each
                workflow was flagged
              </p>
            </div>
            <div>
              <h4 className="font-medium text-purple-600 mb-2">3. Audit Trail</h4>
              <p className="text-sm text-gray-600">
                Every decision is logged with complete provenance including who approved/rejected and when
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
