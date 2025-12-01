import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import { StorageService } from './storage.service';

@Global() // Make StorageService available globally
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'GCS_CLIENT',
      useFactory: (configService: ConfigService) => {
        // This factory will instantiate the GCS client.
        // It can be expanded to include keyFile logic for local dev
        // or will automatically use the service account in a GCP environment.
        return new Storage({
          projectId: configService.get<string>('GCLOUD_PROJECT'),
        });
      },
      inject: [ConfigService],
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}