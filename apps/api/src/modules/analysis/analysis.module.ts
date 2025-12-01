
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WorkspaceAnalysisController } from './workspace-analysis.controller';
import { GeminiAnalystService } from '../ai/gemini-analyst.service';
import { GoogleModule } from '../google/google.module';

@Module({
  imports: [ConfigModule, GoogleModule],
  controllers: [WorkspaceAnalysisController],
  providers: [
    GeminiAnalystService,
    // DataExtractorService and GoogleClientFactory are provided by GoogleModule
  ],
})
export class AnalysisModule {}
