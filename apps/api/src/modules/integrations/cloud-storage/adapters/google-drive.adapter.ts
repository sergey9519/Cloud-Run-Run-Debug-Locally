
import { Injectable, Logger } from '@nestjs/common';
import { ICloudStorageAdapter } from './storage-adapter.interface';
import { CloudFileDto, CloudFileType, CloudProviderType } from '../dto/cloud-storage.dto';
import { GoogleClientFactory } from '../../../google/google-client.factory';

@Injectable()
export class GoogleDriveAdapter implements ICloudStorageAdapter {
  private readonly logger = new Logger(GoogleDriveAdapter.name);
  readonly providerId = CloudProviderType.GOOGLE_DRIVE;

  constructor(
    private readonly clientFactory: GoogleClientFactory
  ) {}

  // Mock user lookup helper since UserService is not yet implemented
  private async getMockUser(userId: string) {
      // In a real app, this would query the DB
      return {
          id: userId,
          email: 'mock@studio.com',
          googleCredentials: {
              accessToken: 'mock-access-token',
              refreshToken: 'mock-refresh-token' // Assume connected for dev
          }
      };
  }

  async isConnected(userId: string): Promise<boolean> {
    try {
        const user = await this.getMockUser(userId);
        return !!user?.googleCredentials?.refreshToken;
    } catch (e) {
        return false;
    }
  }

  async getAuthUrl(userId: string): Promise<string> {
    return `/auth/google/connect?userId=${userId}`;
  }

  async listFiles(userId: string, folderId = 'root'): Promise<{ files: CloudFileDto[]; nextPageToken?: string }> {
    try {
        const user = await this.getMockUser(userId);
        const { drive } = this.clientFactory.createDriveClientForUser(user as any);

        const res = await drive.files.list({
          q: `'${folderId}' in parents and trashed = false`,
          fields: 'nextPageToken, files(id, name, mimeType, size, thumbnailLink, webViewLink, modifiedTime)',
          pageSize: 20,
        });

        const files = (res.data.files || []).map(f => ({
          id: f.id!,
          name: f.name!,
          provider: CloudProviderType.GOOGLE_DRIVE,
          type: f.mimeType === 'application/vnd.google-apps.folder' ? CloudFileType.FOLDER : CloudFileType.FILE,
          mimeType: f.mimeType!,
          sizeBytes: f.size ? parseInt(f.size) : undefined,
          thumbnailUrl: f.thumbnailLink || undefined,
          webViewUrl: f.webViewLink || undefined,
          updatedAt: f.modifiedTime || new Date().toISOString()
        }));

        return { files, nextPageToken: res.data.nextPageToken || undefined };
    } catch (e: any) {
        this.logger.error(`Drive List Failed: ${e.message}`);
        // Return empty if credentials invalid or other error
        return { files: [] };
    }
  }

  async getDownloadUrl(userId: string, fileId: string): Promise<string> {
    return `https://drive.google.com/uc?id=${fileId}&export=download`;
  }
}
