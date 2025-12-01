
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AssetsModule } from './modules/assets/assets.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { IntelligenceModule } from './modules/intelligence/intelligence.module';
import { MoodboardModule } from './modules/moodboard/moodboard.module';
import { AnalysisModule } from './modules/analysis/analysis.module';
import { FreelancersModule } from './modules/freelancers/freelancers.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { ScriptsModule } from './modules/scripts/scripts.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { StorageModule } from './modules/storage/storage.module';
import { HealthModule } from './health/health.module';
import { GoogleModule } from './modules/google/google.module';
import { TranslationModule } from './modules/translation/translation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    EventEmitterModule.forRoot({
      global: true,
    }),
    PrismaModule,
    StorageModule,
    GoogleModule,
    AssetsModule, 
    KnowledgeModule,
    IntelligenceModule,
    MoodboardModule,
    AnalysisModule,
    FreelancersModule,
    ProjectsModule,
    AssignmentsModule,
    ScriptsModule,
    AvailabilityModule,
    TranslationModule,
    HealthModule,
    // Serve Static Files (Frontend)
    // Updated exclusion strategy to prevent shadowing of /api routes
    ServeStaticModule.forRoot({
      rootPath: join((process as any).cwd(), 'dist/client'),
      exclude: ['/api/(.*)', '/api', '/health'],
      serveRoot: '/',
    }),
  ],
})
export class AppModule {}
