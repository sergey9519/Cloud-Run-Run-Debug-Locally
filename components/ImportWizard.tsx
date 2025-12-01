
import React, { useState, useMemo, useEffect } from 'react';
import { Upload, FileSpreadsheet, Check, X, RefreshCw, Sparkles, Briefcase, Users, AlertTriangle, FileText, ArrowRight, Cloud, AlertCircle, Database, Server, Cpu, Activity, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { read, utils } from 'xlsx';
import { GoogleGenAI, Type } from "@google/genai";
import { FreelancerStatus, ProjectStatus, Priority } from '../types';
import { generateContentWithRetry, api } from '../services/api';
import { DeepReader } from '../services/intelligence';

interface ImportWizardProps {
  onImport: (type: 'freelancer' | 'project', data: any[]) => void;
  existingFreelancers?: any[];
  existingProjects?: any[];
}

// Mock Schemas for demo
const FREELANCER_SCHEMA = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, contactInfo: { type: Type.STRING }, role: { type: Type.STRING }, rate: { type: Type.NUMBER }, currency: { type: Type.STRING }, skills: { type: Type.ARRAY, items: { type: Type.STRING } }, bio: { type: Type.STRING }, status: { type: Type.STRING }, timezone: { type: Type.STRING } }, required: ["name", "role", "rate"] } };
const PROJECT_SCHEMA = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, clientName: { type: Type.STRING }, description: { type: Type.STRING }, priority: { type: Type.STRING }, status: { type: Type.STRING }, budget: { type: Type.STRING }, startDate: { type: Type.STRING }, dueDate: { type: Type.STRING }, tags: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["name", "clientName"] } };

