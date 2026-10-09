import { StorageBackend, User, FileItem } from '../types';
import { DataStore, generateId, saveData } from './mockData';

// Format bytes to human-readable
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

// Get storage percentage
export function getStoragePercentage(used: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(100, (used / total) * 100);
}

// Check if user has quota available
export function checkUserQuota(user: User, additionalBytes: number): { allowed: boolean; message?: string } {
  const totalUsed = user.usedBytes + additionalBytes;
  if (totalUsed > user.quotaBytes) {
    return { allowed: false, message: 'Storage quota reached. Contact your admin to request more space.' };
  }
  return { allowed: true };
}

// Backend placement - picks a backend by priority
export function selectBackend(data: DataStore, sizeBytes: number): StorageBackend | null {
  const candidates = data.backends
    .filter(b => b.enabled && b.acceptsUploads && b.directUploads)
    .sort((a, b) => a.priority - b.priority);

  for (const backend of candidates) {
    const available = backend.capacityBytes - backend.usedBytes - backend.reservedBytes;
    if (available >= sizeBytes) {
      return backend;
    }
  }
  return null;
}

// Get effective global cap
export function getEffectiveCap(data: DataStore, globalCap: number): number {
  const totalBackendCapacity = data.backends
    .filter(b => b.enabled)
    .reduce((sum, b) => sum + b.capacityBytes, 0);
  return Math.min(totalBackendCapacity, globalCap);
}

// Get total allocated quotas
export function getTotalAllocatedQuota(data: DataStore): number {
  return data.users.reduce((sum, u) => sum + u.quotaBytes, 0);
}

// Get total used across all users
export function getTotalUsed(data: DataStore): number {
  return data.users.reduce((sum, u) => sum + u.usedBytes, 0);
}

// Upload a file (simulated)
export function simulateUpload(
  data: DataStore,
  userId: string,
  fileName: string,
  sizeBytes: number,
  mimeType: string,
  folderId: string | null
): { success: boolean; message: string; file?: FileItem } {
  const user = data.users.find(u => u.id === userId);
  if (!user) return { success: false, message: 'User not found' };
  if (!user.isActive) return { success: false, message: 'Account is disabled' };

  const quotaCheck = checkUserQuota(user, sizeBytes);
  if (!quotaCheck.allowed) return { success: false, message: quotaCheck.message! };

  const backend = selectBackend(data, sizeBytes);
  if (!backend) return { success: false, message: 'Storage pool is full. Contact your admin.' };

  const fileId = generateId();
  const now = new Date().toISOString();

  const newFile: FileItem = {
    id: fileId,
    ownerId: userId,
    name: fileName,
    folderId,
    backendId: backend.id,
    sizeBytes,
    mimeType,
    status: 'ready',
    createdAt: now,
    updatedAt: now,
  };

  // Update data
  data.files.push(newFile);
  user.usedBytes += sizeBytes;
  backend.usedBytes += sizeBytes;

  // Add audit log
  data.auditLog.push({
    id: generateId(),
    actorId: userId,
    action: 'file.uploaded',
    targetType: 'file',
    targetId: fileId,
    ip: '127.0.0.1',
    createdAt: now,
  });

  saveData(data);
  return { success: true, message: 'File uploaded successfully', file: newFile };
}

// Delete a file
export function deleteFile(data: DataStore, fileId: string, userId: string): { success: boolean; message: string } {
  const file = data.files.find(f => f.id === fileId);
  if (!file) return { success: false, message: 'File not found' };
  if (file.ownerId !== userId) return { success: false, message: 'Access denied' };

  const user = data.users.find(u => u.id === userId);
  const backend = data.backends.find(b => b.id === file.backendId);

  file.status = 'deleted';
  if (user) user.usedBytes = Math.max(0, user.usedBytes - file.sizeBytes);
  if (backend) backend.usedBytes = Math.max(0, backend.usedBytes - file.sizeBytes);

  data.auditLog.push({
    id: generateId(),
    actorId: userId,
    action: 'file.deleted',
    targetType: 'file',
    targetId: fileId,
    ip: '127.0.0.1',
    createdAt: new Date().toISOString(),
  });

  saveData(data);
  return { success: true, message: 'File deleted' };
}

// Create folder
export function createFolder(data: DataStore, userId: string, name: string, parentId: string | null): { success: boolean; message: string } {
  const sanitized = name.replace(/[\/\\:*?"<>|]/g, '').trim().substring(0, 255);
  if (!sanitized) return { success: false, message: 'Invalid folder name' };

  const folder = {
    id: generateId(),
    ownerId: userId,
    parentId,
    name: sanitized,
    createdAt: new Date().toISOString(),
  };

  data.folders.push(folder);
  saveData(data);
  return { success: true, message: 'Folder created' };
}

// Create share link
export function createShareLink(
  data: DataStore,
  fileId: string,
  userId: string,
  expiresDays: number = 7,
  maxDownloads: number | null = null
): { success: boolean; message: string; token?: string } {
  const file = data.files.find(f => f.id === fileId);
  if (!file) return { success: false, message: 'File not found' };
  if (file.ownerId !== userId) return { success: false, message: 'Access denied' };

  const token = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2);
  const expiresAt = new Date(Date.now() + expiresDays * 86400000).toISOString();

  const link = {
    id: generateId(),
    fileId,
    token,
    expiresAt,
    maxDownloads,
    downloadCount: 0,
    createdBy: userId,
    revokedAt: null,
  };

  data.shareLinks.push(link);
  saveData(data);
  return { success: true, message: 'Share link created', token };
}

// Get backend type label
export function getBackendTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    r2: 'Cloudflare R2',
    oci_s3: 'Oracle Cloud',
    b2_s3: 'Backblaze B2',
    wasabi: 'Wasabi',
    s3: 'S3 Compatible',
  };
  return labels[type] || type;
}

// Get backend type color
export function getBackendTypeColor(type: string): string {
  const colors: Record<string, string> = {
    r2: 'bg-orange-100 text-orange-700 border-orange-200',
    oci_s3: 'bg-red-100 text-red-700 border-red-200',
    b2_s3: 'bg-blue-100 text-blue-700 border-blue-200',
    wasabi: 'bg-green-100 text-green-700 border-green-200',
    s3: 'bg-gray-100 text-gray-700 border-gray-200',
  };
  return colors[type] || 'bg-gray-100 text-gray-700 border-gray-200';
}

// Get file icon based on mime type
export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'file-text';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'table';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'file-text';
  if (mimeType === 'application/zip' || mimeType.includes('compressed')) return 'archive';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'music';
  return 'file';
}

// Get MIME type from file name
export function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    mp4: 'video/mp4',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    zip: 'application/zip',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    csv: 'text/csv',
    json: 'application/json',
    html: 'text/html',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}
