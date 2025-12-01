import React, { useState, useMemo } from 'react';
import { Search, Plus, Upload, CheckSquare, Square, ArrowRight, Filter, ChevronDown } from 'lucide-react';
import { Project, ProjectStatus, Priority } from '../types';
import { Link } from 'react-router-dom';
import ProjectModal from './ProjectModal';
import { Badge } from '../src/components/design/Badge';
import { Button } from '../src/components/design/Button';

interface ProjectListProps {
  projects: Project[];
  onCreate?: (project: Partial<Project>) => void;
  onUpdate?: (project: Project) => void;
  onDelete?: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
}

const ProjectList: React.FC<ProjectListProps> = ({ projects, onCreate, onUpdate, onDelete, onBulkDelete }) => {
  const [searchText, setSearchText] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>(undefined);
  const [filters, setFilters] = useState({ status: '', priority: '' });
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'dueDate', direction: 'asc' });

  const filteredProjects = useMemo(() => {
    return projects
        .filter(p => {
            const matchesText = (p.name.toLowerCase().includes(searchText.toLowerCase()) || (p.clientName || '').toLowerCase().includes(searchText.toLowerCase()));
            const matchesStatus = filters.status ? p.status === filters.status : true;
            return matchesText && matchesStatus;
        })
        .sort((a, b) => {
            return sortConfig.direction === 'asc' ? 1 : -1;
        });
  }, [projects, searchText, filters, sortConfig]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProjects.length && filteredProjects.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredProjects.map(p => p.id)));
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const getStatusVariant = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.DELIVERED: return 'success';
      case ProjectStatus.REVIEW: return 'warning';
      case ProjectStatus.IN_PROGRESS: return 'ai';
      default: return 'neutral';
    }
  };

  const getPriorityVariant = (priority?: Priority) => {
    switch (priority) {
      case Priority.URGENT: return 'danger';
      case Priority.HIGH: return 'warning';
      case Priority.NORMAL: return 'ai';
      default: return 'neutral';
    }
  };

  return (
    <div className="p-8 max-w-[1920px] mx-auto space-y-8 font-sans text-ink-primary animate-enter">
      <ProjectModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onSave={(data) => { if(editingProject && onUpdate) onUpdate({...editingProject, ...data} as Project); else if(onCreate) onCreate(data); }}
        initialData={editingProject}
      />
    
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 pb-2">
        <div>
          <h1 className="text-4xl font-display font-semibold tracking-tighter text-ink-primary">Projects</h1>
          <p className="text-ink-secondary mt-2 text-sm font-medium">Manage active campaigns and production schedules.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/imports">
            <Button variant="secondary" size="md" leftIcon={<Upload size={16} />}>
              Import
            </Button>
          </Link>
          <Button 
            variant="primary" 
            size="md" 
            leftIcon={<Plus size={16} />} 
            onClick={() => { setEditingProject(undefined); setIsModalOpen(true); }}
          >
            New Project
          </Button>
        </div>
      </div>

      <div className="bg-surface rounded-3xl border border-border-subtle/60 shadow-card overflow-hidden flex flex-col">
          {/* Toolbar */}
          <div className="p-6 border-b border-border-subtle/60 flex items-center justify-between gap-4 bg-white/50 backdrop-blur-sm">
               <div className="relative flex-1 max-w-md group">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-tertiary group-focus-within:text-primary transition-colors" size={16}/>
                   <input 
                        className="w-full pl-11 pr-4 py-3 bg-app/50 border border-border-subtle rounded-2xl text-sm focus:outline-none focus:border-primary focus:bg-white transition-all placeholder-ink-tertiary font-medium text-ink-primary shadow-sm"
                        placeholder="Filter projects..."
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                   />
               </div>
               <div className="flex items-center gap-4">
                   <div className="h-8 w-px bg-border-subtle"></div>
                   <div className="relative flex items-center">
                       <Filter size={16} className="absolute left-3 text-ink-tertiary pointer-events-none"/>
                       <select 
                            className="bg-transparent pl-9 pr-10 py-2 text-xs font-bold uppercase tracking-widest text-ink-secondary focus:outline-none cursor-pointer hover:text-ink-primary transition-colors appearance-none border border-transparent hover:border-border-subtle rounded-lg"
                            value={filters.status}
                            onChange={e => setFilters({...filters, status: e.target.value})}
                       >
                           <option value="">All Status</option>
                           {Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}
                       </select>
                       <ChevronDown size={14} className="absolute right-3 text-ink-tertiary pointer-events-none"/>
                   </div>
               </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-subtle/30 border-b border-border-subtle/60">
                    <tr>
                        <th className="px-8 py-5 w-16 text-center">
                            <button onClick={toggleSelectAll} className="text-ink-tertiary hover:text-primary transition-colors">
                                {selectedIds.size > 0 ? <CheckSquare size={18}/> : <Square size={18}/>}
                            </button>
                        </th>
                        <th className="px-8 py-5 text-[10px] font-bold text-ink-tertiary uppercase tracking-widest">Project Name</th>
                        <th className="px-8 py-5 text-[10px] font-bold text-ink-tertiary uppercase tracking-widest">Status</th>
                        <th className="px-8 py-5 text-[10px] font-bold text-ink-tertiary uppercase tracking-widest">Owner</th>
                        <th className="px-8 py-5 text-[10px] font-bold text-ink-tertiary uppercase tracking-widest">Timeline</th>
                        <th className="px-8 py-5 text-[10px] font-bold text-ink-tertiary uppercase tracking-widest">Priority</th>
                        <th className="px-8 py-5 text-right"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle/40 bg-surface">
                    {filteredProjects.map(project => {
                        const assigneeName = project.assignedToId ? `User ${project.assignedToId.slice(0,4)}` : null;
                        const isSelected = selectedIds.has(project.id);
                        return (
                            <tr key={project.id} className={`group hover:bg-subtle/30 transition-all duration-200 ${isSelected ? 'bg-primary-tint/30' : ''}`}>
                                <td className="px-8 py-5 text-center">
                                    <button onClick={() => toggleSelectOne(project.id)} className={`transition-colors ${isSelected ? 'text-primary' : 'text-border-hover hover:text-ink-secondary'}`}>
                                        {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                                    </button>
                                </td>
                                <td className="px-8 py-5">
                                    <Link to={`/projects/${project.id}`} className="block group/link">
                                        <div className="font-semibold text-sm text-ink-primary group-hover/link:text-primary transition-colors tracking-tight">{project.name}</div>
                                        <div className="text-[10px] text-ink-secondary font-bold uppercase tracking-widest mt-1.5 opacity-70">{project.clientName}</div>
                                    </Link>
                                </td>
                                <td className="px-8 py-5">
                                    <Badge variant={getStatusVariant(project.status)}>{project.status}</Badge>
                                </td>
                                <td className="px-8 py-5">
                                    {assigneeName ? (
                                        <div className="flex items-center gap-3">
                                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-[9px] font-bold text-ink-secondary border border-white shadow-sm">{assigneeName[0]}</div>
                                            <span className="text-xs text-ink-primary font-medium">Owner</span>
                                        </div>
                                    ) : <span className="text-ink-tertiary text-xs opacity-50">—</span>}
                                </td>
                                <td className="px-8 py-5">
                                    <div className="text-xs font-mono font-medium text-ink-primary tracking-tight">{project.dueDate ? new Date(project.dueDate).toLocaleDateString() : '—'}</div>
                                </td>
                                <td className="px-8 py-5">
                                    <Badge variant={getPriorityVariant(project.priority)}>{project.priority}</Badge>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => { setEditingProject(project); setIsModalOpen(true); }}
                                            className="h-8 px-3 text-[10px] uppercase font-bold"
                                        >
                                            Edit
                                        </Button>
                                        <Link to={`/projects/${project.id}`}>
                                            <div className="p-2 text-ink-tertiary hover:text-primary hover:bg-subtle rounded-lg transition-colors">
                                                <ArrowRight size={18} />
                                            </div>
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
          </div>
      </div>
    </div>
  );
};

export default ProjectList;