import React, { useState } from 'react';
import { Upload, FileSpreadsheet, Check, X, RefreshCw, Sparkles, Briefcase, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { read, utils } from 'xlsx';
import { FreelancerStatus, ProjectStatus } from '../types';

interface ImportWizardProps {
  onImport: (type: 'freelancer' | 'project', data: any[]) => void;
}

const ImportWizard: React.FC<ImportWizardProps> = ({ onImport }) => {
  const [importType, setImportType] = useState<'freelancer' | 'project'>('freelancer');
  const [mode, setMode] = useState<'excel' | 'paste'>('excel');
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFile = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setIsProcessing(true);
    setProgress(0);

    try {
      // Simple progress simulation
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(r => setTimeout(r, 100));
        setProgress(i);
      }

      // Basic file parsing for Excel
      if (uploadedFile.name.endsWith('.xlsx') || uploadedFile.name.endsWith('.csv')) {
        const buffer = await uploadedFile.arrayBuffer();
        const wb = read(buffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonData = utils.sheet_to_json(ws, { header: 1 }) as any[][];
        if (jsonData.length > 0) {
          setStep(2);
        }
      }
    } catch (e) {
      console.error(e);
      alert("Pipeline Fractured. See logs.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportConfirm = async () => {
    setIsProcessing(true);
    
    // Simulate processing
    await new Promise(r => setTimeout(r, 1500));
    
    // Mock data for demo
    const mockData = [
      { id: 'f-1', name: 'John Doe', role: 'Designer', rate: 50, status: FreelancerStatus.ACTIVE },
      { id: 'f-2', name: 'Jane Smith', role: 'Developer', rate: 75, status: FreelancerStatus.ACTIVE }
    ];
    
    onImport(importType, mockData);
    setIsProcessing(false);
    setStep(4);
  };

  return (
    <div className="p-12 max-w-6xl mx-auto min-h-screen flex flex-col font-sans text-ink-primary">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter">Data Ingestion Portal</h1>
          <p className="text-xs text-ink-secondary mt-2">Import data via Excel or text</p>
        </div>
        <Link to="/" className="text-ink-tertiary hover:text-ink-primary p-3 rounded-full hover:bg-subtle">
          <X size={24}/>
        </Link>
      </div>

      <div className="flex items-center gap-4 mb-10">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className={`h-1 rounded-full flex-1 ${s <= step ? 'bg-ink-primary' : 'bg-border-subtle'}`}></div>
        ))}
      </div>

      {step === 1 && (
        <div className="flex-1">
          <div className="bg-surface border border-border-subtle rounded-3xl p-12">
            <input 
              type="file" 
              accept=".xlsx,.csv,.pdf"
              onChange={(e) => { if(e.target.files?.[0]) handleFile(e.target.files[0]); }}
              className="hidden" 
              id="fileInput"
            />
            <div 
              className="w-full h-64 border-2 border-dashed border-border-subtle rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-ink-primary"
              onClick={() => document.getElementById('fileInput')?.click()}
            >
              {file ? (
                <>
                  <FileSpreadsheet size={32} className="text-ink-primary mb-4" />
                  <p className="font-bold">{file.name}</p>
                </>
              ) : (
                <>
                  <Upload size={32} className="text-ink-tertiary mb-4" />
                  <p className="font-bold text-ink-primary">Upload File</p>
                </>
              )}
            </div>
            
            {file && (
              <button 
                onClick={() => setStep(2)} 
                className="w-full mt-8 px-6 py-3 bg-ink-primary text-white font-bold rounded-xl hover:bg-black transition-all"
              >
                Continue
              </button>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex-1">
          <div className="bg-surface border border-border-subtle rounded-3xl p-8">
            <h2 className="text-2xl font-bold mb-6">Review Data</h2>
            <p>Mock data will be imported. Click confirm to proceed.</p>
            
            <div className="flex justify-end gap-4 mt-8">
              <button onClick={() => setStep(1)} className="px-6 py-3 text-ink-secondary hover:text-ink-primary">
                Back
              </button>
              <button onClick={handleImportConfirm} className="px-8 py-3 bg-ink-primary text-white font-bold rounded-xl hover:bg-black">
                Confirm Import
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <Check size={32} className="text-green-600" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Import Complete</h2>
          <p className="text-ink-secondary mb-8">Data has been successfully imported.</p>
          <Link to={importType === 'freelancer' ? '/freelancers' : '/projects'} className="px-8 py-3 bg-ink-primary text-white font-bold rounded-xl hover:bg-black">
            View Data
          </Link>
        </div>
      )}
    </div>
  );
};

export default ImportWizard;
