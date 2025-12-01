import React, { useState, useRef } from 'react';
import { Image, Film, Link as LinkIcon, Plus, ExternalLink, Trash2, BrainCircuit, Database, UploadCloud, FileText } from 'lucide-react';

interface ReferenceGalleryProps {
    items: string[];
    onAdd: (content: string, type: 'url' | 'file', file?: File) => Promise<void>;
    onRemove: (url: string) => void;
}

const ReferenceGallery: React.FC<ReferenceGalleryProps> = ({ items, onAdd, onRemove }) => {
    const [newUrl, setNewUrl] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [processingState, setProcessingState] = useState<'idle' | 'analyzing' | 'uploading' | 'vectorizing'>('idle');
    const [processingLabel, setProcessingLabel] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUrlSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const urlToAdd = newUrl.trim();
        if (urlToAdd) {
            setIsAdding(false);
            setProcessingState('analyzing');
            setProcessingLabel('Scanning URL...');
            
            try {
                await onAdd(urlToAdd, 'url');
            } finally {
                setNewUrl('');
                setProcessingState('idle');
                setProcessingLabel('');
            }
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setIsAdding(false);
            setProcessingState('uploading');
            setProcessingLabel(`Ingesting ${file.name}...`);

            const reader = new FileReader();
            reader.onload = async (event) => {
                const result = event.target?.result as string;
                setProcessingState('vectorizing');
                setProcessingLabel('Updating Neural Weights...');
                
                try {
                    await onAdd(result, 'file', file);
                } finally {
                    setProcessingState('idle');
                    setProcessingLabel('');
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const getIcon = (url: string) => {
        if (url.startsWith('data:image') || url.match(/\.(jpeg|jpg|gif|png|webp)$/i)) return <Image size={24} className="text-purple-500"/>;
        if (url.startsWith('data:video') || url.includes('youtube') || url.includes('vimeo') || url.match(/\.(mp4|mov)$/i)) return <Film size={24} className="text-rose-500"/>;
        if (url.startsWith('data:application/pdf')) return <FileText size={24} className="text-red-500"/>;
        return <LinkIcon size={24} className="text-blue-500"/>;
    };

    const getThumbnail = (url: string) => {
         if (url.startsWith('data:image') || url.match(/\.(jpeg|jpg|gif|png|webp)$/i)) return url;
         if (url.includes('youtube.com/watch?v=')) {
             const v = url.split('v=')[1]?.split('&')[0];
             if (v) return `https://img.youtube.com/vi/${v}/0.jpg`;
         }
         return null;
    };

    return (
        <div className="space-y-6">
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                 {/* Add Button */}
                 {!isAdding && processingState === 'idle' && (
                     <button 
                        onClick={() => setIsAdding(true)}
                        className="aspect-video bg-canvas rounded-2xl border border-dashed border-mist flex flex-col items-center justify-center text-pencil hover:text-ink hover:border-pencil hover:bg-white transition-all group"
                     >
                         <div className="w-10 h-10 rounded-xl bg-white border border-mist flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform duration-300">
                             <Plus size={18} />
                         </div>
                         <span className="text-[10px] font-bold uppercase tracking-widest">Add Asset</span>
                     </button>
                 )}

                 {/* Input Form */}
                 {isAdding && (
                     <div className="col-span-1 md:col-span-2 aspect-video bg-white rounded-2xl border border-mist shadow-sm p-6 flex flex-col justify-between animate-in zoom-in-95 duration-200">
                         <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-ink uppercase tracking-widest flex items-center gap-2">
                                <Database size={12} className="text-indigo-600"/> Add Knowledge
                            </span>
                            <button onClick={() => fileInputRef.current?.click()} className="text-[9px] bg-canvas hover:bg-mist text-ink px-3 py-1.5 rounded-lg font-bold uppercase tracking-wide transition-colors">
                                Upload File
                            </button>
                         </div>
                         
                         <input 
                            type="url" 
                            placeholder="Paste URL..." 
                            className="w-full px-4 py-3 border border-mist rounded-xl text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-pencil font-medium bg-canvas/30"
                            value={newUrl}
                            onChange={(e) => setNewUrl(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit(e)}
                         />
                         
                         <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            onChange={handleFileUpload} 
                        />

                         <div className="flex justify-end gap-3 mt-4">
                             <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-pencil hover:text-ink">Cancel</button>
                             <button onClick={handleUrlSubmit} disabled={!newUrl} className="px-4 py-2 bg-ink text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-colors shadow-sm disabled:opacity-50">Scan</button>
                         </div>
                     </div>
                 )}

                 {/* Processing State */}
                 {processingState !== 'idle' && (
                     <div className="aspect-video bg-white rounded-2xl border border-indigo-100 flex flex-col items-center justify-center p-6 relative overflow-hidden shadow-sm">
                         <div className="absolute inset-0 bg-indigo-50/30 animate-pulse"></div>
                         <div className="relative z-10 flex flex-col items-center">
                             {processingState === 'uploading' ? <UploadCloud size={24} className="text-indigo-600 animate-bounce mb-3"/> : <BrainCircuit size={24} className="text-indigo-600 animate-pulse mb-3"/>}
                             <div className="text-[9px] font-bold text-indigo-900 uppercase tracking-widest">{processingState === 'uploading' ? 'Ingesting' : 'Thinking'}</div>
                             <div className="text-[9px] text-indigo-600/70 mt-1.5 text-center truncate w-full px-2 font-medium">{processingLabel}</div>
                         </div>
                         <div className="absolute bottom-0 left-0 h-0.5 bg-indigo-500 animate-[progress_2s_ease-in-out_infinite] w-full"></div>
                     </div>
                 )}

                 {/* Existing Items */}
                 {items.map((url, idx) => {
                     const thumb = getThumbnail(url);
                     const isDataUri = url.startsWith('data:');
                     const displayName = isDataUri ? 'Uploaded Asset' : new URL(url).hostname;

                     return (
                         <div key={idx} className="group relative aspect-video bg-white rounded-2xl overflow-hidden border border-mist shadow-sm hover:shadow-soft transition-all duration-300 transform hover:-translate-y-1">
                             {/* Cached Knowledge Badge */}
                             <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-white/90 backdrop-blur px-2 py-1 rounded-lg border border-gray-100 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                 <span className="text-[8px] font-bold text-gray-700 uppercase tracking-widest">Indexed</span>
                             </div>

                             {thumb ? (
                                 <img src={thumb} alt="Reference" className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-500" />
                             ) : (
                                 <div className="w-full h-full flex flex-col items-center justify-center bg-canvas group-hover:bg-white transition-colors relative">
                                     {getIcon(url)}
                                     <span className="text-[10px] text-pencil mt-3 font-medium max-w-[80%] truncate">{displayName}</span>
                                 </div>
                             )}
                             
                             {/* Hover Actions */}
                             <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-start justify-end p-3 opacity-0 group-hover:opacity-100">
                                <button onClick={() => onRemove(url)} className="p-2 bg-white text-pencil hover:text-rose-600 rounded-lg shadow-sm border border-mist transition-colors">
                                    <Trash2 size={14} />
                                </button>
                             </div>
                             
                             {!isDataUri && (
                                <a href={url} target="_blank" rel="noopener noreferrer" className="absolute bottom-3 right-3 p-2 bg-white/95 hover:bg-white text-pencil hover:text-indigo-600 rounded-lg shadow-sm border border-mist opacity-0 group-hover:opacity-100 transition-all text-[9px] flex items-center gap-1.5 font-bold uppercase tracking-widest">
                                    Open <ExternalLink size={10} />
                                </a>
                             )}
                         </div>
                     );
                 })}
             </div>
        </div>
    );
};

export default ReferenceGallery;