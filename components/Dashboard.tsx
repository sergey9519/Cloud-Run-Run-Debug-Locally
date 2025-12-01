import React from 'react';
import { LayoutGrid, Activity, CalendarDays, CheckCircle2, Command, ArrowUpRight, Database, Zap } from 'lucide-react';
import { Project, Freelancer, Assignment, Priority, ProjectStatus } from '../types';
import { Link } from 'react-router-dom';
import AIChat from './AIChat';
import DriveFileBrowser from './DriveFileBrowser';
import { SchemaType, FunctionDeclarationSchema } from "@google/generative-ai";

interface DashboardProps {
  projects: Project[];
  freelancers: Freelancer[];
  assignments: Assignment[];
  onCallAction: (action: string, params: any) => Promise<any>;
}

const DataHUD = ({ label, value, trend, icon: Icon, active = false, delay = 0 }: any) => (
    <div 
        className={`
            relative overflow-hidden rounded-3xl p-6 flex flex-col justify-between h-full min-h-[140px] transition-all duration-700 hover:-translate-y-1 hover:shadow-float group cursor-default
            ${active 
                ? 'bg-ink-primary text-white shadow-card ring-1 ring-white/10' 
                : 'bg-surface text-ink-primary shadow-soft border border-border-subtle/60'
            }
        `}
        style={{ animationDelay: `${delay}ms` }}
    >
        {active && (
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-edge-teal/20 to-edge-magenta/20 blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none opacity-60"></div>
        )}
        
        <div className="flex justify-between items-start relative z-10">
            <div className={`p-2.5 rounded-2xl ${active ? 'bg-white/10 backdrop-blur-md' : 'bg-app border border-border-subtle'}`}>
                <Icon size={18} strokeWidth={2} className={active ? 'text-white' : 'text-ink-secondary'} />
            </div>
            {trend && (
                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${active ? 'bg-white/10 text-white border border-white/10' : 'bg-state-success-bg text-state-success border border-state-success/20'}`}>
                    <ArrowUpRight size={10} strokeWidth={3} /> {trend}
                </div>
            )}
        </div>
        
        <div className="relative z-10 mt-auto pt-4">
            <div className="text-4xl font-display font-semibold tracking-tighter leading-none mb-1.5">{value}</div>
            <div className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${active ? 'text-white/60' : 'text-ink-tertiary'}`}>
                {label}
            </div>
        </div>
    </div>
);

const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
};

