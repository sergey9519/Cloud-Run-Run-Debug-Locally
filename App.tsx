
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ProjectList from './components/ProjectList';
import FreelancerList from './components/FreelancerList';
import FreelancerDetail from './components/FreelancerDetail';
import ProjectDetail from './components/ProjectDetail';
import AssignmentView from './components/AssignmentView';
import ImportWizard from './components/ImportWizard';
import PublicProjectView from './components/PublicProjectView';
import CreateStudio from './components/CreateStudio';
import MoodboardTab from './components/Moodboard/MoodboardTab';
import { Freelancer, Project, Assignment, ActivityLog, ProjectStatus, FreelancerStatus, Priority, Script } from './types';
import { api } from './services/api';
import { RefreshCw } from 'lucide-react';

// Wrapper component to provide navigation context to Dashboard
const DashboardWrapper = (props: any) => {
    const navigate = useNavigate();
    return <Dashboard {...props} onCallAction={(action, params) => props.onAgentAction(action, params, navigate)} />;
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  const fetchData = async () => {
      setIsLoading(true);
      try {
          const [f, p, a, s] = await Promise.all([
              api.freelancers.list({ limit: 1000 }),
              api.projects.list({ limit: 1000 }),
              api.assignments.list({ limit: 5000 }),
              api.scripts.list({ limit: 1000 })
          ]);
          setFreelancers(f.data || []);
          setProjects(p.data || []);
          setAssignments(a.data || []);
          setScripts(s.data || []);
      } catch (e) {
          console.error("Failed to fetch data", e);
      } finally {
          setIsLoading(false);
      }
  };

  useEffect(() => {
      if (isAuthenticated) {
          fetchData();
      } else {
          setIsLoading(false);
      }
  }, [isAuthenticated]);

  const handleLogAction = (action: string, details: string) => {
    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      action,
      details,
      timestamp: 'Just now',
      user: 'You'
    };
    setActivityLogs(prev => [newLog, ...prev]);
  };

  const handleImport = async (type: 'freelancer' | 'project', data: any[]) => {
    setIsLoading(true);
    try {
        if (type === 'freelancer') {
            const res = await api.freelancers.importBatch(data as Freelancer[]);
            handleLogAction('Import Completed', `Imported/Updated ${res.data.created + res.data.updated} freelancers.`);
        } else {
            const res = await api.projects.importBatch(data as Project[]);
            handleLogAction('Import Completed', `Imported/Updated ${res.data.created + res.data.updated} projects.`);
        }
        await fetchData();
    } catch (e) {
        alert("Import Failed");
    } finally {
        setIsLoading(false);
    }
  };

  const handleFreelancerUpdate = async (updatedFreelancer: Freelancer) => {
    const res = await api.freelancers.update(updatedFreelancer);
    setFreelancers(prev => prev.map(f => f.id === res.data.id ? res.data : f));
    handleLogAction('Freelancer Updated', `Updated profile for ${res.data.name}`);
  };

  const handleFreelancerDelete = async (id: string) => {
    await api.freelancers.delete(id);
    setFreelancers(prev => prev.filter(f => f.id !== id));
    setAssignments(prev => prev.filter(a => a.freelancerId !== id));
    handleLogAction('Freelancer Deleted', 'Removed freelancer from roster');
  };

  const handleProjectUpdate = async (updatedProject: Project) => {
    const res = await api.projects.update(updatedProject);
    setProjects(prev => prev.map(p => p.id === res.data.id ? res.data : p));
  };

  const handleProjectDelete = async (id: string) => {
    await api.projects.delete(id);
    setProjects(prev => prev.filter(p => p.id !== id));
    setAssignments(prev => prev.filter(a => a.projectId !== id));
    handleLogAction('Project Deleted', 'Deleted project and associated assignments');
  };

  const handleBulkProjectDelete = async (ids: string[]) => {
    if (window.confirm(`Are you sure you want to delete ${ids.length} projects? This action cannot be undone.`)) {
      await api.projects.deleteBatch(ids);
      setProjects(prev => prev.filter(p => !ids.includes(p.id)));
      setAssignments(prev => prev.filter(a => !ids.includes(a.projectId)));
      handleLogAction('Batch Delete', `Deleted ${ids.length} projects`);
    }
  };

  const checkConflict = (freelancerId: string, startDate: string, endDate: string, ignoreAssignmentId?: string): Assignment | undefined => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return assignments.find(a => {
      if (a.freelancerId !== freelancerId) return false;
      if (ignoreAssignmentId && a.id === ignoreAssignmentId) return false;
      const aStart = new Date(a.startDate);
      const aEnd = new Date(a.endDate);
      return aStart <= end && aEnd >= start;
    });
  };

  const handleAssignmentUpdate = async (newAssignment: Assignment) => {
    try {
        const existing = assignments.find(a => a.id === newAssignment.id);
        let res;
        if (existing) {
             res = await api.assignments.update(newAssignment);
             setAssignments(prev => prev.map(a => a.id === newAssignment.id ? res.data : a));
             handleLogAction('Assignment Updated', `Updated assignment details`);
        } else {
             res = await api.assignments.create(newAssignment);
             setAssignments(prev => [...prev, res.data]);
             const freelancerName = freelancers.find(f => f.id === res.data.freelancerId)?.name || 'Unknown';
             const projectName = projects.find(p => p.id === res.data.projectId)?.name || 'Unknown';
             handleLogAction('Assignment Confirmed', `${freelancerName} assigned to ${projectName}`);
             
             // Refresh projects to update fill counts
             const p = await api.projects.list({ limit: 1000 });
             setProjects(p.data);
        }
    } catch (e: any) {
        if (e.message === 'CONFLICT_DETECTED') {
            alert("Server Conflict: Assignment overlaps with existing booking.");
        }
    }
  };
  
  const handleProjectCreate = async (overrides?: Partial<Project>) => {
      const newProject: Project = {
          id: `p-${Date.now()}`,
          name: overrides?.name || 'New Project',
          clientName: overrides?.clientName,
          status: overrides?.status || ProjectStatus.PLANNED,
          priority: overrides?.priority || Priority.NORMAL,
          description: overrides?.description,
          category: overrides?.category,
          startDate: overrides?.startDate,
          dueDate: overrides?.dueDate,
          roleRequirements: overrides?.roleRequirements || [],
          tags: overrides?.tags,
          notes: overrides?.notes,
          createdAt: new Date().toISOString()
      };
      const res = await api.projects.create(newProject);
      setProjects(prev => [...prev, res.data]);
      handleLogAction('Project Created', `Created new project: ${newProject.name}`);
      return res.data;
  };

  const handleFreelancerCreate = async (overrides?: Partial<Freelancer>) => {
      const newFreelancer: Freelancer = {
          id: `f-${Date.now()}`,
          name: overrides?.name || 'New Talent',
          role: overrides?.role || 'Generalist',
          skills: [],
          rate: overrides?.rate || 0,
          currency: 'USD',
          timezone: 'UTC',
          status: FreelancerStatus.ACTIVE,
          contactInfo: overrides?.contactInfo || 'email@example.com',
          utilization: 0,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(overrides?.name || 'New Talent')}&background=random`
      };
      const res = await api.freelancers.create(newFreelancer);
      setFreelancers(prev => [...prev, res.data]);
      handleLogAction('Talent Added', `Added new freelancer: ${newFreelancer.name}`);
      return res.data;
  };

  const handleScriptCreate = async (script: Script) => {
      const res = await api.scripts.create(script);
      setScripts(prev => {
          const exists = prev.find(s => s.id === script.id);
          if (exists) return prev.map(s => s.id === script.id ? res.data : s);
          return [...prev, res.data];
      });
      const projName = projects.find(p => p.id === script.projectId)?.name || 'Unknown Project';
      handleLogAction('Script Saved', `Saved "${script.title}" to ${projName}`);
      return res.data;
  };

  const handleLogin = async (contactInfo: string) => {
      try {
        await api.auth.login(contactInfo); 
        setIsAuthenticated(true);
      } catch (e) {
        console.error("Auth Error:", e);
        throw e;
      }
  };

  const handleAgentAction = async (action: string, params: any, navigate: any) => {
      switch(action) {
          case 'create_project':
              return await handleProjectCreate(params);
          case 'update_project':
              const p = projects.find(proj => proj.id === params.id);
              if (p) {
                  const updated = { ...p, ...params };
                  await handleProjectUpdate(updated);
                  return updated;
              }
              throw new Error("Project not found");
          case 'create_freelancer':
              return await handleFreelancerCreate(params);
          case 'assign_freelancer':
               const assignParams: Assignment = {
                   id: `asn-${Date.now()}`,
                   projectId: params.projectId,
                   freelancerId: params.freelancerId,
                   role: params.role || 'Contributor',
                   startDate: params.startDate || new Date().toISOString(),
                   endDate: params.endDate || new Date(Date.now() + 86400000 * 7).toISOString(),
                   allocation: 100,
                   status: 'Confirmed'
               };
               await handleAssignmentUpdate(assignParams);
               return { status: 'Assigned' };
          case 'navigate':
              navigate(params.path);
              return { status: 'Navigated' };
          case 'get_storage_info':
              try {
                  const info = await api.storage.getInfo();
                  return {
                      bucket: info.data?.bucket || 'Unknown',
                      project: info.data?.projectId || 'Unknown',
                      status: info.data?.configured ? 'Connected' : 'Not Configured'
                  };
              } catch (e) {
                  return { error: 'Failed to retrieve storage info' };
              }
          default:
              return { error: 'Unknown action' };
      }
  };

  if (isLoading) {
    return (
        <div className="h-screen flex items-center justify-center bg-[#F6F6FA]">
            <RefreshCw className="animate-spin text-gray-400"/>
        </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={
            <DashboardWrapper 
                projects={projects} 
                freelancers={freelancers} 
                assignments={assignments}
                onAgentAction={handleAgentAction} 
            />
          } />
          <Route path="projects" element={<ProjectList projects={projects} onCreate={handleProjectCreate} onUpdate={handleProjectUpdate} onDelete={handleProjectDelete} onBulkDelete={handleBulkProjectDelete} />} />
          <Route path="projects/:id" element={
            <ProjectDetail 
                projects={projects} 
                freelancers={freelancers} 
                assignments={assignments} 
                onAssign={handleAssignmentUpdate}
                checkConflict={checkConflict}
                onUpdateProject={handleProjectUpdate}
            />
          } />
          <Route path="freelancers" element={<FreelancerList freelancers={freelancers} assignments={assignments} onCreate={() => handleFreelancerCreate()} />} />
          <Route path="freelancers/:id" element={<FreelancerDetail freelancers={freelancers} projects={projects} assignments={assignments} onUpdate={handleFreelancerUpdate} onDelete={handleFreelancerDelete} />} />
          <Route path="assignments" element={<AssignmentView freelancers={freelancers} projects={projects} assignments={assignments} onAssign={handleAssignmentUpdate} checkConflict={checkConflict} />} />
          <Route path="studio" element={<CreateStudio projects={projects} freelancers={freelancers} assignments={assignments} onSaveScript={handleScriptCreate} />} />
          <Route path="moodboard" element={<MoodboardTab />} />
          <Route path="imports" element={<ImportWizard onImport={handleImport} />} />
        </Route>
        <Route path="/public/projects/:token" element={<PublicProjectView projects={projects} assignments={assignments} freelancers={freelancers} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
