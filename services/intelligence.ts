
import { GoogleGenerativeAI } from "@google/generative-ai";
import { KnowledgeSource, KnowledgeChunk, HallucinationCheck, Project } from '../types';
import { generateContentWithRetry } from './api';

// --- MOCK EMBEDDING & VECTOR STORE ---
class VectorStore {
  private chunks: KnowledgeChunk[] = [];

  addChunks(newChunks: KnowledgeChunk[]) {
    this.chunks = [...this.chunks, ...newChunks];
  }

  // Simulating Semantic Search
  async search(query: string, limit: number = 5): Promise<KnowledgeChunk[]> {
    const queryTokens = query.toLowerCase().split(' ');
    
    const scoredChunks = this.chunks.map(chunk => {
      let score = 0;
      const text = chunk.text.toLowerCase();
      
      queryTokens.forEach(token => {
        if (text.includes(token)) score += 1;
      });

      // Priority Rule: Tone & Voice tags get a boost
      if (chunk.tags.includes('tone') || chunk.tags.includes('voice')) {
        score *= 1.5;
      }
      
      // External Truth gets a boost
      if (chunk.tags.includes('external_truth')) {
        score *= 1.2;
      }
      
      // Lore gets a boost
      if (chunk.tags.includes('lore')) {
        score *= 1.3;
      }

      return { ...chunk, relevanceScore: score };
    });

    return scoredChunks
      .filter(c => (c.relevanceScore || 0) > 0)
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, limit);
  }

  clear() {
    this.chunks = [];
  }
}

export const vectorStore = new VectorStore();

// --- DEEP READER (INGESTION ENGINE) ---

