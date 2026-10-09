import React from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { formatBytes } from '../services/storage';
import { TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

export default function QuotaEvents() {
  const { data } = useData();
  const { user } = useAuth();

  if (user?.role !== 'admin') return null;

  const getUserName = (userId: string) => {
    const u = data.users.find(u => u.id === userId);
    return u?.name || userId;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quota Changes</h1>
        <p className="text-gray-500 mt-1">History of all storage quota modifications</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {data.quotaEvents.length === 0 ? (
          <div className="p-8 text-center">
            <TrendingUp className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No quota changes recorded yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {[...data.quotaEvents].reverse().map(event => {
              const increased = event.newQuota > event.oldQuota;
              return (
                <div key={event.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${increased ? 'bg-green-100' : 'bg-red-100'}`}>
                        {increased ? <ArrowUp className="w-4 h-4 text-green-600" /> : <ArrowDown className="w-4 h-4 text-red-600" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {getUserName(event.userId)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatBytes(event.oldQuota)} → {formatBytes(event.newQuota)}
                          <span className="ml-2 text-gray-400">({increased ? '+' : ''}{formatBytes(event.newQuota - event.oldQuota)})</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{event.reason}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
