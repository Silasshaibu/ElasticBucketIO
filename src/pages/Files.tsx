import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { formatBytes, getStoragePercentage, getFileIcon, getMimeType } from '../services/storage';
import {
  Folder, FileText, Upload, Search, Grid, List, Plus, MoreVertical,
  Download, Trash2, Share2, Eye, ChevronRight, Home, FolderPlus,
  Image, File, Music, Video, Archive, Table, Presentation, AlertCircle, Check
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Files() {
  const { data, uploadFile, deleteFile, createFolder, deleteFolder, createShareLink } = useData();
  const { user } = useAuth();
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [search, setSearch] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; fileId: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ name: string; progress: number; done: boolean }[]>([]);

  if (!user) return null;

  const userFolders = data.folders.filter(f => f.ownerId === user.id && f.parentId === currentFolder);
  const userFiles = data.files.filter(f => f.ownerId === user.id && f.status === 'ready' && f.folderId === currentFolder);
  
  const filteredFolders = search
    ? data.folders.filter(f => f.ownerId === user.id && f.name.toLowerCase().includes(search.toLowerCase()))
    : userFolders;
  
  const filteredFiles = search
    ? data.files.filter(f => f.ownerId === user.id && f.status === 'ready' && f.name.toLowerCase().includes(search.toLowerCase()))
    : userFiles;

  const quotaPct = getStoragePercentage(user.usedBytes, user.quotaBytes);
  const quotaFull = user.usedBytes >= user.quotaBytes;

  // Build breadcrumb
  const breadcrumbs = useMemo(() => {
    const crumbs: { id: string | null; name: string }[] = [{ id: null, name: 'My Files' }];
    let folderId = currentFolder;
    const chain: { id: string; name: string }[] = [];
    while (folderId) {
      const folder = data.folders.find(f => f.id === folderId);
      if (!folder) break;
      chain.unshift({ id: folder.id, name: folder.name });
      folderId = folder.parentId;
    }
    return [...crumbs, ...chain];
  }, [currentFolder, data.folders]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || quotaFull) return;
    const items: { name: string; progress: number; done: boolean }[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      items.push({ name: file.name, progress: 0, done: false });
    }
    setUploadProgress(items);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Simulate upload progress
      for (let p = 0; p <= 100; p += 10) {
        await new Promise(r => setTimeout(r, 50));
        setUploadProgress(prev => prev.map((item, idx) => idx === i ? { ...item, progress: p } : item));
      }
      
      const mimeType = file.type || getMimeType(file.name);
      uploadFile(user.id, file.name, file.size, mimeType, currentFolder);
      setUploadProgress(prev => prev.map((item, idx) => idx === i ? { ...item, progress: 100, done: true } : item));
    }

    setTimeout(() => setUploadProgress([]), 2000);
  };

  const handleDelete = (fileId: string) => {
    if (confirm('Delete this file? This cannot be undone.')) {
      deleteFile(fileId, user.id);
      setSelectedFiles(prev => { const n = new Set(prev); n.delete(fileId); return n; });
    }
  };

  const handleBulkDelete = () => {
    if (selectedFiles.size === 0) return;
    if (confirm(`Delete ${selectedFiles.size} selected file(s)?`)) {
      selectedFiles.forEach(id => deleteFile(id, user.id));
      setSelectedFiles(new Set());
    }
  };

  const getFileIconComponent = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-5 h-5 text-pink-500" />;
    if (mimeType === 'application/pdf') return <FileText className="w-5 h-5 text-red-500" />;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <Table className="w-5 h-5 text-green-500" />;
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return <Presentation className="w-5 h-5 text-orange-500" />;
    if (mimeType.includes('word') || mimeType.includes('document')) return <FileText className="w-5 h-5 text-blue-500" />;
    if (mimeType === 'application/zip' || mimeType.includes('compressed')) return <Archive className="w-5 h-5 text-amber-500" />;
    if (mimeType.startsWith('video/')) return <Video className="w-5 h-5 text-purple-500" />;
    if (mimeType.startsWith('audio/')) return <Music className="w-5 h-5 text-indigo-500" />;
    return <File className="w-5 h-5 text-gray-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Storage bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Storage</span>
          <span className="text-sm text-gray-500">
            {formatBytes(user.usedBytes)} of {formatBytes(user.quotaBytes)}
          </span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${quotaPct > 90 ? 'bg-red-500' : quotaPct > 70 ? 'bg-amber-500' : 'bg-indigo-500'}`}
            style={{ width: `${quotaPct}%` }}
          />
        </div>
        {quotaFull && (
          <div className="flex items-center gap-2 mt-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4" />
            Storage full. Contact your admin to request more space.
          </div>
        )}
      </div>

      {/* Upload progress */}
      {uploadProgress.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
          <p className="text-sm font-medium text-gray-700">Uploading...</p>
          {uploadProgress.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 truncate">{item.name}</span>
                  <span className="text-gray-500">{item.done ? '✓ Done' : `${item.progress}%`}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${item.done ? 'bg-green-500' : 'bg-indigo-500'}`} style={{ width: `${item.progress}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm flex-1 min-w-0">
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={crumb.id || 'root'}>
              {i > 0 && <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
              <button
                onClick={() => setCurrentFolder(crumb.id)}
                className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 truncate ${
                  i === breadcrumbs.length - 1 ? 'text-gray-900 font-medium' : 'text-gray-500'
                }`}
              >
                {i === 0 && <Home className="w-4 h-4" />}
                <span className="truncate">{crumb.name}</span>
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search files..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-48"
          />
        </div>

        {/* View toggle */}
        <div className="flex border border-gray-300 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Grid className="w-4 h-4" />
          </button>
        </div>

        {/* Actions */}
        <button
          onClick={() => setShowNewFolderModal(true)}
          className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <FolderPlus className="w-4 h-4" />
          New Folder
        </button>
        <button
          onClick={() => setShowUploadModal(true)}
          disabled={quotaFull}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload className="w-4 h-4" />
          Upload
        </button>
        {selectedFiles.size > 0 && (
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-2 px-3 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
            Delete ({selectedFiles.size})
          </button>
        )}
      </div>

      {/* Drop zone / File list */}
      <div
        className="bg-white rounded-xl border border-gray-200 overflow-hidden"
        onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={e => { e.preventDefault(); e.stopPropagation(); handleUpload(e.dataTransfer.files); }}
      >
        {filteredFolders.length === 0 && filteredFiles.length === 0 ? (
          <div className="p-12 text-center">
            <Folder className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No files here yet</p>
            <p className="text-sm text-gray-400 mt-1">Upload files or create a folder to get started</p>
            <button
              onClick={() => setShowUploadModal(true)}
              disabled={quotaFull}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              Upload files
            </button>
          </div>
        ) : viewMode === 'list' ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={selectedFiles.size === filteredFiles.length && filteredFiles.length > 0}
                    onChange={e => {
                      if (e.target.checked) setSelectedFiles(new Set(filteredFiles.map(f => f.id)));
                      else setSelectedFiles(new Set());
                    }}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Modified</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredFolders.map(folder => (
                <tr key={folder.id} className="hover:bg-gray-50 cursor-pointer" onDoubleClick={() => setCurrentFolder(folder.id)}>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Folder className="w-5 h-5 text-amber-500" />
                      <span className="text-sm font-medium text-gray-900">{folder.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">—</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDistanceToNow(new Date(folder.createdAt), { addSuffix: true })}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => { if (confirm('Delete folder and all contents?')) deleteFolder(folder.id, user.id); }} className="text-gray-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredFiles.map(file => (
                <tr key={file.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      checked={selectedFiles.has(file.id)}
                      onChange={e => {
                        const n = new Set(selectedFiles);
                        if (e.target.checked) n.add(file.id); else n.delete(file.id);
                        setSelectedFiles(n);
                      }}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {getFileIconComponent(file.mimeType)}
                      <span className="text-sm text-gray-900 truncate max-w-xs">{file.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatBytes(file.sizeBytes)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDistanceToNow(new Date(file.updatedAt), { addSuffix: true })}</td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <button
                        onClick={e => setContextMenu(contextMenu?.fileId === file.id ? null : { x: 0, y: 0, fileId: file.id })}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {contextMenu?.fileId === file.id && (
                        <div className="absolute right-0 top-8 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                          <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => { setContextMenu(null); }}>
                            <Download className="w-4 h-4" /> Download
                          </button>
                          <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => { setContextMenu(null); setShowShareModal(file.id); }}>
                            <Share2 className="w-4 h-4" /> Share link
                          </button>
                          <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => { setContextMenu(null); }}>
                            <Eye className="w-4 h-4" /> Preview
                          </button>
                          <hr className="my-1 border-gray-100" />
                          <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50" onClick={() => { setContextMenu(null); handleDelete(file.id); }}>
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredFolders.map(folder => (
              <div key={folder.id} className="p-3 rounded-lg border border-gray-200 hover:border-indigo-300 cursor-pointer transition-colors" onDoubleClick={() => setCurrentFolder(folder.id)}>
                <Folder className="w-10 h-10 text-amber-500 mb-2" />
                <p className="text-sm font-medium text-gray-900 truncate">{folder.name}</p>
              </div>
            ))}
            {filteredFiles.map(file => (
              <div key={file.id} className="p-3 rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors group">
                <div className="flex items-center justify-center h-16 mb-2">
                  {getFileIconComponent(file.mimeType)}
                </div>
                <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{formatBytes(file.sizeBytes)}</p>
                <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1 text-gray-400 hover:text-indigo-600" title="Download"><Download className="w-3.5 h-3.5" /></button>
                  <button className="p-1 text-gray-400 hover:text-indigo-600" title="Share" onClick={() => setShowShareModal(file.id)}><Share2 className="w-3.5 h-3.5" /></button>
                  <button className="p-1 text-gray-400 hover:text-red-500" title="Delete" onClick={() => handleDelete(file.id)}><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <Modal onClose={() => setShowUploadModal(false)} title="Upload Files">
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-indigo-400 transition-colors cursor-pointer"
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleUpload(e.dataTransfer.files); setShowUploadModal(false); }}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.multiple = true;
              input.onchange = () => { handleUpload(input.files); setShowUploadModal(false); };
              input.click();
            }}
          >
            <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">Drop files here or click to browse</p>
            <p className="text-sm text-gray-400 mt-1">Files upload directly to storage</p>
          </div>
        </Modal>
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <NewFolderModal
          onClose={() => setShowNewFolderModal(false)}
          onCreate={(name) => { createFolder(user.id, name, currentFolder); setShowNewFolderModal(false); }}
        />
      )}

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          fileId={showShareModal}
          onClose={() => setShowShareModal(null)}
          onCreate={(expiresDays, maxDownloads) => {
            const result = createShareLink(showShareModal, user.id, expiresDays, maxDownloads);
            if (result.success && result.token) {
              const url = `${window.location.origin}/s/${result.token}`;
              navigator.clipboard.writeText(url);
              alert('Share link copied to clipboard!');
            }
            setShowShareModal(null);
          }}
        />
      )}
    </div>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function NewFolderModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string) => void }) {
  const [name, setName] = useState('');
  return (
    <Modal onClose={onClose} title="New Folder">
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Folder name"
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        autoFocus
        onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onCreate(name.trim()); }}
      />
      <div className="flex gap-2 mt-4">
        <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
        <button
          onClick={() => name.trim() && onCreate(name.trim())}
          disabled={!name.trim()}
          className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          Create
        </button>
      </div>
    </Modal>
  );
}

function ShareModal({ fileId, onClose, onCreate }: { fileId: string; onClose: () => void; onCreate: (days: number, maxDownloads: number | null) => void }) {
  const [days, setDays] = useState(7);
  const [maxDownloads, setMaxDownloads] = useState('');
  return (
    <Modal onClose={onClose} title="Create Share Link">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expires in</label>
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value={1}>1 day</option>
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max downloads (optional)</label>
          <input
            type="number"
            value={maxDownloads}
            onChange={e => setMaxDownloads(e.target.value)}
            placeholder="Unlimited"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            min="1"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button
            onClick={() => onCreate(days, maxDownloads ? parseInt(maxDownloads) : null)}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            Create Link
          </button>
        </div>
      </div>
    </Modal>
  );
}
