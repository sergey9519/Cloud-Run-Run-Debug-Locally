
import { Controller, Get, UseGuards } from '@nestjs/common';
import { DriveService, DriveFileDTO } from './drive.service';

// In a real app, use @UseGuards(JwtAuthGuard)
@Controller('google/drive')
export class DriveController {
  constructor(private readonly driveService: DriveService) {}

  @Get('team-assets')
  async getTeamAssets(): Promise<DriveFileDTO[]> {
    return await this.driveService.listTeamAssets();
  }
}
