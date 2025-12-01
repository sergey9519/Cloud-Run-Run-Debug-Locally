import { Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { AssetsService } from '../assets/assets.service';
import { DeepReaderService } from '../intelligence/deep-reader.service';
import { KnowledgeSourceEntity } from './interfaces/knowledge-source.interface'; 
import { StorageService } from '../storage/storage.service';
import { Buffer } from 'buffer';

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);
  private sources: KnowledgeSourceEntity[] = [];

  constructor(
    private readonly assetsService: AssetsService,
    private readonly deepReader: DeepReaderService,
    private readonly storage: StorageService 
  ) {}

  async createFromAsset(projectId: string, assetId: string): Promise<KnowledgeSourceEntity> {
    this.logger.log(`[Ingestion] Pipeline started for AssetID: ${assetId}`);
    
    const asset = await this.assetsService.findOne(assetId);
    if (!asset) throw new NotFoundException(`Asset ${assetId} not found`);

    let content = '';
    let summary = '';

    try {
        // 1. Secure Retrieval (Signed URL)
        const downloadUrl = await this.assetsService.getDownloadUrl(asset.id);
        
        // 2. Fetch Stream
        // Note: In high-scale 2025 systems, we would pipe this stream directly to the worker
        // via Transferable Objects (ReadableStream), bypassing the Main Thread RAM entirely.
        // For compatibility with the current pdf-parse lib, we still buffer, 
        // BUT we do it with explicit size guards.
        const response = await fetch(downloadUrl);
        
        if (!response.ok) {
            throw new Error(`Upstream Storage Error: ${response.status} ${response.statusText}`);
        }
        
        const contentLength = Number(response.headers.get('content-length'));
        if (contentLength > 20 * 1024 * 1024) {
            // 20MB Limit for synchronous buffer to prevent OOM
            throw new UnprocessableEntityException('File too large for real-time indexing. Submit to background job.');
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 3. Off-Thread Processing
        // The heavy lifting now happens in the Worker Thread
        content = await this.deepReader.extractText(buffer, asset.mimeType);
        summary = `Indexed ${asset.fileName} (${(content.length / 1000).toFixed(1)}k chars)`;

    } catch (error: any) {
        this.logger.error(`[Ingestion] Failed for ${assetId}: ${error.message}`);
        content = "Extraction failed due to processing error.";
        summary = "Indexing Error";
        // We do not throw here to allow the Entity to be created with Error status
        // This ensures the UI can show "Failed" instead of crashing
    }

    // 4. Atomic State Commit
    const newSource: KnowledgeSourceEntity = {
        id: `ks-${Date.now()}`,
        type: 'file',
        title: asset.fileName,
        assetId: asset.id,
        originalContent: content,
        summary,
        status: content === 'Extraction failed due to processing error.' ? 'error' : 'indexed',
        createdAt: new Date()
    };

    this.sources.push(newSource);
    return newSource;
  }

  async findAll(projectId: string): Promise<KnowledgeSourceEntity[]> {
      return this.sources;
  }

  async remove(id: string): Promise<void> {
      this.sources = this.sources.filter(s => s.id !== id);
  }
}