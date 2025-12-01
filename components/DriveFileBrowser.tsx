
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  HardDrive, Search, Folder, FileText, Image as ImageIcon, Film, 
  LayoutGrid, List, Cloud, UploadCloud, Download, 
  MoreHorizontal, Plus, X, Tag, Code, Settings, FileJson, CheckCircle2,
  Wifi, WifiOff, RefreshCw, AlertCircle, CloudLightning, Database, Lock, Globe
} from 'lucide-react';
import { api } from '../services/api';

// --- DOMAIN MODELS ---

export interface AssetLogic {
  id: string;
  type: 'script' | 'trigger' | 'tag';
  value: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  url: string;
  publicUrl?: string; // Explicit public link if available
  modifiedTime: string;
  logic: AssetLogic[];
  synced?: boolean;
  storageError?: boolean;
}

// --- CUSTOM HOOKS ---

const useAssetManager = () => {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'offline'>('connected');
  const [bucketName, setBucketName] = useState<string>('');

  const fetchAssets = useCallback(async () => {
      setIsSyncing(true);
      try {
        const [assetsRes, configRes] = await Promise.all([
            api.assets.list(),
            api.storage.getInfo()
        ]);

        if (configRes.success && configRes.data) {
            setBucketName(configRes.data.bucket);
        }

        if (assetsRes.success && assetsRes.data) {
          // Recover local logic/tags which aren't in backend yet
          const localLogicStr = localStorage.getItem('local_asset_logic');
          const localLogic = localLogicStr ? JSON.parse(localLogicStr) : {};

          const mappedFiles: DriveFile[] = assetsRes.data.map(a => ({
            id: a.id,
            name: a.fileName,
            mimeType: a.mimeType,
            size: a.sizeBytes,
            url: a.url || '',
            publicUrl: a.publicUrl,
            modifiedTime: a.createdAt ? new Date(a.createdAt).toISOString() : new Date().toISOString(),
            logic: localLogic[a.id] || [], 
            synced: true
          }));
          setFiles(mappedFiles);
          
          if (assetsRes.message === 'Offline Mode') {
             setConnectionStatus('offline');
          } else {
             setConnectionStatus('connected');
          }
        }
      } catch (e) {
        setConnectionStatus('offline');
        console.error("Failed to fetch assets", e);
      } finally {
        setIsSyncing(false);
      }
  }, []);

  // Fetch initial assets from backend
  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Update file logic 
  const updateFile = useCallback(async (id: string, updater: (f: DriveFile) => DriveFile) => {
    setFiles(prev => {
      const currentFile = prev.find(f => f.id === id);
      if (!currentFile) return prev;
      const updatedFile = updater(currentFile);
      
      const newFiles = prev.map(f => f.id === id ? updatedFile : f);
      
      // Persist logic locally since backend doesn't support arbitrary metadata yet
      const logicMap = newFiles.reduce((acc, f) => ({...acc, [f.id]: f.logic}), {});
      localStorage.setItem('local_asset_logic', JSON.stringify(logicMap));

      return newFiles;
    });
  }, []);

  const handleImport = useCallback(async (uploadedFiles: FileList | null) => {
    if (!uploadedFiles) return;
    setIsUploading(true);
    
    const uploadPromises = Array.from(uploadedFiles).map(async (file) => {
      try {
          const res = await api.assets.upload(file);
          const asset = res.data;
          if (asset) {
              return {
                id: asset.id,
                name: asset.fileName,
                mimeType: asset.mimeType,
                size: asset.sizeBytes,
                url: asset.url || '',
                publicUrl: asset.publicUrl,
                modifiedTime: asset.createdAt ? new Date(asset.createdAt).toISOString() : new Date().toISOString(),
                logic: [],
                synced: true
              } as DriveFile;
          }
      } catch (e) {
          console.error("Upload failed", e);
      }
      return null;
    });

    const results = await Promise.all(uploadPromises);
    const newAssets = results.filter(Boolean) as DriveFile[];

    setFiles(prev => [...newAssets, ...prev]);
    setIsUploading(false);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
      try {
          await api.assets.delete(id);
          setFiles(prev => prev.filter(f => f.id !== id));
      } catch (e) {
          console.error("Delete failed", e);
          alert("Failed to delete asset from cloud storage.");
      }
  }, []);

  const handleExport = useCallback(() => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(files, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `assets_export_${new Date().toISOString()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }, [files]);

  return { 
    files, isDragging, setIsDragging, isUploading, isSyncing, updateFile, 
    handleImport, handleExport, handleDelete, connectionStatus, bucketName,
    refresh: fetchAssets 
  };
};

// --- SUB-COMPONENTS ---

const LogicBadge: React.FC<{ type: string; value: string }> = ({ type, value }) => {
  const colors = {
    script: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    trigger: 'bg-amber-50 text-amber-700 border-amber-100',
    tag: 'bg-indigo-50 text-indigo-700 border-indigo-100'
  };
  const icon = {
    script: <Code size={10} />,
    trigger: <Settings size={10} />,
    tag: <Tag size={10} />
  };

  return (
    <span className={`flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded border ${colors[type as keyof typeof colors] || colors.tag} font-bold uppercase tracking-wider`}>
      {icon[type as keyof typeof icon] || <Tag size={10} />} {value}
    </span>
  );
};

interface FileCardProps {
  file: DriveFile;
  viewMode: 'grid' | 'list';
  onSelect: (file: DriveFile) => void;
  isSelected: boolean;
  compact?: boolean;
}

const FileCard = React.memo(({ file, viewMode, onSelect, isSelected, compact }: FileCardProps) => {
  const isList = viewMode === 'list';
  const isPrivate = !file.publicUrl;
  
  const getIcon = (mime: string) => {
    if (mime.includes('image')) return <ImageIcon className="text-purple-500" size={compact ? 16 : 20} />;
    if (mime.includes('video')) return <Film className="text-rose-500" size={compact ? 16 : 20} />;
    if (mime.includes('pdf')) return <FileText className="text-red-500" size={compact ? 16 : 20} />;
    return <Folder className="text-indigo-400" size={compact ? 16 : 20} />;
  };

  return (
    <div 
      onClick={() => onSelect(file)}
      draggable="true"
      onDragStart={(e) => {
          // Transfer data for simple drops (text/uri-list)
          const textRef = file.mimeType.startsWith('image/') ? `![${file.name}](${file.url})` : `[${file.name}](${file.url})`;
          e.dataTransfer.setData('text/plain', textRef);
          // Transfer full object for complex drops (internal)
          e.dataTransfer.setData('application/json', JSON.stringify(file));
          e.dataTransfer.effectAllowed = 'copy';
      }}
      className={`
        group relative cursor-grab active:cursor-grabbing transition-all border select-none bg-white hover:-translate-y-0.5 hover:shadow-card
        ${isSelected ? 'border-indigo-500 shadow-md ring-1 ring-indigo-500/20 z-10' : 'border-gray-100 hover:border-gray-200'}
        ${isList 
            ? 'flex items-center gap-3 p-2 rounded-lg' 
            : `rounded-xl ${compact ? 'p-2' : 'p-3'} flex flex-col ${compact ? 'gap-2' : 'gap-3'}`
        }
      `}
    >
      <div className={`${isList ? 'w-8 h-8' : 'aspect-square'} flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden relative border border-gray-50 group-hover:border-gray-100 transition-colors`}>
        {file.mimeType.includes('image') && file.url ? (
             <img src={file.url} className="w-full h-full object-cover" loading="lazy" />
        ) : null}
        <div className={`absolute inset-0 flex items-center justify-center -z-10 bg-gray-50 ${file.mimeType.includes('image') ? 'opacity-0 group-hover:opacity-10' : ''}`}>
             {getIcon(file.mimeType)}
        </div>
        
        {/* Privacy Indicator */}
        <div className="absolute top-1 left-1">
            {isPrivate ? (
                <div className="bg-black/20 backdrop-blur-md rounded-full p-0.5 text-white" title="Private (Signed URL)">
                    <Lock size={8} />
                </div>
            ) : (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-500/80 backdrop-blur-md rounded-full p-0.5 text-white" title="Public Access">
                    <Globe size={8} />
                </div>
            )}
        </div>

        {file.logic.length > 0 && !compact && (
          <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-indigo-500 rounded-full shadow-sm ring-1 ring-white" />
        )}
      </div>

      <div className={`flex-1 min-w-0 ${!isList && 'text-center'}`}>
        <div className={`font-display font-semibold text-gray-900 truncate ${compact ? 'text-[10px] tracking-tight' : 'text-xs'}`}>{file.name}</div>
        {!compact && (
            <>
                <div className="flex flex-wrap gap-1 mt-1.5 justify-center min-h-[1rem]">
                {file.logic.slice(0, isList ? 5 : 2).map((l: AssetLogic) => <LogicBadge key={l.id} type={l.type} value={l.value} />)}
                </div>
                {!isList && (
                <div className="text-[9px] text-gray-400 mt-1.5 font-mono flex items-center justify-center gap-1 uppercase tracking-wide">
                    {(Number(file.size || 0) / 1024).toFixed(1)} KB
                </div>
                )}
            </>
        )}
      </div>
    </div>
  );
});

const LogicEditor = ({ file, onClose, onUpdate, onDelete }: { file: DriveFile, onClose: () => void, onUpdate: (id: string, fn: any) => void, onDelete: (id: string) => void }) => {
  const [newValue, setNewValue] = useState('');
  const [newType, setNewType] = useState<AssetLogic['type']>('tag');

  const handleAdd = () => {
    if (!newValue) return;
    onUpdate(file.id, (f: DriveFile) => ({
      ...f,
      logic: [...f.logic, { id: `logic-${Date.now()}`, type: newType, value: newValue }]
    }));
    setNewValue('');
  };

  return (
    <div className="w-72 border-l border-gray-100 bg-white h-full flex flex-col shadow-xl absolute right-0 top-0 z-20 animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white/80 backdrop-blur-xl">
        <h3 className="font-bold text-[10px] uppercase tracking-widest text-gray-500 flex items-center gap-2"><Settings size={12} /> Metadata</h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-50 rounded-full text-gray-400 hover:text-gray-900 transition-colors"><X size={14}/></button>
      </div>
      <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
        <div className="mb-6">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100"><FileText className="text-indigo-500" size={16} /></div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-gray-900 truncate">{file.name}</div>
              <div className="text-[9px] text-gray-400 font-mono uppercase tracking-wide mt-0.5">{file.mimeType.split('/')[1]}</div>
            </div>
          </div>
        </div>
        <div className="mb-6">
           <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-3">Smart Tags</div>
           <div className="space-y-2">
             {file.logic.map(l => (
                 <div key={l.id} className="flex items-center justify-between p-2 bg-white border border-gray-100 rounded-lg shadow-sm group hover:border-indigo-100 transition-colors">
                    <LogicBadge type={l.type} value={l.value} />
                    <button onClick={() => onUpdate(file.id, (f: DriveFile) => ({ ...f, logic: f.logic.filter(x => x.id !== l.id) }))} className="text-gray-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X size={12} />
                    </button>
                 </div>
             ))}
             {file.logic.length === 0 && <div className="text-[10px] text-gray-300 italic text-center py-4 border border-dashed border-gray-100 rounded-lg">No tags attached.</div>}
           </div>
        </div>
        <div className="flex gap-2">
          <input 
            type="text" value={newValue} onChange={(e) => setNewValue(e.target.value)}
            placeholder="Add tag..." className="flex-1 px-3 py-2 text-[10px] font-medium border border-gray-200 rounded-lg outline-none focus:border-indigo-500 bg-white transition-colors placeholder-gray-300"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button onClick={handleAdd} className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-all"><Plus size={14} /></button>
        </div>
        <div className="pt-6 border-t border-gray-100 mt-6">
             <button onClick={() => { onDelete(file.id); onClose(); }} className="w-full py-2.5 text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors uppercase tracking-widest flex items-center justify-center gap-2">
                <X size={12}/> Delete Asset
             </button>
        </div>
      </div>
    </div>
  );
};

interface AssetLibraryProps {
    onSelect?: (file: DriveFile) => void;
    compact?: boolean;
}

const AssetLibrary = ({ onSelect, compact = false }: AssetLibraryProps) => {
  const { files, isDragging, setIsDragging, isUploading, isSyncing, updateFile, handleImport, handleExport, handleDelete, connectionStatus, bucketName, refresh } = useAssetManager();
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(compact ? 'list' : 'grid');
  const [filter, setFilter] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="h-full flex flex-col bg-white relative overflow-hidden" onDragOver={e => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={e => { e.preventDefault(); setIsDragging(false); handleImport(e.dataTransfer.files); }}>
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-indigo-50/90 backdrop-blur-sm border-2 border-dashed border-indigo-500 m-4 rounded-2xl flex items-center justify-center animate-in fade-in duration-300">
          <div className="flex flex-col items-center gap-3 animate-bounce">
             <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shadow-sm">
                <UploadCloud size={32} />
             </div>
             <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-widest">Drop to Import</h3>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className={`border-b border-gray-100 bg-white/80 backdrop-blur-xl z-10 ${compact ? 'p-3' : 'px-6 py-4'}`}>
        <div className="flex justify-between items-center mb-3">
          <div>
            <h1 className={`font-display font-bold text-gray-900 flex items-center gap-2 ${compact ? 'text-xs uppercase tracking-widest' : 'text-lg tracking-tight'}`}>
              <HardDrive className="text-indigo-600" size={compact ? 14 : 18} /> 
              {compact ? 'Local Assets' : 'Asset Repository'}
            </h1>
          </div>
          <div className="flex items-center gap-1">
             <button onClick={refresh} className="p-2 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors" title="Sync with Cloud">
                <RefreshCw size={16} className={isSyncing || isUploading ? 'animate-spin' : ''}/>
             </button>
             {!compact && (
                <button onClick={handleExport} className="p-2 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors" title="Export">
                    <Download size={16} />
                </button>
             )}
             <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className={`flex items-center justify-center gap-2 font-bold text-white bg-gray-900 hover:bg-black rounded-lg shadow-sm transition-all disabled:opacity-70 ${compact ? 'w-6 h-6' : 'px-3 py-1.5 text-xs uppercase tracking-wide'}`}>
               {isUploading ? <RefreshCw size={12} className="animate-spin"/> : <Plus size={12} />} {!compact && (isUploading ? 'Syncing...' : 'Import')}
             </button>
             <input type="file" multiple ref={fileInputRef} className="hidden" onChange={(e) => handleImport(e.target.files)} />
          </div>
        </div>
        
        <div className="relative group">
           <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
           <input 
            type="text" 
            placeholder="Filter assets..." 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)} 
            className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50/50 border border-gray-100 hover:border-gray-200 focus:border-indigo-500 focus:bg-white rounded-xl outline-none transition-all placeholder-gray-400 font-medium" 
           />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className={`flex-1 overflow-y-auto custom-scrollbar ${compact ? 'p-3' : 'p-6'}`}>
          {files.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-3 opacity-60">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100">
                    <Cloud size={20} className="text-gray-300" />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest">No Assets Found</p>
              </div>
          ) : (
              <div className={viewMode === 'grid' ? `grid ${compact ? 'grid-cols-2' : 'grid-cols-4'} gap-3` : "space-y-2"}>
                 {filteredFiles.map(file => (
                   <FileCard 
                    key={file.id} 
                    file={file} 
                    viewMode={viewMode} 
                    onSelect={(f) => { setSelectedFile(f); if(onSelect) onSelect(f); }} 
                    isSelected={selectedFile?.id === file.id}
                    compact={compact}
                   />
                 ))}
              </div>
          )}
        </div>
        
        {selectedFile && !compact && (
          <div className="relative w-72">
            <LogicEditor file={selectedFile} onClose={() => setSelectedFile(null)} onUpdate={updateFile} onDelete={handleDelete} />
          </div>
        )}
      </div>
      
      {/* Footer Status */}
      {!compact && (
          <div className="px-6 py-2 border-t border-gray-100 bg-white text-[10px] text-gray-400 flex justify-between items-center font-medium uppercase tracking-wider">
              <span>{files.length} Items {bucketName && <span className="text-indigo-400 ml-2">@ {bucketName}</span>}</span>
              <span className={`flex items-center gap-1.5 ${connectionStatus === 'connected' ? 'text-emerald-500' : 'text-gray-400'}`}>
                  {connectionStatus === 'connected' ? <CloudLightning size={10}/> : <WifiOff size={10}/>} {connectionStatus === 'connected' ? 'Cloud Synced' : 'Local Mode'}
              </span>
          </div>
      )}
    </div>
  );
};

export default AssetLibrary;
