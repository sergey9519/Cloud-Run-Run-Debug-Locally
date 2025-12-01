
import { Controller, Get, Post, Body, Param, Patch, Delete, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MoodboardService } from './moodboard.service';
import { CreateMoodboardItemDto } from './dto/create-moodboard-item.dto';

@Controller('moodboard')
export class MoodboardController {
  constructor(private readonly moodboardService: MoodboardService) {}

  @Post(':projectId/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@Param('projectId') projectId: string, @UploadedFile() file: any) { // Type 'any' used for mock Express.Multer.File
    // 1. Upload to Cloud Storage (S3/GCS) -> Get URL
    const mockUrl = `https://cdn.studio.com/${projectId}/${Date.now()}_${file.originalname}`;
    
    // 2. Create DTO
    const dto: CreateMoodboardItemDto = {
        projectId,
        type: file.mimetype.startsWith('video') ? 'video' : 'image' as any,
        url: mockUrl,
        caption: 'Processing...'
    };

    return this.moodboardService.create(dto);
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
