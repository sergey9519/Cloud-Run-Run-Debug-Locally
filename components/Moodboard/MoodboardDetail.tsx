
import React, { useState } from 'react';
import { X, Tag, Palette, Check, Film, Image as ImageIcon, Camera, Sparkles, Loader2 } from 'lucide-react';
import { MoodboardItem } from '../../types';
import { GoogleGenerativeAI } from "@google/generative-ai";

interface MoodboardDetailProps {
  item: MoodboardItem;
  onClose: () => void;
  onUpdate: (item: MoodboardItem) => void;
  onDelete: (id: string) => void;
}

const MoodboardDetail: React.FC<MoodboardDetailProps> = ({ item, onClose, onUpdate, onDelete }) => {
  const [editedItem, setEditedItem] = useState(item);
  const [tagInput, setTagInput] = useState('');
  const [moodInput, setMoodInput] = useState('');
  
  // AI Edit State
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    onUpdate(editedItem);
    onClose();
  };

  const addTag = (e: React.FormEvent) => {
      e.preventDefault();
      if(tagInput.trim()) {
          setEditedItem({...editedItem, tags: [...editedItem.tags, tagInput.trim()]});
          setTagInput('');
      }
  };

  const addMood = (e: React.FormEvent) => {
    e.preventDefault();
    if(moodInput.trim()) {
        setEditedItem({...editedItem, moods: [...editedItem.moods, moodInput.trim()]});
        setMoodInput('');
    }
  };

  const handleAIEdit = async () => {
      if (!editPrompt.trim() || !process.env.API_KEY || item.type !== 'image') return;
      setIsEditing(true);

      try {
          // Fetch base64 of current image
          const imgRes = await fetch(editedItem.url);
          const blob = await imgRes.blob();
          const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
          });
          
          const cleanBase64 = base64.split(',')[1];
          const ai = new GoogleGenerativeAI(process.env.API_KEY);
          
          const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
          const response = await model.generateContent([
              { inlineData: { mimeType: blob.type, data: cleanBase64 } },
              editPrompt
          ]);

          // Check response parts for image
          for (const part of response.response.candidates?.[0]?.content?.parts || []) {
              if (part.inlineData) {
                  const newBase64 = part.inlineData.data;
                  const newMime = part.inlineData.mimeType || 'image/png';
                  const newDataUrl = `data:${newMime};base64,${newBase64}`;
                  setEditedItem({ ...editedItem, url: newDataUrl });
                  setEditPrompt('');
                  break;
              }
          }
      } catch (e) {
          console.error("Edit failed", e);
          alert("AI Edit failed. Try a different prompt.");
      } finally {
          setIsEditing(false);
      }
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
       <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-gray-100 animate-in slide-in-from-right duration-300">
           {/* Header */}
           <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                    {item.type === 'video' ? <Film size={14} className="text-rose-500"/> : <ImageIcon size={14} className="text-indigo-500"/>}
                    Asset Detail
                </h3>
                <div className="flex gap-2">
                    <button onClick={() => { onDelete(item.id); onClose(); }} className="p-2 text-gray-400 hover:text-rose-600 transition-colors rounded-lg hover:bg-rose-50">
                        <span className="sr-only">Delete</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-50">
                        <X size={18} />
                    </button>
                </div>
           </div>

           {/* Content */}
           <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
               <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 mb-8 shadow-sm">
                   {item.type === 'video' ? (
                       <video src={editedItem.url} controls className="w-full h-auto max-h-[400px] object-contain" autoPlay muted loop />
                   ) : (
                       <img src={editedItem.url} alt="Detail" className="w-full h-auto object-contain" />
                   )}
               </div>

               {/* AI Editor (Image Only) */}
               {item.type === 'image' && (
                   <div className="mb-8 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                       <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                           <Sparkles size={12}/> AI Editor
                       </label>
                       <div className="flex gap-2">
                           <input 
                                className="flex-1 px-3 py-2 bg-white border border-indigo-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                placeholder="Add sunglasses, make it vintage..."
                                value={editPrompt}
                                onChange={(e) => setEditPrompt(e.target.value)}
                                disabled={isEditing}
                           />
                           <button 
                                onClick={handleAIEdit} 
                                disabled={isEditing || !editPrompt}
                                className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                           >
                               {isEditing ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14}/>}
                               Edit
                           </button>
                       </div>
                   </div>
               )}

               <div className="space-y-8">
                   {/* Caption */}
                   <div className="space-y-2">
                       <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">AI Caption</label>
                       <textarea 
                          value={editedItem.caption} 
                          onChange={(e) => setEditedItem({...editedItem, caption: e.target.value})}
                          className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm leading-relaxed focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none resize-none shadow-sm"
                          rows={3}
                       />
                   </div>

                   {/* Shot Info */}
                    {editedItem.shotType && (
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-600 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 w-fit">
                            <Camera size={14} className="text-gray-400"/> {editedItem.shotType}
                        </div>
                    )}

                   {/* Tags */}
                   <div className="space-y-3">
                       <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><Tag size={12}/> Tags</label>
                       <div className="flex flex-wrap gap-2">
                           {editedItem.tags.map(tag => (
                               <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full flex items-center gap-1 group border border-transparent hover:border-gray-200">
                                   {tag}
                                   <button onClick={() => setEditedItem({...editedItem, tags: editedItem.tags.filter(t => t !== tag)})} className="text-gray-400 hover:text-rose-500"><X size={10}/></button>
                               </span>
                           ))}
                       </div>
                       <form onSubmit={addTag}>
                           <input 
                            placeholder="Add tag..." 
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            className="text-xs bg-transparent border-b border-gray-200 focus:border-indigo-500 outline-none py-1 w-full placeholder-gray-300"
                           />
                       </form>
                   </div>

                   {/* Moods */}
                   <div className="space-y-3">
                       <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-400"></div> Moods</label>
                       <div className="flex flex-wrap gap-2">
                           {editedItem.moods.map(mood => (
                               <span key={mood} className="px-3 py-1 bg-rose-50 text-rose-700 text-xs font-medium rounded-full flex items-center gap-1 border border-rose-100">
                                   {mood}
                                   <button onClick={() => setEditedItem({...editedItem, moods: editedItem.moods.filter(m => m !== mood)})} className="text-rose-400 hover:text-rose-600"><X size={10}/></button>
                               </span>
                           ))}
                       </div>
                       <form onSubmit={addMood}>
                           <input 
                            placeholder="Add mood..." 
                            value={moodInput}
                            onChange={(e) => setMoodInput(e.target.value)}
                            className="text-xs bg-transparent border-b border-gray-200 focus:border-rose-500 outline-none py-1 w-full placeholder-gray-300"
                           />
                       </form>
                   </div>

                   {/* Colors */}
                   <div className="space-y-3">
                       <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><Palette size={12}/> Palette</label>
                       <div className="flex gap-3">
                           {editedItem.colors.map(color => (
                               <div key={color} className="group relative">
                                   <div className="w-10 h-10 rounded-full shadow-sm border border-gray-100 ring-2 ring-transparent group-hover:ring-offset-1 group-hover:ring-gray-200 transition-all cursor-pointer" style={{ backgroundColor: color }}></div>
                                   <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-mono text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity bg-white px-1 rounded shadow-sm border border-gray-100">{color}</div>
                               </div>
                           ))}
                       </div>
                   </div>
               </div>
           </div>

           {/* Footer */}
           <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
               <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-900 text-xs font-bold uppercase tracking-wide">Cancel</button>
               <button onClick={handleSave} className="px-6 py-2 bg-gray-900 text-white rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-black transition-all shadow-sm flex items-center gap-2">
                   <Check size={14}/> Save Changes
               </button>
           </div>
       </div>
    </div>
  );
};

export default MoodboardDetail;
