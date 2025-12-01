import { Injectable, Inject, Logger, OnModuleInit, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import { Readable } from 'stream';

export interface UploadResult {
  /** The full GCS path to the file (e.g., 'imports/my-file.xlsx') */
  path: string;
  /** A publicly accessible URL, if the object is public */
  publicUrl: string;
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly bucketName: string;

  constructor(
    @Inject('GCS_CLIENT') private readonly storage: Storage,
    private readonly configService: ConfigService,
  ) {
    this.bucketName = this.configService.get<string>('GCS_BUCKET_NAME');
    if (!this.bucketName) {
      throw new Error('GCS_BUCKET_NAME environment variable must be set');
    }
  }

  async onModuleInit() {
    try {
      const [exists] = await this.storage.bucket(this.bucketName).exists();
      if (!exists) {
        this.logger.error(`Bucket "${this.bucketName}" does not exist!`);
        throw new InternalServerErrorException(`Storage bucket misconfiguration.`);
      }
      this.logger.log(`Successfully connected to GCS Bucket: "${this.bucketName}"`);
    } catch (error) {
      this.logger.error(`Failed to verify GCS bucket connection: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Could not connect to Cloud Storage.');
    }
  }

  /**
   * Uploads a file buffer to the configured GCS bucket.
   * @param fileBuffer The file content as a Buffer.
   * @param destination The full path and filename in the bucket (e.g., 'imports/file.xlsx').
   * @param mimetype The MIME type of the file.
   * @returns A promise that resolves with the path and public URL.
   */
  async upload(fileBuffer: Buffer, destination: string, mimetype: string): Promise<UploadResult> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(destination);

    await file.save(fileBuffer, {
      metadata: { contentType: mimetype },
    });

    this.logger.log(`File uploaded to gs://${this.bucketName}/${destination}`);

    return {
      path: destination,
      publicUrl: file.publicUrl(),
    };
  }

  /**
   * Generates a temporary signed URL to allow reading a private file.
   * @param path The full GCS path to the file.
   * @param durationMinutes The number of minutes the URL should be valid for.
   * @returns A promise that resolves with the signed URL.
   */
  async getSignedUrl(path: string, durationMinutes = 15): Promise<string> {
    const options = {
      version: 'v4' as const,
      action: 'read' as const,
      expires: Date.now() + durationMinutes * 60 * 1000,
    };

    try {
      const [url] = await this.storage.bucket(this.bucketName).file(path).getSignedUrl(options);
      return url;
    } catch (error) {
      this.logger.error(`Failed to get signed URL for "${path}"`, error.stack);
      throw new InternalServerErrorException('Could not generate file access URL.');
    }
  }

  /**
   * Gets a readable stream for a file in GCS. Ideal for processing large files.
   * @param path The full GCS path to the file.
   * @returns A readable stream of the file's contents.
   */
  async getReadStream(path: string): Promise<Readable> {
    const file = this.storage.bucket(this.bucketName).file(path);
    const [exists] = await file.exists();
    if (!exists) {
      throw new NotFoundException(`File not found at path: ${path}`);
    }
    return file.createReadStream();
  }
}