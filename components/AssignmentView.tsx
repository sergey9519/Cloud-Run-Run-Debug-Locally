
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, GripVertical, Clock } from 'lucide-react';
import { Freelancer, Project, Assignment } from '../types';

interface AssignmentViewProps {
    freelancers: Freelancer[];
    projects: Project[];
    assignments: Assignment[];
    onAssign: (assignment: Assignment) => void;
    checkConflict?: (freelancerId: string, start: string, end: string, ignoreAssignmentId?: string) => Assignment | undefined;
}

const AssignmentView: React.FC<AssignmentViewProps> = ({ freelancers, projects, assignments, onAssign, checkConflict }) => {
    const [currentDate, setCurrentDate] = useState(new Date('2023-10-01'));
    
    const DAYS_TO_SHOW = 21;
    const CELL_WIDTH = 54;
    
    const getUnassignedRoles = () => {
        const unassigned: { project: Project, roleId: string, roleName: string, count: number }[] = [];
        projects.forEach(p => {
            p.roleRequirements.forEach(r => {
                const filled = assignments.filter(a => a.projectId === p.id && a.role === r.role).length;
                if (filled < r.count) {
                    unassigned.push({ project: p, roleId: r.id, roleName: r.role, count: r.count - filled });
                }
            });
        });
        return unassigned;
    };

    const unassignedRoles = getUnassignedRoles();

    const handleDragStart = (e: React.DragEvent, roleData: any) => {
        e.dataTransfer.setData('application/json', JSON.stringify(roleData));
        e.dataTransfer.effectAllowed = 'copy';
    };

    const handleDrop = (e: React.DragEvent, freelancerId: string) => {
        e.preventDefault();
        try {
            const rawData = e.dataTransfer.getData('application/json');
            if (!rawData) return;
            
            const data = JSON.parse(rawData);
            if (!data.projectId || !data.roleName) return;

            const project = projects.find(p => p.id === data.projectId);
            
            if (project) {
                if (project.startDate && project.dueDate && new Date(project.startDate) > new Date(project.dueDate)) {
                    alert("Cannot assign: Project start date is after due date.");
                    return;
                }

                const defaultStart = new Date(currentDate).toISOString();
                const defaultEnd = new Date(currentDate.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

                const start = project.startDate || defaultStart;
                const end = project.dueDate || defaultEnd;

                if (checkConflict) {
                    const conflict = checkConflict(freelancerId, start, end);
                    if (conflict) {
                         const confirm = window.confirm(`Scheduling Conflict detected. Create overlap?`);
                         if (!confirm) return;
                    }
                }

                const newAssignment: Assignment = {
                    id: `asn-${Date.now()}`,
                    projectId: project.id,
                    freelancerId: freelancerId,
                    role: data.roleName,
                    startDate: start,
                    endDate: end,
                    allocation: 100,
                    status: 'Tentative',
                    notes: ''
                };
                onAssign(newAssignment);
            }
        } catch (err) {
            console.error("Drop failed", err);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const calendarDays = [];
    for (let i = 0; i < DAYS_TO_SHOW; i++) {
        const d = new Date(currentDate);
        d.setDate(d.getDate() + i);
        calendarDays.push(d);
    }

    const getPositionStyle = (start: string, end: string) => {
        const s = new Date(start);
        const e = new Date(end);
        const viewStart = currentDate;
        
        const diffTime = Math.abs(e.getTime() - s.getTime());
        const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        const offsetTime = s.getTime() - viewStart.getTime();
        const offsetDays = Math.ceil(offsetTime / (1000 * 60 * 60 * 24));

        if (offsetDays + durationDays < 0 || offsetDays > DAYS_TO_SHOW) return null;

        const left = Math.max(0, offsetDays * CELL_WIDTH);
        const width = Math.min(durationDays * CELL_WIDTH, (DAYS_TO_SHOW * CELL_WIDTH) - left);

        return { left: `${left}px`, width: `${width}px` };
    };

    return (
        <div className="p-6 md:p-12 max-w-[2000px] mx-auto space-y-8 animate-enter pb-24 font-sans text-ink">
            <div className="flex justify-between items-end px-2">
                <div>
                    <h1 className="text-5xl font-semibold tracking-tighter text-ink leading-[0.9]">Schedule.</h1>
                    <p className="text-pencil mt-2 text-sm font-medium tracking-wide">Allocation timeline.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 bg-white p-1.5 border border-mist rounded-xl shadow-sm">
                        <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); }} className="p-2 hover:bg-gray-50 text-pencil transition-colors rounded-lg"><ChevronLeft size={16}/></button>
                        <div className="flex items-center gap-2 px-6 min-w-[180px] justify-center font-bold text-ink text-xs font-mono uppercase tracking-wide">
                            <Calendar size={14} className="text-pencil"/>
                            {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                        </div>
                        <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); }} className="p-2 hover:bg-gray-50 text-pencil transition-colors rounded-lg"><ChevronRight size={16}/></button>
                    </div>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-8 pb-4 h-[700px]">
                {/* Sidebar: Unassigned */}
                <div className="w-full xl:w-72 flex-shrink-0 bg-white border border-mist flex flex-col h-full rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-5 border-b border-mist bg-canvas/30">
                        <h3 className="text-[10px] font-bold text-pencil uppercase tracking-widest">Unassigned Roles</h3>
                    </div>
                    <div className="p-4 overflow-y-auto flex-1 space-y-3 custom-scrollbar bg-white">
                        {unassignedRoles.length === 0 ? (
                            <div className="text-center py-16 text-pencil text-xs flex flex-col items-center opacity-60">
                                <div className="mb-3 p-3 bg-canvas rounded-xl border border-mist"><Clock size={20}/></div>
                                <span className="font-bold uppercase tracking-widest text-[10px]">All roles filled</span>
                            </div>
                        ) : (
                            unassignedRoles.map((item, idx) => (
                                <div 
                                    key={`${item.project.id}-${item.roleId}-${idx}`}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, { projectId: item.project.id, roleName: item.roleName })}
                                    className="bg-white border border-mist p-4 hover:border-ink cursor-grab active:cursor-grabbing transition-colors group relative rounded-xl hover:shadow-md"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[9px] font-bold text-white bg-ink px-2 py-0.5 uppercase tracking-wide rounded-md shadow-sm">{item.roleName}</span>
                                        <GripVertical size={14} className="text-mist group-hover:text-ink transition-colors" />
                                    </div>
                                    <div className="text-sm font-semibold text-ink truncate tracking-tight">{item.project.name}</div>
                                    <div className="text-[10px] text-pencil mt-1.5 flex items-center gap-1.5 font-medium">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                        {item.project.startDate ? new Date(item.project.startDate).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : 'TBD'}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Main Gantt */}
                <div className="flex-1 bg-white border border-mist flex flex-col overflow-hidden rounded-2xl shadow-sm">
                    <div className="flex border-b border-mist bg-canvas/30 overflow-x-hidden">
                        <div className="w-72 flex-shrink-0 p-5 border-r border-mist font-bold text-[10px] text-pencil uppercase tracking-widest flex items-center bg-canvas/30 z-20 sticky left-0">Freelancer</div>
                        <div className="flex-1 overflow-hidden relative">
                            <div className="flex" style={{ width: `${DAYS_TO_SHOW * CELL_WIDTH}px` }}>
                                {calendarDays.map((date, i) => {
                                    const isToday = date.toDateString() === new Date().toDateString();
                                    return (
                                    <div key={i} className={`flex-shrink-0 text-center border-r border-mist/50 last:border-r-0 ${isToday ? 'bg-indigo-50/20' : ''}`} style={{ width: `${CELL_WIDTH}px` }}>
                                        <div className="text-[9px] text-pencil uppercase py-3 font-bold tracking-wider">{date.toLocaleDateString('en-US', { weekday: 'narrow' })}</div>
                                        <div className={`text-xs font-bold pb-3 font-mono ${isToday ? 'text-indigo-600' : 'text-ink'}`}>
                                            {date.getDate()}
                                        </div>
                                    </div>
                                )})}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {freelancers.map(freelancer => {
                            const userAssignments = assignments.filter(a => a.freelancerId === freelancer.id);
                            
                            return (
                                <div 
                                    key={freelancer.id} 
                                    className="flex border-b border-mist min-h-[80px] hover:bg-canvas/30 transition-colors group/row"
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, freelancer.id)}
                                >
                                    <div className="w-72 flex-shrink-0 p-5 border-r border-mist flex items-center gap-4 bg-white z-10 sticky left-0 group-hover/row:bg-gray-50/50 transition-colors">
                                        <div className="relative">
                                            <img src={freelancer.avatar} className="w-10 h-10 rounded-xl border border-mist object-cover" />
                                            {freelancer.utilization > 0 && (
                                                <div className={`absolute -bottom-1 -right-1 w-3 h-3 border-2 border-white flex items-center justify-center rounded-full ${freelancer.utilization > 100 ? 'bg-rose-500' : 'bg-emerald-500'}`}>
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-semibold text-ink truncate tracking-tight">{freelancer.name}</div>
                                            <div className="text-[10px] text-pencil truncate font-medium uppercase tracking-widest mt-0.5">{freelancer.role}</div>
                                        </div>
                                    </div>

                                    <div className="flex-1 relative overflow-hidden">
                                        <div className="absolute inset-0 flex pointer-events-none">
                                            {[...Array(DAYS_TO_SHOW)].map((_, i) => (
                                                <div key={i} className="border-r border-mist/30 h-full" style={{ width: `${CELL_WIDTH}px` }}></div>
                                            ))}
                                        </div>

                                        {userAssignments.map(assign => {
                                            const style = getPositionStyle(assign.startDate, assign.endDate);
                                            if (!style) return null;
                                            const project = projects.find(p => p.id === assign.projectId);

                                            return (
                                                <div 
                                                    key={assign.id}
                                                    className="absolute top-1/2 -translate-y-1/2 h-12 border border-ink bg-white overflow-hidden cursor-pointer hover:bg-ink group z-10 transition-colors rounded shadow-sm"
                                                    style={{ ...style }}
                                                    title={`${project?.name} - ${assign.role}`}
                                                >
                                                    <div className="pl-3 pr-3 h-full flex flex-col justify-center">
                                                        <span className="text-[10px] font-bold text-ink group-hover:text-white truncate uppercase tracking-widest">{project?.name}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        
                                        {userAssignments.length === 0 && (
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 pointer-events-none transition-opacity duration-300">
                                                <span className="text-[9px] text-pencil font-bold uppercase tracking-widest border border-dashed border-mist px-3 py-1.5 bg-white rounded-lg shadow-sm">Drop to assign</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssignmentView;
