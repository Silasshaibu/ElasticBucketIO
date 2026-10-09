import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { formatBytes, getStoragePercentage, getBackendTypeLabel, getBackendTypeColor } from '../services/storage';
import {
  Server, Plus, Settings, TestTube, Power, PowerOff, AlertTriangle,
  CheckCircle, XCircle, Loader2, Cloud, Database, HardDrive, Globe
} from 'lucide-react';
import { BackendType } from '../types';

const BACKEND_PRESETS: Record<string, {
  type: BackendType;
  endpointPattern: string;
  region: string;
  forcePathStyle: boolean;
  defaultPriority: number;
  credentialsRef: string;
  notes: string;
}> = {
  r2: {
    type: 'r2',
    endpointPattern: 'https://<ACCOUNT_ID>.r2.cloudflarestorage.com',
    region: 'auto',
    forcePathStyle: false,
    defaultPriority: 10,
    credentialsRef: 'BACKEND_R2',
    notes: 'Cloudflare R2 - Free egress. Set CORS on the bucket.',
  },
  oci: {
    type: 'oci_s3',
    endpointPattern: 'https://<namespace>.compat.objectstorage.<region>.oraclecloud.com',
    region: 'us-ashburn-1',
    forcePathStyle: true,
    defaultPriority: 20,
    credentialsRef: 'BACKEND_OCI',
    notes: 'Oracle Cloud - CORS headers are fixed and cannot be edited. Direct uploads may not work.',
  },
  b2: {
    type: 'b2_s3',
    endpointPattern: 'https://s3.<region>.backblazeb2.com',
    region: 'us-west-004',
    forcePathStyle: true,
    defaultPriority: 30,
    credentialsRef: 'BACKEND_B2',
    notes: 'Backblaze B2 - Configure CORS with PutBucketCors. Use application key limited to one bucket.',
  },
  wasabi: {
    type: 'wasabi',
    endpointPattern: 'https://s3.<region>.wasabisys.com',
    region: 'eu-central-1',
    forcePathStyle: false,
    defaultPriority: 40,
    credentialsRef: 'BACKEND_WASABI',
    notes: 'Wasabi - 1 TB minimum charge, 90-day minimum retention. Best for cold/overflow storage.',
  },
};