const MorningBriefing = ({ projectCount, urgentCount, assignments }: { projectCount: number, urgentCount: number, assignments: number }) => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const greeting = getGreeting();
    
    return (
        <div className="bg-surface rounded-3xl p-8 relative overflow-hidden group h-full flex flex-col border border-border-subtle/60 shadow-card hover:shadow-float transition-shadow duration-700">
            {/* Dynamic Background Mesh - Optimized */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent opacity-60 blur-3xl -translate-y-1/3 translate-x-1/4 pointer-events-none"></div>

            {/* Top Bar: Date & Status */}
            <div className="relative z-10 flex items-center justify-between mb-8">
                 <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-ink-secondary uppercase tracking-widest border border-border-subtle px-3 py-1.5 rounded-full bg-app/50 backdrop-blur-sm font-mono">{today}</span>
                 </div>
                 <span className="text-[10px] font-bold text-edge-teal uppercase tracking-widest flex items-center gap-2 bg-white/80 border border-border-subtle/50 px-3 py-1.5 rounded-full backdrop-blur-sm shadow-sm">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-edge-teal opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-edge-teal"></span>
                    </span>
                    System Optimal
                 </span>
            </div>
            
            <div className="relative z-10 flex-1 flex flex-col justify-between animate-enter">
                <div>
                    <h1 className="text-5xl font-display font-semibold text-ink-primary tracking-tighter leading-[0.95] mb-4">
                        {greeting}.
                    </h1>
                    <p className="text-sm text-ink-secondary font-medium max-w-[80%] leading-relaxed text-balance">
                        Studio performance is nominal. You have <span className="text-ink-primary font-bold">{assignments} active assignments</span> scheduled across the global roster.
                    </p>
                </div>
                
                {/* Compact Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mt-auto">
                    <div className="flex flex-col justify-center p-4 rounded-2xl bg-app/40 border border-border-subtle/60 hover:bg-white hover:border-border-hover transition-colors group/stat cursor-default">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white border border-border-subtle flex items-center justify-center text-primary font-bold text-sm shadow-sm group-hover/stat:scale-110 transition-transform duration-300">
                                {projectCount}
                            </div>
                            <div>
                                <div className="text-sm font-bold text-ink-primary tracking-tight">Active</div>
                                <div className="text-[9px] text-ink-tertiary uppercase tracking-widest font-semibold">Campaigns</div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col justify-center p-4 rounded-2xl bg-app/40 border border-border-subtle/60 hover:bg-white hover:border-border-hover transition-colors group/stat cursor-default">
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl border border-border-subtle flex items-center justify-center font-bold text-sm shadow-sm group-hover/stat:scale-110 transition-transform duration-300 ${urgentCount > 0 ? 'bg-state-danger-bg text-state-danger border-state-danger/20' : 'bg-white text-ink-tertiary'}`}>
                                {urgentCount}
                            </div>
                            <div>
                                <div className="text-sm font-bold text-ink-primary tracking-tight">Attention</div>
                                <div className="text-[9px] text-ink-tertiary uppercase tracking-widest font-semibold">Required</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PriorityStack = ({ projects }: { projects: Project[] }) => {
    const urgentProjects = projects
        .filter(p => p.priority === Priority.URGENT || p.priority === Priority.HIGH)
        .filter(p => p.status !== ProjectStatus.DELIVERED && p.status !== ProjectStatus.ARCHIVED)
        .sort((a, b) => (a.dueDate && b.dueDate ? new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime() : 0))
        .slice(0, 5);

    return (
        <div className="bg-surface rounded-3xl flex flex-col h-full overflow-hidden border border-border-subtle/60 shadow-soft hover:shadow-card transition-shadow duration-500">
            <div className="px-6 py-5 border-b border-border-subtle/60 flex justify-between items-center bg-surface/50 backdrop-blur-md">
                <h3 className="text-[10px] font-bold text-ink-secondary uppercase tracking-widest flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-state-danger animate-pulse"></div>
                    Critical Path
                </h3>
                <Link to="/projects" className="text-[10px] font-bold text-ink-primary hover:text-primary uppercase tracking-widest transition-colors px-2 py-1 rounded hover:bg-subtle">View Index</Link>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-app/30">
                {urgentProjects.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-ink-tertiary text-center opacity-60">
                        <CheckCircle2 size={40} className="mb-4 opacity-20 text-state-success"/>
                        <p className="text-[10px] font-bold uppercase tracking-widest">All Systems Normal</p>
                    </div>
                ) : (
                    urgentProjects.map(p => (
                        <Link key={p.id} to={`/projects/${p.id}`} className="block p-4 bg-white border border-border-subtle/60 rounded-2xl hover:border-primary/30 hover:shadow-sm transition-all group relative overflow-hidden">
                            <div className="flex justify-between items-start mb-2 relative z-10">
                                <span className="font-bold text-xs text-ink-primary line-clamp-1 group-hover:text-primary transition-colors tracking-tight">{p.name}</span>
                                <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${p.priority === Priority.URGENT ? 'bg-state-danger-bg text-state-danger' : 'bg-state-warning-bg text-state-warning'}`}>
                                    {p.priority}
                                </span>
                            </div>
                            <div className="flex items-center justify-between relative z-10">
                                <span className="text-[10px] text-ink-tertiary font-medium uppercase tracking-wide truncate max-w-[60%]">{p.clientName}</span>
                                <span className="text-[10px] text-ink-primary font-mono font-bold flex items-center gap-1.5 bg-app/50 px-2 py-0.5 rounded border border-border-subtle/50">
                                    <CalendarDays size={10} className="text-ink-tertiary"/>
                                    {p.dueDate ? new Date(p.dueDate).toLocaleDateString(undefined, {month:'numeric', day:'numeric'}) : 'N/A'}
                                </span>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ projects, freelancers, assignments, onCallAction }) => {
    const activeAssignments = assignments.filter(a => new Date(a.endDate) >= new Date()).length;
    const urgentProjects = projects.filter(p => p.priority === Priority.URGENT || p.priority === Priority.HIGH).length;
    
    // Tools definition for Dashboard Chat
    const dashboardTools: any[] = [
        {
            name: "create_project",
            description: "Create a new project in the system.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    name: { type: SchemaType.STRING, description: "Project name" },
                    clientName: { type: SchemaType.STRING, description: "Client name" },
                    description: { type: SchemaType.STRING, description: "Brief description" }
                },
                required: ["name"]
            }
        },
        {
            name: "navigate",
            description: "Navigate to a specific page.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    path: { type: SchemaType.STRING, description: "Path to navigate to (e.g. /projects, /freelancers)" }
                },
                required: ["path"]
            }
        }
    ];

    return (
        <div className="p-8 max-w-[1920px] mx-auto space-y-8 animate-enter pb-24 font-sans text-ink-primary">
            {/* Header Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[320px]">
                 <div className="lg:col-span-2 h-full">
                     <MorningBriefing 
                        projectCount={projects.length} 
                        urgentCount={urgentProjects} 
                        assignments={activeAssignments}
                     />
                 </div>
                 <div className="h-full">
                     <PriorityStack projects={projects} />
                 </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <DataHUD label="Total Roster" value={freelancers.length} icon={Zap} delay={100} />
                <DataHUD label="Active Projects" value={projects.filter(p => p.status === ProjectStatus.IN_PROGRESS).length} icon={Activity} active trend="+12%" delay={200} />
                <DataHUD label="Utilization" value={`${Math.round((assignments.length / (freelancers.length || 1)) * 100)}%`} icon={LayoutGrid} delay={300} />
                <DataHUD label="Data Points" value="1.2k" icon={Database} delay={400} />
            </div>

            {/* Main Workspace */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 h-[640px]">
                {/* Left: AI Agent */}
                <div className="xl:col-span-2 bg-white rounded-3xl border border-border-subtle shadow-card overflow-hidden flex flex-col">
                    <AIChat 
                        freelancers={freelancers} 
                        projects={projects} 
                        assignments={assignments} 
                        onCallAction={onCallAction}
                        customTitle="Studio Director AI"
                        customSystemInstruction="You are the Studio Director AI. You can manage projects, assign freelancers, and analyze studio performance."
                        customTools={dashboardTools}
                    />
                </div>

                {/* Right: Quick Access / Drive */}
                <div className="bg-white rounded-3xl border border-border-subtle shadow-card overflow-hidden flex flex-col p-6">
                     <h3 className="font-bold text-ink-secondary text-[10px] uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Command size={14} className="text-ink-tertiary" /> Quick Access
                     </h3>
                     <div className="flex-1 overflow-hidden -mx-2 px-2">
                        <DriveFileBrowser compact onSelect={() => {}} />
                     </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;