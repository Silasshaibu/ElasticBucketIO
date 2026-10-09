import React from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Shield, User, Server, FileText, Key } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function AuditLog() {
  const { data } = useData();
  const { user } = useAuth();

  if (user?.role !== 'admin') return null;

  const getActionIcon = (action: string) => {
    if (action.includes('user')) return <User className="w-4 h-4 text-blue-500" />;
    if (action.includes('backend')) return <Server className="w-4 h-4 text-purple-500" />;
    if (action.includes('file')) return <FileText className="w-4 h-4 text-green-500" />;
    if (action.includes('password') || action.includes('quota')) return <Key className="w-4 h-4 text-amber-500" />;
    return <Shield className="w-4 h-4 text-gray-500" />;
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'user.created': 'Created user',
      'user.deleted': 'Deleted user',
      'user.disabled': 'Disabled user',
      'user.enabled': 'Enabled user',
      'user.password_reset': 'Reset password',
      'quota.changed': 'Changed quota',
      'backend.created': 'Added backend',
      'backend.updated': 'Updated backend',
      'backend.enabled': 'Enabled backend',
      'backend.disabled': 'Disabled backend',
      'file.uploaded': 'Uploaded file',
      'file.deleted': 'Deleted file',
    };
    return labels[action] || action;
  };

  const getActorName = (actorId: string) => {
    if (actorId === 'admin') return 'Admin';
    const u = data.users.find(u => u.id === actorId);
    return u?.name || actorId;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-gray-500 mt-1">Track all administrative actions and changes</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {data.auditLog.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Shield className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p>No audit events yet</p>
            </div>
          ) : (
            [...data.auditLog].reverse().map(entry => (
              <div key={entry.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  {getActionIcon(entry.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{getActionLabel(entry.action)}</span>
                    <span className="text-xs text-gray-400">by {getActorName(entry.actorId)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {entry.targetType.replace('_', ' ')} • {entry.ip}
                  </p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
