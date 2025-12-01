import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { GoogleClientFactory, AuthenticatedUser } from './google-client.factory';

@Injectable()
export class SheetIngestorService {
  private readonly logger = new Logger(SheetIngestorService.name);
  // Token conservation limit: Avoid sending massive grids to the LLM
  private readonly MAX_CELLS = 10000;

  constructor(private readonly clientFactory: GoogleClientFactory) {}

  /**
   * Fetches the first visible sheet from a Spreadsheet ID and converts it to a Markdown table.
   */
  async fetchAndFormatSheet(user: AuthenticatedUser, fileId: string): Promise<string> {
    if (!user.googleCredentials) {
      throw new BadRequestException('User missing Google credentials');
    }

    const { sheets } = this.clientFactory.createClients(user);

    try {
      // 1. Get Spreadsheet Metadata to identify the first visible sheet
      const meta = await sheets.spreadsheets.get({ spreadsheetId: fileId });
      const visibleSheet = meta.data.sheets?.find(s => !s.properties?.hidden);
      
      if (!visibleSheet?.properties?.title) {
        throw new Error('No visible sheets found in document.');
      }
      
      const sheetName = visibleSheet.properties.title;

      // 2. Fetch Data (Values)
      // We rely on the API to return the "used range" if we just provide the sheet name
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: fileId,
        range: sheetName,
        valueRenderOption: 'FORMATTED_VALUE', // Get human-readable strings (e.g. "$100.00" instead of 100)
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return 'The sheet appears to be empty.';
      }

      // 3. Format to Markdown
      return this.rowsToMarkdown(rows);

    } catch (error) {
      this.logger.error(`Failed to ingest sheet ${fileId}: ${error.message}`);
      // Clean up error message for frontend
      const msg = error.response?.data?.error?.message || error.message;
      throw new BadRequestException(`Google Sheets Error: ${msg}`);
    }
  }

  /**
   * Converts a 2D array of strings into a Markdown table.
   * Includes logic to truncate data if it exceeds token limits.
   */
  private rowsToMarkdown(rows: any[][]): string {
    const totalCells = rows.reduce((acc, row) => acc + row.length, 0);
    
    let activeRows = rows;
    let warning = '';
    
    // Optimization: Truncate if too large to ensure fast inference
    if (totalCells > this.MAX_CELLS) {
        const avgCols = rows[0]?.length || 1;
        const maxRows = Math.floor(this.MAX_CELLS / avgCols);
        activeRows = rows.slice(0, maxRows);
        warning = `\n\n*(Note: Data truncated. Analyzed top ${maxRows} rows to optimize processing speed.)*`;
    }

    if (activeRows.length === 0) return '';

    // Normalize headers (Row 1)
    const headers = activeRows[0].map(cell => this.cleanCell(cell));
    
    // Markdown Table Syntax construction
    const headerRow = `| ${headers.join(' | ')} |`;
    const separatorRow = `| ${headers.map(() => '---').join(' | ')} |`;

    const bodyRows = activeRows.slice(1).map(row => {
        // Ensure every row has the same number of columns as the header
        const normalized = Array.from({ length: headers.length }, (_, i) => this.cleanCell(row[i]));
        return `| ${normalized.join(' | ')} |`;
    });

    return `${headerRow}\n${separatorRow}\n${bodyRows.join('\n')}${warning}`;
  }

  /**
   * Sanitizes cell data to prevent breaking Markdown formatting.
   */
  private cleanCell(val: any): string {
    if (val === null || val === undefined) return '';
    let str = String(val).trim();
    // Escape pipes as they are structural elements in Markdown tables
    str = str.replace(/\|/g, '\\|');
    // Replace newlines with spaces to keep the table structure intact
    str = str.replace(/\n/g, ' '); 
    return str;
  }
}