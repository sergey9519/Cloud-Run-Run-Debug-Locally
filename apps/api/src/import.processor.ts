import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ExcelImportService } from './excel-import.service';
import { IMPORT_QUEUE, FREELANCER_IMPORT_JOB } from './imports.constants';

interface FreelancerImportJobData {
  gcsPath: string;
}

@Processor(IMPORT_QUEUE)
export class ImportProcessor extends WorkerHost {
  private readonly logger = new Logger(ImportProcessor.name);

  constructor(private readonly excelImportService: ExcelImportService) {
    super();
  }

  async process(job: Job<FreelancerImportJobData, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);
    switch (job.name) {
      case FREELANCER_IMPORT_JOB:
        return this.excelImportService.processFreelancerImport(job.data.gcsPath);
      default:
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed with error: ${error.message}`, error.stack);
  }
}