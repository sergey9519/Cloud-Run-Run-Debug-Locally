
import React, { useState, useEffect } from 'react';
import { X, Sparkles, Plus, Trash2, Loader2, User, FileText, BrainCircuit, AlertTriangle, Tag, Calendar } from 'lucide-react';
import { Project, RoleRequirement, ProjectStatus, Priority } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import { generateContentWithRetry } from '../services/api';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Partial<Project>) => void;
  initialData?: Project;
}

const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState<Partial<Project>>({
    name: '',
    clientName: '',
    category: '',
    description: '',
    status: ProjectStatus.PLANNED,
    priority: Priority.NORMAL,
    roleRequirements: [],
    budget: '',
    startDate: '',
    dueDate: '',
    tags: [],
    notes: ''
  });

  const [rawContext, setRawContext] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({ ...initialData });
        setTagInput(initialData.tags?.join(', ') || '');
        setRawContext('');
      } else {
        setFormData({
          name: '',
          clientName: '',
          category: 'Social Media',
          description: '',
          status: ProjectStatus.PLANNED,
          priority: Priority.NORMAL,
          roleRequirements: [],
          budget: '',
          startDate: new Date().toISOString().split('T')[0],
          dueDate: '',
          tags: [],
          notes: ''
        });
        setTagInput('');
        setRawContext('');
      }
    }
  }, [isOpen, initialData]);

  const handleGenerateAI = async () => {
    if (!process.env.API_KEY || (!formData.name && !rawContext)) {
      alert("Please enter a Project Name or provide Source Material.");
      return;
    }

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        Role: Creative Producer AI.
        Task: Analyze the context and structure a project.
        
        CONTEXT: "${rawContext || formData.name}"
        CLIENT: ${formData.clientName}

        Return JSON schema:
        {
          "narrative_brief": "String",
          "production_constraints": "String",
          "stylistic_tags": ["String"],
          "suggested_roles": [{ "role": "String", "count": Integer, "skills": ["String"] }]
        }
      `;

      const response = await generateContentWithRetry(ai, {
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });

      const cleanJson = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
      const result = JSON.parse(cleanJson);

      const newRoles: RoleRequirement[] = (result.suggested_roles || []).map((r: any, idx: number) => ({
        id: `role-${Date.now()}-${idx}`,
        role: r.role,
        count: r.count || 1,
        filled: 0,
        skillsRequired: r.skills || []
      }));

      setFormData(prev => ({
        ...prev,
        description: result.narrative_brief,
        notes: result.production_constraints,
        roleRequirements: newRoles.length > 0 ? newRoles : prev.roleRequirements,
        tags: result.stylistic_tags || []
      }));
      
      setTagInput((result.stylistic_tags || []).join(', '));

    } catch (e) {
      console.error("AI Generation failed", e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const processedTags = tagInput.split(',').map(t => t.trim()).filter(Boolean);
    onSave({ ...formData, tags: processedTags });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 font-sans animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200">
        
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{initialData ? 'Edit Project' : 'New Project'}</h2>
            <p className="text-xs text-gray-500">Configure campaign parameters.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
            
            {/* AI Sidebar */}
            <div className="w-full lg:w-80 bg-gray-50/50 border-r border-gray-100 p-6 flex flex-col gap-6 overflow-y-auto">
                 <div className="flex-1 flex flex-col">
                    <label className="text-[10px] font-bold text-indigo-900 uppercase tracking-wide mb-2 flex items-center gap-2">
                        <BrainCircuit size={12} className="text-indigo-600"/> Auto-Config
                    </label>
                    <textarea
                        className="flex-1 w-full p-3 bg-white border border-indigo-100 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs resize-none shadow-sm placeholder-indigo-200 text-gray-700 leading-relaxed font-mono"
                        placeholder="Paste messy notes, emails, or briefs here. AI will structure the project."
                        value={rawContext}
                        onChange={(e) => setRawContext(e.target.value)}
                    />
                    <button 
                        type="button"
                        onClick={handleGenerateAI}
                        disabled={isGenerating || (!rawContext && !formData.name)}
                        className="mt-3 bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2 uppercase tracking-wide"
                    >
                        {isGenerating ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12} />}
                        {isGenerating ? 'Processing...' : 'Analyze & Fill'}
                    </button>
                 </div>
                 
                 <div className="pt-6 border-t border-gray-200 space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Name</label>
                        <input 
                            required
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-sm font-medium"
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Client</label>
                        <input 
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-sm"
                            value={formData.clientName}
                            onChange={e => setFormData({...formData, clientName: e.target.value})}
                        />
                    </div>
                 </div>
            </div>

            {/* Main Form */}
            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                <form id="project-form" onSubmit={handleSave} className="space-y-8 max-w-3xl mx-auto">
                    
                    <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-2">
                            <label className="text-[11px] font-semibold text-gray-700 flex items-center gap-2">
                                <FileText size={14} className="text-gray-400"/> Narrative Brief
                            </label>
                            <textarea 
                                className="w-full p-4 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900/5 focus:border-gray-900 outline-none text-sm leading-relaxed min-h-[120px] shadow-sm font-sans"
                                placeholder="Core story..."
                                value={formData.description}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] font-semibold text-gray-700 flex items-center gap-2">
                                <AlertTriangle size={14} className="text-gray-400"/> Constraints
                            </label>
                            <textarea 
                                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900/5 focus:border-gray-900 outline-none text-xs font-mono min-h-[80px] text-gray-600"
                                placeholder="Tech specs..."
                                value={formData.notes}
                                onChange={e => setFormData({...formData, notes: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 rounded-xl border border-gray-100 bg-white shadow-sm">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Status</label>
                            <select 
                                className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs font-medium outline-none focus:border-gray-400"
                                value={formData.status}
                                onChange={e => setFormData({...formData, status: e.target.value as ProjectStatus})}
                            >
                                {Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Start</label>
                            <input type="date" className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs font-medium outline-none focus:border-gray-400"
                                value={formData.startDate ? new Date(formData.startDate).toISOString().split('T')[0] : ''}
                                onChange={e => setFormData({...formData, startDate: e.target.value})}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Due</label>
                            <input type="date" className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs font-medium outline-none focus:border-gray-400"
                                value={formData.dueDate ? new Date(formData.dueDate).toISOString().split('T')[0] : ''}
                                onChange={e => setFormData({...formData, dueDate: e.target.value})}
                            />
                        </div>
                        <div className="col-span-2 md:col-span-4 mt-2">
                             <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1 mb-1"><Tag size={12}/> Tags</label>
                             <input 
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs font-medium outline-none focus:border-gray-400"
                                placeholder="Comma separated tags..."
                                value={tagInput}
                                onChange={e => setTagInput(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                         <div className="flex justify-between items-center mb-3">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Staffing Plan</label>
                            <button type="button" onClick={() => setFormData(p => ({...p, roleRequirements: [...(p.roleRequirements||[]), {id:`role-${Date.now()}`, role:'New', count:1, filled:0, skillsRequired:[]}]}))} className="text-indigo-600 hover:text-indigo-700 text-[10px] font-bold flex items-center gap-1 uppercase">
                                <Plus size={12}/> Add Role
                            </button>
                        </div>
                        
                        <div className="space-y-2">
                            {formData.roleRequirements?.map((req) => (
                                <div key={req.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                                    <User size={14} className="text-gray-400"/>
                                    <input className="w-32 bg-transparent text-xs font-bold text-gray-900 border-none focus:ring-0 p-0" value={req.role} onChange={e => {
                                        const newRoles = formData.roleRequirements?.map(r => r.id === req.id ? {...r, role: e.target.value} : r);
                                        setFormData({...formData, roleRequirements: newRoles});
                                    }} />
                                    <div className="h-4 w-px bg-gray-200"></div>
                                    <input type="number" className="w-12 bg-transparent text-xs text-gray-600 border-none focus:ring-0 p-0 text-center" value={req.count} onChange={e => {
                                        const newRoles = formData.roleRequirements?.map(r => r.id === req.id ? {...r, count: parseInt(e.target.value)} : r);
                                        setFormData({...formData, roleRequirements: newRoles});
                                    }} />
                                    <div className="h-4 w-px bg-gray-200"></div>
                                    <input className="flex-1 bg-transparent text-xs text-gray-500 border-none focus:ring-0 p-0" placeholder="Required Skills..." value={req.skillsRequired.join(', ')} onChange={e => {
                                        const newRoles = formData.roleRequirements?.map(r => r.id === req.id ? {...r, skillsRequired: e.target.value.split(',')} : r);
                                        setFormData({...formData, roleRequirements: newRoles});
                                    }} />
                                    <button type="button" onClick={() => setFormData(p => ({...p, roleRequirements: p.roleRequirements?.filter(r => r.id !== req.id)}))} className="text-gray-400 hover:text-rose-500"><Trash2 size={14}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </form>
            </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3 z-10">
            <button onClick={onClose} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-md text-xs transition-colors">
                Cancel
            </button>
            <button onClick={handleSave} className="px-5 py-2 bg-gray-900 text-white font-medium rounded-md text-xs hover:bg-black shadow-sm transition-all">
                {initialData ? 'Update Project' : 'Create Project'}
            </button>
        </div>

      </div>
    </div>
  );
};

export default ProjectModal;
