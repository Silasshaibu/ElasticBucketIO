import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  HardDrive, Server, Shield, Upload, Download, Users, Database,
  Cloud, Lock, Zap, Globe, ArrowRight, CheckCircle
} from 'lucide-react';

export default function Architecture() {
  const { user } = useAuth();
  if (user?.role !== 'admin') return null;

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Architecture</h1>
        <p className="text-gray-500 mt-1">How StaffDrive pools storage across multiple S3-compatible backends</p>
      </div>

      {/* Overview */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Overview</h2>
        <p className="text-gray-600 leading-relaxed">
          StaffDrive is a private file storage system where you (the admin) create staff accounts with individual storage quotas.
          Files are stored across one or more S3-compatible storage backends (Cloudflare R2, Oracle Cloud, Backblaze B2, Wasabi) 
          that the app pools into <strong>one unified library</strong>. Users never see which backend holds their files.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <Feature icon={Zap} title="Fast Transfers" desc="Browser talks directly to backends using presigned URLs. Files never pass through the server." />
          <Feature icon={Lock} title="Hard Quotas" desc="Server-enforced per-user storage quotas and per-backend capacity limits." />
          <Feature icon={Shield} title="Strict Isolation" desc="Staff can only see and touch their own files. No cross-user access possible." />
        </div>
      </div>

      {/* Upload Flow */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Flow</h2>
        <div className="space-y-3">
          <FlowStep num={1} text="Client calls POST /api/uploads/init with file name, size, and mime type" />
          <FlowStep num={2} text="Server checks: user active, size ≤ MAX_FILE_BYTES, used + reserved + size ≤ quota" />
          <FlowStep num={3} text="Backend placement: picks backend by priority where capacity allows" />
          <FlowStep num={4} text="Server creates file (pending) + upload record, reserves both user quota and backend capacity atomically" />
          <FlowStep num={5} text="Returns presigned PUT URL (≤100MB) or multipart UploadPart URLs (>100MB)" />
          <FlowStep num={6} text="Browser uploads directly to backend with progress tracking" />
          <FlowStep num={7} text="Client calls POST /api/uploads/complete → server verifies true size via HeadObject" />
          <FlowStep num={8} text="Transaction: mark file ready, increment used_bytes, convert reservation to used" />
        </div>
      </div>

      {/* Backend Placement */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Backend Placement</h2>
        <p className="text-gray-600 mb-4">
          On upload, the system picks a backend in priority order (lowest first) where:
        </p>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> Backend is enabled and accepts uploads</li>
          <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> Backend supports direct browser uploads (direct_uploads = true)</li>
          <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> used_bytes + reserved_bytes + file_size ≤ capacity_bytes</li>
        </ul>
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-2">Default Priority Order:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <PriorityBadge name="R2" priority={10} color="bg-orange-100 text-orange-700" />
            <PriorityBadge name="Oracle" priority={20} color="bg-red-100 text-red-700" />
            <PriorityBadge name="B2" priority={30} color="bg-blue-100 text-blue-700" />
            <PriorityBadge name="Wasabi" priority={40} color="bg-green-100 text-green-700" />
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Security Model</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SecurityItem title="Credentials" desc="Backend secrets exist only in server environment variables. Never stored in DB or exposed to clients." />
          <SecurityItem title="Ownership" desc="Every query enforces owner_id = session.user.id. Staff cannot read, list, or delete other users' files." />
          <SecurityItem title="Presigned URLs" desc="Short expiry (PUT 15min, GET 5min), scoped to single key on single backend, ContentType pinned." />
          <SecurityItem title="No Public Signup" desc="Admin-only user creation. No self-registration endpoint exists." />
          <SecurityItem title="Audit Trail" desc="All admin actions, quota changes, backend changes logged to audit_log table." />
          <SecurityItem title="Rate Limiting" desc="Login, upload init, and share resolution are rate-limited to prevent abuse." />
        </div>
      </div>

      {/* Tech Stack */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Tech Stack</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <TechBadge name="Next.js" desc="App Router" />
          <TechBadge name="TypeScript" desc="Full stack" />
          <TechBadge name="Tailwind" desc="+ shadcn/ui" />
          <TechBadge name="Auth.js v5" desc="Credentials + JWT" />
          <TechBadge name="Drizzle ORM" desc="+ Neon Postgres" />
          <TechBadge name="AWS SDK" desc="S3 presigned URLs" />
          <TechBadge name="Zod" desc="Input validation" />
          <TechBadge name="Upstash" desc="Rate limiting" />
          <TechBadge name="Vitest" desc="Unit tests" />
        </div>
      </div>

      {/* Provider Notes */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Provider Notes</h2>
        <div className="space-y-4">
          <ProviderNote
            name="Cloudflare R2"
            color="bg-orange-100 text-orange-700"
            notes="Free egress. CORS set per bucket by admin. Best for primary storage."
          />
          <ProviderNote
            name="Oracle Cloud"
            color="bg-red-100 text-red-700"
            notes="CORS headers are fixed and cannot be edited. Direct browser uploads may not work. Use as overflow via backend:migrate."
          />
          <ProviderNote
            name="Backblaze B2"
            color="bg-blue-100 text-blue-700"
            notes="Configurable CORS. Use application key limited to one bucket. Set lifecycle rule to keep only last version."
          />
          <ProviderNote
            name="Wasabi"
            color="bg-green-100 text-green-700"
            notes="1 TB minimum charge. 90-day minimum retention. Free egress policy expects downloads ≤ stored amount. Best as last priority / cold storage."
          />
        </div>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, title, desc }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <Icon className="w-6 h-6 text-indigo-600 mb-2" />
      <p className="font-medium text-gray-900 text-sm">{title}</p>
      <p className="text-xs text-gray-500 mt-1">{desc}</p>
    </div>
  );
}

function FlowStep({ num, text }: { num: number; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
        {num}
      </div>
      <p className="text-sm text-gray-600 pt-0.5">{text}</p>
    </div>
  );
}

function PriorityBadge({ name, priority, color }: { name: string; priority: number; color: string }) {
  return (
    <div className={`px-3 py-2 rounded-lg text-center ${color}`}>
      <p className="font-medium text-sm">{name}</p>
      <p className="text-xs opacity-75">Priority {priority}</p>
    </div>
  );
}

function SecurityItem({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex items-start gap-2">
      <Lock className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
    </div>
  );
}

function TechBadge({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
      <p className="text-sm font-medium text-gray-900">{name}</p>
      <p className="text-xs text-gray-500">{desc}</p>
    </div>
  );
}

function ProviderNote({ name, color, notes }: { name: string; color: string; notes: string }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
      <span className={`px-2 py-1 text-xs font-medium rounded ${color} flex-shrink-0`}>{name}</span>
      <p className="text-sm text-gray-600">{notes}</p>
    </div>
  );
}
