import React, { useState, useEffect } from 'react';
import AIChat from './AIChat';
import { Project, Freelancer, Assignment, Script, KnowledgeSource } from '../types';
import { Save, PanelRight, Sparkles, Loader2, ShieldCheck, AlertTriangle, CheckCircle, Database, UploadCloud } from 'lucide-react';
import { RAGEngine, HallucinationGuard, DeepReader } from '../services/intelligence';
import { useSearchParams } from 'react-router-dom';
import { GoogleGenAI } from "@google/genai";
import { generateContentWithRetry } from '../services/api';

interface CreateStudioProps {
  projects: Project[];
  freelancers: Freelancer[];
  assignments: Assignment[];
  onSaveScript?: (script: Script) => Promise<Script>;
  onUpdateProject?: (project: Project) => Promise<void>;
}

const CreativeStudio: React.FC<CreateStudioProps> = ({ projects, freelancers, assignments, onSaveScript }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const paramProjectId = searchParams.get('project');
  
  const [scriptContent, setScriptContent] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [scriptTitle, setScriptTitle] = useState('');
  const [currentScriptId, setCurrentScriptId] = useState<string>('');
  
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  
  // Derived Intelligence State
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [hallucinations, setHallucinations] = useState<any[]>([]);
  const [isGuarding, setIsGuarding] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const contextData = selectedProject?.knowledgeBase?.map(item => `[${item.category}] ${item.title}: ${item.content.substring(0, 500)}...`).join('\n\n') || '';

  // Handle URL Params
  useEffect(() => {
    if (paramProjectId && paramProjectId !== selectedProjectId) setSelectedProjectId(paramProjectId);
  }, [paramProjectId]);

  // Sync Read-Only Context from Project
  useEffect(() => {
    if (selectedProject) {
        const projectSources: KnowledgeSource[] = [];
        selectedProject.knowledgeBase?.forEach(kb => {
            const typeMap: Record<string, 'text' | 'file' | 'url' | 'youtube' | 'wiki'> = { 'General': 'url', 'Research': 'wiki', 'Technical': 'file', 'Brand': 'text' };
            projectSources.push({
                id: kb.id,
                type: typeMap[kb.category] || 'text',
                title: kb.title,
                originalContent: kb.content,
                summary: `Project Context (${kb.category})`,
                status: 'indexed',
                chunks: [],
                createdAt: kb.updatedAt
            });
        });
        if (selectedProject.toneAttributes?.length) {
             projectSources.push({
                 id: 'tone-1',
                 type: 'text',
                 title: 'Tone & Mood',
                 originalContent: selectedProject.toneAttributes.join(', '),
                 summary: 'Creative Direction',
                 status: 'indexed',
                 chunks: [],
                 createdAt: new Date().toISOString()
             });
        }
        if (selectedProject.brandGuidelines) {
            projectSources.push({
                id: 'brand-1',
                type: 'text',
                title: 'Brand Guidelines',
                originalContent: `DO: ${selectedProject.brandGuidelines.dos.join(', ')}. DONT: ${selectedProject.brandGuidelines.donts.join(', ')}`,
                summary: 'Brand Rules',
                status: 'indexed',
                chunks: [],
                createdAt: new Date().toISOString()
            });
        }
        setSources(projectSources);
    }
  }, [selectedProject?.id, selectedProject?.updatedAt]);

  const handleAgentAction = async (action: string, params: any) => {
    if (action === 'update_script') {
        const newContent = params.content;
        setScriptContent(prev => params.mode === 'replace' ? newContent : prev ? prev + '\n' + newContent : newContent);
        setTimeout(() => runHallucinationGuard(newContent), 1000);
        return { status: 'success', message: 'Editor updated' };
    }
    if (action === 'generate_rag_content' && selectedProject) {
       try {
         const content = await RAGEngine.generate(params.prompt, sources, selectedProject);
         return { status: 'success', content };
       } catch (e) { return { status: 'error', message: 'RAG Generation failed' }; }
    }
    return { status: 'error', message: 'Unknown tool' };
  };

  const runHallucinationGuard = async (textToCheck: string) => {
    if (!selectedProject || !textToCheck) return;
    setIsGuarding(true);
    const constraints = [
        ...(selectedProject.tags || []), 
        "Maintain consistent voice", 
        ...(selectedProject.toneAttributes || []),
        ...(selectedProject.brandGuidelines?.dos || []).map(d => `Do: ${d}`),
        ...(selectedProject.brandGuidelines?.donts || []).map(d => `Don't: ${d}`),
        ...(selectedProject.knowledgeBase?.map(k => k.content.slice(0, 50)) || [])
    ];
    const check = await HallucinationGuard.validate(textToCheck, constraints);
    setHallucinations(check.violations);
    setIsGuarding(false);
  };

  const handleEnhance = async () => {
    if (!scriptContent.trim() || !process.env.API_KEY) return;
    setIsEnhancing(true);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Refine and structure this creative writing. Use markdown headers and bullet points. Content: ${scriptContent}`;
        const response = await generateContentWithRetry(ai, { model: 'gemini-2.5-flash', contents: prompt });
        if (response.text) {
             setScriptContent(response.text);
             setTimeout(() => runHallucinationGuard(response.text), 500);
        }
    } catch(e) { console.error(e); } finally { setIsEnhancing(false); }
  };

  const handleSave = async () => {
      if (onSaveScript) {
         const saved = await onSaveScript({
             id: currentScriptId || `scr-${Date.now()}`, 
             title: scriptTitle || 'Untitled Script', 
             content: scriptContent, 
             version: 1, 
             createdAt: new Date().toISOString(), 
             updatedAt: new Date().toISOString(), 
             projectId: selectedProjectId
         });
         setCurrentScriptId(saved.id);
         setSearchParams(prev => { prev.set('script', saved.id); return prev; });
      }
  };

  const handleDrop = async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          const file = e.dataTransfer.files[0];
          try {
             // Use DeepReader to get text content from dropped file
             const source = await DeepReader.ingestFile(file);
             setScriptContent(prev => prev ? prev + '\n\n' + source.originalContent : source.originalContent);
          } catch(err) {
              console.error(err);
              alert("Could not read file.");
          }
      }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] min-h-[600px] bg-[#F5F5F7] font-sans text-gray-900 overflow-hidden">
        {/* Center Editor */}
        <div 
            className="flex-1 flex flex-col relative bg-white shadow-soft z-10 mx-6 my-6 rounded-2xl border border-gray-100 overflow-hidden"
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
        >
            {dragActive && (
                <div className="absolute inset-0 z-50 bg-indigo-50/90 backdrop-blur-md flex flex-col items-center justify-center border-2 border-indigo-500 border-dashed m-3 rounded-xl transition-all duration-300">
                    <UploadCloud size={48} className="text-indigo-600 mb-3 animate-bounce"/>
                    <h3 className="text-xl font-bold text-indigo-900 tracking-tight">Drop to Import</h3>
                    <p className="text-sm text-indigo-700 font-medium">Appends file content to editor</p>
                </div>
            )}

            {/* Toolbar */}
            <div className="h-16 border-b border-gray-100 bg-white/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-30">
                 <div className="flex items-center gap-4">
                     <select 
                        value={selectedProjectId} 
                        onChange={(e) => { setSelectedProjectId(e.target.value); setSearchParams(prev => { prev.set('project', e.target.value); return prev; }); }}
                        className="bg-transparent text-xs font-bold text-gray-700 focus:outline-none cursor-pointer hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors border border-transparent hover:border-gray-100 uppercase tracking-wide"
                     >
                         <option value="">Select Context...</option>
                         {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                     </select>
                 </div>
                 
                 <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-2">
                    <input 
                        type="text" value={scriptTitle} onChange={(e) => setScriptTitle(e.target.value)} placeholder="Untitled Script"
                        className="text-center text-sm font-semibold text-gray-900 focus:outline-none placeholder-gray-300 hover:bg-gray-50 rounded-lg px-4 py-1.5 transition-colors tracking-tight"
                    />
                 </div>

                 <div className="flex items-center gap-3">
                    <button onClick={handleEnhance} disabled={isEnhancing} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50">
                        {isEnhancing ? <Loader2 size={18} className="animate-spin"/> : <Sparkles size={18}/>}
                    </button>
                    <button onClick={handleSave} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-black transition-all flex items-center gap-2 shadow-sm uppercase tracking-widest">
                        <Save size={14}/> Save
                    </button>
                    <div className="h-6 w-px bg-gray-100 mx-1"></div>
                    <button onClick={() => setShowRightPanel(!showRightPanel)} className={`p-2 rounded-lg transition-colors ${showRightPanel ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'}`}>
                         <PanelRight size={20} />
                    </button>
                 </div>
            </div>

            <div className="flex-1 relative overflow-hidden">
                {!selectedProjectId && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50/50 z-20 pointer-events-none backdrop-blur-[2px]">
                        <p className="text-sm text-gray-400 font-medium tracking-wide">Select a project to enable AI tools</p>
                    </div>
                )}
                <textarea
                    className="absolute inset-0 w-full h-full p-10 resize-none focus:outline-none font-mono text-sm leading-8 text-gray-800 z-10 bg-transparent custom-scrollbar"
                    value={scriptContent} onChange={(e) => setScriptContent(e.target.value)} spellCheck={false} placeholder="Start writing or drop a text file here..."
                />
            </div>

            <div className="h-10 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between px-6 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                <div className="flex items-center gap-6">
                    <span>{scriptContent.length} chars</span>
                    <span className="flex items-center gap-2"><Database size={12} className="text-gray-400"/> {sources.length} active sources</span>
                </div>
                <div>
                    {isGuarding ? <span className="text-amber-500 flex items-center gap-2"><ShieldCheck size={14}/> Scanning Content...</span> : 
                     hallucinations.length > 0 ? <span className="text-rose-500 flex items-center gap-2"><AlertTriangle size={14}/> {hallucinations.length} Issues Detected</span> : 
                     <span className="text-emerald-600 flex items-center gap-2"><CheckCircle size={14}/> Guard Active</span>}
                </div>
            </div>
        </div>

        {/* Right Panel */}
        <div className={`flex-shrink-0 border-l border-gray-100 bg-white z-20 transition-all duration-500 cubic-bezier(0.2,0.8,0.2,1) ${showRightPanel ? 'w-[420px] translate-x-0' : 'w-0 translate-x-full opacity-0 overflow-hidden'}`}>
            <div className="w-[420px] h-full">
                <AIChat
                    key={selectedProjectId || 'default'} 
                    freelancers={freelancers} projects={projects} assignments={assignments} onCallAction={handleAgentAction}
                    agentMode={true} customTitle="Creative Assistant" contextData={contextData}
                />
            </div>
        </div>
    </div>
  );
};

export default CreativeStudio;