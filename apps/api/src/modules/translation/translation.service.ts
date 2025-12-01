
import { Injectable, Logger, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 } from '@google-cloud/translate';

@Injectable()
export class TranslationService implements OnModuleInit {
  private readonly logger = new Logger(TranslationService.name);
  private translate: v2.Translate;
  private isConfigured = false;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.initializeClient();
  }

  private initializeClient() {
    try {
      const storageConfig: any = {
        projectId: this.configService.get('GCP_PROJECT_ID') || this.configService.get('GOOGLE_CLOUD_PROJECT'),
      };

      // Credential Resolution Strategy (Matching StorageService)
      const credentialsJson = this.configService.get('GCP_CREDENTIALS');
      let method = 'None';

      if (credentialsJson) {
        try {
          storageConfig.credentials = JSON.parse(credentialsJson);
          method = 'GCP_CREDENTIALS (JSON)';
        } catch (e) {
          this.logger.warn('Failed to parse GCP_CREDENTIALS JSON for TranslationService.');
        }
      }

      if (!storageConfig.credentials) {
        const clientEmail = this.configService.get('GCP_CLIENT_EMAIL');
        const privateKey = this.configService.get('GCP_PRIVATE_KEY');
        if (clientEmail && privateKey) {
          storageConfig.credentials = {
            client_email: clientEmail,
            private_key: privateKey.replace(/\\n/g, '\n'),
          };
          method = 'ENV VARS (Client Email + Private Key)';
        } else {
          const keyFile = this.configService.get('GOOGLE_APPLICATION_CREDENTIALS');
          if (keyFile) {
            storageConfig.keyFilename = keyFile;
            method = 'GOOGLE_APPLICATION_CREDENTIALS (File Path)';
          }
        }
      }

      if (storageConfig.credentials || storageConfig.keyFilename) {
        this.translate = new v2.Translate(storageConfig);
        this.isConfigured = true;
        this.logger.log(`TranslationService: Online (${method})`);
      } else {
        this.logger.warn('TranslationService: Credentials missing. Feature disabled.');
      }
    } catch (e: any) {
      this.logger.error(`TranslationService initialization failed: ${e.message}`);
    }
  }

  async translateText(text: string, targetLanguage: string): Promise<string> {
    if (!this.isConfigured) {
      throw new InternalServerErrorException('Translation service is not configured.');
    }

    try {
      // Google Cloud Translate v2 returns [string, metadata]
      const [translation] = await this.translate.translate(text, targetLanguage);
      return translation;
    } catch (error: any) {
      this.logger.error(`Translation API failed: ${error.message}`);
      throw new InternalServerErrorException(`Translation failed: ${error.message}`);
    }
  }
}
