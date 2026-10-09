import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { formatBytes, getBackendTypeLabel } from '../services/storage';
import { HardDrive, Download, AlertCircle, Clock, CheckCircle } from 'lucide-react';

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const { resolveShareLink, data } = useData();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [backendName, setBackendName] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid link');
      return;
    }

    const result = resolveShareLink(token);
    if (result.file && result.backend) {
      setFileName(result.file.name);
      setFileSize(formatBytes(result.file.sizeBytes));
      setBackendName(result.backend.name);
      setStatus('ready');
    } else {
      setStatus('error');
      setMessage(result.message);
    }
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4">
            <HardDrive className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">StaffDrive</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {status === 'loading' && (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Resolving link...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Link Unavailable</h2>
              <p className="text-gray-500 mt-2">{message}</p>
            </div>
          )}

          {status === 'ready' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">File Ready</h2>
              <p className="text-gray-600 font-medium truncate mb-4">{fileName}</p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Size</span>
                  <span className="text-gray-900 font-medium">{fileSize}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  // Simulate download - in real app this would redirect to presigned URL
                  alert(`In production, this would redirect to a presigned download URL from the "${backendName}" backend.\n\nThe browser downloads directly from the storage provider - files never pass through the server.`);
                }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-all"
              >
                <Download className="w-5 h-5" />
                Download File
              </button>

              <p className="text-xs text-gray-400 mt-4">
                Files are served directly from S3-compatible storage via presigned URLs
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
