import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ICloudStorageAdapter } from './adapters/storage-adapter.interface';
import { GoogleDriveAdapter } from './adapters/google-drive.adapter'; // Implementation below
import { CloudProviderOptionDto, CloudProviderType, CloudFileDto } from './dto/cloud-storage.dto';

@Injectable()
export class CloudStorageService {
  private readonly logger = new Logger(CloudStorageService.name);
  private readonly adapters: Map<string, ICloudStorageAdapter> = new Map();

  constructor(
    // In a real app, inject specific adapters via DI
    private readonly googleDriveAdapter: GoogleDriveAdapter
  ) {
    this.registerAdapter(googleDriveAdapter);
    // this.registerAdapter(new DropboxAdapter(...)); 
    // this.registerAdapter(new OneDriveAdapter(...)); 
  }

  private registerAdapter(adapter: ICloudStorageAdapter) {
    this.adapters.set(adapter.providerId, adapter);
  }

  /**
   * Returns all available storage options and their connection status for the user.
   */
  async getProviderOptions(userId: string): Promise<CloudProviderOptionDto[]> {
    const options: CloudProviderOptionDto[] = [];

    // 1. Google Drive
    options.push({
      id: CloudProviderType.GOOGLE_DRIVE,
      name: 'Google Drive',
      iconUrl: 'https://cdn.simpleicons.org/googledrive',
      isConnected: await this.googleDriveAdapter.isConnected(userId),
      authUrl: await this.googleDriveAdapter.getAuthUrl(userId)
    });

    // 2. Dropbox (Mock/Future)
    options.push({
      id: CloudProviderType.DROPBOX,
      name: 'Dropbox',
      iconUrl: 'https://cdn.simpleicons.org/dropbox',
      isConnected: false,
      authUrl: 'https://www.dropbox.com/oauth2/authorize?client_id=PLACEHOLDER...'
    });

    // 3. OneDrive (Mock/Future)
    options.push({
      id: CloudProviderType.ONEDRIVE,
      name: 'OneDrive',
      iconUrl: 'https://cdn.simpleicons.org/microsoftonedrive',
      isConnected: false,
      authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=PLACEHOLDER...'
    });

    return options;
  }

  async listFiles(userId: string, providerId: string, folderId?: string): Promise<{ files: CloudFileDto[]; nextPageToken?: string }> {
    const adapter = this.adapters.get(providerId);
    if (!adapter) {
      throw new BadRequestException(`Provider '${providerId}' is not supported.`);
    }

    if (!(await adapter.isConnected(userId))) {
      throw new BadRequestException(`User is not connected to ${providerId}`);
    }

    try {
      return await adapter.listFiles(userId, folderId);
    } catch (error: any) {
      this.logger.error(`Failed to list files for ${providerId}: ${error.message}`);
      throw new BadRequestException(`External API Error: ${error.message}`);
    }
  }
}