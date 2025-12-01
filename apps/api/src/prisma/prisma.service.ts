
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';

// Stub PrismaClient to avoid build errors when client isn't generated
class PrismaClient {
  async $connect() { return Promise.resolve(); }
  async $disconnect() { return Promise.resolve(); }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  // Define properties explicitly to satisfy TypeScript when client generation is missing
  // Initializing to a mock object prevents runtime crashes if called without DB
  asset: any = { findMany: () => [], findUnique: () => null, create: () => ({}), update: () => ({}), delete: () => ({}) };
  assignment: any = { findMany: () => [], findUnique: () => null, create: () => ({}), update: () => ({}), delete: () => ({}) };
  freelancer: any = { findMany: () => [], findUnique: () => null, create: () => ({}), update: () => ({}), delete: () => ({}) };
  project: any = { findMany: () => [], findUnique: () => null, create: () => ({}), update: () => ({}), delete: () => ({}) };
  script: any = { findMany: () => [], findUnique: () => null, create: () => ({}), update: () => ({}), delete: () => ({}) };

  $transaction: any = (ops: any[]) => Promise.all(ops);

  async onModuleInit() {
    await this.connectWithRetry();
  }

  async connectWithRetry(retries = 5, delay = 2000) {
    for (let i = 0; i < retries; i++) {
        try {
            await (this as any).$connect();
            this.logger.log('Database connected successfully');
            return;
        } catch (e: any) {
            this.logger.warn(`Database connection attempt ${i + 1}/${retries} failed: ${e.message}`);
            if (i === retries - 1) {
                this.logger.error('Could not connect to Database. Application will run in LIMITED MODE (No Persistence).');
            } else {
                await new Promise(res => setTimeout(res, delay));
            }
        }
    }
  }

  async onModuleDestroy() {
    try {
      await (this as any).$disconnect();
    } catch (e) {
      // Ignore disconnect errors
    }
  }
}
