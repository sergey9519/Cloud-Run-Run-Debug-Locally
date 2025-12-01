import React, { useState, useEffect } from 'react';
import { Save, Sparkles, Languages, FileText, Upload } from 'lucide-react';

interface CreateStudioProps {
  projects: any[];
  freelancers: any[];
  assignments: any[];
  onSaveScript?: (script: any) => Promise<any>;
}

const CreateStudio: React.FC<CreateStudioProps> = ({ projects, freelancers, assignments, onSaveScript }) => {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [scriptContent, setScriptContent] = useState('');
  const [scriptTitle, setScriptTitle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const handleGenerate = async () => {
    if (!selectedProject || !scriptContent.trim()) return;

    setIsGenerating(true);
    try {
      // Stub implementation
      await new Promise(resolve => setTimeout(resolve, 2000));
      setScriptContent(prev => prev + '\n\n--- AI Generated Content ---\nThis is a stub implementation of AI content generation.');
    } catch (e) {
      console.error(e);
      alert('Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTranslate = async () => {
    if (!scriptContent.trim()) return;

    setIsTranslating(true);
    try {
      // Stub implementation
      await new Promise(resolve => setTimeout(resolve, 1500));
      alert('Translation feature - stub implementation');
    } catch (e) {
      console.error(e);
      alert('Translation failed.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSave = async () => {
    if (!scriptTitle.trim() || !scriptContent.trim() || !onSaveScript) return;

    setIsSaving(true);
    try {
      await onSaveScript({
        id: `scr-${Date.now()}`,
        title: scriptTitle,
        content: scriptContent,
        projectId: selectedProjectId,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      alert('Script saved successfully!');
    } catch (e) {
      console.error(e);
      alert('Save failed. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      // Stub file processing
      setScriptContent(prev => prev ? prev + '\n\n' + `File: ${file.name}` : `File: ${file.name}`);
    }
  };

  return (
    <div className="h-full flex bg-white">
      <div className="flex-1 flex flex-col p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-ink-primary mb-2">Creative Studio</h1>
          <p className="text-ink-secondary">AI-powered content creation and management</p>
        </div>

        <div className="flex gap-4 mb-6">
          <select 
            value={selectedProjectId} 
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-4 py-2 border border-border-subtle rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          >
            <option value="">Select Project</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-primary mb-2">Script Title</label>
            <input
              type="text"
              value={scriptTitle}
              onChange={(e) => setScriptTitle(e.target.value)}
              placeholder="Enter script title..."
              className="w-full px-4 py-2 border border-border-subtle rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          <div className="flex-1 relative">
            <label className="block text-sm font-medium text-ink-primary mb-2">Script Content</label>
            <textarea
              value={scriptContent}
              onChange={(e) => setScriptContent(e.target.value)}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              placeholder="Start writing your script here, or drop files to import content..."
              className="w-full h-full p-4 border border-border-subtle rounded-lg resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !scriptContent.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {isGenerating ? 'Generating...' : 'Enhance'}
            </button>
            
            <button
              onClick={handleTranslate}
              disabled={isTranslating || !scriptContent.trim()}
              className="flex items-center gap-2 px-4 py-2 border border-border-subtle text-ink-primary rounded-lg hover:bg-subtle disabled:opacity-50"
            >
              <Languages className="w-4 h-4" />
              {isTranslating ? 'Translating...' : 'Translate'}
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving || !scriptTitle.trim() || !scriptContent.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 ml-auto"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Script'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateStudio;