import React from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { formatBytes, getStoragePercentage, getTotalAllocatedQuota, getTotalUsed, getEffectiveCap, getBackendTypeLabel, getBackendTypeColor } from '../services/storage';
import { Users, HardDrive, Server, AlertTriangle, TrendingUp, Database, Shield } from 'lucide-react';

const GLOBAL_QUOTA_CAP = 107374182400; // 100 GB

export default function Dashboard() {
  const { data } = useData();
  const { user } = useAuth();

  if (user?.role !== 'admin') return null;

  const totalUsers = data.users.filter(u => u.role === 'staff').length;
  const activeUsers = data.users.filter(u => u.role === 'staff' && u.isActive).length;
  const totalUsed = getTotalUsed(data);
  const totalAllocated = getTotalAllocatedQuota(data);
  const effectiveCap = getEffectiveCap(data, GLOBAL_QUOTA_CAP);
  const enabledBackends = data.backends.filter(b => b.enabled);
  const totalBackendCapacity = enabledBackends.reduce((s, b) => s + b.capacityBytes, 0);
  const totalBackendUsed = enabledBackends.reduce((s, b) => s + b.usedBytes, 0);
  const overAllocated = totalAllocated > effectiveCap;
  const totalFiles = data.files.filter(f => f.status === 'ready').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your StaffDrive instance</p>
      </div>

      {/* Warning if over-allocated */}
      {overAllocated && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Quota over-allocation warning</p>
            <p className="text-sm text-amber-700 mt-1">
              Total allocated quotas ({formatBytes(totalAllocated)}) exceed the effective capacity ({formatBytes(effectiveCap)}).
              You may not be able to accept all uploads.
            </p>
          </div>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Staff Users"
          value={`${activeUsers} / ${totalUsers}`}
          sublabel="active / total"
          color="indigo"
        />
        <StatCard
          icon={Database}
          label="Total Files"
          value={totalFiles.toString()}
          sublabel={`${formatBytes(totalUsed)} stored`}
          color="blue"
        />
        <StatCard
          icon={HardDrive}
          label="Storage Used"
          value={formatBytes(totalUsed)}
          sublabel={`of ${formatBytes(effectiveCap)} capacity`}
          color="green"
        />
        <StatCard
          icon={Server}
          label="Backends"
          value={`${enabledBackends.length} / ${data.backends.length}`}
          sublabel="enabled / total"
          color="purple"
        />
      </div>

      {/* Storage overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quota allocation */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-gray-900">Quota Allocation</h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-600">Allocated to users</span>
                <span className="font-medium text-gray-900">{formatBytes(totalAllocated)}</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${overAllocated ? 'bg-red-500' : 'bg-indigo-500'}`}
                  style={{ width: `${Math.min(100, (totalAllocated / effectiveCap) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {((totalAllocated / effectiveCap) * 100).toFixed(1)}% of {formatBytes(effectiveCap)} effective cap
              </p>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-600">Actually used</span>
                <span className="font-medium text-gray-900">{formatBytes(totalUsed)}</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (totalUsed / totalAllocated) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {((totalUsed / totalAllocated) * 100).toFixed(1)}% of allocated
              </p>
            </div>
          </div>
        </div>

        {/* Backend summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Server className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Storage Backends</h3>
          </div>
          <div className="space-y-3">
            {data.backends.map(backend => {
              const usedPct = getStoragePercentage(backend.usedBytes, backend.capacityBytes);
              return (
                <div key={backend.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getBackendTypeColor(backend.type)}`}>
                        {getBackendTypeLabel(backend.type)}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{backend.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {backend.enabled ? (
                        <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">Active</span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">Disabled</span>
                      )}
                      {backend.acceptsUploads && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">Uploads</span>
                      )}
                    </div>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${usedPct > 90 ? 'bg-red-500' : usedPct > 70 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                      style={{ width: `${usedPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5 text-xs text-gray-500">
                    <span>{formatBytes(backend.usedBytes)} used</span>
                    <span>{formatBytes(backend.capacityBytes)} capacity</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* User storage table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">User Storage</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Storage Used</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quota</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.users.filter(u => u.role === 'staff').map(u => {
                const pct = getStoragePercentage(u.usedBytes, u.quotaBytes);
                return (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{u.name}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{formatBytes(u.usedBytes)}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{formatBytes(u.quotaBytes)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{pct.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {u.isActive ? (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">Active</span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">Disabled</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sublabel, color }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sublabel: string;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-400">{sublabel}</p>
        </div>
      </div>
    </div>
  );
}
