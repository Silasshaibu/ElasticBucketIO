import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { User, StorageBackend, FileItem, Folder, ShareLink, QuotaEvent, AuditLogEntry } from '../types';
import { loadData, saveData, generateId, DataStore } from '../services/mockData';

interface DataContextType {
  data: DataStore;
  refresh: () => void;
  // User management
  createUser: (email: string, name: string, password: string, quotaBytes: number) => { success: boolean; message: string; tempPassword?: string };
  updateUserQuota: (userId: string, newQuota: number, reason: string) => { success: boolean; message: string };
  toggleUserActive: (userId: string) => { success: boolean; message: string };
  deleteUser: (userId: string) => { success: boolean; message: string };
  resetUserPassword: (userId: string) => { success: boolean; message: string; tempPassword?: string };
  // Backend management
  addBackend: (backend: Omit<StorageBackend, 'id' | 'createdAt' | 'usedBytes' | 'reservedBytes' | 'lastTestedAt' | 'lastTestOk'>) => { success: boolean; message: string };
  updateBackend: (id: string, updates: Partial<StorageBackend>) => { success: boolean; message: string };
  testBackend: (id: string) => { success: boolean; message: string };
  enableBackend: (id: string) => { success: boolean; message: string };
  disableBackend: (id: string) => { success: boolean; message: string };
  // File operations
  uploadFile: (userId: string, fileName: string, sizeBytes: number, mimeType: string, folderId: string | null) => { success: boolean; message: string };
  deleteFile: (fileId: string, userId: string) => { success: boolean; message: string };
  createFolder: (userId: string, name: string, parentId: string | null) => { success: boolean; message: string };
  deleteFolder: (folderId: string, userId: string) => { success: boolean; message: string };
  // Share links
  createShareLink: (fileId: string, userId: string, expiresDays: number, maxDownloads: number | null) => { success: boolean; message: string; token?: string };
  revokeShareLink: (linkId: string) => { success: boolean; message: string };
  resolveShareLink: (token: string) => { file: FileItem | null; backend: StorageBackend | null; message: string };
  // Data reset
  resetAllData: () => void;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DataStore>(() => loadData());

  const refresh = useCallback(() => {
    setData(loadData());
  }, []);

  const createUser = useCallback((email: string, name: string, _password: string, quotaBytes: number) => {
    const d = loadData();
    if (d.users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, message: 'Email already exists' };
    }

    const tempPassword = Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 6);
    const newUser: User = {
      id: generateId(),
      email: email.toLowerCase(),
      name,
      role: 'staff',
      quotaBytes,
      usedBytes: 0,
      isActive: true,
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
    };

    d.users.push(newUser);
    d.auditLog.push({
      id: generateId(),
      actorId: 'admin',
      action: 'user.created',
      targetType: 'user',
      targetId: newUser.id,
      ip: '127.0.0.1',
      createdAt: new Date().toISOString(),
    });

