
import { IsString, IsEnum, IsOptional, IsArray, IsUrl, IsUUID } from 'class-validator';

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  GIF = 'gif'
}

export class CreateMoodboardItemDto {
  @IsUUID()
  projectId: string;

  @IsEnum(MediaType)
  type: MediaType;

  @IsUrl()
  url: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  moods?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  colors?: string[];

  @IsOptional()
  @IsString()
  shotType?: string;
}
