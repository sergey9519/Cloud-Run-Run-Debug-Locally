
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../../prisma/prisma.service';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { Buffer } from 'buffer';

export interface AssetEntity {
  id: string;
  projectId?: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  publicUrl?: string;
  createdAt: Date;
  isTransient?: boolean;
  url?: string; // Virtual field for frontend convenience
}

export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);
  private memoryStore: AssetEntity[] = []; // In-memory fallback

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {
    this.logger.log('AssetsService Initialized');
  }

  async create(file: MulterFile, projectId?: string): Promise<AssetEntity> {
    const fileExt = extname(file.originalname);
    const uniqueName = `${randomUUID()}${fileExt}`;
    const storageKey = `uploads/${projectId || 'global'}/${uniqueName}`;

    // 1. Upload to Cloud Storage
    const uploaded = await this.storage.uploadObject({
      key: storageKey,
      body: file.buffer,
      contentType: file.mimetype,
      isPublic: true, 
    });

    const finalUrl = uploaded.publicUrl || uploaded.signedUrl;

    const assetEntity: AssetEntity = {
        id: randomUUID(),
        fileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storageKey: uploaded.storageKey,
        publicUrl: uploaded.publicUrl,
        url: finalUrl,
        createdAt: new Date(),
        isTransient: true,
        projectId: projectId || undefined
    };

    // 2. Save to Memory Store (Resilience)
    this.memoryStore.unshift(assetEntity);

    // 3. Save Record to DB
    // Check if prisma asset model actually exists to avoid runtime crash if schema is outdated
    if (this.prisma && (this.prisma as any).asset) {
        try {
            const asset = await this.prisma.asset.create({
              data: {
                id: assetEntity.id,
                fileName: file.originalname,
                mimeType: file.mimetype,
                sizeBytes: file.size,
                storageKey: uploaded.storageKey,
                publicUrl: uploaded.publicUrl, // Nullable in DB
                projectId: projectId || null,
              },
            });
            
            // Update memory store to reflect persistence (remove transient flag)
            const index = this.memoryStore.findIndex(a => a.id === assetEntity.id);
            if (index !== -1) {
                this.memoryStore[index] = { ...asset, url: finalUrl, isTransient: false };
            }
            
            return { ...asset, url: finalUrl, isTransient: false };
        } catch (e: any) {
            this.logger.warn(`Database save failed (Storage successful). Asset ${assetEntity.id} kept in memory: ${e.message}`);
            return assetEntity;
        }
    }

    return assetEntity;
  }

  async findAll(): Promise<AssetEntity[]> {
    let dbAssets: AssetEntity[] = [];
    
    // 1. Try DB
    if (this.prisma && (this.prisma as any).asset) {
        try {
            const records = await this.prisma.asset.findMany({
              orderBy: { createdAt: 'desc' },
              take: 1000
            });
            // Mark DB assets as persistent
            dbAssets = records.map((a: any) => ({ ...a, isTransient: false }));
        } catch(e) {
            this.logger.warn(`Failed to list assets from DB: ${e}`);
        }
    }

    // 2. Merge with Memory Store
    const dbIds = new Set(dbAssets.map(a => a.id));
    const memoryAssets = this.memoryStore.filter(a => !dbIds.has(a.id));
    
    // Combine and sort
    const allAssets = [...memoryAssets, ...dbAssets].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // 3. Populate virtual URL field on list
    return await Promise.all(allAssets.map(async (a) => {
        // If we already have a functional URL (e.g. from memory or publicUrl), use it
        if (a.url) return a;
        if (a.publicUrl) return { ...a, url: a.publicUrl };
        
        let url = '';
        try {
            // Only try signing if we have a key and no public url
            if (a.storageKey) {
                url = await this.storage.getSignedDownloadUrl(a.storageKey);
            }
        } catch(e) {
            // Storage might be down or misconfigured, return asset without URL
        }
        return { ...a, url };
    }));
  }

  async findOne(id: string): Promise<AssetEntity> {
    // 1. Check memory first
    const memoryAsset = this.memoryStore.find(a => a.id === id);
    if (memoryAsset) return memoryAsset;

    // 2. Check DB
    if (!this.prisma || !(this.prisma as any).asset) throw new NotFoundException('Asset DB unavailable');
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  async getDownloadUrl(id: string): Promise<string> {
    try {
        const asset = await this.findOne(id);
        if (asset.url) return asset.url;
        if (asset.publicUrl) return asset.publicUrl;
        return this.storage.getSignedDownloadUrl(asset.storageKey);
    } catch (e) {
        return '';
    }
  }

  async delete(id: string): Promise<void> {
    try {
        const asset = await this.findOne(id);
        
        await this.storage.deleteObject(asset.storageKey);
        this.memoryStore = this.memoryStore.filter(a => a.id !== id);

        if (this.prisma && (this.prisma as any).asset) {
            await this.prisma.asset.delete({ where: { id } });
        }
    } catch (e: any) {
        this.logger.warn(`Delete failed: ${e.message}`);
    }
  }
}
