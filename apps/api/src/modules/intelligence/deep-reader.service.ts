
import { Injectable, Logger, UnsupportedMediaTypeException, OnModuleInit } from '@nestjs/common';
import { Worker } from 'worker_threads';
import { Buffer } from 'buffer';
import * as path from 'path';

@Injectable()
export class DeepReaderService implements OnModuleInit {
  private readonly logger = new Logger(DeepReaderService.name);
  
  // 2025 Standard: Pre-compile Regex to avoid recompilation on every request
  private readonly CLEANUP_REGEX = /(\r\n|\n|\r|\t| +)/gm;

  onModuleInit() {
    this.logger.log('DeepReader Intelligence Engine: Worker Threads Enabled');
  }

  /**
   * Offloads heavy parsing to a Worker Thread to prevent Event Loop Blocking.
   */
  async extractText(buffer: Buffer, mimeType: string): Promise<string> {
    const start = (process as any).hrtime.bigint();
    this.logger.debug(`[DeepReader] Offloading ${mimeType} (${buffer.length} bytes) to Worker Pool`);

    try {
      let content = '';

      if (this.isPdf(mimeType)) {
        content = await this.parsePdfInWorker(buffer);
      } else if (this.isText(mimeType)) {
        content = buffer.toString('utf-8');
      } else {
        throw new UnsupportedMediaTypeException(`DeepReader does not support ${mimeType} natively.`);
      }

      // Cleanup happens on main thread as it's fast on strings < 10MB
      // For larger strings, this too should move to the worker.
      const cleanContent = this.sanitizeText(content);

      const end = (process as any).hrtime.bigint();
      const duration = Number(end - start) / 1e6; // ns to ms
      this.logger.log(`[DeepReader] Extraction Success: ${cleanContent.length} chars in ${duration.toFixed(2)}ms`);
      
      return cleanContent;

    } catch (error: any) {
      this.logger.error(`[DeepReader] Worker Failure: ${error.message}`, error.stack);
      throw error;
    }
  }

  private isPdf(mimeType: string): boolean {
    return mimeType === 'application/pdf';
  }

  private isText(mimeType: string): boolean {
    return [
      'text/plain', 'text/csv', 'text/markdown', 'text/html', 
      'application/json', 'application/xml'
    ].some(t => mimeType.includes(t));
  }

  private sanitizeText(text: string): string {
    // Single pass regex replacement
    return text.replace(this.CLEANUP_REGEX, ' ').trim();
  }

  /**
   * The "Supergenius" Worker Implementation.
   * In a real build, this worker code lives in a separate file.
   * Here we instantiate it via Blob/Eval for portability in this response.
   */
  private parsePdfInWorker(buffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      const workerScript = `
        const { parentPort, workerData } = require('worker_threads');
        const pdf = require('pdf-parse');

        parentPort.on('message', async (buffer) => {
          try {
            const data = await pdf(buffer);
            parentPort.postMessage({ status: 'success', text: data.text });
          } catch (e) {
            parentPort.postMessage({ status: 'error', error: e.message });
          }
        });
      `;

      const worker = new Worker(workerScript, { eval: true });
      
      worker.on('message', (result) => {
        worker.terminate();
        if (result.status === 'success') resolve(result.text);
        else reject(new Error(result.error));
      });

      worker.on('error', (err) => {
        worker.terminate();
        reject(err);
      });

      worker.on('exit', (code) => {
        if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
      });

      // Zero-Copy transfer if possible (Buffer is Uint8Array), but pdf-parse needs copy usually.
      // We pass the buffer to the worker.
      worker.postMessage(buffer);
    });
  }
}
