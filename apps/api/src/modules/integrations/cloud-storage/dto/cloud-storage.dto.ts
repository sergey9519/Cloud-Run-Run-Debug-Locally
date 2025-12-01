
import { IsEnum, IsString, IsUrl, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export enum CloudProviderType {
  GOOGLE_DRIVE = 'google_drive',
  DROPBOX = 'dropbox',
  ONEDRIVE = 'onedrive',
  BOX = 'box'
}

export enum CloudFileType {
  FILE = 'file',
  FOLDER = 'folder'
}

export class CloudProviderOptionDto {
  @IsEnum(CloudProviderType)
  id: CloudProviderType;

  @IsString()
  name: string;

  @IsUrl()
  iconUrl: string;

  @IsBoolean()
  isConnected: boolean;

  @IsOptional()
  @IsUrl()
  authUrl?: string; // URL to initiate OAuth flow if not connected
}

export class CloudFileDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsEnum(CloudFileType)
  type: CloudFileType;

  @IsString()
  provider: CloudProviderType;

  @IsString()
  mimeType: string;

  @IsOptional()
  @IsNumber()
  sizeBytes?: number;

  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @IsOptional()
  @IsString()
  webViewUrl?: string;

  @IsString()
  updatedAt: string;
}

export class ListFilesQueryDto {
  @IsOptional()
  @IsString()
  folderId?: string;

  @IsOptional()
  @IsString()
  nextPageToken?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
