import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  GIF = 'gif'
}

export class CreateMoodboardItemDto {
  @IsString()
  projectId: string;

  @IsEnum(MediaType)
  type: MediaType;

  @IsString()
  @IsOptional()
  caption?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsArray()
  @IsOptional()
  colors?: string[];

  @IsString()
  @IsOptional()
  url?: string;

  @IsArray()
  @IsOptional()
  moods?: string[];

  @IsString()
  @IsOptional()
  shotType?: string;
}