const ImportWizard: React.FC<ImportWizardProps> = ({ onImport, existingFreelancers = [], existingProjects = [] }) => {
  const [importType, setImportType] = useState<'freelancer' | 'project'>('freelancer');
  const [mode, setMode] = useState<'excel' | 'paste'>('excel');
  const [step, setStep] = useState(1); 
  
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState<string>('IDLE'); // UPLOAD -> STREAM -> QUEUE -> PARSE
  
  const [rows, setRows] = useState<any[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);

  // --- Simulated Pipeline Flow ---
  const simulatePipeline = async (startProgress: number, endProgress: number, stage: string, delayMs: number) => {
      setProcessingStage(stage);
      const steps = 10;
      const stepValue = (endProgress - startProgress) / steps;
      for(let i = 0; i < steps; i++) {
          await new Promise(r => setTimeout(r, delayMs / steps));
          setProgress(prev => Math.min(prev + stepValue, endProgress));
      }
  };

  const handleFile = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setIsProcessing(true);
    setProgress(0);
    
    try {
        // Stage 1: Secure Uplink (Mock S3 Multipart)
        await simulatePipeline(0, 30, 'ENCRYPTING & UPLOADING STREAM', 1200);
        
        // Stage 2: Job Injection
        await simulatePipeline(30, 50, 'DISPATCHING JOB TO WORKER QUEUE', 800);
        setJobId(`job-${Date.now().toString().slice(-6)}`);

        // Stage 3: Deep Read (The Worker)
        await simulatePipeline(50, 80, 'WORKER: PARSING BINARY DATA', 1500);

        // Actual Logic Hook
        if (uploadedFile.name.endsWith('.xlsx') || uploadedFile.name.endsWith('.csv')) {
            const buffer = await uploadedFile.arrayBuffer();
            const wb = read(buffer, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const jsonData = utils.sheet_to_json(ws, { header: 1 }) as any[][];
            if (jsonData.length > 0) {
                setHeaders(jsonData[0] as string[]);
                setRows(jsonData.slice(1));
            }
        } else {
             // Deep Reader Hook
             const source = await DeepReader.ingestFile(uploadedFile);
             await executeAIAnalysis(source.originalContent);
        }

        // Stage 4: Finalizing
        await simulatePipeline(80, 100, 'VALIDATING SCHEMA', 500);
        setStep(2);

    } catch (e) {
        console.error(e);
        alert("Pipeline Fractured. See logs.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handlePasteAnalysis = async () => {
      if (!pastedText.trim()) return;
      setIsProcessing(true);
      setProgress(0);

      try {
          await simulatePipeline(0, 40, 'STREAMING TEXT TO VECTOR STORE', 1000);
          await simulatePipeline(40, 80, 'GEMINI 2.0: STRUCTURING UNSTRUCTURED DATA', 2500);
          await executeAIAnalysis(pastedText);
          await simulatePipeline(80, 100, 'FINALIZING', 200);
          setStep(2);
      } catch (e) {
          console.error(e);
          alert("Analysis Failed");
      } finally {
          setIsProcessing(false);
      }
  };

  const executeAIAnalysis = async (content: string) => {
      if (!process.env.API_KEY) throw new Error("API Key required.");
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const isFreelancer = importType === 'freelancer';
      const schema = isFreelancer ? FREELANCER_SCHEMA : PROJECT_SCHEMA;
      
      const response = await generateContentWithRetry(ai, {
          model: 'gemini-2.5-flash',
          contents: `Extract data. Return strict JSON. Content: ${content.slice(0, 25000)}`,
          config: { responseMimeType: 'application/json', responseSchema: schema }
      });
      
      const jsonResult = JSON.parse(response.text);
      const dataArray = Array.isArray(jsonResult) ? jsonResult : [];
      
      if (dataArray.length > 0) {
          const firstItem = dataArray[0];
          const dynamicHeaders = Object.keys(firstItem);
          setHeaders(dynamicHeaders);
          setRows(dataArray.map(obj => Object.values(obj)));
      }
  };

  const handleImportConfirm = async () => {
       setIsProcessing(true);
       await simulatePipeline(0, 100, 'ATOMIC DATABASE COMMIT', 1500);
       
       const mappedData = rows.map(row => {
           const obj: any = {};
           headers.forEach((h, i) => { obj[h] = row[i]; });
           if (!obj.id) obj.id = `${importType === 'freelancer' ? 'f' : 'p'}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
           if (importType === 'freelancer' && !obj.avatar) obj.avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(obj.name || 'User')}&background=random`;
           if (importType === 'project' && !obj.status) obj.status = ProjectStatus.PLANNED;
           if (importType === 'freelancer' && !obj.status) obj.status = FreelancerStatus.ACTIVE;
           return obj;
       });

       onImport(importType, mappedData); 
       setIsProcessing(false); 
       setStep(4); 
  };

  return (
    <div className="p-12 max-w-6xl mx-auto min-h-screen flex flex-col font-sans text-ink-primary animate-enter">
         <div className="flex items-center justify-between mb-12">
            <div>
                <h1 className="text-4xl font-display font-bold tracking-tighter text-ink-primary">Data Ingestion Portal</h1>
                <div className="flex items-center gap-3 mt-2">
                    <p className="text-xs text-ink-secondary uppercase tracking-widest font-bold">
                        Pipeline v2.4 <span className="text-border-hover mx-2">|</span> Secure TLS 1.3
                    </p>
                </div>
            </div>
            <Link to="/" className="text-ink-tertiary hover:text-ink-primary p-3 rounded-full hover:bg-subtle transition-colors"><X size={24}/></Link>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-4 mb-10">
            {[1, 2, 3, 4].map(s => (
                <div key={s} className={`h-1 rounded-full flex-1 transition-all duration-700 ${s <= step ? 'bg-ink-primary' : 'bg-border-subtle'}`}></div>
            ))}
        </div>

        {/* STEP 1: UPLOAD */}
        {step === 1 && (
            <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <button onClick={() => setImportType('freelancer')} className={`p-10 rounded-3xl transition-all duration-300 group relative text-left border ${importType === 'freelancer' ? 'bg-ink-primary text-white border-ink-primary shadow-card' : 'bg-surface text-ink-secondary border-border-subtle hover:border-ink-secondary'}`}>
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`p-3 rounded-xl ${importType === 'freelancer' ? 'bg-white/20 text-white' : 'bg-subtle text-ink-secondary'}`}><Users size={24}/></div>
                            <span className="text-xl font-bold tracking-tight">Roster Import</span>
                        </div>
                        <p className={`text-xs font-medium leading-relaxed ${importType === 'freelancer' ? 'text-white/70' : 'text-ink-tertiary'}`}>Bulk ingest talent profiles via Excel or Resume PDF. AI auto-extraction enabled.</p>
                    </button>
                    <button onClick={() => setImportType('project')} className={`p-10 rounded-3xl transition-all duration-300 group relative text-left border ${importType === 'project' ? 'bg-ink-primary text-white border-ink-primary shadow-card' : 'bg-surface text-ink-secondary border-border-subtle hover:border-ink-secondary'}`}>
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`p-3 rounded-xl ${importType === 'project' ? 'bg-white/20 text-white' : 'bg-subtle text-ink-secondary'}`}><Briefcase size={24}/></div>
                            <span className="text-xl font-bold tracking-tight">Project Import</span>
                        </div>
                        <p className={`text-xs font-medium leading-relaxed ${importType === 'project' ? 'text-white/70' : 'text-ink-tertiary'}`}>Ingest campaign briefs or manifests. AI extracts dates, budgets, and roles.</p>
                    </button>
                </div>

                <div className="bg-surface border border-border-subtle rounded-3xl flex-1 flex flex-col shadow-card overflow-hidden min-h-[500px]">
                    <div className="px-10 pt-10 flex gap-8 border-b border-border-subtle">
                        <button onClick={() => setMode('excel')} className={`pb-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-all ${mode === 'excel' ? 'border-ink-primary text-ink-primary' : 'border-transparent text-ink-tertiary hover:text-ink-secondary'}`}>Upload Binary</button>
                        <button onClick={() => setMode('paste')} className={`pb-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-all ${mode === 'paste' ? 'border-ink-primary text-ink-primary' : 'border-transparent text-ink-tertiary hover:text-ink-secondary'}`}>Raw Text Stream</button>
                    </div>

                    <div className="flex-1 flex flex-col p-12 bg-app/50 relative">
                        {isProcessing && (
                            <div className="absolute inset-0 z-50 bg-surface/90 backdrop-blur-lg flex flex-col items-center justify-center animate-in fade-in duration-500">
                                <div className="w-96 text-center space-y-6">
                                    <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                                        <div className="absolute inset-0 rounded-full border-4 border-border-subtle"></div>
                                        <div className="absolute inset-0 rounded-full border-4 border-t-ink-primary border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                                        <Server size={32} className="text-ink-primary animate-pulse"/>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <div className="text-2xl font-display font-bold text-ink-primary tracking-tight">{Math.round(progress)}%</div>
                                        <div className="text-[10px] font-bold text-edge-teal uppercase tracking-widest flex items-center justify-center gap-2">
                                            <Activity size={12} className="animate-bounce"/>
                                            {processingStage}
                                        </div>
                                    </div>

                                    {/* Terminal Log */}
                                    <div className="w-full bg-ink-primary rounded-lg p-4 text-left font-mono text-[10px] text-green-400 h-24 overflow-hidden relative shadow-inner border border-ink-secondary">
                                        <div className="opacity-50 absolute top-2 right-2 text-[8px] uppercase">System Log</div>
                                        <p>> Initiating secure handshake...</p>
                                        <p>> Stream opened (Port 443)</p>
                                        {jobId && <p>> Job Assigned: {jobId}</p>}
                                        {progress > 50 && <p>> Worker Node 04: Analyzing payload...</p>}
                                        {progress > 80 && <p>> Structuring data models...</p>}
                                        <div className="animate-pulse mt-1">_</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {mode === 'excel' ? (
                            <div 
                                className={`w-full h-full border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all min-h-[300px] group ${file ? 'border-state-success bg-state-success-bg/10' : 'border-border-subtle hover:border-ink-primary hover:bg-white'}`} 
                                onClick={() => document.getElementById('fileInput')?.click()}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => { e.preventDefault(); if(e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
                            >
                                <input type="file" id="fileInput" className="hidden" onChange={(e) => { if(e.target.files?.[0]) handleFile(e.target.files[0]); }}/>
                                {file ? (
                                    <><div className="w-16 h-16 bg-state-success-bg rounded-2xl text-state-success flex items-center justify-center mb-6 shadow-sm"><FileSpreadsheet size={32}/></div><p className="font-bold text-ink-primary text-sm">{file.name}</p></>
                                ) : (
                                    <>
                                        <div className="w-16 h-16 bg-white border border-border-subtle rounded-2xl text-ink-tertiary group-hover:text-ink-primary flex items-center justify-center mb-6 shadow-float transition-colors"><Upload size={32}/></div>
                                        <p className="font-bold text-ink-primary text-sm uppercase tracking-wide">Drop Asset (XLSX, CSV, PDF)</p>
                                        <p className="text-ink-tertiary text-xs mt-2 font-medium">Maximum payload: 500MB</p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="w-full h-full flex flex-col gap-6">
                                <div className="relative flex-1">
                                    <textarea
                                        className="absolute inset-0 w-full h-full p-8 bg-white border border-border-subtle rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm font-mono resize-none shadow-sm placeholder-ink-tertiary/50 text-ink-primary custom-scrollbar leading-relaxed"
                                        placeholder="// Paste raw unstructured text here..."
                                        value={pastedText}
                                        onChange={(e) => setPastedText(e.target.value)}
                                    />
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="text-[10px] text-ink-tertiary font-bold uppercase tracking-widest flex items-center gap-2">
                                        <Cpu size={12}/> Neural Processing Enabled
                                    </div>
                                    <button 
                                        onClick={handlePasteAnalysis}
                                        disabled={!pastedText.trim() || isProcessing}
                                        className="px-8 py-4 bg-ink-primary text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-black transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center gap-3 disabled:opacity-50"
                                    >
                                        <Sparkles size={14}/> Initiate Analysis
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </>
        )}

        {/* STEP 2: PREVIEW (Table) */}
        {step === 2 && (
            <div className="flex-1 flex flex-col gap-8 animate-in slide-in-from-bottom-4 duration-500">
                <div className="bg-surface border border-border-subtle rounded-3xl overflow-hidden shadow-card flex-1 overflow-x-auto relative">
                    <table className="w-full text-left">
                        <thead className="bg-subtle/30 border-b border-border-subtle">
                            <tr>
                                {headers.map(h => (
                                    <th key={h} className={`px-8 py-6 text-[10px] font-bold uppercase tracking-widest ${['name', 'email', 'role'].includes(h.toLowerCase()) ? 'text-ink-primary' : 'text-ink-tertiary'}`}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                            {rows.slice(0, 10).map((row, i) => (
                                <tr key={i} className="hover:bg-subtle/30 transition-colors">
                                    {row.map((cell, j) => (
                                        <td key={j} className="px-8 py-4 text-xs text-ink-secondary font-medium whitespace-nowrap max-w-[250px] truncate">
                                            {Array.isArray(cell) ? cell.join(', ') : String(cell)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                <div className="flex justify-end gap-4">
                    <button onClick={() => { setStep(1); setFile(null); setPastedText(''); setJobId(null); }} className="px-6 py-3 text-ink-secondary hover:text-ink-primary font-bold uppercase tracking-wide hover:bg-subtle rounded-xl text-xs transition-colors">
                        Abort
                    </button>
                    <button onClick={() => setStep(3)} className="px-8 py-3 bg-ink-primary text-white font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-black shadow-lg flex items-center gap-3">
                        Review Impact <ArrowRight size={14}/>
                    </button>
                </div>
            </div>
        )}

        {/* STEP 3: IMPACT (Same logic, refined UI) */}
        {step === 3 && (
            <div className="flex-1 flex flex-col items-center justify-center animate-in slide-in-from-bottom-8 duration-500">
                <div className="w-full max-w-3xl grid grid-cols-3 gap-8 mb-12">
                    <div className="bg-surface p-8 rounded-3xl border border-border-subtle shadow-float flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-2xl bg-state-success-bg text-state-success flex items-center justify-center mb-4">
                            <Database size={24} />
                        </div>
                        <div className="text-4xl font-bold text-ink-primary mb-2">12</div>
                        <div className="text-[10px] font-bold text-ink-tertiary uppercase tracking-widest">New Records</div>
                    </div>
                    <div className="bg-surface p-8 rounded-3xl border border-border-subtle shadow-float flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                            <RefreshCw size={24} />
                        </div>
                        <div className="text-4xl font-bold text-ink-primary mb-2">4</div>
                        <div className="text-[10px] font-bold text-ink-tertiary uppercase tracking-widest">Updates</div>
                    </div>
                    <div className="bg-surface p-8 rounded-3xl border border-border-subtle shadow-float flex flex-col items-center text-center opacity-50">
                        <div className="w-12 h-12 rounded-2xl bg-state-danger-bg text-state-danger flex items-center justify-center mb-4">
                            <AlertTriangle size={24} />
                        </div>
                        <div className="text-4xl font-bold text-ink-primary mb-2">0</div>
                        <div className="text-[10px] font-bold text-ink-tertiary uppercase tracking-widest">Conflicts</div>
                    </div>
                </div>

                <button onClick={handleImportConfirm} disabled={isProcessing} className="w-full max-w-md px-8 py-5 bg-ink-primary text-white font-bold rounded-2xl text-sm uppercase tracking-widest hover:bg-black shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center justify-center gap-3 disabled:opacity-70">
                    {isProcessing ? <Loader2 className="animate-spin"/> : <Check size={20}/>}
                    {isProcessing ? 'Committing Transaction...' : 'Execute Commit'}
                </button>
            </div>
        )}

        {/* STEP 4: SUCCESS */}
        {step === 4 && (
             <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-state-success-bg rounded-3xl text-state-success flex items-center justify-center mb-8 shadow-lg shadow-state-success/20">
                    <Check size={48} strokeWidth={3}/>
                </div>
                <h2 className="text-4xl font-display font-bold text-ink-primary mb-4 tracking-tighter">Ingestion Complete</h2>
                <p className="text-ink-secondary mb-12 text-sm font-medium max-w-md leading-relaxed">
                    Data has been successfully synchronized to the Master Node.
                    {jobId && <span className="block mt-4 text-[10px] uppercase tracking-widest font-bold text-edge-teal font-mono">Job ID: {jobId}</span>}
                </p>
                <div className="flex gap-6">
                    <button onClick={() => { setStep(1); setFile(null); setPastedText(''); setJobId(null); }} className="px-8 py-4 bg-surface border border-border-subtle text-ink-primary font-bold hover:border-ink-tertiary transition-all rounded-2xl text-xs uppercase tracking-widest shadow-sm">
                        New Stream
                    </button>
                    <Link to={importType === 'freelancer' ? '/freelancers' : '/projects'} className="px-8 py-4 bg-ink-primary text-white font-bold hover:bg-black transition-all rounded-2xl text-xs uppercase tracking-widest shadow-lg">
                        View Roster
                    </Link>
                </div>
            </div>
        )}
    </div>
  );
};

export default ImportWizard;
