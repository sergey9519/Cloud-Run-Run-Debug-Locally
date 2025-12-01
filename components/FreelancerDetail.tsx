import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, X, Plus, Sparkles, Loader2, Trash2, Calendar } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { Freelancer, Assignment, Project, FreelancerStatus } from '../types';
import { generateContentWithRetry } from '../services/api';

interface FreelancerDetailProps {
  freelancers: Freelancer[];
  projects: Project[];
  assignments: Assignment[];
  onUpdate: (updatedFreelancer: Freelancer) => void;
  onDelete: (id: string) => Promise<void>;
}

const SYSTEM_SKILLS = [
    'After Effects', 'Premiere Pro', 'Figma', 'Photoshop', 'Illustrator', 
    'Cinema 4D', 'Blender', 'DaVinci Resolve', 'Copywriting', 'SEO', 
    'React', 'Node.js', 'Python', 'Marketing Strategy', 'Brand Identity'
];

const FreelancerDetail: React.FC<FreelancerDetailProps> = ({ freelancers, projects, assignments, onUpdate, onDelete }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const freelancer = freelancers.find(f => f.id === id);
  const [newSkill, setNewSkill] = useState('');
  const [isPolishing, setIsPolishing] = useState(false);
  
  if (!freelancer) return <div>Freelancer not found</div>;

  const freelancerAssignments = assignments.filter(a => a.freelancerId === freelancer.id);
  const activeAssignments = freelancerAssignments.filter(a => new Date(a.endDate) >= new Date());
  const pastAssignments = freelancerAssignments.filter(a => new Date(a.endDate) < new Date());

  const handleAddSkill = (e: React.FormEvent) => {
      e.preventDefault();
      if (newSkill.trim() && !freelancer.skills.includes(newSkill.trim())) {
          onUpdate({
              ...freelancer,
              skills: [...freelancer.skills, newSkill.trim()]
          });
          setNewSkill('');
      }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
      onUpdate({
          ...freelancer,
          skills: freelancer.skills.filter(s => s !== skillToRemove)
      });
  };

  const toggleStatus = () => {
      onUpdate({
          ...freelancer,
          status: freelancer.status === FreelancerStatus.ACTIVE ? FreelancerStatus.INACTIVE : FreelancerStatus.ACTIVE
      });
  };

  const handlePolishBio = async () => {
    if (!freelancer.bio || !process.env.API_KEY) return;
    setIsPolishing(true);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await generateContentWithRetry(ai, {
            model: 'gemini-2.5-flash',
            contents: `Rewrite this freelancer bio to be more professional, punchy, and highlight key strengths. Bio: "${freelancer.bio}"`
        });
        onUpdate({ ...freelancer, bio: response.text });
    } catch(e) {
        console.error("Failed to polish bio", e);
    } finally {
        setIsPolishing(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this freelancer? This action cannot be undone.")) {
        await onDelete(freelancer.id);
        navigate('/freelancers');
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto animate-in fade-in duration-500 font-sans text-ink pb-24">
      <div className="mb-12 border-b border-mist pb-8">
        <Link to="/freelancers" className="inline-flex items-center text-[10px] font-bold text-pencil hover:text-ink mb-8 transition-colors uppercase tracking-widest">
            <ArrowLeft size={10} className="mr-2" /> Roster Index
        </Link>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8">
             <div className="flex items-center gap-8">
                <div className="w-28 h-28 bg-white border border-mist p-1 rounded-3xl overflow-hidden shadow-sm">
                    <img src={freelancer.avatar} className="w-full h-full object-cover grayscale rounded-2xl"/>
                </div>
                <div>
                    <h1 className="text-5xl font-semibold text-ink tracking-tighter mb-3">{freelancer.name}</h1>
                    <div className="flex items-center gap-4 text-sm text-pencil">
                        <span className="font-bold uppercase tracking-widest text-xs">{freelancer.role}</span>
                        <span className="text-mist">/</span>
                        <span className={`px-2.5 py-1 border text-[10px] font-bold uppercase tracking-widest rounded ${freelancer.status === FreelancerStatus.ACTIVE ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-gray-50 text-gray-500 border-mist'}`}>
                            {freelancer.status}
                        </span>
                    </div>
                </div>
             </div>
             <div className="flex gap-3">
                 <button onClick={toggleStatus} className="px-5 py-2.5 bg-white border border-mist text-ink hover:border-ink hover:bg-gray-50 transition-all text-xs font-bold uppercase tracking-widest rounded-xl shadow-sm">
                    {freelancer.status === FreelancerStatus.ACTIVE ? 'Deactivate' : 'Activate'}
                 </button>
                 <button className="px-5 py-2.5 bg-ink text-white border border-ink hover:bg-black transition-all text-xs font-bold uppercase tracking-widest rounded-xl shadow-lg">Edit Profile</button>
                 <button onClick={handleDelete} className="px-3.5 py-2.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 transition-all rounded-xl shadow-sm" title="Delete Freelancer">
                    <Trash2 size={16} />
                 </button>
             </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Column: Stats & Info */}
        <div className="space-y-8">
             <div className="bg-white border border-mist p-8 rounded-3xl shadow-sm">
                <h3 className="text-[10px] font-bold text-pencil uppercase tracking-widest mb-6 border-b border-mist pb-3">Details</h3>
                <div className="space-y-5 text-xs font-medium">
                    <div className="flex items-center justify-between group">
                        <span className="text-pencil uppercase tracking-wide font-bold text-[10px]">Email</span>
                        <span className="text-ink font-bold">{freelancer.contactInfo}</span>
                    </div>
                    {freelancer.phone && (
                        <div className="flex items-center justify-between group">
                            <span className="text-pencil uppercase tracking-wide font-bold text-[10px]">Phone</span>
                            <span className="text-ink font-bold">{freelancer.phone}</span>
                        </div>
                    )}
                    <div className="flex items-center justify-between group">
                         <span className="text-pencil uppercase tracking-wide font-bold text-[10px]">Zone</span>
                        <span className="text-ink font-bold">{freelancer.timezone}</span>
                    </div>
                    <div className="flex items-center justify-between group">
                        <span className="text-pencil uppercase tracking-wide font-bold text-[10px]">Rate</span>
                        <span className="text-ink font-bold">{freelancer.rate} {freelancer.currency}/day</span>
                    </div>
                </div>
             </div>

             <div className="bg-white border border-mist p-8 rounded-3xl shadow-sm">
                <div className="flex justify-between items-center mb-5 border-b border-mist pb-3">
                    <h3 className="text-[10px] font-bold text-pencil uppercase tracking-widest">Bio</h3>
                    {freelancer.bio && (
                        <button 
                            onClick={handlePolishBio} 
                            disabled={isPolishing}
                            className="text-[10px] text-indigo-600 font-bold flex items-center gap-1 hover:text-indigo-800 transition-colors uppercase tracking-wide"
                        >
                            {isPolishing ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>}
                            Refine
                        </button>
                    )}
                </div>
                <p className="text-sm text-ink leading-loose font-normal">
                    {freelancer.bio || <span className="text-pencil italic">No bio available.</span>}
                </p>
             </div>

             <div className="bg-white border border-mist p-8 rounded-3xl shadow-sm">
                <h3 className="text-[10px] font-bold text-pencil uppercase tracking-widest mb-5 border-b border-mist pb-3">Skills</h3>
                <div className="flex flex-wrap gap-2 mb-6">
                    {freelancer.skills.map(skill => (
                        <span key={skill} className="inline-flex items-center gap-1.5 px-3 py-1 bg-canvas text-ink text-[10px] font-bold border border-mist uppercase tracking-wide rounded-lg">
                            {skill}
                            <button onClick={() => handleRemoveSkill(skill)} className="text-pencil hover:text-rose-500 transition-colors ml-1"><X size={10}/></button>
                        </span>
                    ))}
                </div>
                <form onSubmit={handleAddSkill} className="flex gap-2">
                    <div className="flex-1 relative">
                        <input 
                            type="text" 
                            list="system-skills"
                            value={newSkill} 
                            onChange={(e) => setNewSkill(e.target.value)} 
                            placeholder="ADD SKILL..." 
                            className="w-full px-4 py-2.5 text-[10px] border border-mist rounded-xl focus:border-ink outline-none transition-all bg-white placeholder-pencil font-bold uppercase tracking-wide"
                        />
                        <datalist id="system-skills">
                            {SYSTEM_SKILLS.map(s => <option key={s} value={s} />)}
                        </datalist>
                    </div>
                    <button type="submit" disabled={!newSkill} className="px-3 bg-ink text-white hover:bg-black disabled:opacity-50 transition-colors rounded-xl"><Plus size={16}/></button>
                </form>
             </div>
        </div>

        {/* Right Column: Assignments */}
        <div className="lg:col-span-2 space-y-8">
            <div className="bg-white border border-mist rounded-3xl overflow-hidden shadow-sm">
                <div className="p-8 border-b border-mist bg-canvas/30">
                    <h3 className="font-semibold text-ink text-lg tracking-tight">Active & Upcoming</h3>
                </div>
                {activeAssignments.length > 0 ? (
                    <div className="divide-y divide-mist">
                        {activeAssignments.map(assign => {
                            const project = projects.find(p => p.id === assign.projectId);
                            return (
                                <div key={assign.id} className="p-6 hover:bg-canvas/50 transition-colors flex justify-between items-center group">
                                    <div>
                                        <div className="font-semibold text-ink mb-1 text-base tracking-tight">{project?.name}</div>
                                        <div className="text-[10px] text-pencil font-bold uppercase tracking-widest">{project?.clientName} — {assign.role}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-bold text-ink tabular-nums font-mono mb-1">{new Date(assign.startDate).toLocaleDateString()} - {new Date(assign.endDate).toLocaleDateString()}</div>
                                        <div className="text-[10px] text-indigo-600 font-bold bg-indigo-50 inline-block px-2.5 py-0.5 border border-indigo-100 uppercase tracking-widest rounded-full">100% Load</div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="p-16 text-center text-pencil text-sm flex flex-col items-center opacity-60">
                        <div className="w-12 h-12 bg-canvas flex items-center justify-center mb-4 border border-mist text-pencil rounded-full">
                            <Calendar size={20}/>
                        </div>
                        <span className="font-bold uppercase tracking-widest text-xs">Available for booking</span>
                    </div>
                )}
            </div>

            {pastAssignments.length > 0 && (
                <div className="bg-white border border-mist opacity-60 hover:opacity-100 transition-opacity rounded-3xl overflow-hidden">
                    <div className="p-8 border-b border-mist bg-canvas/30">
                         <h3 className="font-bold text-pencil text-xs uppercase tracking-widest">Archive</h3>
                    </div>
                    <div className="divide-y divide-mist">
                        {pastAssignments.map(assign => {
                             const project = projects.find(p => p.id === assign.projectId);
                             return (
                                <div key={assign.id} className="p-6 flex justify-between items-center hover:bg-canvas/50 transition-colors">
                                    <div>
                                        <div className="font-medium text-pencil group-hover:text-ink transition-colors">{project?.name}</div>
                                        <div className="text-[10px] text-pencil/70 uppercase tracking-wide font-medium">{project?.clientName}</div>
                                    </div>
                                    <div className="text-[10px] text-pencil font-bold tabular-nums font-mono">
                                        {new Date(assign.endDate).toLocaleDateString()}
                                    </div>
                                </div>
                             )
                        })}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default FreelancerDetail;