import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ImportsController } from './imports.controller';
import { ExcelImportService } from './excel-import.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ImportProcessor } from './import.processor';
import { IMPORT_QUEUE } from './imports.constants';

@Module({
  imports: [
    PrismaModule, // StorageModule is global, no need to import here
    BullModule.registerQueue({
      name: IMPORT_QUEUE,
    }),
  ],
  controllers: [ImportsController],
  providers: [ExcelImportService, ImportProcessor],
})
export class ImportsModule {}