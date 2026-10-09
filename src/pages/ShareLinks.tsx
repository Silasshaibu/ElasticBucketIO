import React from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { formatBytes } from '../services/storage';
import { Share2, Copy, Check, Trash2, ExternalLink, Clock, Download } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useState } from 'react';

export default function ShareLinks() {
  const { data, revokeShareLink } = useData();
  const { user } = useAuth();
  const [copied, setCopied] = useState<string | null>(null);

  if (!user) return null;

  const userLinks = data.shareLinks.filter(l => l.createdBy === user.id && !l.revokedAt);
  const revokedLinks = data.shareLinks.filter(l => l.createdBy === user.id && l.revokedAt);

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/s/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  const getFileName = (fileId: string) => {
    const file = data.files.find(f => f.id === fileId);
    return file?.name || 'Unknown file';
  };

  const getFileSize = (fileId: string) => {
    const file = data.files.find(f => f.id === fileId);
    return file ? formatBytes(file.sizeBytes) : '—';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Share Links</h1>
        <p className="text-gray-500 mt-1">Manage links you've created for sharing files</p>
      </div>

      {/* Active links */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Active Links</h3>
        </div>
        {userLinks.length === 0 ? (
          <div className="p-8 text-center">
            <Share2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No active share links</p>
            <p className="text-sm text-gray-400 mt-1">Create share links from the Files page</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {userLinks.map(link => {
              const isExpired = new Date(link.expiresAt) < new Date();
              return (
                <div key={link.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{getFileName(link.fileId)}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {isExpired ? 'Expired' : `Expires ${formatDistanceToNow(new Date(link.expiresAt), { addSuffix: true })}`}
                        </span>
                        <span className="flex items-center gap-1">
                          <Download className="w-3 h-3" />
                          {link.downloadCount}{link.maxDownloads ? ` / ${link.maxDownloads}` : ''} downloads
                        </span>
                        <span>{getFileSize(link.fileId)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => copyLink(link.token)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                      >
                        {copied === link.token ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied === link.token ? 'Copied!' : 'Copy'}
                      </button>
                      <button
                        onClick={() => revokeShareLink(link.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Revoke
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Revoked links */}
      {revokedLinks.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Revoked Links</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {revokedLinks.map(link => (
              <div key={link.id} className="px-6 py-4 opacity-60">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 line-through">{getFileName(link.fileId)}</p>
                    <p className="text-xs text-gray-400 mt-1">Revoked {format(new Date(link.revokedAt!), 'MMM d, yyyy')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
