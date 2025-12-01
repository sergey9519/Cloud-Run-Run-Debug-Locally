
import { 
  Injectable, 
  Logger, 
  InternalServerErrorException, 
  OnModuleInit
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Buffer } from 'buffer';
import { Readable } from 'stream';

export interface StoredObject {
  storageKey: string;
  publicUrl?: string; 
  signedUrl?: string;
  mimeType: string;
  sizeBytes?: number;
}

export interface UploadOptions {
  key: string;
  body: Buffer | Readable;
  contentType: string;
  isPublic?: boolean;
  metadata?: Record<string, string>;
  traceId?: string;
}

export const STORAGE_EVENTS = {
  UPLOADED: 'storage.object.uploaded',
  DELETED: 'storage.object.deleted',
  ERROR: 'storage.operation.error',
};

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private storage: any;
  private bucket: any;
  private readonly bucketName: string;
  private isConfigured = false;
  private connectedEmail = '';

  constructor(
    private configService: ConfigService,
    private eventEmitter: EventEmitter2
  ) {
    // 1. Bucket Configuration with specific ID support
    const envBucket = this.configService.get('STORAGE_BUCKET');
    const specificId = this.configService.get('CLOUD_STORAGE_ID'); // Handle the specific ID provided
    this.bucketName = envBucket || specificId || 'studio-roster-assets-main';
  }

  async onModuleInit() {
    await this.initializeStorage();

    if (this.isConfigured) {
        this.logger.log(`StorageService: Online (Bucket: ${this.bucketName})`);
        // Async verification without blocking boot
        this.verifyConnection().catch(e => this.logger.warn(`Lazy connection verify failed: ${e.message}`));
    } else {
        this.logger.warn('StorageService is NOT configured. Uploads will FAIL.');
    }
  }

  private async initializeStorage() {
    try {
        const { Storage } = await import('@google-cloud/storage');

        const storageConfig: any = {
          projectId: this.configService.get('GCP_PROJECT_ID') || this.configService.get('GOOGLE_CLOUD_PROJECT'),
          retryOptions: {
            autoRetry: true,
            retryDelayMultiplier: 2,
            totalTimeout: 600, // 10 minutes for large media assets
            maxRetryDelay: 60,
            maxRetries: 3,
          },
        };

        let method = 'None';

        // Strategy 1: Full JSON in Env (Best Practice for Container/K8s)
        const credentialsJson = this.configService.get('GCP_CREDENTIALS');
        if (credentialsJson) {
          try {
            const parsed = JSON.parse(credentialsJson);
            storageConfig.credentials = parsed;
            this.connectedEmail = parsed.client_email;
            method = 'GCP_CREDENTIALS (JSON)';
          } catch (e) {
            this.logger.warn('Failed to parse GCP_CREDENTIALS JSON.');
          }
        } 
        
        // Strategy 2: Individual Env Vars (Standard Dev/CI)
        if (!storageConfig.credentials) {
            const clientEmail = this.configService.get('GCP_CLIENT_EMAIL');
            const privateKey = this.configService.get('GCP_PRIVATE_KEY');
            
            if (clientEmail && privateKey) {
                const formattedKey = privateKey.replace(/\\n/g, '\n');
                storageConfig.credentials = {
                    client_email: clientEmail,
                    private_key: formattedKey,
                };
                this.connectedEmail = clientEmail;
                method = 'ENV VARS (Client Email + Private Key)';
            }
        }

        // Strategy 3: HMAC Keys (Compatibility Mode / User provided)
        if (!storageConfig.credentials) {
            const accessKeyId = this.configService.get('GCS_ACCESS_KEY_ID');
            const secretAccessKey = this.configService.get('GCS_SECRET_ACCESS_KEY');
            // Note: The prompt only provided Key ID, but we support the pair if present.
            if (accessKeyId && secretAccessKey) {
               // HMAC is usually used with S3 client, but typically not natively here.
               // We log a warning that standard JSON creds are preferred.
               this.logger.warn("HMAC Keys detected. @google-cloud/storage prefers Service Account JSON. Attempting fallback...");
            }
        }

        // Strategy 4: ADC (Application Default Credentials)
        if (!storageConfig.credentials && !storageConfig.keyFilename) {
           const keyFile = this.configService.get('GOOGLE_APPLICATION_CREDENTIALS');
           if (keyFile) {
             storageConfig.keyFilename = keyFile;
             method = 'GOOGLE_APPLICATION_CREDENTIALS (File Path)';
           }
        }

        this.storage = new Storage(storageConfig);
        this.bucket = this.storage.bucket(this.bucketName);
        
        // Assume configured if we have explicit credentials or are relying on ADC
        this.isConfigured = !!(storageConfig.credentials || storageConfig.keyFilename || process.env.GOOGLE_APPLICATION_CREDENTIALS);
        if (this.isConfigured) {
            this.logger.log(`Storage Credential Strategy: ${method}`);
        }
    } catch (e: any) {
        this.logger.warn(`StorageService initialization failed. Reason: ${e.message}`);
        this.isConfigured = false;
    }
  }

  private async verifyConnection() {
    if (!this.bucket) return;
    try {
      const [exists] = await this.bucket.exists();
      if (!exists) {
        this.logger.warn(`Bucket '${this.bucketName}' does not exist. Check your GCP Project permissions.`);
      } else {
        this.logger.log(`Bucket '${this.bucketName}' connected successfully.`);
      }
    } catch (e: any) {
      if (e.code === 403) {
         this.logger.error(`Permission Denied accessing bucket '${this.bucketName}'. Check IAM Roles.`);
      } else {
         this.logger.warn(`GCS Connectivity Check: ${e.message}`);
      }
    }
  }

  private sanitizeKey(key: string): string {
    // Prevent directory traversal
    return key.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\.\./g, '');
  }

  async uploadObject(params: UploadOptions): Promise<StoredObject> {
    const safeKey = this.sanitizeKey(params.key);

    if (!this.isConfigured) {
        // Fail securely: Do not allow uploads if storage isn't verified
        throw new InternalServerErrorException('Cloud Storage is not configured. Upload rejected.');
    }

    const file = this.bucket.file(safeKey);

    try {
      const stream = file.createWriteStream({
        metadata: {
          contentType: params.contentType,
          metadata: params.metadata,
          // Production Cache Headers: Immutable for 1 year
          cacheControl: 'public, max-age=31536000, immutable',
        },
        resumable: false, // Disable resumable for small files to reduce latency
        validation: false,
      });

      await new Promise((resolve, reject) => {
        if (Buffer.isBuffer(params.body)) {
          stream.end(params.body);
        } else if (params.body instanceof Readable) {
          params.body.pipe(stream);
        } else {
          reject(new Error('Invalid body format'));
        }

        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      let publicUrl: string | undefined = undefined;
      let signedUrl: string | undefined = undefined;

      // Handle Public Access vs Signed URL Fallback
      if (params.isPublic) {
        try {
            await file.makePublic();
            publicUrl = `https://storage.googleapis.com/${this.bucketName}/${safeKey}`;
        } catch (e: any) {
            // UBLA (Uniform Bucket Level Access) prevents ACLs. 
            // We fallback to a long-lived signed URL if public access fails.
            this.logger.debug(`Bucket enforces Uniform Access. Generating V4 Signed URL.`);
            signedUrl = await this.getSignedDownloadUrl(safeKey, 604800); // 7 days
        }
      }

      this.eventEmitter.emit(STORAGE_EVENTS.UPLOADED, { key: safeKey, traceId: params.traceId });
      
      return {
        storageKey: safeKey,
        mimeType: params.contentType,
        publicUrl,
        signedUrl,
        sizeBytes: Buffer.isBuffer(params.body) ? params.body.length : undefined
      };

    } catch (error: any) {
      this.logger.error(`GCS Upload Failed [${safeKey}]: ${error.message}`);
      this.eventEmitter.emit(STORAGE_EVENTS.ERROR, { operation: 'upload', key: safeKey, error: error.message });
      throw new InternalServerErrorException('Cloud storage upload failed');
    }
  }

  async getSignedDownloadUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    if (!this.isConfigured) throw new InternalServerErrorException('Storage not configured');
    
    const safeKey = this.sanitizeKey(key);
    
    try {
      const [url] = await this.bucket.file(safeKey).getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + expiresInSeconds * 1000,
      });
      return url;
    } catch (error: any) {
      this.logger.error(`GCS Sign URL Failed [${safeKey}]: ${error.message}`);
      throw error;
    }
  }

  async deleteObject(key: string): Promise<void> {
    if (!this.isConfigured) return;

    const safeKey = this.sanitizeKey(key);
    try {
      await this.bucket.file(safeKey).delete();
      this.eventEmitter.emit(STORAGE_EVENTS.DELETED, { key: safeKey });
      this.logger.log(`Deleted GCS Object: ${safeKey}`);
    } catch (error: any) {
      if (error.code !== 404) {
        this.logger.warn(`Delete failed: ${error.message}`);
      }
    }
  }

  getStorageInfo() {
    return {
      bucket: this.bucketName,
      configured: this.isConfigured,
      identity: this.connectedEmail || 'unknown',
      projectId: this.configService.get('GCP_PROJECT_ID') || 'unknown'
    };
  }
}
