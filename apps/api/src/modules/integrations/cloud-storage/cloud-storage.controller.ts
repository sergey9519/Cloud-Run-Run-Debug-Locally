
import { Controller, Get, Param, Query, UseGuards, Req } from '@nestjs/common';
import { CloudStorageService } from './cloud-storage.service';
import { ListFilesQueryDto } from './dto/cloud-storage.dto';

// @UseGuards(JwtAuthGuard)
@Controller('integrations/storage')
export class CloudStorageController {
  constructor(private readonly storageService: CloudStorageService) {}

  @Get('options')
  async getOptions(@Req() req: any) {
    // const userId = req.user.id;
    const userId = 'mock-user-id'; // Placeholder
    return this.storageService.getProviderOptions(userId);
  }

  @Get(':provider/files')
  async listFiles(
    @Param('provider') provider: string,
    @Query() query: ListFilesQueryDto,
    @Req() req: any
  ) {
    // const userId = req.user.id;
    const userId = 'mock-user-id'; // Placeholder
    return this.storageService.listFiles(userId, provider, query.folderId);
  }
}
