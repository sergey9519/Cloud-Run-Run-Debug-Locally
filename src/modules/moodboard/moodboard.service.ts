
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateMoodboardItemDto } from './dto/create-moodboard-item.dto';
import { GoogleGenAI } from '@google/genai';

// Mock DB Interface for Type Safety in this example
interface MoodboardItem {
    id: string;
    projectId: string;
    type: 'image' | 'video' | 'gif';
    url: string;
    caption?: string;
    tags: string[];
    moods: string[];
    colors: string[];
    shotType?: string;
    vector?: number[];
    createdAt: Date;
    updatedAt: Date;
}

@Injectable()
export class MoodboardService {
  private readonly logger = new Logger(MoodboardService.name);
  private items: MoodboardItem[] = []; // In-memory store for simulation

  constructor() {}

  async create(createDto: CreateMoodboardItemDto): Promise<MoodboardItem> {
    const newItem: MoodboardItem = {
      id: `mb-${Date.now()}`,
      ...createDto,
      tags: createDto.tags || [],
      moods: createDto.moods || [],
      colors: createDto.colors || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.items.push(newItem);
    
    // Trigger Async Analysis
    this.analyzeAsset(newItem).catch(err => this.logger.error(`Analysis failed for ${newItem.id}`, err));

    return newItem;
  }

  async findAllByProject(projectId: string): Promise<MoodboardItem[]> {
    return this.items.filter(item => item.projectId === projectId);
  }

  async update(id: string, updateData: Partial<MoodboardItem>): Promise<MoodboardItem> {
    const index = this.items.findIndex(i => i.id === id);
    if (index === -1) throw new NotFoundException(`Item ${id} not found`);
    
    this.items[index] = { ...this.items[index], ...updateData, updatedAt: new Date() };
    return this.items[index];
  }

  async remove(id: string): Promise<void> {
    this.items = this.items.filter(i => i.id !== id);
  }

  async search(projectId: string, query: string): Promise<MoodboardItem[]> {
      const projectItems = await this.findAllByProject(projectId);
      const lowerQ = query.toLowerCase();
      
      // Simple text search (Vector search would be implemented here in production)
      return projectItems.filter(item => 
        item.caption?.toLowerCase().includes(lowerQ) ||
        item.tags.some(t => t.toLowerCase().includes(lowerQ)) ||
        item.moods.some(m => m.toLowerCase().includes(lowerQ))
      );
  }

  /**
   * AI Pipeline: Vision Analysis
   */
  private async analyzeAsset(item: MoodboardItem) {
     if (!process.env.API_KEY) {
         this.logger.warn("No API Key, skipping analysis");
         return;
     }

     try {
         const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
         const model = 'gemini-2.5-flash';
         
         // Note: In a real backend, we'd fetch the file buffer from S3/URL here.
         // Since we don't have the file buffer in this context, we assume the URL might be accessible 
         // or passed differently. For this logic, we'll outline the call.
         
         const prompt = `
            Analyze this visual asset for a moodboard.
            JSON Output: { "caption": string, "tags": string[], "moods": string[], "colors": string[], "shotType": string }
         `;
         
         // Mocking the call structure
         /*
         const response = await ai.models.generateContent({
             model,
             contents: [
                 { inlineData: { mimeType: 'image/jpeg', data: '...' } },
                 { text: prompt }
             ]
         });
         */
         
         // Simulate successful update
         await this.update(item.id, {
             caption: "AI Analyzed Asset",
             tags: ["AI", "Generated"],
             moods: ["Tech", "Modern"]
         });

     } catch (e) {
         this.logger.error("AI Analysis Failed", e);
     }
  }
}
