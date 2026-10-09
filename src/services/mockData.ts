import { User, StorageBackend, FileItem, Folder, ShareLink, QuotaEvent, AuditLogEntry } from '../types';

const STORAGE_KEY = 'staffdrive_data';

interface DataStore {
  users: User[];
  backends: StorageBackend[];
  files: FileItem[];
  folders: Folder[];
  shareLinks: ShareLink[];
  quotaEvents: QuotaEvent[];
  auditLog: AuditLogEntry[];
}

function generateId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch (e) {
    // fallback
  }
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

function getInitialData(): DataStore {
  const now = new Date().toISOString();
  const adminId = generateId();
  const staff1Id = generateId();
  const staff2Id = generateId();
  const staff3Id = generateId();
  const backendId = generateId();
  
  const folder1Id = generateId();
  const folder2Id = generateId();
  const folder3Id = generateId();
  
  return {
    users: [
      {
        id: adminId,
        email: 'admin@staffdrive.io',
        name: 'Admin User',
        role: 'admin',
        quotaBytes: 107374182400, // 100 GB
        usedBytes: 0,
        isActive: true,
        mustChangePassword: false,
        createdAt: now,
        lastLoginAt: now,
      },
      {
        id: staff1Id,
        email: 'alice@company.com',
        name: 'Alice Johnson',
        role: 'staff',
        quotaBytes: 5368709120, // 5 GB
        usedBytes: 2147483648, // 2 GB
        isActive: true,
        mustChangePassword: false,
        createdAt: now,
        lastLoginAt: now,
      },
      {
        id: staff2Id,
        email: 'bob@company.com',
        name: 'Bob Smith',
        role: 'staff',
        quotaBytes: 5368709120,
        usedBytes: 4294967296, // 4 GB
        isActive: true,
        mustChangePassword: false,
        createdAt: now,
        lastLoginAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: staff3Id,
        email: 'carol@company.com',
        name: 'Carol Davis',
        role: 'staff',
        quotaBytes: 10737418240, // 10 GB
        usedBytes: 1073741824, // 1 GB
        isActive: true,
        mustChangePassword: true,
        createdAt: now,
        lastLoginAt: null,
      },
    ],
    backends: [
      {
        id: backendId,
        name: 'r2-main',
        type: 'r2',
        endpoint: 'https://abc123.r2.cloudflarestorage.com',
        region: 'auto',
        bucket: 'staffdrive-main',
        credentialsRef: 'BACKEND_R2_MAIN',
        forcePathStyle: false,
        directUploads: true,
        capacityBytes: 107374182400, // 100 GB
        usedBytes: 7516192768, // 7 GB
        reservedBytes: 0,
        priority: 10,
        enabled: true,
        acceptsUploads: true,
        lastTestedAt: now,
        lastTestOk: true,
        createdAt: now,
      },
    ],
    files: [
      {
        id: generateId(),
        ownerId: staff1Id,
        name: 'Q4-Report.pdf',
        folderId: folder1Id,
        backendId: backendId,
        sizeBytes: 524288000, // 500 MB
        mimeType: 'application/pdf',
        status: 'ready',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        updatedAt: new Date(Date.now() - 172800000).toISOString(),
      },
      {
        id: generateId(),
        ownerId: staff1Id,
        name: 'Team-Photo.jpg',
        folderId: null,
        backendId: backendId,
        sizeBytes: 8388608, // 8 MB
        mimeType: 'image/jpeg',
        status: 'ready',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: generateId(),
        ownerId: staff1Id,
        name: 'Budget-2024.xlsx',
        folderId: folder1Id,
        backendId: backendId,
        sizeBytes: 1048576, // 1 MB
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        status: 'ready',
        createdAt: new Date(Date.now() - 259200000).toISOString(),
        updatedAt: new Date(Date.now() - 259200000).toISOString(),
      },
      {
        id: generateId(),
        ownerId: staff1Id,
        name: 'Presentation-Draft.pptx',
        folderId: folder2Id,
        backendId: backendId,
        sizeBytes: 1572864000, // 1.5 GB
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        status: 'ready',
        createdAt: new Date(Date.now() - 432000000).toISOString(),
        updatedAt: new Date(Date.now() - 432000000).toISOString(),
      },
      {
        id: generateId(),
        ownerId: staff2Id,
        name: 'Client-Contracts.zip',
        folderId: folder3Id,
        backendId: backendId,
        sizeBytes: 2147483648, // 2 GB
        mimeType: 'application/zip',
        status: 'ready',
        createdAt: new Date(Date.now() - 345600000).toISOString(),
        updatedAt: new Date(Date.now() - 345600000).toISOString(),
      },
      {
        id: generateId(),
        ownerId: staff2Id,
        name: 'Meeting-Notes.docx',
        folderId: null,
        backendId: backendId,
        sizeBytes: 524288, // 512 KB
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        status: 'ready',
        createdAt: new Date(Date.now() - 43200000).toISOString(),
        updatedAt: new Date(Date.now() - 43200000).toISOString(),
      },
      {
        id: generateId(),
        ownerId: staff2Id,
        name: 'Project-Plan.pdf',
        folderId: folder3Id,
        backendId: backendId,
        sizeBytes: 2147483648, // 2 GB
        mimeType: 'application/pdf',
        status: 'ready',
        createdAt: new Date(Date.now() - 518400000).toISOString(),
        updatedAt: new Date(Date.now() - 518400000).toISOString(),
      },
      {
        id: generateId(),
        ownerId: staff3Id,
        name: 'Design-Mockup.png',
        folderId: null,
        backendId: backendId,
        sizeBytes: 1073741824, // 1 GB
        mimeType: 'image/png',
        status: 'ready',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ],
    folders: [
      { id: folder1Id, ownerId: staff1Id, parentId: null, name: 'Reports', createdAt: now },
      { id: folder2Id, ownerId: staff1Id, parentId: null, name: 'Presentations', createdAt: now },
      { id: folder3Id, ownerId: staff2Id, parentId: null, name: 'Client Files', createdAt: now },
    ],
    shareLinks: [],
    quotaEvents: [
      {
        id: generateId(),
        userId: staff1Id,
        changedBy: adminId,
        oldQuota: 2147483648,
        newQuota: 5368709120,
        reason: 'Increased for project needs',
        createdAt: new Date(Date.now() - 604800000).toISOString(),
      },
    ],
    auditLog: [
      {
        id: generateId(),
        actorId: adminId,
        action: 'backend.created',
        targetType: 'storage_backend',
        targetId: backendId,
        ip: '127.0.0.1',
        createdAt: now,
      },
      {
        id: generateId(),
        actorId: adminId,
        action: 'user.created',
        targetType: 'user',
        targetId: staff1Id,
        ip: '127.0.0.1',
        createdAt: now,
      },
    ],
  };
}

export function loadData(): DataStore {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate the parsed data has required fields
        if (parsed && parsed.users && parsed.backends && parsed.files) {
          return parsed;
        }
      }
    }
  } catch (e) {
    console.error('Failed to load data:', e);
  }
  const initial = getInitialData();
  try {
    saveData(initial);
  } catch (e) {
    console.error('Failed to save initial data:', e);
  }
  return initial;
}

export function saveData(data: DataStore): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  } catch (e) {
    console.error('Failed to save data:', e);
  }
}

export function resetData(): DataStore {
  localStorage.removeItem(STORAGE_KEY);
  return loadData();
}

export { generateId };
export type { DataStore };
