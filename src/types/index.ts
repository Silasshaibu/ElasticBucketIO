export type UserRole = 'admin' | 'staff';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  quotaBytes: number;
  usedBytes: number;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export type BackendType = 'r2' | 'oci_s3' | 'b2_s3' | 'wasabi' | 's3';

export interface StorageBackend {
  id: string;
  name: string;
  type: BackendType;
  endpoint: string;
  region: string;
  bucket: string;
  credentialsRef: string;
  forcePathStyle: boolean;
  directUploads: boolean;
  capacityBytes: number;
  usedBytes: number;
  reservedBytes: number;
  priority: number;
  enabled: boolean;
  acceptsUploads: boolean;
  lastTestedAt: string | null;
  lastTestOk: boolean | null;
  createdAt: string;
}

export interface FileItem {
  id: string;
  ownerId: string;
  name: string;
  folderId: string | null;
  backendId: string;
  sizeBytes: number;
  mimeType: string;
  status: 'pending' | 'ready' | 'deleted';
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  ownerId: string;
  parentId: string | null;
  name: string;
  createdAt: string;
}

export interface ShareLink {
  id: string;
  fileId: string;
  token: string;
  expiresAt: string;
  maxDownloads: number | null;
  downloadCount: number;
  createdBy: string;
  revokedAt: string | null;
}

export interface QuotaEvent {
  id: string;
  userId: string;
  changedBy: string;
  oldQuota: number;
  newQuota: number;
  reason: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  ip: string;
  createdAt: string;
}

export interface UploadProgress {
  id: string;
  fileName: string;
  sizeBytes: number;
  uploadedBytes: number;
  status: 'uploading' | 'completing' | 'done' | 'error';
  error?: string;
}
