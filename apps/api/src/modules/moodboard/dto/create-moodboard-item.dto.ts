import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateMoodboardItemDto {
  @IsString()
  projectId: string;

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
  type?: string;
}