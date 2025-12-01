import React, { useState } from 'react';
import { Plus, X, ThumbsUp, ThumbsDown, Palette, Type } from 'lucide-react';
import { Project } from '../types';

interface ToneMoodBoardProps {
  project: Project;
  onUpdate: (updates: Partial<Project>) => void;
}

const ToneMoodBoard: React.FC<ToneMoodBoardProps> = ({ project, onUpdate }) => {
  const [toneInput, setToneInput] = useState('');
  const [doInput, setDoInput] = useState('');
  const [dontInput, setDontInput] = useState('');

  const handleAddTone = (e: React.FormEvent) => {
    e.preventDefault();
    if (toneInput.trim()) {
      onUpdate({
        toneAttributes: [...(project.toneAttributes || []), toneInput.trim()]
      });
      setToneInput('');
    }
  };

  const handleRemoveTone = (tone: string) => {
    onUpdate({
      toneAttributes: (project.toneAttributes || []).filter(t => t !== tone)
    });
  };

  const handleAddDo = (e: React.FormEvent) => {
    e.preventDefault();
    if (doInput.trim()) {
      onUpdate({
        brandGuidelines: {
          ...project.brandGuidelines,
          dos: [...(project.brandGuidelines?.dos || []), doInput.trim()],
          donts: project.brandGuidelines?.donts || []
        }
      });
      setDoInput('');
    }
  };

  const handleAddDont = (e: React.FormEvent) => {
    e.preventDefault();
    if (dontInput.trim()) {
      onUpdate({
        brandGuidelines: {
          ...project.brandGuidelines,
          dos: project.brandGuidelines?.dos || [],
          donts: [...(project.brandGuidelines?.donts || []), dontInput.trim()]
        }
      });
      setDontInput('');
    }
  };

  const handleRemoveRule = (type: 'dos' | 'donts', rule: string) => {
    const current = project.brandGuidelines || { dos: [], donts: [] };
    onUpdate({
      brandGuidelines: {
        ...current,
        [type]: current[type].filter(r => r !== rule)
      }
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Tone & Mood Keywords */}
      <div className="bg-white rounded-2xl border border-mist p-8 shadow-sm hover:shadow-soft transition-shadow duration-500">
        <h3 className="text-[10px] font-bold text-pencil uppercase tracking-widest mb-6 flex items-center gap-2">
          <Palette size={14} className="text-indigo-600"/> Tone & Atmosphere
        </h3>
        
        <div className="flex flex-wrap gap-2 mb-6">
          {(project.toneAttributes || []).map(tone => (
            <span key={tone} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-ink text-xs font-semibold rounded-lg border border-mist shadow-sm">
              {tone}
              <button onClick={() => handleRemoveTone(tone)} className="text-pencil hover:text-rose-500 transition-colors"><X size={10}/></button>
            </span>
          ))}
          {(project.toneAttributes || []).length === 0 && (
             <span className="text-xs text-pencil italic font-medium">No tone keywords defined.</span>
          )}
        </div>

        <form onSubmit={handleAddTone} className="relative group">
           <input 
             type="text" 
             value={toneInput}
             onChange={e => setToneInput(e.target.value)}
             placeholder="Add keyword (e.g. 'Optimistic')"
             className="w-full pl-4 pr-10 py-3 bg-canvas/50 border border-mist rounded-xl text-xs font-medium outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder-pencil/60"
           />
           <button type="submit" disabled={!toneInput} className="absolute right-2 top-2 p-1.5 text-pencil hover:text-indigo-600 disabled:opacity-0 transition-all">
             <Plus size={14}/>
           </button>
        </form>
      </div>

      {/* Brand Guardrails */}
      <div className="bg-white rounded-2xl border border-mist p-8 shadow-sm hover:shadow-soft transition-shadow duration-500">
        <h3 className="text-[10px] font-bold text-pencil uppercase tracking-widest mb-6 flex items-center gap-2">
          <Type size={14} className="text-emerald-600"/> Brand Guardrails
        </h3>

        <div className="space-y-8">
          {/* Do's */}
          <div>
            <div className="flex items-center gap-2 mb-3">
               <ThumbsUp size={12} className="text-emerald-500"/>
               <span className="text-[10px] font-bold text-ink uppercase tracking-wide">Do's</span>
            </div>
            <ul className="space-y-2 mb-3">
              {(project.brandGuidelines?.dos || []).map((rule, i) => (
                <li key={i} className="text-xs text-ink font-medium flex items-start gap-3 group bg-emerald-50/50 p-2 rounded-lg border border-transparent hover:border-emerald-100 transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0"></span>
                  <span className="flex-1 leading-relaxed">{rule}</span>
                  <button onClick={() => handleRemoveRule('dos', rule)} className="text-pencil hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><X size={12}/></button>
                </li>
              ))}
            </ul>
            <form onSubmit={handleAddDo} className="relative">
                <input 
                    type="text" 
                    value={doInput}
                    onChange={e => setDoInput(e.target.value)}
                    placeholder="Add a required element..."
                    className="w-full pl-3 pr-10 py-2 bg-canvas/50 border border-transparent hover:border-mist rounded-lg text-xs font-medium outline-none focus:border-emerald-500 focus:bg-white transition-all placeholder-pencil/50"
                />
                <button type="submit" disabled={!doInput} className="absolute right-1 top-1 p-1 text-pencil hover:text-emerald-600 disabled:opacity-0 transition-all"><Plus size={14}/></button>
            </form>
          </div>

          {/* Don'ts */}
          <div>
             <div className="flex items-center gap-2 mb-3">
               <ThumbsDown size={12} className="text-rose-500"/>
               <span className="text-[10px] font-bold text-ink uppercase tracking-wide">Don'ts</span>
            </div>
             <ul className="space-y-2 mb-3">
              {(project.brandGuidelines?.donts || []).map((rule, i) => (
                <li key={i} className="text-xs text-ink font-medium flex items-start gap-3 group bg-rose-50/50 p-2 rounded-lg border border-transparent hover:border-rose-100 transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0"></span>
                  <span className="flex-1 leading-relaxed">{rule}</span>
                  <button onClick={() => handleRemoveRule('donts', rule)} className="text-pencil hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><X size={12}/></button>
                </li>
              ))}
            </ul>
            <form onSubmit={handleAddDont} className="relative">
                <input 
                    type="text" 
                    value={dontInput}
                    onChange={e => setDontInput(e.target.value)}
                    placeholder="Add a restriction..."
                    className="w-full pl-3 pr-10 py-2 bg-canvas/50 border border-transparent hover:border-mist rounded-lg text-xs font-medium outline-none focus:border-rose-500 focus:bg-white transition-all placeholder-pencil/50"
                />
                <button type="submit" disabled={!dontInput} className="absolute right-1 top-1 p-1 text-pencil hover:text-rose-600 disabled:opacity-0 transition-all"><Plus size={14}/></button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToneMoodBoard;