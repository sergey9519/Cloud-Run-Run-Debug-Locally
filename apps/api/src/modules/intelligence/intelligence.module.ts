import { Module } from '@nestjs/common';
import { DeepReaderService } from './deep-reader.service';

@Module({
  providers: [DeepReaderService],
  exports: [DeepReaderService],
})
export class IntelligenceModule {}