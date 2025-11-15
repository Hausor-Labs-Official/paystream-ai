'use client';

import { useState, useRef } from 'react';
import { Upload, Camera, FileText, Loader2, CheckCircle, XCircle } from 'lucide-react';

interface DocumentScannerProps {
  documentType: 'id_card' | 'invoice' | 'receipt' | 'w2';
  onScanComplete: (data: any) => void;
  title?: string;
  description?: string;
}

export function DocumentScanner({ documentType, onScanComplete, title, description }: DocumentScannerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPEG, WEBP)');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setResult(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleScan = async () => {
    if (!file || !preview) return;

    setScanning(true);
    setError(null);

    try {
      // Convert to base64 without data URL prefix
      const base64 = preview.split(',')[1];

      const response = await fetch('/api/scan/document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64,
          mimeType: file.type,
          documentType,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Include the original image preview in the result
        const resultWithImage = {
          ...data,
          image: preview, // Include full data URL for use in parent components
        };
        setResult(resultWithImage);
        onScanComplete(resultWithImage);
      } else {
        setError(data.error || 'Failed to scan document');
      }
    } catch (err) {
      setError('An error occurred while scanning the document');
      console.error(err);
    } finally {
      setScanning(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getDocumentTypeLabel = () => {
    switch (documentType) {
      case 'id_card':
        return 'ID Card / Driver License';
      case 'invoice':
        return 'Invoice';
      case 'receipt':
        return 'Receipt';
      case 'w2':
        return 'W-2 Tax Form';
      default:
        return 'Document';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <div className="flex items-center gap-3 text-white">
            <Camera size={24} />
            <div>
              <h3 className="text-xl font-bold">{title || `Scan ${getDocumentTypeLabel()}`}</h3>
              {description && <p className="text-blue-100 text-sm mt-1">{description}</p>}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {!preview && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-400 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-700 font-medium mb-2">Click to upload {getDocumentTypeLabel()}</p>
                <p className="text-sm text-gray-500">PNG, JPEG, WEBP up to 10MB</p>
              </label>
            </div>
          )}

          {preview && !result && (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={preview}
                  alt="Document preview"
                  className="w-full rounded-lg border-2 border-gray-200 max-h-96 object-contain bg-gray-50"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleScan}
                  disabled={scanning}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {scanning ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Scanning with AI...
                    </>
                  ) : (
                    <>
                      <FileText size={20} />
                      Scan Document
                    </>
                  )}
                </button>
                <button
                  onClick={handleReset}
                  disabled={scanning}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="text-green-600" size={24} />
                <div>
                  <p className="font-semibold text-green-900">Scan Complete!</p>
                  <p className="text-sm text-green-700">
                    Confidence: {result.confidence}% | {Object.keys(result.data).length} fields extracted
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-3">Extracted Data:</h4>
                <div className="space-y-2">
                  {Object.entries(result.data).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-2 border-b border-gray-200 last:border-0">
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {key.replace(/_/g, ' ')}:
                      </span>
                      <span className="text-sm text-gray-900 font-mono">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleReset}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Scan Another Document
              </button>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <XCircle className="text-red-600" size={24} />
              <div>
                <p className="font-semibold text-red-900">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