    saveData(d);
    setData(d);
    return { success: true, message: 'User created', tempPassword };
  }, []);

  const updateUserQuota = useCallback((userId: string, newQuota: number, reason: string) => {
    const d = loadData();
    const user = d.users.find(u => u.id === userId);
    if (!user) return { success: false, message: 'User not found' };

    const oldQuota = user.quotaBytes;
    user.quotaBytes = newQuota;

    d.quotaEvents.push({
      id: generateId(),
      userId,
      changedBy: 'admin',
      oldQuota,
      newQuota,
      reason,
      createdAt: new Date().toISOString(),
    });

    d.auditLog.push({
      id: generateId(),
      actorId: 'admin',
      action: 'quota.changed',
      targetType: 'user',
      targetId: userId,
      ip: '127.0.0.1',
      createdAt: new Date().toISOString(),
    });

    saveData(d);
    setData(d);
    return { success: true, message: 'Quota updated' };
  }, []);

  const toggleUserActive = useCallback((userId: string) => {
    const d = loadData();
    const user = d.users.find(u => u.id === userId);
    if (!user) return { success: false, message: 'User not found' };

    user.isActive = !user.isActive;
    d.auditLog.push({
      id: generateId(),
      actorId: 'admin',
      action: user.isActive ? 'user.enabled' : 'user.disabled',
      targetType: 'user',
      targetId: userId,
      ip: '127.0.0.1',
      createdAt: new Date().toISOString(),
    });

    saveData(d);
    setData(d);
    return { success: true, message: user.isActive ? 'User enabled' : 'User disabled' };
  }, []);

  const deleteUser = useCallback((userId: string) => {
    const d = loadData();
    const user = d.users.find(u => u.id === userId);
    if (!user) return { success: false, message: 'User not found' };

    // Delete user's files from backends
    const userFiles = d.files.filter(f => f.ownerId === userId && f.status === 'ready');
    userFiles.forEach(f => {
      const backend = d.backends.find(b => b.id === f.backendId);
      if (backend) backend.usedBytes = Math.max(0, backend.usedBytes - f.sizeBytes);
      f.status = 'deleted';
    });

    // Remove user's folders
    d.folders = d.folders.filter(f => f.ownerId !== userId);

    // Deactivate user instead of removing
    user.isActive = false;
    user.name = user.name + ' (deleted)';

    d.auditLog.push({
      id: generateId(),
      actorId: 'admin',
      action: 'user.deleted',
      targetType: 'user',
      targetId: userId,
      ip: '127.0.0.1',
      createdAt: new Date().toISOString(),
    });

    saveData(d);
    setData(d);
    return { success: true, message: 'User deleted' };
  }, []);

  const resetUserPassword = useCallback((userId: string) => {
    const d = loadData();
    const user = d.users.find(u => u.id === userId);
    if (!user) return { success: false, message: 'User not found' };

    const tempPassword = Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 6);
    user.mustChangePassword = true;

    d.auditLog.push({
      id: generateId(),
      actorId: 'admin',
      action: 'user.password_reset',
      targetType: 'user',
      targetId: userId,
      ip: '127.0.0.1',
      createdAt: new Date().toISOString(),
    });

    saveData(d);
    setData(d);
    return { success: true, message: 'Password reset', tempPassword };
  }, []);

  const addBackend = useCallback((backend: Omit<StorageBackend, 'id' | 'createdAt' | 'usedBytes' | 'reservedBytes' | 'lastTestedAt' | 'lastTestOk'>) => {
    const d = loadData();
    if (d.backends.find(b => b.name === backend.name)) {
      return { success: false, message: 'Backend name already exists' };
    }

    const newBackend: StorageBackend = {
      ...backend,
      id: generateId(),
      usedBytes: 0,
      reservedBytes: 0,
      lastTestedAt: null,
      lastTestOk: null,
      createdAt: new Date().toISOString(),
    };

    d.backends.push(newBackend);
    d.auditLog.push({
      id: generateId(),
      actorId: 'admin',
      action: 'backend.created',
      targetType: 'storage_backend',
      targetId: newBackend.id,
      ip: '127.0.0.1',
      createdAt: new Date().toISOString(),
    });

    saveData(d);
    setData(d);
    return { success: true, message: 'Backend added' };
  }, []);

  const updateBackend = useCallback((id: string, updates: Partial<StorageBackend>) => {
    const d = loadData();
    const backend = d.backends.find(b => b.id === id);
    if (!backend) return { success: false, message: 'Backend not found' };

    Object.assign(backend, updates);
    d.auditLog.push({
      id: generateId(),
      actorId: 'admin',
      action: 'backend.updated',
      targetType: 'storage_backend',
      targetId: id,
      ip: '127.0.0.1',
      createdAt: new Date().toISOString(),
    });

    saveData(d);
    setData(d);
    return { success: true, message: 'Backend updated' };
  }, []);

  const testBackend = useCallback((id: string) => {
    const d = loadData();
    const backend = d.backends.find(b => b.id === id);
    if (!backend) return { success: false, message: 'Backend not found' };

    // Simulate test - in real app this would actually connect
    const success = Math.random() > 0.1; // 90% success rate for demo
    backend.lastTestedAt = new Date().toISOString();
    backend.lastTestOk = success;
    backend.directUploads = success;

    saveData(d);
    setData(d);
    return { success, message: success ? 'Connection test passed' : 'Connection test failed. Check credentials and CORS settings.' };
  }, []);

  const enableBackend = useCallback((id: string) => {
    const d = loadData();
    const backend = d.backends.find(b => b.id === id);
    if (!backend) return { success: false, message: 'Backend not found' };
    if (!backend.lastTestOk) return { success: false, message: 'Backend must pass connection test before enabling' };

    backend.enabled = true;
    d.auditLog.push({
      id: generateId(),
      actorId: 'admin',
      action: 'backend.enabled',
      targetType: 'storage_backend',
      targetId: id,
      ip: '127.0.0.1',
      createdAt: new Date().toISOString(),
    });

    saveData(d);
    setData(d);
    return { success: true, message: 'Backend enabled' };
  }, []);

  const disableBackend = useCallback((id: string) => {
    const d = loadData();
    const backend = d.backends.find(b => b.id === id);
    if (!backend) return { success: false, message: 'Backend not found' };

    backend.enabled = false;
    backend.acceptsUploads = false;
    d.auditLog.push({
      id: generateId(),
      actorId: 'admin',
      action: 'backend.disabled',
      targetType: 'storage_backend',
      targetId: id,
      ip: '127.0.0.1',
      createdAt: new Date().toISOString(),
    });

    saveData(d);
    setData(d);
    return { success: true, message: 'Backend disabled' };
  }, []);

  const uploadFile = useCallback((userId: string, fileName: string, sizeBytes: number, mimeType: string, folderId: string | null) => {
    const d = loadData();
    const user = d.users.find(u => u.id === userId);
    if (!user) return { success: false, message: 'User not found' };
    if (!user.isActive) return { success: false, message: 'Account is disabled' };
    if (user.usedBytes + sizeBytes > user.quotaBytes) {
      return { success: false, message: 'Storage quota reached' };
    }

    // Find a backend
    const backend = d.backends
      .filter(b => b.enabled && b.acceptsUploads)
      .sort((a, b) => a.priority - b.priority)
      .find(b => b.capacityBytes - b.usedBytes - b.reservedBytes >= sizeBytes);

    if (!backend) return { success: false, message: 'Storage pool is full' };

    const now = new Date().toISOString();
    const file: FileItem = {
      id: generateId(),
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

    d.files.push(file);
    user.usedBytes += sizeBytes;
    backend.usedBytes += sizeBytes;

    saveData(d);
    setData(d);
    return { success: true, message: 'File uploaded' };
  }, []);

  const deleteFile = useCallback((fileId: string, userId: string) => {
    const d = loadData();
    const file = d.files.find(f => f.id === fileId);
    if (!file) return { success: false, message: 'File not found' };
    if (file.ownerId !== userId) return { success: false, message: 'Access denied' };

    const user = d.users.find(u => u.id === userId);
    const backend = d.backends.find(b => b.id === file.backendId);

    file.status = 'deleted';
    if (user) user.usedBytes = Math.max(0, user.usedBytes - file.sizeBytes);
    if (backend) backend.usedBytes = Math.max(0, backend.usedBytes - file.sizeBytes);

    saveData(d);
    setData(d);
    return { success: true, message: 'File deleted' };
  }, []);

  const createFolder = useCallback((userId: string, name: string, parentId: string | null) => {
    const d = loadData();
    const sanitized = name.replace(/[\/\\:*?"<>|]/g, '').trim().substring(0, 255);
    if (!sanitized) return { success: false, message: 'Invalid folder name' };

    d.folders.push({
      id: generateId(),
      ownerId: userId,
      parentId,
      name: sanitized,
      createdAt: new Date().toISOString(),
    });

    saveData(d);
    setData(d);
    return { success: true, message: 'Folder created' };
  }, []);

  const deleteFolder = useCallback((folderId: string, userId: string) => {
    const d = loadData();
    const folder = d.folders.find(f => f.id === folderId);
    if (!folder) return { success: false, message: 'Folder not found' };
    if (folder.ownerId !== userId) return { success: false, message: 'Access denied' };

    // Delete all files in folder
    const filesInFolder = d.files.filter(f => f.folderId === folderId && f.status === 'ready');
    filesInFolder.forEach(f => {
      const user = d.users.find(u => u.id === f.ownerId);
      const backend = d.backends.find(b => b.id === f.backendId);
      f.status = 'deleted';
      if (user) user.usedBytes = Math.max(0, user.usedBytes - f.sizeBytes);
      if (backend) backend.usedBytes = Math.max(0, backend.usedBytes - f.sizeBytes);
    });

    // Delete subfolders recursively
    const subfolders = d.folders.filter(f => f.parentId === folderId);
    subfolders.forEach(sf => {
      const subFiles = d.files.filter(f => f.folderId === sf.id && f.status === 'ready');
      subFiles.forEach(f => {
        const user = d.users.find(u => u.id === f.ownerId);
        const backend = d.backends.find(b => b.id === f.backendId);
        f.status = 'deleted';
        if (user) user.usedBytes = Math.max(0, user.usedBytes - f.sizeBytes);
        if (backend) backend.usedBytes = Math.max(0, backend.usedBytes - f.sizeBytes);
      });
    });

    d.folders = d.folders.filter(f => f.id !== folderId && f.parentId !== folderId);
    saveData(d);
    setData(d);
    return { success: true, message: 'Folder deleted' };
  }, []);

  const createShareLink = useCallback((fileId: string, userId: string, expiresDays: number, maxDownloads: number | null) => {
    const d = loadData();
    const file = d.files.find(f => f.id === fileId);
    if (!file) return { success: false, message: 'File not found' };
    if (file.ownerId !== userId) return { success: false, message: 'Access denied' };

    const token = generateId().replace(/-/g, '') + generateId().replace(/-/g, '');
    const expiresAt = new Date(Date.now() + expiresDays * 86400000).toISOString();

    d.shareLinks.push({
      id: generateId(),
      fileId,
      token,
      expiresAt,
      maxDownloads,
      downloadCount: 0,
      createdBy: userId,
      revokedAt: null,
    });

    saveData(d);
    setData(d);
    return { success: true, message: 'Share link created', token };
  }, []);

  const revokeShareLink = useCallback((linkId: string) => {
    const d = loadData();
    const link = d.shareLinks.find(l => l.id === linkId);
    if (!link) return { success: false, message: 'Link not found' };

    link.revokedAt = new Date().toISOString();
    saveData(d);
    setData(d);
    return { success: true, message: 'Link revoked' };
  }, []);

  const resolveShareLink = useCallback((token: string) => {
    const d = loadData();
    const link = d.shareLinks.find(l => l.token === token);
    if (!link) return { file: null, backend: null, message: 'Link not found' };
    if (link.revokedAt) return { file: null, backend: null, message: 'This link has been revoked' };
    if (new Date(link.expiresAt) < new Date()) return { file: null, backend: null, message: 'This link has expired' };
    if (link.maxDownloads && link.downloadCount >= link.maxDownloads) {
      return { file: null, backend: null, message: 'Download limit reached' };
    }

    const file = d.files.find(f => f.id === link.fileId);
    if (!file || file.status !== 'ready') return { file: null, backend: null, message: 'File not found' };

    const backend = d.backends.find(b => b.id === file.backendId);
    if (!backend || !backend.enabled) return { file: null, backend: null, message: 'File is unavailable' };

    link.downloadCount++;
    saveData(d);
    setData(d);
    return { file, backend, message: 'OK' };
  }, []);

  const resetAllData = useCallback(() => {
    localStorage.removeItem('staffdrive_data');
    const fresh = loadData();
    setData(fresh);
  }, []);

  return (
    <DataContext.Provider value={{
      data, refresh, createUser, updateUserQuota, toggleUserActive, deleteUser,
      resetUserPassword, addBackend, updateBackend, testBackend, enableBackend,
      disableBackend, uploadFile, deleteFile, createFolder, deleteFolder,
      createShareLink, revokeShareLink, resolveShareLink, resetAllData,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
}
