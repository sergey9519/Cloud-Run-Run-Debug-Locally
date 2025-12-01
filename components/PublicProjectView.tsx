
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, Shield, Loader2, AlertTriangle } from 'lucide-react';
import { Project, Freelancer, Assignment } from '../types';
import { api } from '../services/api';

interface PublicProjectViewProps {
  projects: Project[];
  assignments: Assignment[];
  freelancers: Freelancer[];
}

const PublicProjectView: React.FC<PublicProjectViewProps> = ({ projects: initialProjects, assignments: initialAssignments, freelancers: initialFreelancers }) => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [localProject, setLocalProject] = useState<Project | undefined>(undefined);
  const [localData, setLocalData] = useState<{ assignments: Assignment[], freelancers: Freelancer[] }>({ assignments: [], freelancers: [] });

  useEffect(() => {
      // Determine if we are in "Guest Mode" (Direct link access, App state empty)
      const isGuestAccess = initialProjects.length === 0 && !!token;

      const loadData = async () => {
          try {
              if (isGuestAccess) {
                  // Guest Mode: Fetch data explicitly
                  console.log("Guest Access: Loading Public Data...");
                  const [pRes, aRes, fRes] = await Promise.all([
                      api.projects.list(), 
                      api.assignments.list(),
                      api.freelancers.list()
                  ]);
                  
                  const found = pRes.data.find(p => p.shareToken === token);
                  if (found) {
                      setLocalProject(found);
                      setLocalData({ assignments: aRes.data, freelancers: fRes.data });
                  }
              } else {
                  // Authenticated Mode: Use props
                  const found = initialProjects.find(p => p.shareToken === token);
                  if (found) {
                      setLocalProject(found);
                      setLocalData({ assignments: initialAssignments, freelancers: initialFreelancers });
                  }
              }
          } catch (e) {
              console.error("Failed to load project data", e);
          } finally {
              setLoading(false);
          }
      };

      loadData();
  }, [token, initialProjects.length]);

  if (loading) {
      return (
          <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center font-sans">
              <div className="flex flex-col items-center gap-4 text-pencil">
                  <Loader2 size={32} className="animate-spin text-indigo-500"/>
                  <span className="text-xs font-bold uppercase tracking-widest">Verifying Secure Link...</span>
              </div>
          </div>
      );
  }

  // Access Revoked or Invalid Token
  if (!localProject || (localProject.shareTokenRevokedAt)) {
      return (
          <div className="min-h-screen bg-[#F4F4F0] flex items-center justify-center font-sans">
              <div className="bg-white p-16 border border-mist text-center max-w-lg rounded-3xl shadow-soft">
                  <div className="w-16 h-16 bg-gray-50 text-pencil border border-mist flex items-center justify-center mx-auto mb-8 rounded-2xl">
                      <Shield size={24}/>
                  </div>
                  <h2 className="text-2xl font-semibold text-ink mb-3 tracking-tight">Access Revoked</h2>
                  <p className="text-pencil text-xs font-bold uppercase tracking-widest leading-relaxed">
                      This secure link has expired or is invalid.<br/>
                      Please contact the studio administrator.
                  </p>
              </div>
          </div>
      )
  }

  const projectAssignments = localData.assignments.filter(a => a.projectId === localProject.id);
  const filledRoles = projectAssignments.length;
  const totalRoles = localProject.roleRequirements.reduce((acc, r) => acc + r.count, 0);
  const progress = totalRoles > 0 ? Math.round((filledRoles / totalRoles) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#F5F5F7] font-sans text-ink">
      <header className="bg-white/80 backdrop-blur-md border-b border-mist sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-10 h-24 flex items-center justify-between">
             <div className="flex items-center gap-2">
                <span className="font-semibold text-lg tracking-tight">Studio.</span>
                <div className="w-10 h-10 bg-ink flex items-center justify-center text-white font-bold text-lg rounded-xl shadow-sm">
                    <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                </div>
             </div>
             <div className="flex items-center gap-2 text-[10px] text-pencil font-bold uppercase tracking-widest border border-mist px-4 py-1.5 bg-gray-50 rounded-full">
                <Shield size={12} /> External View
             </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-10 py-20 animate-in fade-in duration-700">
         <div className="bg-white border border-mist mb-16 rounded-3xl shadow-soft overflow-hidden">
            <div className="p-12 border-b border-mist bg-white">
                <div className="flex flex-col md:flex-row justify-between items-start gap-10">
                    <div>
                        <div className="text-pencil font-bold mb-4 uppercase tracking-widest text-[10px]">{localProject.clientName || 'Client Confidential'}</div>
                        <h1 className="text-6xl font-semibold mb-6 text-ink leading-[0.9] tracking-tighter">{localProject.name}</h1>
                        <div className="flex items-center gap-4 text-sm mt-8">
                             <span className="bg-ink text-white px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg shadow-sm">{localProject.status}</span>
                             {localProject.dueDate && (
                                <span className="flex items-center gap-2 font-mono text-xs font-bold text-ink bg-gray-50 px-3 py-1.5 rounded-lg border border-mist"><Calendar size={12}/> Due {new Date(localProject.dueDate).toLocaleDateString()}</span>
                             )}
                        </div>
                    </div>
                    <div className="text-right hidden md:block">
                        <div className="text-7xl font-light text-ink tracking-tighter">{progress}%</div>
                        <div className="text-[10px] text-pencil font-bold uppercase tracking-widest mt-2">Staffing Complete</div>
                    </div>
                </div>
            </div>
            
            <div className="p-12">
                <h3 className="text-[10px] font-bold text-pencil uppercase tracking-widest mb-10 border-b border-mist pb-4">Roster Assignment</h3>
                
                <div className="space-y-10">
                    {localProject.roleRequirements.map(req => {
                        const roleAssignments = projectAssignments.filter(a => a.role === req.role);
                        return (
                            <div key={req.id}>
                                <div className="flex items-center justify-between mb-5">
                                    <h4 className="text-xl font-semibold text-ink tracking-tight">{req.role}</h4>
                                    <span className="text-xs font-mono font-bold text-pencil bg-canvas px-2 py-1 rounded border border-mist">{roleAssignments.length} / {req.count} Filled</span>
                                </div>
                                
                                {roleAssignments.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {roleAssignments.map(assign => {
                                            const f = localData.freelancers.find(fr => fr.id === assign.freelancerId);
                                            return (
                                                <div key={assign.id} className="flex items-center gap-5 p-5 bg-white border border-mist rounded-2xl shadow-sm">
                                                    {f?.avatar && <img src={f.avatar} className="w-12 h-12 border border-mist object-cover grayscale rounded-full" />}
                                                    <div>
                                                        <div className="font-bold text-ink text-sm tracking-tight mb-1">{f?.name || 'Unknown'}</div>
                                                        <div className="text-[10px] text-pencil font-bold uppercase tracking-wide">{new Date(assign.startDate).toLocaleDateString()} — {new Date(assign.endDate).toLocaleDateString()}</div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <div className="p-6 border border-dashed border-mist text-center text-xs text-pencil font-bold uppercase tracking-widest bg-gray-50/30 rounded-2xl">
                                        Pending Assignment
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
         </div>
         
         <div className="text-center text-pencil/50 text-[10px] font-bold uppercase tracking-widest">
            Studio Roster OS &copy; 2025
         </div>
      </div>
    </div>
  );
};

export default PublicProjectView;
