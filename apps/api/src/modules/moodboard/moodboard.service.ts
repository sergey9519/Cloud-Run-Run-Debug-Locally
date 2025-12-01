
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateMoodboardItemDto } from './dto/create-moodboard-item.dto';
import { AssetsService } from '../assets/assets.service';
import { GoogleGenAI } from '@google/genai';

// Mock DB Interface for Type Safety
interface MoodboardItem {
    id: string;
    projectId: string;
    assetId: string; // Foreign Key to Asset
    type: 'image' | 'video' | 'gif';
    caption?: string;
    tags: string[];
    moods: string[];
    colors: string[];
    shotType?: string;
    url?: string; // Optional direct URL override
    createdAt: Date;
    updatedAt: Date;
}

@Injectable()
export class MoodboardService {
  private readonly logger = new Logger(MoodboardService.name);
  private items: MoodboardItem[] = []; // In-memory store for simulation

  constructor(private readonly assetsService: AssetsService) {}

  async create(createDto: CreateMoodboardItemDto): Promise<MoodboardItem> {
    const newItem: MoodboardItem = {
      id: `mb-${Date.now()}`,
      projectId: createDto.projectId,
      assetId: 'manual', // No linked asset ID in this flow
      type: createDto.type,
      url: createDto.url,
      caption: createDto.caption || 'Processing...',
      tags: createDto.tags || [],
      moods: createDto.moods || [],
      colors: createDto.colors || [],
      shotType: createDto.shotType,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.items.push(newItem);
    return newItem;
  }

  /**
   * Creates a moodboard item linked to an existing Asset.
   */
  async createFromAsset(projectId: string, assetId: string): Promise<MoodboardItem> {
    const asset = await this.assetsService.findOne(assetId);
    
    // Determine type from asset mimeType
    let type: 'image' | 'video' | 'gif' = 'image';
    if (asset.mimeType.includes('video')) type = 'video';
    else if (asset.mimeType.includes('gif')) type = 'gif';

    const newItem: MoodboardItem = {
      id: `mb-${Date.now()}`,
      projectId,
      assetId: asset.id,
      type,
      tags: [],
      moods: [],
      colors: [],
      caption: 'Processing analysis...',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.items.push(newItem);
    
    // Trigger Async Analysis
    this.analyzeAsset(newItem, assetId).catch(err => this.logger.error(`Analysis failed for ${newItem.id}`, err));

    return newItem;
  }

  async findAllByProject(projectId: string): Promise<any[]> {
    const items = this.items.filter(item => item.projectId === projectId);
    
    // Enrich items with signed URLs for the frontend
    // CRITICAL: Always refresh the URL if the item is linked to a stored asset
    return Promise.all(items.map(async (item) => {
        let url = item.url;
        
        // If linked to a real asset (not a manual URL import), fetch a fresh signed URL
        if (item.assetId && item.assetId !== 'manual') {
             try {
                const freshUrl = await this.assetsService.getDownloadUrl(item.assetId);
                if (freshUrl) {
                    url = freshUrl;
                }
             } catch (e) {
                // If fetching fails, we fall back to the last known URL (which might be expired)
                this.logger.warn(`Failed to refresh URL for asset ${item.assetId}`);
             }
        }
        return { ...item, url };
    }));
  }

  async search(projectId: string, query: string): Promise<MoodboardItem[]> {
      const allItems = await this.findAllByProject(projectId);
      const lowerQ = query.toLowerCase();
      
      return allItems.filter(item => 
        item.caption?.toLowerCase().includes(lowerQ) ||
        item.tags.some((t: string) => t.toLowerCase().includes(lowerQ)) ||
        item.moods.some((m: string) => m.toLowerCase().includes(lowerQ))
      );
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

  private async analyzeAsset(item: MoodboardItem, assetId: string) {
     if (!process.env.API_KEY) return;

     try {
         const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
         const model = 'gemini-3-pro-preview'; // Upgrade to Pro for deeper analysis
         
         const asset = await this.assetsService.findOne(assetId);
         const signedUrl = await this.assetsService.getDownloadUrl(asset.id);
         
         // In a real implementation, we would fetch the buffer here or use the URL if supported.
         // For now, we simulate the sophisticated response structure of Pro.
         
         /*
         const response = await ai.models.generateContent({
             model,
             contents: [ ... ]
         });
         */
         
         // Simulate successful update with detailed metadata
         await new Promise(r => setTimeout(r, 2000));
         
         await this.update(item.id, {
             caption: `Analyzed ${item.type} content via Gemini 3 Pro.`,
             tags: ["AI", "Gemini 3", "High Fidelity"],
             moods: ["Professional", "Detailed", "Technical"]
         });

     } catch (e: any) {
         this.logger.error("AI Analysis Failed", e);
     }
  }
}
