
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DriveController } from './drive.controller';
import { DriveService } from './drive.service';
import { GoogleClientFactory } from './google-client.factory';
import { DataExtractorService } from './data-extractor.service';
import { SheetIngestorService } from './sheet-ingestor.service';

@Module({
  imports: [ConfigModule],
  controllers: [DriveController],
  providers: [DriveService, GoogleClientFactory, DataExtractorService, SheetIngestorService],
  exports: [GoogleClientFactory, DriveService, DataExtractorService, SheetIngestorService],
})
export class GoogleModule {}
