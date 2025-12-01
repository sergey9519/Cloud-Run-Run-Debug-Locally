
import { Injectable, Logger } from '@nestjs/common';
import { GoogleClientFactory } from './google-client.factory';

export interface DriveFileDTO {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string | null;
  webViewLink?: string | null;
  iconLink?: string | null;
  modifiedTime?: string | null;
  size?: string | null;
}

@Injectable()
export class DriveService {
  private readonly logger = new Logger(DriveService.name);
  private readonly TEAM_FOLDER_ID = process.env.GOOGLE_TEAM_FOLDER_ID;

  constructor(private readonly clientFactory: GoogleClientFactory) {}

  async listTeamAssets(): Promise<DriveFileDTO[]> {
    if (!this.TEAM_FOLDER_ID) {
      this.logger.warn('GOOGLE_TEAM_FOLDER_ID is not set. Returning empty asset list.');
      return [];
    }

    try {
      // Ensure Service Account is usable before calling
      const drive = this.clientFactory.createDriveClient();

      const response = await drive.files.list({
        q: `'${this.TEAM_FOLDER_ID}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, thumbnailLink, webViewLink, iconLink, modifiedTime, size)',
        pageSize: 100,
        orderBy: 'folder, modifiedTime desc',
      });

      if (!response.data || !response.data.files) {
        return [];
      }

      return response.data.files.map(file => ({
        id: file.id || '',
        name: file.name || 'Untitled',
        mimeType: file.mimeType || 'application/octet-stream',
        thumbnailLink: file.thumbnailLink || null,
        webViewLink: file.webViewLink || null,
        iconLink: file.iconLink || null,
        modifiedTime: file.modifiedTime || null,
        size: file.size || null
      })).filter(f => f.id !== ''); // Filter out any invalid files
    } catch (error: any) {
      this.logger.error(`Failed to list team assets: ${error.message}`);
      // Return empty list on failure rather than crashing endpoint
      return [];
    }
  }
}
