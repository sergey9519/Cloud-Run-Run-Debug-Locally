import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Clock, ChevronDown, User, Sparkles, Database, FileText, ScrollText, Layers, AlertTriangle, ArrowRight, LayoutDashboard, Grid } from 'lucide-react';
import { Project, Freelancer, Assignment, Script, ProjectContextItem, KnowledgeSource } from '../types';
import { api } from '../services/api';
import ReferenceGallery from './ReferenceGallery';
import ContextHub from './ContextHub';
import ToneMoodBoard from './ToneMoodBoard';
import MoodboardTab from './Moodboard/MoodboardTab';

interface ProjectDetailProps {
    freelancers: Freelancer[];
    projects: Project[];
    assignments: Assignment[];
    logs?: any[]; 
    onAssign: (assignment: Assignment) => void;
    checkConflict?: (freelancerId: string, start: string, end: string, ignoreAssignmentId?: string) => Assignment | undefined;
    onUpdateProject: (project: Project) => void;
    onDelete?: (id: string) => Promise<void>;
    onLog?: (action: string, details: string) => void;
}

const DateBadge = ({ dueDate, idealPostDate }: { dueDate?: string, idealPostDate?: string }) => {
    if (!dueDate) return <span className="text-pencil text-xs font-medium tracking-wide">No Date</span>;

    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let bgClass = "bg-emerald-50 text-emerald-700 border-emerald-100";
    let icon = <Clock size={12} />;
    let text = `${diffDays} days left`;

    if (diffDays < 0) {
        bgClass = "bg-rose-50 text-rose-700 border-rose-100";
        icon = <AlertTriangle size={12} />;
        text = `Overdue (${Math.abs(diffDays)}d)`;
    } else if (diffDays < 3) {
        bgClass = "bg-amber-50 text-amber-700 border-amber-100";
        text = `Due in ${diffDays} days`;
    }

    return (
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${bgClass}`}>
            {icon} {text}
        </div>
    );
};

const ProjectDetail: React.FC<ProjectDetailProps> = ({ projects, freelancers, assignments, onUpdateProject }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const project = projects.find(p => p.id === id);
    const [activeTab, setActiveTab] = useState<'overview' | 'moodboard'>('overview');
    
    const [scripts, setScripts] = useState<Script[]>([]);
    const [sources, setSources] = useState<KnowledgeSource[]>([]);

    useEffect(() => {
        if (project) {
            api.scripts.findByProject(project.id).then(res => setScripts(res.data)).catch(console.error);

            // Map existing ProjectContextItems to KnowledgeSources for the ContextHub
            const projectSources: KnowledgeSource[] = [];
            project.knowledgeBase?.forEach(kb => {
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
            setSources(projectSources);
        }
    }, [project?.id, project?.knowledgeBase]);

    const handleAddSource = async (newSource: KnowledgeSource) => {
        if (!project) return;
        
        // Optimistic UI update
        setSources(prev => [...prev, newSource]);

        // Smart Category Mapping
        let category: ProjectContextItem['category'] = 'General';
        if (newSource.type === 'file') category = 'Technical';
        else if (newSource.type === 'wiki' || newSource.type === 'youtube') category = 'Research';
        else if (newSource.type === 'text') category = 'Brand';

        const newItem: ProjectContextItem = {
            id: newSource.id,
            title: newSource.title,
            content: newSource.originalContent || newSource.summary || '',
            category, 
            updatedAt: new Date().toISOString()
        };

        const updatedKB = [...(project.knowledgeBase || []), newItem];
        onUpdateProject({ ...project, knowledgeBase: updatedKB });
    };

    const handleRemoveSource = async (id: string) => {
        if (!project) return;
        setSources(prev => prev.filter(s => s.id !== id));
        const updatedKB = (project.knowledgeBase || []).filter(kb => kb.id !== id);
        onUpdateProject({ ...project, knowledgeBase: updatedKB });
    };
    
    const handleProjectUpdate = (updates: Partial<Project>) => {
        if (!project) return;
        onUpdateProject({ ...project, ...updates });
    };

    if (!project) return <div className="p-12 text-center text-pencil text-sm font-medium">Project not found</div>;

    const assignedFreelancers = assignments
        .filter(a => a.projectId === project.id)
        .map(a => freelancers.find(f => f.id === a.freelancerId))
        .filter(Boolean) as Freelancer[];

    return (
        <div className="h-full min-h-screen flex flex-col bg-app font-sans text-ink">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-border-subtle px-10 py-5 flex flex-col gap-6 transition-all duration-300">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button onClick={() => navigate('/projects')} className="p-2 -ml-2 hover:bg-subtle rounded-full text-ink-secondary hover:text-ink-primary transition-colors">
                            <ChevronDown size={20} className="rotate-90" strokeWidth={2.5} />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 mb-2 opacity-80">
                                <span className="text-[10px] font-bold tracking-widest text-ink-secondary uppercase">{project.category || 'Campaign'}</span>
                                <span className="text-border-hover text-[10px]">/</span>
                                <span className="text-[10px] font-bold tracking-widest text-ink-secondary uppercase">{project.clientName}</span>
                            </div>
                            <h1 className="text-3xl font-display font-semibold text-ink-primary leading-none tracking-tight">{project.name}</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <DateBadge dueDate={project.dueDate} idealPostDate={project.idealPostDate} />
                        <button className="bg-ink-primary text-white px-6 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all shadow-sm active:scale-95">
                            Edit Project
                        </button>
                    </div>
                 </div>

                 <div className="flex gap-8 border-t border-border-subtle/50 pt-1">
                     <button 
                        onClick={() => setActiveTab('overview')} 
                        className={`py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${activeTab === 'overview' ? 'border-ink-primary text-ink-primary' : 'border-transparent text-ink-tertiary hover:text-ink-secondary'}`}
                     >
                        <LayoutDashboard size={14} className={activeTab === 'overview' ? 'text-primary' : ''}/> Brief & Specs
                     </button>
                     <button 
                        onClick={() => setActiveTab('moodboard')} 
                        className={`py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${activeTab === 'moodboard' ? 'border-primary text-primary' : 'border-transparent text-ink-tertiary hover:text-primary'}`}
                     >
                        <Grid size={14} className={activeTab === 'moodboard' ? 'text-primary' : ''}/> Visual Moodboard
                     </button>
                 </div>
            </header>

            {activeTab === 'moodboard' ? (
                <div className="flex-1">
                    <MoodboardTab projectId={project.id} />
                </div>
            ) : (
                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden max-w-[1920px] mx-auto w-full p-10 gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    
                    {/* Main Content */}
                    <main className="flex-1 flex flex-col gap-12 overflow-y-auto custom-scrollbar pr-4 pb-24">
                        
                        {/* 1. Brief */}
                        <section>
                            <h2 className="text-[10px] font-bold text-ink-tertiary uppercase tracking-widest mb-5 flex items-center gap-2">
                                    <FileText size={14} className="opacity-70"/> Brief & Constraints
                            </h2>
                            <div className="bg-surface rounded-3xl border border-border-subtle p-10 shadow-sm hover:shadow-card transition-shadow duration-500">
                                <div className="prose prose-sm max-w-none text-ink-primary leading-loose font-sans font-medium text-base/8">
                                    {project.description || <span className="text-ink-tertiary italic font-normal">No brief provided.</span>}
                                </div>
                                {project.notes && (
                                    <div className="mt-10 pt-8 border-t border-border-subtle/50">
                                        <h3 className="text-[10px] font-bold text-ink-tertiary uppercase tracking-widest mb-4 opacity-70">Technical Notes</h3>
                                        <div className="bg-app/50 p-6 rounded-2xl border border-border-subtle/60">
                                            <p className="text-xs text-ink-secondary font-mono leading-relaxed">{project.notes}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* 2. Visual Assets */}
                        <section>
                            <h2 className="text-[10px] font-bold text-ink-tertiary uppercase tracking-widest mb-5 flex items-center gap-2">
                                    <Layers size={14} className="opacity-70"/> Quick References
                            </h2>
                            <ReferenceGallery 
                                items={project.references || []} 
                                onAdd={async (content) => {
                                    const updatedRefs = [...(project.references || []), content];
                                    onUpdateProject({ ...project, references: updatedRefs });
                                }} 
                                onRemove={(url) => {
                                    const updatedRefs = (project.references || []).filter(r => r !== url);
                                    onUpdateProject({ ...project, references: updatedRefs });
                                }}
                            />
                        </section>

                        {/* 3. Creative Direction */}
                        <section>
                            <h2 className="text-[10px] font-bold text-ink-tertiary uppercase tracking-widest mb-5 flex items-center gap-2">
                                    <Sparkles size={14} className="opacity-70"/> Creative Direction
                            </h2>
                            <ToneMoodBoard project={project} onUpdate={handleProjectUpdate} />
                        </section>

                        {/* 4. Project Intelligence */}
                        <section>
                            <h2 className="text-[10px] font-bold text-ink-tertiary uppercase tracking-widest mb-5 flex items-center gap-2">
                                    <Database size={14} className="opacity-70"/> Project Intelligence
                            </h2>
                            <div className="bg-surface rounded-3xl border border-border-subtle overflow-hidden h-[500px] shadow-sm hover:shadow-card transition-shadow duration-500">
                                <ContextHub sources={sources} onAddSource={handleAddSource} onRemoveSource={handleRemoveSource} />
                            </div>
                        </section>

                    </main>

                    {/* Sidebar */}
                    <aside className="w-full lg:w-[400px] flex flex-col gap-8 flex-shrink-0">
                        
                        {/* Team */}
                        <div className="bg-surface rounded-3xl border border-border-subtle p-8 shadow-sm">
                            <h3 className="text-[10px] font-bold text-ink-secondary uppercase tracking-widest mb-6 flex items-center gap-2"><User size={14}/> Team Assignment</h3>
                            <div className="space-y-4">
                                {assignedFreelancers.length === 0 ? (
                                    <div className="text-center py-10 border border-dashed border-border-subtle rounded-2xl bg-app/30">
                                        <span className="text-xs text-ink-tertiary font-medium">No active assignments</span>
                                    </div>
                                ) : (
                                    assignedFreelancers.map(f => (
                                        <div key={f.id} className="flex items-center gap-4 group cursor-default p-2 rounded-xl hover:bg-subtle/30 transition-colors">
                                            <img src={f.avatar} className="w-10 h-10 rounded-full bg-subtle object-cover border border-white shadow-sm group-hover:scale-105 transition-transform duration-300"/>
                                            <div className="min-w-0">
                                                <div className="text-sm font-semibold text-ink-primary truncate tracking-tight">{f.name}</div>
                                                <div className="text-[10px] text-ink-secondary font-medium truncate uppercase tracking-wide mt-0.5">{f.role}</div>
                                            </div>
                                        </div>
                                    ))
                                )}
                                <button className="w-full mt-2 py-3 text-[10px] font-bold text-ink-primary bg-white hover:bg-subtle rounded-xl border border-border-subtle transition-all uppercase tracking-widest shadow-sm hover:shadow-md">
                                    Manage Roster
                                </button>
                            </div>
                        </div>

                        {/* Specs */}
                        <div className="bg-surface rounded-3xl border border-border-subtle p-8 shadow-sm">
                            <h3 className="text-[10px] font-bold text-ink-secondary uppercase tracking-widest mb-6">Specifications</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-3 border-b border-border-subtle/50">
                                    <span className="text-xs text-ink-secondary font-medium">Format</span>
                                    <span className="text-xs font-mono font-bold text-ink-primary bg-app px-2 py-1 rounded">{project.format || '—'}</span>
                                </div>
                                <div className="flex justify-between items-center py-3 border-b border-border-subtle/50">
                                    <span className="text-xs text-ink-secondary font-medium">Duration</span>
                                    <span className="text-xs font-mono font-bold text-ink-primary bg-app px-2 py-1 rounded">{project.length || '—'}</span>
                                </div>
                                <div className="flex justify-between items-center py-3 border-b border-border-subtle/50">
                                    <span className="text-xs text-ink-secondary font-medium">Budget</span>
                                    <span className="text-xs font-mono font-bold text-ink-primary bg-app px-2 py-1 rounded">{project.budget || '—'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Scripts */}
                        <div className="bg-surface rounded-3xl border border-border-subtle p-8 shadow-sm flex flex-col h-[400px]">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-[10px] font-bold text-ink-secondary uppercase tracking-widest flex items-center gap-2">
                                    <ScrollText size={14}/> Scripts
                                </h3>
                                <Link to={`/studio?project=${project.id}`} className="text-[10px] font-bold text-primary hover:text-indigo-800 flex items-center gap-1 transition-colors uppercase tracking-wide group">
                                    Open Studio <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform"/>
                                </Link>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                                {scripts.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-app/30 rounded-2xl border border-dashed border-border-subtle">
                                        <span className="text-xs text-ink-tertiary font-medium mb-3">No drafts initialized.</span>
                                        <Link to={`/studio?project=${project.id}`} className="px-4 py-2 bg-white border border-border-subtle rounded-lg text-[10px] font-bold text-ink-primary uppercase tracking-wide shadow-sm hover:border-ink-secondary transition-all">Start Writing</Link>
                                    </div>
                                ) : (
                                    scripts.map(script => (
                                        <Link key={script.id} to={`/studio?project=${project.id}&script=${script.id}`} className="block p-4 hover:bg-subtle/50 rounded-xl border border-border-subtle hover:border-primary/20 transition-all group shadow-sm hover:shadow-md bg-white">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-semibold text-xs text-ink-primary group-hover:text-primary transition-colors truncate">{script.title}</span>
                                                <span className="text-[9px] font-mono font-bold text-ink-tertiary bg-app px-1.5 py-0.5 rounded border border-border-subtle/50 group-hover:border-primary/20 group-hover:text-primary transition-colors">v{script.version}</span>
                                            </div>
                                            <div className="text-[10px] text-ink-secondary line-clamp-2 leading-relaxed font-medium">{script.content.substring(0, 80)}...</div>
                                        </Link>
                                    ))
                                )}
                            </div>
                        </div>
                    </aside>
                </div>
            )}
        </div>
    );
};

export default ProjectDetail;