
import { Controller, Get, UseGuards } from '@nestjs/common';
import { DriveService, DriveFileDTO } from './drive.service';
import { GoogleClientFactory } from './google-client.factory';

// In a real app, use @UseGuards(JwtAuthGuard)
@Controller('google/drive')
export class DriveController {
  constructor(
    private readonly driveService: DriveService,
    private readonly googleFactory: GoogleClientFactory
  ) {}

  @Get('team-assets')
  async getTeamAssets(): Promise<DriveFileDTO[]> {
    return await this.driveService.listTeamAssets();
  }

  @Get('status')
  getAuthStatus() {
    return this.googleFactory.getServiceAccountProfile();
  }
}