export default function AdminBackends() {
  const { data, addBackend, updateBackend, testBackend, enableBackend, disableBackend } = useData();
  const { user } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);

  if (user?.role !== 'admin') return null;

  const handleTest = async (id: string) => {
    setTesting(id);
    // Simulate test delay
    await new Promise(r => setTimeout(r, 1500));
    const result = testBackend(id);
    setTestResult({ id, success: result.success, message: result.message });
    setTesting(null);
    setTimeout(() => setTestResult(null), 5000);
  };

  const handleEnable = (id: string) => {
    const backend = data.backends.find(b => b.id === id);
    if (!backend?.lastTestOk) {
      alert('Backend must pass connection test before enabling.');
      return;
    }
    enableBackend(id);
  };

  const handleDisable = (id: string) => {
    const backend = data.backends.find(b => b.id === id);
    if (!backend) return;
    
    const filesOnBackend = data.files.filter(f => f.backendId === id && f.status === 'ready');
    if (filesOnBackend.length > 0) {
      const totalBytes = filesOnBackend.reduce((s, f) => s + f.sizeBytes, 0);
      if (!confirm(`${filesOnBackend.length} files (${formatBytes(totalBytes)}) will become unavailable until you re-enable this backend. Continue?`)) {
        return;
      }
    }
    disableBackend(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Storage Backends</h1>
          <p className="text-gray-500 mt-1">Manage S3-compatible storage providers</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          Add Backend
        </button>
      </div>

      {/* Backend cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data.backends.map(backend => {
          const usedPct = getStoragePercentage(backend.usedBytes, backend.capacityBytes);
          const filesOnBackend = data.files.filter(f => f.backendId === backend.id && f.status === 'ready').length;
          const isTesting = testing === backend.id;
          const testStatus = testResult?.id === backend.id ? testResult : null;

          return (
            <div key={backend.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getBackendTypeColor(backend.type)}`}>
                      <Cloud className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{backend.name}</h3>
                      <p className="text-xs text-gray-500">{getBackendTypeLabel(backend.type)} • Priority {backend.priority}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {backend.enabled ? (
                      <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" /> Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" /> Disabled
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Storage bar */}
              <div className="px-6 py-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">{formatBytes(backend.usedBytes)} used</span>
                  <span className="text-gray-500">{formatBytes(backend.capacityBytes)} capacity</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${usedPct > 90 ? 'bg-red-500' : usedPct > 70 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                    style={{ width: `${usedPct}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>{filesOnBackend} files</span>
                  <span>{(100 - usedPct).toFixed(1)}% free</span>
                </div>
              </div>

              {/* Details */}
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Endpoint</span>
                  <span className="text-gray-700 font-mono text-xs truncate max-w-[200px]">{backend.endpoint}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Bucket</span>
                  <span className="text-gray-700 font-mono text-xs">{backend.bucket}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Credentials</span>
                  <span className="text-gray-700 font-mono text-xs">{backend.credentialsRef}_*</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className={`flex items-center gap-1 ${backend.directUploads ? 'text-green-600' : 'text-gray-400'}`}>
                    {backend.directUploads ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    Direct uploads
                  </span>
                  <span className={`flex items-center gap-1 ${backend.acceptsUploads ? 'text-blue-600' : 'text-gray-400'}`}>
                    {backend.acceptsUploads ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    Accepts uploads
                  </span>
                </div>
                {backend.lastTestedAt && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Last tested</span>
                    <span className={backend.lastTestOk ? 'text-green-600' : 'text-red-600'}>
                      {backend.lastTestOk ? '✓ Passed' : '✗ Failed'} ({new Date(backend.lastTestedAt).toLocaleDateString()})
                    </span>
                  </div>
                )}
              </div>

              {/* Test result */}
              {testStatus && (
                <div className={`px-6 py-2 text-sm ${testStatus.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {testStatus.message}
                </div>
              )}

              {/* Actions */}
              <div className="px-6 py-3 border-t border-gray-100 flex items-center gap-2">
                <button
                  onClick={() => handleTest(backend.id)}
                  disabled={isTesting}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TestTube className="w-3.5 h-3.5" />}
                  Test
                </button>
                {backend.enabled ? (
                  <>
                    <button
                      onClick={() => {
                        updateBackend(backend.id, { acceptsUploads: !backend.acceptsUploads });
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg ${
                        backend.acceptsUploads
                          ? 'border border-amber-300 text-amber-700 hover:bg-amber-50'
                          : 'border border-green-300 text-green-700 hover:bg-green-50'
                      }`}
                    >
                      {backend.acceptsUploads ? 'Stop Uploads' : 'Allow Uploads'}
                    </button>
                    <button
                      onClick={() => handleDisable(backend.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-red-300 text-red-600 rounded-lg hover:bg-red-50 ml-auto"
                    >
                      <PowerOff className="w-3.5 h-3.5" />
                      Disable
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleEnable(backend.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-green-300 text-green-700 rounded-lg hover:bg-green-50 ml-auto"
                  >
                    <Power className="w-3.5 h-3.5" />
                    Enable
                  </button>
                )}
              </div>

              {/* Wasabi warning */}
              {backend.type === 'wasabi' && (
                <div className="px-6 py-2 bg-amber-50 border-t border-amber-100">
                  <p className="text-xs text-amber-700">
                    ⚠️ Wasabi has a 1 TB minimum charge and 90-day minimum retention. Deleting files before 90 days still incurs charges.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Backend Modal */}
      {showAddModal && (
        <AddBackendModal
          onClose={() => setShowAddModal(false)}
          onAdd={(backend) => {
            addBackend(backend);
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}

function AddBackendModal({ onClose, onAdd }: { onClose: () => void; onAdd: (backend: any) => void }) {
  const [preset, setPreset] = useState<string>('r2');
  const [name, setName] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [region, setRegion] = useState('');
  const [bucket, setBucket] = useState('');
  const [credentialsRef, setCredentialsRef] = useState('');
  const [capacityGB, setCapacityGB] = useState(100);
  const [priority, setPriority] = useState(10);

  const applyPreset = (key: string) => {
    const p = BACKEND_PRESETS[key];
    if (!p) return;
    setPreset(key);
    setEndpoint(p.endpointPattern);
    setRegion(p.region);
    setCredentialsRef(p.credentialsRef);
    setPriority(p.defaultPriority);
    setName(key === 'r2' ? 'r2-main' : `${key}-main`);
  };

  React.useEffect(() => {
    applyPreset(preset);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Storage Backend</h3>

        {/* Preset selector */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          {Object.entries(BACKEND_PRESETS).map(([key, p]) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className={`p-3 rounded-lg border text-left transition-colors ${
                preset === key ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="text-sm font-medium text-gray-900">{getBackendTypeLabel(p.type)}</p>
              <p className="text-xs text-gray-500 mt-0.5">Priority {p.defaultPriority}</p>
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Backend Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="e.g., r2-main"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint</label>
            <input type="text" value={endpoint} onChange={e => setEndpoint(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
              <input type="text" value={region} onChange={e => setRegion(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bucket</label>
              <input type="text" value={bucket} onChange={e => setBucket(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="my-bucket"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Credentials Reference</label>
            <input type="text" value={credentialsRef} onChange={e => setCredentialsRef(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              Env vars: {credentialsRef}_ACCESS_KEY_ID and {credentialsRef}_SECRET_ACCESS_KEY
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (GB)</label>
              <input type="number" value={capacityGB} onChange={e => setCapacityGB(Number(e.target.value))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <input type="number" value={priority} onChange={e => setPriority(Number(e.target.value))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                min="1"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700">{BACKEND_PRESETS[preset]?.notes}</p>
        </div>

        <div className="mt-4 p-3 bg-amber-50 rounded-lg">
          <p className="text-xs text-amber-700">
            ⚠️ New backends start disabled. Set the environment variables in Vercel, then test the connection before enabling.
          </p>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button
            onClick={() => {
              const p = BACKEND_PRESETS[preset];
              onAdd({
                name,
                type: p.type,
                endpoint,
                region,
                bucket,
                credentialsRef,
                forcePathStyle: p.forcePathStyle,
                directUploads: false,
                capacityBytes: capacityGB * 1073741824,
                priority,
                enabled: false,
                acceptsUploads: false,
              });
            }}
            disabled={!name || !endpoint || !bucket}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            Add Backend
          </button>
        </div>
      </div>
    </div>
  );
}
