
import { Controller, Post, Body, Param, Get, Delete } from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';

@Controller('knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Post('create-from-asset')
  async createFromAsset(
      @Body('projectId') projectId: string, 
      @Body('assetId') assetId: string
  ) {
    return this.knowledgeService.createFromAsset(projectId, assetId);
  }

  @Get(':projectId')
  async findAll(@Param('projectId') projectId: string) {
      return this.knowledgeService.findAll(projectId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
      return this.knowledgeService.remove(id);
  }
}
