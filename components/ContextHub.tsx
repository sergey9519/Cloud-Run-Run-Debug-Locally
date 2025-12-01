
import React, { useState, useRef } from 'react';
import { Link2, FileText, Youtube, BookOpen, Trash2, Loader2, Plus, BrainCircuit, Globe, UploadCloud } from 'lucide-react';
import { KnowledgeSource } from '../types';
import { DeepReader } from '../services/intelligence';
import { api } from '../services/api';

interface ContextHubProps {
  sources: KnowledgeSource[];
  onAddSource: (source: KnowledgeSource) => void;
  onRemoveSource: (id: string) => void;
}

const ContextHub: React.FC<ContextHubProps> = ({ sources, onAddSource, onRemoveSource }) => {
  const [urlInput, setUrlInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUrlIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput) return;
    
    setIsProcessing(true);
    setUploadStatus('Scanning...');
    try {
      // For URLs, we still use the DeepReader directly or map it to a backend endpoint
      const source = await DeepReader.ingestURL(urlInput);
      onAddSource(source);
      setUrlInput('');
    } catch (e) {
      alert("Failed to ingest URL. Ensure it is accessible.");
    } finally {
      setIsProcessing(false);
      setUploadStatus('');
    }
  };

  const handleFile = async (file: File) => {
      setIsProcessing(true);
      setUploadStatus('Uploading...');
      try {
          // 1. Upload to Assets Service (Storage)
          const assetRes = await api.assets.upload(file);
          const asset = assetRes.data;

          // 2. Request Knowledge Service to create source from Asset ID
          // This moves the heavy lifting (OCR, PDF parsing) to the backend
          setUploadStatus('Indexing...');
          const knowledgeRes = await api.knowledge.createFromAsset('global', asset.id, asset);
          onAddSource(knowledgeRes.data);

      } catch (e) {
          alert("Failed to ingest file. Check format.");
          console.error(e);
      } finally {
          setIsProcessing(false);
          setUploadStatus('');
      }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
    }
  };

  const getSourceConfig = (type: string) => {
    switch(type) {
      case 'youtube': return { icon: Youtube, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', label: 'Video' };
      case 'wiki': return { icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', label: 'Wiki' };
      case 'file': return { icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', label: 'Doc' };
      default: return { icon: Link2, color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-100', label: 'Web' };
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Ingestion Zone */}
      <div className="p-5 border-b border-mist bg-white relative z-10">
         <div className="flex gap-3">
            <div className="relative flex-1 group">
                <input
                    type="text"
                    className="block w-full pl-10 pr-10 py-3 bg-canvas border border-mist rounded-xl text-xs text-ink placeholder-pencil/60 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none font-medium"
                    placeholder="Feed URL to Neural Net..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUrlIngest(e)}
                />
                <Globe size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-pencil group-focus-within:text-indigo-500 transition-colors"/>
                {urlInput && (
                    <button 
                        onClick={handleUrlIngest}
                        disabled={isProcessing}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                    >
                        {isProcessing ? <Loader2 size={12} className="animate-spin"/> : <Plus size={12} strokeWidth={3}/>}
                    </button>
                )}
            </div>
            <button 
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={() => setDragActive(true)}
                disabled={isProcessing}
                className={`px-4 rounded-xl border flex items-center justify-center transition-all gap-2 ${dragActive ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-mist bg-canvas text-pencil hover:border-indigo-300 hover:text-indigo-600'}`}
                title="Upload File"
            >
                {isProcessing ? (
                    <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-600 uppercase tracking-wide">
                        <Loader2 size={12} className="animate-spin"/> {uploadStatus}
                    </div>
                ) : (
                    <UploadCloud size={16} />
                )}
            </button>
         </div>

         <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} accept=".txt,.md,.json,.csv,.js,.ts,.html,.pdf,.png,.jpg,.jpeg" />
         
         {/* Drop Zone Visual Feedback */}
         {dragActive && (
            <div 
                className="absolute inset-0 z-50 bg-indigo-50/95 backdrop-blur-sm flex flex-col items-center justify-center border-2 border-indigo-500 border-dashed m-3 rounded-lg shadow-lg"
                onDragLeave={() => setDragActive(false)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
            >
                <UploadCloud size={32} className="text-indigo-600 mb-3 animate-bounce pointer-events-none"/>
                <p className="text-xs font-bold text-indigo-900 pointer-events-none uppercase tracking-widest">Drop to Ingest</p>
            </div>
         )}
      </div>

      {/* Source List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-3 bg-canvas/30">
         {sources.length === 0 && (
           <div className="text-center py-20 opacity-60">
             <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 border border-mist shadow-sm">
                 <BrainCircuit size={20} className="text-pencil"/>
             </div>
             <div className="text-[10px] text-pencil font-bold uppercase tracking-widest">Context Empty</div>
             <p className="text-[10px] text-pencil/70 mt-1 max-w-[150px] mx-auto leading-relaxed font-medium">System awaits intelligence input.</p>
           </div>
         )}
         
         {sources.map(source => {
           const config = getSourceConfig(source.type);
           const Icon = config.icon;
           
           return (
             <div key={source.id} className="group relative bg-white border border-mist p-4 rounded-2xl hover:shadow-soft hover:border-indigo-200 transition-all duration-300">
               <div className="flex justify-between items-start mb-3">
                 <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border ${config.bg} ${config.border} ${config.color}`}>
                   <Icon size={12} />
                   <span className="text-[9px] font-bold uppercase tracking-wider">{config.label}</span>
                 </div>
                 <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onRemoveSource(source.id)} className="text-pencil hover:text-rose-500 transition-colors">
                        <Trash2 size={14} />
                    </button>
                 </div>
               </div>
               
               <div className="font-semibold text-sm text-ink leading-tight mb-2 line-clamp-1 tracking-tight" title={source.title}>{source.title}</div>
               
               <div className="text-[10px] text-pencil font-medium line-clamp-2 leading-relaxed bg-canvas/50 p-2.5 rounded-xl border border-transparent group-hover:border-mist transition-colors">
                 {source.summary}
               </div>
               
               {source.status === 'indexed' && (
                  <div className="absolute top-4 right-4 text-emerald-500" title="Indexed">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                  </div>
               )}
             </div>
           );
         })}
      </div>
    </div>
  );
};

export default ContextHub;