export const DeepReader = {
  async ingestFile(file: File): Promise<KnowledgeSource> {
    // 1. Image Handling (Gemini Vision)
    if (file.type.startsWith('image/') && process.env.API_KEY) {
        return this.ingestImage(file);
    }
    
    // 2. Video Handling
    if (file.type.startsWith('video/') && process.env.API_KEY) {
        // Video analysis on frontend is tricky due to size.
        // In a real app, this would upload to GCS first. 
        // For now, we simulate a text extraction or small video analysis via backend proxy if available.
        // Or we warn the user.
        return new Promise((resolve) => resolve({
            id: `vid-${Date.now()}`,
            type: 'file',
            title: file.name,
            originalContent: "Video analysis pending upload.",
            summary: "Video Content",
            status: 'processing',
            chunks: [],
            createdAt: new Date().toISOString()
        }));
    }

    // 3. Text Handling (Default fallback)
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = e.target?.result as string;
            // Basic text chunking
            const chunks = this.chunkContent(content, file.name, ['file', 'upload']);
            
            // Add to Vector Store
            vectorStore.addChunks(chunks);

            resolve({
                id: `file-${Date.now()}`,
                type: 'file',
                title: file.name,
                url: '',
                originalContent: content,
                summary: `Imported document: ${file.name} (${Math.round(file.size / 1024)} KB)`,
                status: 'indexed',
                chunks,
                createdAt: new Date().toISOString()
            });
        };
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
  },

  async ingestURL(url: string): Promise<KnowledgeSource> {
    // 1. Identify Type
    let type: 'youtube' | 'wiki' | 'url' = 'url';
    if (url.includes('youtube.com') || url.includes('youtu.be')) type = 'youtube';
    else if (url.includes('wikipedia') || url.includes('fandom.com')) type = 'wiki';

    // 2. Simulate Fetch/Scrape (Deep Parsing)
    let content = "";
    let title = "";

    await new Promise(r => setTimeout(r, 1500)); // Simulate processing latency

    if (type === 'youtube') {
      title = "Transcript: " + (url.length > 30 ? url.slice(0,30) + "..." : url);
      content = `[00:00] Welcome back to the channel. Today we are analyzing the core themes of this project.
[00:15] Key takeaway: The visual style must be high-contrast and neon.
[00:45] Lore Detail: The protagonist, 'Unit 734', cannot speak but communicates via radio waves.
[01:20] IMPORTANT: Never use blue light in the enemy base scenes. Only red.`;
    } else if (type === 'wiki') {
      title = "Wiki Entry: Lore Database";
      content = `History and Origins
The faction known as "The Silenced" emerged in 2040.
They are characterized by their lack of digital footprints.

Powers & Abilities
- Signal Jamming: Blocks all wifi within 50m.
- Stealth: Can turn invisible to thermal cameras.

Weaknesses
- Analog tech: They cannot hack mechanical devices.`;
    } else {
      try {
          const hostname = new URL(url).hostname;
          title = "External Resource: " + hostname;
      } catch { title = "External Link"; }
      
      content = `Strategic Overview extracted from ${url}:
1. Focus on speed and efficiency.
2. Target audience is Gen Z gamers.
3. Key Keywords: Glitch, Hype, Drop, Rare.
4. Avoid corporate speak.`;
    }

    const tags = type === 'wiki' ? ['external_truth', 'lore'] : ['general', 'context'];
    const chunks = this.chunkContent(content, url, tags);
    vectorStore.addChunks(chunks);

    return {
      id: `source-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      type,
      title,
      url,
      originalContent: content,
      summary: `AI Analysis: Extracted ${chunks.length} chunks from ${type}.`,
      status: 'indexed',
      chunks,
      createdAt: new Date().toISOString()
    };
  },

  async ingestImage(file: File): Promise<KnowledgeSource> {
      const base64Data = await this.fileToBase64(file);
      const ai = new GoogleGenerativeAI(process.env.API_KEY!);
      
      const response = await generateContentWithRetry(ai, {
          model: 'gemini-3-pro-preview', // Upgraded for 2025 Standard
          contents: {
              parts: [
                  { inlineData: { mimeType: file.type, data: base64Data } },
                  { text: "Analyze this image in detail. Extract all visible text, describe visual elements, style, mood, and any technical specs provided. Be extremely specific." }
              ]
          }
      });

      const content = response.text || "No analysis generated.";
      const chunks = this.chunkContent(content, file.name, ['image', 'analysis']);
      vectorStore.addChunks(chunks);

      return {
          id: `img-${Date.now()}`,
          type: 'file', // Treat as file type for now in UI
          title: file.name,
          url: '',
          originalContent: content,
          summary: `AI Image Analysis of ${file.name}`,
          status: 'indexed',
          chunks,
          createdAt: new Date().toISOString()
      };
  },

  // Helper for consistent chunking
  chunkContent(content: string, sourceId: string, tags: string[] = ['general']): KnowledgeChunk[] {
      // Split by paragraphs or roughly 500 chars to optimize for vector context window
      const rawChunks = content.split('\n\n').flatMap(p => p.length > 500 ? p.match(/.{1,500}/g) || [] : [p]);
      return rawChunks.map((text, idx) => ({
          id: `chunk-${Date.now()}-${idx}`,
          sourceId,
          text: text.trim(),
          tags,
      })).filter(c => c.text.length > 0);
  },

  fileToBase64(file: File): Promise<string> {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => {
              const result = reader.result as string;
              // Remove Data URL prefix
              const base64 = result.split(',')[1];
              resolve(base64);
          };
          reader.onerror = error => reject(error);
      });
  }
};

// --- HALLUCINATION GUARD ---

export const HallucinationGuard = {
  async validate(text: string, projectConstraints: string[]): Promise<HallucinationCheck> {
    if (!process.env.API_KEY || !text) return { hasViolation: false, violations: [] };

    try {
      const ai = new GoogleGenerativeAI(process.env.API_KEY);
      const prompt = `
      You are a Continuity Editor. Check the following generated text against these Constraints (Context).
      
      CONSTRAINTS / TRUTH:
      ${projectConstraints.map(c => `- ${c}`).join('\n')}
      
      TEXT TO CHECK:
      "${text}"
      
      Task: Identify if any part of the text contradicts the constraints or established truth.
      Return valid JSON (no markdown):
      {
        "hasViolation": boolean,
        "violations": [
          { "quote": "exact substring from text", "rule": "which rule was broken", "correction": "suggestion" }
        ]
      }
      `;

      const response = await generateContentWithRetry(ai, {
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      
      let jsonStr = response.text;
      if (jsonStr) {
          jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
          return JSON.parse(jsonStr);
      }
      return { hasViolation: false, violations: [] };
    } catch (e) {
      console.error("Guard failed", e);
      return { hasViolation: false, violations: [] };
    }
  }
};

// --- RAG GENERATOR ---

export const RAGEngine = {
  async generate(prompt: string, sources: KnowledgeSource[], project: Project): Promise<string> {
    if (!process.env.API_KEY) throw new Error("No API Key");

    // 1. Retrieve Context
    const retrievedChunks = await vectorStore.search(prompt, 8);
    
    // 2. Build Context Window
    const contextBlock = retrievedChunks.map((c, i) => `[Source ${i+1}]: ${c.text}`).join('\n\n');
    const summaryBlock = sources.map(s => `[Summary of ${s.title}]: ${s.summary}`).join('\n');
    const constraints = (project.tags || []).join(', ');

    // 3. System Prompt
    const systemPrompt = `
    You are a Creative Assistant. Write content based on the user's prompt using the provided Source Material.
    
    CRITICAL RULES:
    1. PRIORITIZE the "Source Material" above all else.
    2. If you use a specific fact from a Source, append a citation like [[Source X]].
    3. Adhere to Tone/Style: ${constraints}.
    4. Do NOT hallucinate facts not found in the source if it concerns specific Lore.
    
    SOURCE MATERIAL (RAG CONTEXT):
    ${contextBlock}
    
    HIGH-LEVEL SUMMARIES:
    ${summaryBlock}
    `;

    // 4. Generate
    const ai = new GoogleGenerativeAI(process.env.API_KEY);
    const response = await generateContentWithRetry(ai, {
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: systemPrompt + `\n\nUSER PROMPT: ${prompt}` }] }
      ]
    });

    return response.text;
  }
};
