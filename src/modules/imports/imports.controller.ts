import { Controller, Post, UploadedFile, UseInterceptors, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, Logger, Inject } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from '../../modules/storage/storage.service';
import { randomUUID } from 'crypto';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { FREELANCER_IMPORT_JOB, IMPORT_QUEUE } from './imports.constants';

@Controller('imports')
export class ImportsController {
  private readonly logger = new Logger(ImportsController.name);

  constructor(
    @InjectQueue(IMPORT_QUEUE) private readonly importQueue: Queue,
    private readonly storageService: StorageService,
  ) {}

  @Post('freelancers')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFreelancerFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), // .xlsx
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    this.logger.log(`Received freelancer import file: ${file.originalname}`);

    // 1. Upload to GCS
    const destination = `imports/freelancers/${randomUUID()}-${file.originalname}`;
    await this.storageService.upload(file.buffer, destination, file.mimetype);
    this.logger.log(`File uploaded to GCS at: ${destination}`);

    // 2. Add a job to the queue for background processing
    const job = await this.importQueue.add(FREELANCER_IMPORT_JOB, {
      gcsPath: destination,
    });

    this.logger.log(`Added import job ${job.id} to the queue.`);

    return {
      jobId: job.id,
      message: 'File import has been queued for processing.',
    };
  }
}