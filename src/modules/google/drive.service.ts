
import { Injectable, Logger } from '@nestjs/common';
import { GoogleClientFactory } from './google-client.factory';

export interface DriveFileDTO {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webViewLink?: string;
  iconLink?: string;
  modifiedTime?: string;
  size?: number;
}

@Injectable()
export class DriveService {
  private readonly logger = new Logger(DriveService.name);
  private readonly TEAM_FOLDER_ID = process.env.GOOGLE_TEAM_FOLDER_ID;

  constructor(private readonly clientFactory: GoogleClientFactory) {}

  async listTeamAssets(): Promise<DriveFileDTO[]> {
    if (!this.TEAM_FOLDER_ID) {
      const errorMessage = 'GOOGLE_TEAM_FOLDER_ID is not set.';
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    const drive = this.clientFactory.createDriveClient();

    try {
      const response = await drive.files.list({
        q: `'${this.TEAM_FOLDER_ID}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, thumbnailLink, webViewLink, iconLink, modifiedTime, size)',
        // TODO: Implement pagination
        pageSize: 100,
        orderBy: 'folder, modifiedTime desc',
      });

      return (response.data.files || []).map(file => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        thumbnailLink: file.thumbnailLink,
        webViewLink: file.webViewLink,
        iconLink: file.iconLink,
        modifiedTime: file.modifiedTime,
        size: file.size ? parseInt(file.size, 10) : undefined
      }));
    } catch (error) {
      this.logger.error(`Failed to list team assets: ${error.message}`);
      throw error;
    }
  }
}
