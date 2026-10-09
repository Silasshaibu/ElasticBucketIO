import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { HardDrive, ArrowLeft, FileQuestion } from 'lucide-react';

export default function NotFound() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-2xl mb-6">
          <FileQuestion className="w-10 h-10 text-gray-400" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
        <p className="text-gray-500 mb-8">Page not found. The file you're looking for doesn't exist.</p>
        <Link
          to={user ? '/files' : '/login'}
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          {user ? 'Back to Files' : 'Go to Login'}
        </Link>
      </div>
    </div>
  );
}
