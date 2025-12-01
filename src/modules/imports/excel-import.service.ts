import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../apps/api/src/prisma/prisma.service';
import { ImportFreelancerRowSchema, ImportFreelancerRow } from './dto/import-freelancers.dto';
import { StorageService } from '../storage/storage.service';
import * as ExcelJS from 'exceljs';

interface ImportResult {
  processedCount: number;
  successCount: number;
  errors: Array<{ row: number; error: string; data?: any }>;
}

@Injectable()
export class ExcelImportService {
  private readonly logger = new Logger(ExcelImportService.name);
  private readonly BATCH_SIZE = 100;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Processes an Excel file from a GCS path using streaming to minimize memory footprint.
   * @param gcsPath The path to the file in the GCS bucket (e.g., 'imports/file.xlsx').
   */
  async processFreelancerImport(gcsPath: string): Promise<ImportResult> {
    const result: ImportResult = {
      processedCount: 0,
      successCount: 0,
      errors: [],
    };

    const stream = await this.storageService.getReadStream(gcsPath);
    const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(stream, {
      entries: 'emit',
      sharedStrings: 'cache',
      hyperlinks: 'ignore',
      styles: 'ignore',
    });

    let headers: string[] = [];
    let batch: ImportFreelancerRow[] = [];

    // We iterate over the workbook. 
    // Note: ExcelJS stream reader is slightly different than standard worksheet access.
    for await (const worksheetReader of workbookReader) {
      for await (const row of worksheetReader) {
        // Skip empty rows
        if (row.values.length === 0) continue;

        // Assume Row 1 is header
        if (row.number === 1) {
            // row.values in ExcelJS is 1-based index array, index 0 is empty/undefined usually.
            // We map it to a cleaner array of strings.
            headers = (row.values as any[])
                .slice(1) // skip index 0
                .map(val => String(val).toLowerCase().trim());
            continue;
        }

        // Process Data Rows
        const rowData: Record<string, any> = {};
        const rowValues = row.values as any[];

        // Map columns based on headers (Dynamic Mapping)
        headers.forEach((header, index) => {
            // ExcelJS row.values is 1-based, so header index matches (index + 1)
            const cellValue = rowValues[index + 1]; 
            
            // Map simple headers to DTO keys
            if (header.includes('email') || header.includes('contact')) rowData.email = cellValue;
            else if (header.includes('name')) rowData.name = cellValue;
            else if (header.includes('role')) rowData.role = cellValue;
            else if (header.includes('rate')) rowData.rate = cellValue;
            else if (header.includes('skill')) rowData.skills = cellValue; // Zod handles splitting
            else if (header.includes('phone')) rowData.phone = cellValue;
            else if (header.includes('bio')) rowData.bio = cellValue;
            else if (header.includes('portfolio')) rowData.portfolioUrl = cellValue;
            else if (header.includes('status')) rowData.status = cellValue;
            else if (header.includes('timezone')) rowData.timezone = cellValue;
        });

        // Validate
        const validation = ImportFreelancerRowSchema.safeParse(rowData);

        if (!validation.success) {
            result.errors.push({
                row: row.number,
                error: validation.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
                data: rowData // Optional: Include for debugging
            });
        } else {
            batch.push(validation.data);
        }

        result.processedCount++;

        // Batch Insert
        if (batch.length >= this.BATCH_SIZE) {
            await this.flushBatch(batch);
            result.successCount += batch.length;
            batch = []; // Clear batch
        }
      }
    }

    // Flush remaining
    if (batch.length > 0) {
        await this.flushBatch(batch);
        result.successCount += batch.length;
    }

    this.logger.log(`Import completed. Processed: ${result.processedCount}, Created/Updated: ${result.successCount}, Errors: ${result.errors.length}`);
    return result;
  }

  /**
   * Upserts a batch of freelancers transactionally.
   */
  private async flushBatch(freelancers: ImportFreelancerRow[]) {
    // This approach is more robust and performant for handling many-to-many relations during an import.
    // 1. Collect all unique skills from the batch.
    const uniqueSkillNames = [
      ...new Set(freelancers.flatMap((f) => f.skills)),
    ];

    // 2. Use a transaction to ensure data integrity.
    await this.prisma.$transaction(
      async (tx) => {
        // 3. Upsert all skills to ensure they exist and get their IDs.
        // `createMany` with `skipDuplicates` is highly efficient.
        await tx.skill.createMany({
          data: uniqueSkillNames.map((name) => ({ name })),
          skipDuplicates: true,
        });

        // 4. Fetch the skills we just created/ensured exist to map names to IDs.
        const skillsInDb = await tx.skill.findMany({
          where: { name: { in: uniqueSkillNames } },
        });
        const skillNameToIdMap = new Map(skillsInDb.map((s) => [s.name, s.id]));

        // 5. Create or update each freelancer and connect them to their skills.
        for (const freelancer of freelancers) {
          const { skills, ...freelancerData } = freelancer;
          const skillIds = skills.map((name) => skillNameToIdMap.get(name)).filter(Boolean);

          await tx.freelancer.upsert({
            where: { email: freelancerData.email },
            update: freelancerData,
            create: {
              ...freelancerData,
              skills: { create: skillIds.map(skillId => ({ skillId })) },
            },
          });
        }
      },
    ); // End of transaction
  }
}