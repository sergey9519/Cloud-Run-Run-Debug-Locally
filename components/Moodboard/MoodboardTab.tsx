
import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Upload, Filter, Film, Image as ImageIcon, Loader2, UploadCloud, Link as LinkIcon, Check, ChevronDown, PlusCircle, Sparkles, X } from 'lucide-react';
import { MoodboardItem, Project } from '../../types';
import { api } from '../../services/api';
import MoodboardDetail from './MoodboardDetail';
import { GoogleGenAI } from "@google/genai";

interface MoodboardTabProps {
  projectId?: string;
}

const MoodboardTab: React.FC<MoodboardTabProps> = ({ projectId: propProjectId }) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(propProjectId);
  const [projects, setProjects] = useState<Project[]>([]);
  
  const [items, setItems] = useState<MoodboardItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'image' | 'video'>('all');
  const [selectedItem, setSelectedItem] = useState<MoodboardItem | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // URL Import State
  const [showImportInput, setShowImportInput] = useState(false);
  const [importUrl, setImportUrl] = useState('');

  // Generation State
  const [showGenModal, setShowGenModal] = useState(false);
  const [genPrompt, setGenPrompt] = useState('');
  const [genRatio, setGenRatio] = useState('1:1');
  const [isGenerating, setIsGenerating] = useState(false);

  // 1. Initial Logic: If prop is missing, fetch projects
  useEffect(() => {
      if (!propProjectId) {
          api.projects.list().then(res => setProjects(res.data));
      } else {
          setSelectedProjectId(propProjectId);
      }
  }, [propProjectId]);

  // 2. Fetch Items when selectedProjectId changes
  useEffect(() => {
    if (!selectedProjectId) {
        setItems([]);
        return;
    }
    
    setLoading(true);
    let mounted = true;
    
    api.moodboard.list(selectedProjectId).then(res => {
        if(mounted) {
            setItems(res.data);
            setLoading(false);
        }
    });
    
    return () => { mounted = false; };
  }, [selectedProjectId]);

  const processFiles = async (files: FileList) => {
    if (!selectedProjectId) return;
    setIsUploading(true);
    
    try {
        const newItems = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const assetRes = await api.assets.upload(file, selectedProjectId);
            const asset = assetRes.data;
            const linkRes = await api.moodboard.linkAsset(selectedProjectId, asset.id);
            newItems.push(linkRes.data);
        }
        setItems(prev => [...newItems, ...prev]);
    } catch(e) {
        console.error(e);
        alert("Upload failed.");
    } finally {
        setIsUploading(false);
        if(fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImportUrl = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedProjectId || !importUrl.trim()) return;
      
      setIsUploading(true);
      try {
          const res = await api.moodboard.create({
              projectId: selectedProjectId,
              type: 'image', // Assume image for simple URL imports
              url: importUrl.trim(),
              caption: 'Imported from URL'
          });
          setItems(prev => [res.data, ...prev]);
          setImportUrl('');
          setShowImportInput(false);
      } catch (e) {
          alert("Failed to import URL");
      } finally {
          setIsUploading(false);
      }
  };

  const handleGenerateImage = async () => {
      if (!selectedProjectId || !genPrompt.trim() || !process.env.API_KEY) return;
      setIsGenerating(true);

      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const response = await ai.models.generateContent({
              model: 'gemini-3-pro-image-preview',
              contents: { parts: [{ text: genPrompt }] },
              config: {
                  imageConfig: {
                      aspectRatio: genRatio,
                      imageSize: "1K"
                  }
              }
          });

          // Extract image
          for (const part of response.candidates?.[0]?.content?.parts || []) {
              if (part.inlineData) {
                  const base64 = part.inlineData.data;
                  const mimeType = part.inlineData.mimeType || 'image/png';
                  const dataUrl = `data:${mimeType};base64,${base64}`;
                  
                  // Convert to File object for upload flow
                  const res = await fetch(dataUrl);
                  const blob = await res.blob();
                  const file = new File([blob], `generated-${Date.now()}.png`, { type: mimeType });
                  
                  // Upload using existing flow
                  const assetRes = await api.assets.upload(file, selectedProjectId);
                  const asset = assetRes.data;
                  const linkRes = await api.moodboard.linkAsset(selectedProjectId, asset.id);
                  
                  // Update item with generation metadata
                  const newItem = linkRes.data;
                  await api.moodboard.update({
                      ...newItem,
                      caption: genPrompt,
                      tags: ['AI Generated', 'Gemini 3 Pro'],
                      shotType: genRatio
                  });
                  
                  setItems(prev => [newItem, ...prev]);
              }
          }
          setShowGenModal(false);
          setGenPrompt('');
      } catch(e) {
          console.error("Generation failed", e);
          alert("Failed to generate image.");
      } finally {
          setIsGenerating(false);
      }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        await processFiles(e.target.files);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        await processFiles(e.dataTransfer.files);
    }
  };

  const handleUpdate = async (updated: MoodboardItem) => {
      await api.moodboard.update(updated);
      setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
  };

  const handleDelete = async (id: string) => {
      await api.moodboard.delete(id);
      setItems(prev => prev.filter(i => i.id !== id));
  };

  const filteredItems = items.filter(item => {
      const matchesSearch = searchQuery === '' || 
        item.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.moods.some(m => m.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.caption.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = activeFilter === 'all' || item.type === activeFilter;
      
      return matchesSearch && matchesType;
  });

  return (
    <div 
        className="flex flex-col h-full bg-[#F5F5F7] p-8 min-h-screen relative"
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
    >
       {/* Drop Zone Overlay */}
       {dragActive && selectedProjectId && (
           <div className="absolute inset-0 z-50 bg-indigo-50/90 backdrop-blur-sm m-4 rounded-3xl border-2 border-dashed border-indigo-500 flex flex-col items-center justify-center animate-in fade-in duration-200">
               <div className="bg-white p-6 rounded-2xl shadow-float animate-bounce">
                   <UploadCloud size={48} className="text-indigo-600 mb-2"/>
               </div>
               <h3 className="mt-4 text-xl font-bold text-indigo-900 tracking-tight">Drop to Upload</h3>
               <p className="text-sm text-indigo-600 font-medium">Add to Moodboard</p>
           </div>
       )}

       {/* Generation Modal */}
       {showGenModal && (
           <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200">
                   <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                       <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wide">
                           <Sparkles size={16} className="text-indigo-600"/> Generate Asset
                       </h3>
                       <button onClick={() => setShowGenModal(false)} className="text-gray-400 hover:text-gray-900"><X size={18}/></button>
                   </div>
                   <div className="p-6 space-y-4">
                       <div>
                           <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Prompt</label>
                           <textarea 
                                autoFocus
                                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-indigo-500 focus:bg-white outline-none resize-none transition-all"
                                rows={3}
                                placeholder="A futuristic city with neon lights..."
                                value={genPrompt}
                                onChange={e => setGenPrompt(e.target.value)}
                           />
                       </div>
                       <div>
                           <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Aspect Ratio</label>
                           <div className="flex gap-2">
                               {['1:1', '16:9', '9:16', '4:3', '3:4'].map(r => (
                                   <button 
                                    key={r}
                                    onClick={() => setGenRatio(r)}
                                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${genRatio === r ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                                   >
                                       {r}
                                   </button>
                               ))}
                           </div>
                       </div>
                   </div>
                   <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                       <button onClick={() => setShowGenModal(false)} className="px-4 py-2 text-gray-600 font-bold text-xs uppercase tracking-wide hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
                       <button 
                        onClick={handleGenerateImage} 
                        disabled={isGenerating || !genPrompt}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-indigo-700 shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center gap-2"
                       >
                           {isGenerating ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14}/>}
                           Generate
                       </button>
                   </div>
               </div>
           </div>
       )}

       {/* Toolbar */}
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 sticky top-0 z-20 bg-[#F5F5F7]/95 backdrop-blur-sm py-4">
           
           <div className="flex gap-4 w-full md:w-auto">
               {/* Project Selector (Standalone Mode) */}
               {!propProjectId && (
                   <div className="relative">
                       <select 
                           value={selectedProjectId || ''} 
                           onChange={(e) => setSelectedProjectId(e.target.value)}
                           className="appearance-none bg-white border border-gray-200 text-gray-900 text-xs font-bold uppercase tracking-widest pl-4 pr-10 py-3 rounded-2xl shadow-sm focus:outline-none focus:border-indigo-500 cursor-pointer hover:border-gray-300 transition-colors"
                       >
                           <option value="" disabled>Select Context...</option>
                           {projects.map(p => (
                               <option key={p.id} value={p.id}>{p.name}</option>
                           ))}
                       </select>
                       <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                   </div>
               )}

               <div className="relative flex-1 md:w-96 group">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors"/>
                    <input 
                        type="text" 
                        placeholder="Search by mood, tag, or context..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none text-sm font-medium transition-all"
                    />
               </div>
           </div>

           <div className="flex gap-3 items-center">
               <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                   <button onClick={() => setActiveFilter('all')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${activeFilter === 'all' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}>All</button>
                   <button onClick={() => setActiveFilter('image')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${activeFilter === 'image' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-indigo-600'}`}>Images</button>
                   <button onClick={() => setActiveFilter('video')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${activeFilter === 'video' ? 'bg-rose-500 text-white shadow-md' : 'text-gray-500 hover:text-rose-500'}`}>Videos</button>
               </div>
               
               {selectedProjectId && (
                   <>
                       <button onClick={() => setShowGenModal(true)} className="p-3 bg-white border border-gray-200 text-indigo-600 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all shadow-sm" title="Generate with AI">
                           <Sparkles size={16}/>
                       </button>

                       <div className="relative flex items-center">
                           {showImportInput ? (
                               <form onSubmit={handleImportUrl} className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-1 shadow-sm absolute right-0 min-w-[300px] animate-in slide-in-from-right-5 fade-in z-30">
                                   <input 
                                      autoFocus
                                      type="url" 
                                      placeholder="https://..." 
                                      value={importUrl} 
                                      onChange={(e) => setImportUrl(e.target.value)}
                                      className="flex-1 pl-3 text-xs outline-none bg-transparent h-8"
                                   />
                                   <button type="submit" disabled={isUploading} className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                                       {isUploading ? <Loader2 size={12} className="animate-spin"/> : <Check size={12}/>}
                                   </button>
                                   <button type="button" onClick={() => setShowImportInput(false)} className="p-1.5 text-gray-400 hover:text-gray-600">
                                       <Upload size={12} className="rotate-45"/>
                                   </button>
                               </form>
                           ) : (
                               <button 
                                   onClick={() => setShowImportInput(true)} 
                                   className="px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold uppercase tracking-widest hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm flex items-center gap-2"
                               >
                                   <LinkIcon size={14}/> Import URL
                               </button>
                           )}
                       </div>

                       <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="px-6 py-3 bg-gray-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-gray-300/50 flex items-center gap-2 disabled:opacity-70"
                       >
                           {isUploading ? <Loader2 size={16} className="animate-spin"/> : <Upload size={16} />}
                           Upload
                       </button>
                       <input type="file" multiple ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleUpload} />
                   </>
               )}
           </div>
       </div>

       {/* Masonry Grid */}
       {!selectedProjectId ? (
           <div className="flex-1 flex flex-col items-center justify-center text-gray-400 opacity-60">
               <Film size={48} className="mb-4 opacity-50"/>
               <p className="text-sm font-bold uppercase tracking-widest">Select a project to enable uploads</p>
           </div>
       ) : loading ? (
           <div className="flex-1 flex items-center justify-center">
               <Loader2 size={32} className="animate-spin text-gray-300"/>
           </div>
       ) : filteredItems.length === 0 ? (
           <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
               <div onClick={() => fileInputRef.current?.click()} className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6 cursor-pointer hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                    <PlusCircle size={32} className="opacity-50"/>
               </div>
               <p className="text-sm font-medium text-gray-500">Board is empty</p>
               <p className="text-xs mt-2 text-gray-400 max-w-xs text-center leading-relaxed">
                   Upload images or paste a URL to start building your visual moodboard.
               </p>
           </div>
       ) : (
           <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-6 space-y-6 pb-20">
               {filteredItems.map(item => (
                   <div 
                    key={item.id} 
                    onClick={() => setSelectedItem(item)}
                    className="break-inside-avoid bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-zoom-in group relative border border-gray-100"
                   >
                       <div className="relative">
                           {item.type === 'video' ? (
                               <video src={item.url} className="w-full h-auto object-cover" muted loop onMouseOver={e => e.currentTarget.play()} onMouseOut={e => e.currentTarget.pause()}/>
                           ) : (
                               <img src={item.url} alt="Moodboard" className="w-full h-auto object-cover" />
                           )}
                           
                           {/* Overlay */}
                           <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                <div className="text-white font-medium text-xs line-clamp-2 leading-relaxed mb-2 drop-shadow-md">
                                    {item.status === 'processing' ? (
                                        <span className="flex items-center gap-2 text-indigo-200"><Loader2 size={12} className="animate-spin"/> Analyzing visual data...</span>
                                    ) : (
                                        item.caption || "No caption"
                                    )}
                                </div>
                                {item.status === 'ready' && (
                                    <div className="flex flex-wrap gap-1">
                                        {item.moods.slice(0, 3).map(m => (
                                            <span key={m} className="px-2 py-0.5 bg-white/20 backdrop-blur-md text-white text-[9px] font-bold rounded-md uppercase tracking-wide border border-white/30">{m}</span>
                                        ))}
                                    </div>
                                )}
                           </div>

                           {/* Type Icon */}
                           <div className="absolute top-3 right-3 bg-black/20 backdrop-blur-md p-1.5 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity">
                               {item.type === 'video' ? <Film size={12}/> : <ImageIcon size={12}/>}
                           </div>
                       </div>
                       
                       {/* Color Strip */}
                       {item.colors.length > 0 && (
                           <div className="h-1.5 flex w-full">
                               {item.colors.map(c => <div key={c} style={{backgroundColor: c}} className="flex-1"></div>)}
                           </div>
                       )}
                   </div>
               ))}
           </div>
       )}

       {/* Detail Panel */}
       {selectedItem && (
           <MoodboardDetail 
            item={selectedItem} 
            onClose={() => setSelectedItem(null)} 
            onUpdate={handleUpdate}
            onDelete={handleDelete}
           />
       )}
    </div>
  );
};

export default MoodboardTab;
