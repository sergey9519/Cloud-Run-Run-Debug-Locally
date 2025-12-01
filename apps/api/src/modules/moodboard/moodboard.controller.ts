
import { Controller, Get, Post, Body, Param, Patch, Delete, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MoodboardService } from './moodboard.service';
import { CreateMoodboardItemDto } from './dto/create-moodboard-item.dto';
import { AssetsService } from '../assets/assets.service';

@Controller('moodboard')
export class MoodboardController {
  constructor(
    private readonly moodboardService: MoodboardService,
    private readonly assetsService: AssetsService
  ) {}

  @Post(':projectId/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@Param('projectId') projectId: string, @UploadedFile() file: any) { // Type 'any' used for mock Express.Multer.File
    // 1. Upload to Cloud Storage via AssetsService
    const asset = await this.assetsService.create(file, projectId);
    
    // 2. Create DTO with real GCS URL
    const dto: CreateMoodboardItemDto = {
        projectId,
        type: file.mimetype.startsWith('video') ? 'video' : 'image' as any,
        url: asset.url || asset.publicUrl || '',
        caption: 'Processing analysis...'
    };

    return this.moodboardService.create(dto);
  }

  @Post(':projectId/link-asset')
  async linkAsset(
      @Param('projectId') projectId: string, 
      @Body('assetId') assetId: string
  ) {
    return this.moodboardService.createFromAsset(projectId, assetId);
  }

  @Post(':projectId')
  async create(@Param('projectId') projectId: string, @Body() createDto: CreateMoodboardItemDto) {
    createDto.projectId = projectId;
    return this.moodboardService.create(createDto);
  }

  @Get(':projectId')
  async findAll(@Param('projectId') projectId: string) {
    return this.moodboardService.findAllByProject(projectId);
  }

  @Get(':projectId/search')
  async search(@Param('projectId') projectId: string, @Query('q') query: string) {
    return this.moodboardService.search(projectId, query);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateData: any) {
    return this.moodboardService.update(id, updateData);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.moodboardService.remove(id);
  }
}
